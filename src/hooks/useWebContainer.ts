import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebContainer } from '@webcontainer/api'
import { logTerminal, logWebContainerStatus } from '@/lib/pipelineLog'
import {
  packageJsonDepsFingerprint,
  patchMountFilesForWebContainer,
  patchProductDeltasForWebContainer,
} from '@/lib/patchWebContainerFiles'
import type { SandboxError } from '@/lib/sandboxErrors'
import { sandboxErrorsToMessages } from '@/lib/sandboxErrors'
import { dedupeSandboxErrors } from '@/lib/sandboxErrors'
import {
  parseDevError,
  parseDevErrorsFromTerminal,
  parseNpmErrors,
  sanitizeTerminalChunk,
  stripAnsi,
} from '@/lib/terminalSanitize'
import {
  DEV_PORT_MAX,
  DEV_PORT_START,
  isDevPreviewPort,
  isPortInUseError,
  nextDevPort,
} from '@/lib/devServerPorts'
import { BASE_NEXT_SCAFFOLD } from '@/lib/baseScaffold'
import {
  attachServerReady,
  bootWebContainerOnce,
  buildFileSystemTree,
  resetProjectRuntimeState,
  runWebContainerOp,
} from '@/lib/webContainerManager'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type { WebContainerFiles } from '@/lib/patchWebContainerFiles'
export type { SandboxError } from '@/lib/sandboxErrors'

export type WebContainerStatus =
  | 'idle'
  | 'booting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error'

const NPM_INSTALL_ARGS = [
  'install',
  '--no-audit',
  '--no-fund',
  '--progress=false',
  '--loglevel=warn',
  '--prefer-online',
]

const NPM_SPAWN_OPTS = { env: { CI: '1' } }

type KillableProcess = {
  kill: () => void
}

function isInstallFailure(data: string) {
  return /npm error|ERR!|ERESOLVE|ETARGET|notarget/i.test(data)
}

function depsFingerprintFromPatched(patched: Record<string, string>): string | null {
  const pkg = patched['package.json']
  return pkg ? packageJsonDepsFingerprint(pkg) : null
}

export function useWebContainer() {
  const devServerStartedRef = useRef(false)
  const serverReadyRef = useRef(false)
  const devTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sandboxErrorsRef = useRef<SandboxError[]>([])
  const terminalBufferRef = useRef('')
  const fullPipelineRef = useRef<Promise<Record<string, string>> | null>(null)
  const initPipelineRef = useRef<Promise<void> | null>(null)
  const sandboxInitializedRef = useRef(false)
  const installedDepsFingerprintRef = useRef<string | null>(null)
  const installCompletedRef = useRef(false)
  const eaddrInUseRef = useRef(false)
  const activeDevPortRef = useRef<number | null>(null)
  const activeDevProcessRef = useRef<KillableProcess | null>(null)
  const pendingDeltaRef = useRef<Record<string, string>>({})
  const deltaFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deltaFlushChainRef = useRef<Promise<Record<string, string>>>(Promise.resolve({}))

  const [instance, setInstance] = useState<WebContainer | null>(null)
  const [status, setStatus] = useState<WebContainerStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [terminal, setTerminal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sandboxErrors, setSandboxErrors] = useState<SandboxError[]>([])

  const appendTerminalChunk = useCallback((chunk: string) => {
    const clean = sanitizeTerminalChunk(chunk)
    if (!clean) return
    const text = clean.endsWith('\n') ? clean : `${clean}\n`
    terminalBufferRef.current += text
    setTerminal((prev) => prev + text)
    logTerminal('sandbox', text)
  }, [])

  const appendLine = useCallback((line: string) => {
    const text = line.endsWith('\n') ? line : `${line}\n`
    terminalBufferRef.current += text
    setTerminal((prev) => prev + text)
    logTerminal('sandbox', text)
  }, [])

  const stopActiveDevProcess = useCallback((reason: string) => {
    const proc = activeDevProcessRef.current
    if (!proc) return
    appendLine(reason)
    try {
      proc.kill()
    } catch {
      // The process may already have exited.
    } finally {
      activeDevProcessRef.current = null
      devServerStartedRef.current = false
      serverReadyRef.current = false
      activeDevPortRef.current = null
      setPreviewUrl(null)
    }
  }, [appendLine])

  const setParsedErrors = useCallback((errors: SandboxError[]) => {
    sandboxErrorsRef.current = errors
    setSandboxErrors(errors)
  }, [])

  const mergeSandboxErrors = useCallback((incoming: SandboxError[]) => {
    if (incoming.length === 0) return
    setSandboxErrors((prev) => {
      const next = dedupeSandboxErrors([...prev, ...incoming])
      sandboxErrorsRef.current = next
      return next
    })
  }, [])

  const appendSandboxError = useCallback(
    (err: SandboxError) => {
      mergeSandboxErrors([err])
    },
    [mergeSandboxErrors]
  )

  const syncDevErrorsFromTerminal = useCallback(() => {
    const parsed = parseDevErrorsFromTerminal(terminalBufferRef.current)
    if (parsed.length > 0) mergeSandboxErrors(parsed)
  }, [mergeSandboxErrors])

  const clearSandboxErrors = useCallback(() => {
    sandboxErrorsRef.current = []
    setSandboxErrors([])
  }, [])

  const recordInstallFailure = useCallback(
    (exitCode: number) => {
      const parsed = parseNpmErrors(terminalBufferRef.current)
      if (parsed.length > 0) {
        setParsedErrors(parsed)
        setError(parsed[0].message)
      } else {
        setError(`npm install failed (exit code ${exitCode})`)
        setParsedErrors([
          {
            id: `install-exit-${exitCode}`,
            message: `npm install failed (exit code ${exitCode})`,
            fixHint: 'Check package.json dependency versions.',
          },
        ])
      }
      setStatus('error')
    },
    [setParsedErrors]
  )

  useEffect(() => {
    logWebContainerStatus(status, error ?? undefined)
  }, [status, error])

  useEffect(() => {
    attachServerReady((port, url) => {
      if (!isDevPreviewPort(port)) return
      activeDevPortRef.current = port
      serverReadyRef.current = true
      if (devTimeoutRef.current) {
        clearTimeout(devTimeoutRef.current)
        devTimeoutRef.current = null
      }
      setPreviewUrl(url)
      setStatus('ready')
      appendLine('')
      appendLine(`      ✓ Server ready at ${url}`)
    })
  }, [appendLine])

  const boot = useCallback(async (): Promise<WebContainer> => {
    setStatus('booting')
    setError(null)
    appendLine('$ runtime42: booting WebContainer…')

    try {
      const webContainer = await bootWebContainerOnce()
      setInstance(webContainer)
      setStatus('idle')
      appendLine('WebContainer ready.')
      return webContainer
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to boot WebContainer'
      setStatus('error')
      setError(message)
      appendLine(`ERROR: ${message}`)
      throw err
    }
  }, [appendLine])

  const prepareNewProject = useCallback(() => {
    pendingDeltaRef.current = {}
    if (deltaFlushTimerRef.current) {
      clearTimeout(deltaFlushTimerRef.current)
      deltaFlushTimerRef.current = null
    }
    deltaFlushChainRef.current = Promise.resolve({})
    devServerStartedRef.current = false
    serverReadyRef.current = false
    fullPipelineRef.current = null
    initPipelineRef.current = null
    sandboxInitializedRef.current = false
    installedDepsFingerprintRef.current = null
    installCompletedRef.current = false
    eaddrInUseRef.current = false
    activeDevPortRef.current = null
    stopActiveDevProcess('      stopped previous dev server')
    terminalBufferRef.current = ''
    if (devTimeoutRef.current) {
      clearTimeout(devTimeoutRef.current)
      devTimeoutRef.current = null
    }
    setPreviewUrl(null)
    setTerminal('')
    setError(null)
    clearSandboxErrors()
    resetProjectRuntimeState()
    setStatus('idle')
  }, [clearSandboxErrors, stopActiveDevProcess])

  const pipeProcessOutput = useCallback(
    (source: string, stream: ReadableStream<string>) => {
      stream.pipeTo(
        new WritableStream({
          write(data) {
            const chunk = stripAnsi(data.replace(/\r\n/g, '\n'))
            appendTerminalChunk(chunk)

            if (source === 'npm-install' && isInstallFailure(chunk)) {
              setStatus('error')
            }

            if (source === 'npm-dev') {
              if (isPortInUseError(chunk)) {
                eaddrInUseRef.current = true
              }
              if (chunk.includes('Turbopack is not supported')) {
                appendSandboxError({
                  id: 'turbopack-unsupported',
                  message: 'Turbopack is not supported in WebContainer.',
                  fixHint: 'Use Next 14.2.29 with scripts.dev: next dev --port 3000',
                })
              }
              if (/GET \/ \d{3}|⨯ TypeError|createContext.*is not a function/i.test(chunk)) {
                queueMicrotask(() => syncDevErrorsFromTerminal())
              }
            }
          },
        })
      )
    },
    [appendSandboxError, appendTerminalChunk, syncDevErrorsFromTerminal]
  )

  const runNpmInstall = useCallback(
    async (wc: WebContainer, label = '[3/4] Installing dependencies') => {
      setStatus('installing')
      appendLine('')
      appendLine(label)
      appendLine('$ npm install')
      const installProcess = await wc.spawn('npm', NPM_INSTALL_ARGS, NPM_SPAWN_OPTS)
      pipeProcessOutput('npm-install', installProcess.output)
      const installExit = await installProcess.exit
      if (installExit !== 0) {
        recordInstallFailure(installExit)
        throw new Error(`npm install failed (exit code ${installExit})`)
      }
      appendLine('      ✓ npm install complete')
    },
    [appendLine, pipeProcessOutput, recordInstallFailure]
  )

  const startDevServerWithPortFallback = useCallback(
    async (wc: WebContainer) => {
      if (serverReadyRef.current && activeDevPortRef.current != null) {
        appendLine(
          `      (dev server already running on port ${activeDevPortRef.current})`
        )
        return activeDevPortRef.current
      }

      if (activeDevProcessRef.current) {
        stopActiveDevProcess('      stopped stale dev server before retry')
      }

      devServerStartedRef.current = true
      setStatus('starting')

      if (devTimeoutRef.current) clearTimeout(devTimeoutRef.current)
      devTimeoutRef.current = setTimeout(() => {
        if (!serverReadyRef.current) {
          const msg = 'Dev server timed out after 3 minutes'
          setStatus('error')
          setError(msg)
          appendSandboxError({ id: 'dev-timeout', message: msg })
          appendLine(`ERROR: ${msg}`)
        }
      }, 180_000)

      for (let port = DEV_PORT_START; port <= DEV_PORT_MAX; port++) {
        eaddrInUseRef.current = false
        serverReadyRef.current = false

        appendLine(`$ npx next dev --port ${port}`)
        const proc = await wc.spawn(
          'npx',
          ['next', 'dev', '--port', String(port)],
          NPM_SPAWN_OPTS
        )
        activeDevProcessRef.current = proc
        pipeProcessOutput('npm-dev', proc.output)

        const quickDeadline = Date.now() + 6000
        while (Date.now() < quickDeadline) {
          await sleep(400)
          if (serverReadyRef.current) return activeDevPortRef.current ?? port
          if (eaddrInUseRef.current) break
        }

        if (serverReadyRef.current) return activeDevPortRef.current ?? port

        if (eaddrInUseRef.current) {
          const next = nextDevPort(port)
          if (next == null) break
          stopActiveDevProcess(`      stopped dev server attempt on occupied port ${port}`)
          appendLine(`      port ${port} in use, trying ${next}…`)
          continue
        }

        const slowDeadline = Date.now() + 174_000
        while (Date.now() < slowDeadline) {
          await sleep(500)
          if (serverReadyRef.current) return activeDevPortRef.current ?? port
          if (eaddrInUseRef.current) {
            const next = nextDevPort(port)
            if (next == null) break
            stopActiveDevProcess(`      stopped dev server attempt on occupied port ${port}`)
            appendLine(`      port ${port} in use, trying ${next}…`)
            break
          }
        }

        if (serverReadyRef.current) return activeDevPortRef.current ?? port
        if (!eaddrInUseRef.current) break
      }

      throw new Error(
        `Could not start dev server (ports ${DEV_PORT_START}–${DEV_PORT_MAX} in use)`
      )
    },
    [appendLine, appendSandboxError, pipeProcessOutput, stopActiveDevProcess]
  )

  const writeFilesToSandbox = useCallback(
    async (wc: WebContainer, patched: Record<string, string>) => {
      appendLine('')
      const paths = Object.keys(patched)
      appendLine(`$ patching ${paths.length} file${paths.length === 1 ? '' : 's'}…`)
      for (const [path, contents] of Object.entries(patched)) {
        const parts = path.split('/').filter(Boolean)
        if (parts.length > 1) {
          let dir = ''
          for (let i = 0; i < parts.length - 1; i++) {
            dir += (i === 0 ? '' : '/') + parts[i]
            try {
              await wc.fs.mkdir(dir)
            } catch {
              // directory may already exist
            }
          }
        }
        await wc.fs.writeFile(path, contents)
        appendLine(`      wrote ${path}`)
      }

      const depsFp = depsFingerprintFromPatched(patched)
      const depsTouched = Object.prototype.hasOwnProperty.call(patched, 'package.json')
      const shouldInstall =
        depsTouched && depsFp !== null && depsFp !== installedDepsFingerprintRef.current

      if (shouldInstall) {
        clearSandboxErrors()
        setError(null)
        await runNpmInstall(wc, '[deps] Installing new packages')
        installedDepsFingerprintRef.current = depsFp
        installCompletedRef.current = true
      }

      return patched
    },
    [appendLine, clearSandboxErrors, runNpmInstall]
  )

  /** Step 1–3: boot scaffold once, install once, dev server once */
  const initializeSandbox = useCallback(
    async (files?: Record<string, string>) => {
      if (initPipelineRef.current) {
        await initPipelineRef.current
        return
      }
      if (sandboxInitializedRef.current) return

      const init = runWebContainerOp(async () => {
        setTerminal('')
        terminalBufferRef.current = ''
        setError(null)
        clearSandboxErrors()

        appendLine('runtime42 — WebContainer sandbox')
        appendLine('────────────────────────────────────────')

        if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
          const msg =
            'Page is not cross-origin isolated. Restart the Vite dev server (COEP/COOP headers required).'
          appendLine(`ERROR: ${msg}`)
          setStatus('error')
          setError(msg)
          throw new Error(msg)
        }

        setStatus('booting')
        appendLine('')
        appendLine('[1/3] Booting WebContainer…')
        const wc = await bootWebContainerOnce()
        setInstance(wc)
        appendLine('      ✓ WebContainer booted')

        appendLine('')
        appendLine('[2/3] Mounting fixed scaffold…')
        const mountFiles = patchMountFilesForWebContainer(files ?? BASE_NEXT_SCAFFOLD)
        await wc.mount(buildFileSystemTree(mountFiles))
        appendLine(`      ✓ Mounted ${Object.keys(mountFiles).length} files`)

        await runNpmInstall(wc, '[2/3] Installing dependencies')
        const depsFp = depsFingerprintFromPatched(mountFiles)
        if (depsFp) {
          installedDepsFingerprintRef.current = depsFp
          installCompletedRef.current = true
        }

        appendLine('')
        appendLine('[3/3] Starting dev server (runs once)')
        await startDevServerWithPortFallback(wc)

        sandboxInitializedRef.current = true
      })

      initPipelineRef.current = init
      try {
        await init
      } finally {
        initPipelineRef.current = null
      }
    },
    [
      appendLine,
      clearSandboxErrors,
      runNpmInstall,
      startDevServerWithPortFallback,
    ]
  )

  const writeFileBatch = useCallback(
    async (changedFiles: Record<string, string>) => {
      if (Object.keys(changedFiles).length === 0) return changedFiles

      if (!sandboxInitializedRef.current) {
        await initializeSandbox({ ...BASE_NEXT_SCAFFOLD, ...changedFiles })
        return patchProductDeltasForWebContainer(changedFiles)
      }

      return runWebContainerOp(async () => {
        const wc = await bootWebContainerOnce()
        setInstance(wc)
        const patched = patchProductDeltasForWebContainer(changedFiles)
        await writeFilesToSandbox(wc, patched)
        if (!serverReadyRef.current) {
          await startDevServerWithPortFallback(wc)
        } else {
          setStatus('ready')
        }
        return patched
      })
    },
    [initializeSandbox, startDevServerWithPortFallback, writeFilesToSandbox]
  )

  const flushPendingDeltas = useCallback(async () => {
    if (deltaFlushTimerRef.current) {
      clearTimeout(deltaFlushTimerRef.current)
      deltaFlushTimerRef.current = null
    }
    const batch = pendingDeltaRef.current
    if (Object.keys(batch).length === 0) return {}
    pendingDeltaRef.current = {}
    return writeFileBatch(batch)
  }, [writeFileBatch])

  /** Step 4–5: patch product files — batched during streaming, immediate on complete */
  const writeFileDeltas = useCallback(
    async (
      changedFiles: Record<string, string>,
      options?: { immediate?: boolean }
    ) => {
      if (Object.keys(changedFiles).length === 0) return changedFiles

      if (options?.immediate) {
        if (deltaFlushTimerRef.current) {
          clearTimeout(deltaFlushTimerRef.current)
          deltaFlushTimerRef.current = null
        }
        Object.assign(pendingDeltaRef.current, changedFiles)
        const run = async () => flushPendingDeltas()
        deltaFlushChainRef.current = deltaFlushChainRef.current.then(run, run)
        return deltaFlushChainRef.current
      }

      Object.assign(pendingDeltaRef.current, changedFiles)
      if (deltaFlushTimerRef.current) clearTimeout(deltaFlushTimerRef.current)

      return new Promise<Record<string, string>>((resolve, reject) => {
        deltaFlushTimerRef.current = setTimeout(() => {
          deltaFlushTimerRef.current = null
          const run = async () => flushPendingDeltas()
          deltaFlushChainRef.current = deltaFlushChainRef.current.then(run, run)
          deltaFlushChainRef.current.then(resolve).catch(reject)
        }, 200)
      })
    },
    [flushPendingDeltas]
  )

  const runFullPipeline = useCallback(
    async (files: Record<string, string>) => {
      if (fullPipelineRef.current) return fullPipelineRef.current

      const pipeline = (async () => {
        if (!sandboxInitializedRef.current) {
          await initializeSandbox(files)
        } else {
          await writeFileDeltas(files, { immediate: true })
        }
        return patchProductDeltasForWebContainer(files)
      })()

      fullPipelineRef.current = pipeline
      try {
        return await pipeline
      } finally {
        fullPipelineRef.current = null
      }
    },
    [initializeSandbox, writeFileDeltas]
  )

  const mountFiles = useCallback(
    async (files: Record<string, string>) => {
      return runFullPipeline(files)
    },
    [runFullPipeline]
  )

  const runInstall = useCallback(async () => {
    appendLine('$ npm install (skipped — use runFullPipeline)')
  }, [appendLine])

  const startDevServer = useCallback(async () => {
    appendLine('$ npm run dev (skipped — use runFullPipeline)')
  }, [appendLine])

  const updateFiles = useCallback(
    async (changedFiles: Record<string, string>) => {
      return writeFileDeltas(changedFiles)
    },
    [writeFileDeltas]
  )

  const getErrorLines = useCallback(() => {
    if (sandboxErrorsRef.current.length > 0) {
      return sandboxErrorsToMessages(sandboxErrorsRef.current)
    }
    const lines = stripAnsi(terminal).split('\n').filter(Boolean)
    return lines.filter(
      (line) => /error/i.test(line) || /failed/i.test(line) || /ERR!/i.test(line)
    )
  }, [terminal])

  const buildErrors = sandboxErrors.map((e) => e.message)

  return {
    instance,
    status,
    previewUrl,
    terminal,
    error,
    sandboxErrors,
    buildErrors,
    boot,
    mountFiles,
    runInstall,
    startDevServer,
    runFullPipeline,
    updateFiles,
    writeFileDeltas,
    initializeSandbox,
    getErrorLines,
    clearBuildErrors: clearSandboxErrors,
    clearSandboxErrors,
    prepareNewProject,
  }
}
