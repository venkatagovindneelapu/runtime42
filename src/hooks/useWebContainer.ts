import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebContainer } from '@webcontainer/api'
import { logTerminal, logWebContainerStatus } from '@/lib/pipelineLog'
import {
  packageJsonDepsFingerprint,
  patchFilesForWebContainer,
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
  const installedDepsFingerprintRef = useRef<string | null>(null)
  const installCompletedRef = useRef(false)
  const eaddrInUseRef = useRef(false)
  const activeDevPortRef = useRef<number | null>(null)

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
    devServerStartedRef.current = false
    serverReadyRef.current = false
    fullPipelineRef.current = null
    installedDepsFingerprintRef.current = null
    installCompletedRef.current = false
    eaddrInUseRef.current = false
    activeDevPortRef.current = null
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
  }, [clearSandboxErrors])

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
    [appendLine, appendSandboxError, pipeProcessOutput]
  )

  const runFullPipeline = useCallback(
    async (files: Record<string, string>) => {
      if (fullPipelineRef.current) return fullPipelineRef.current

      const pipeline = runWebContainerOp(async () => {
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

        try {
          setStatus('booting')
          appendLine('')
          appendLine('[1/4] Booting WebContainer…')
          const wc = await bootWebContainerOnce()
          setInstance(wc)
          appendLine('      ✓ WebContainer booted')

          setStatus('booting')
          appendLine('')
          appendLine('[2/4] Mounting project files…')
          const patched = patchFilesForWebContainer(files)
          const fileCount = Object.keys(patched).length
          await wc.mount(buildFileSystemTree(patched))
          appendLine(`      ✓ Mounted ${fileCount} files`)

          await runNpmInstall(wc)
          const depsFp = depsFingerprintFromPatched(patched)
          if (depsFp) {
            installedDepsFingerprintRef.current = depsFp
            installCompletedRef.current = true
          }

          appendLine('')
          appendLine('[4/4] Starting dev server')
          await startDevServerWithPortFallback(wc)

          return patched
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sandbox pipeline failed'
          setStatus('error')
          setError((prev) => prev ?? message)
          appendLine('')
          appendLine(`ERROR: ${message}`)
          if (sandboxErrorsRef.current.length === 0 && /npm install failed/i.test(message)) {
            const parsed = parseNpmErrors(terminalBufferRef.current)
            if (parsed.length > 0) setParsedErrors(parsed)
          }
          throw err
        }
      })

      fullPipelineRef.current = pipeline
      try {
        return await pipeline
      } finally {
        fullPipelineRef.current = null
      }
    },
    [
      appendLine,
      appendSandboxError,
      clearSandboxErrors,
      pipeProcessOutput,
      runNpmInstall,
      setParsedErrors,
      startDevServerWithPortFallback,
    ]
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
      return runWebContainerOp(async () => {
        const webContainer = await bootWebContainerOnce()
        setInstance(webContainer)
        const patched = patchFilesForWebContainer(changedFiles)
        const paths = Object.keys(patched)

        appendLine('')
        appendLine('$ updating files…')
        for (const [path, contents] of Object.entries(patched)) {
          await webContainer.fs.writeFile(path, contents)
          appendLine(`      wrote ${path}`)
        }

        const depsFp = depsFingerprintFromPatched(patched)
        const depsTouched = paths.some(
          (p) => p === 'package.json' || p === 'package-lock.json'
        )
        const shouldInstall =
          depsTouched && depsFp !== null && depsFp !== installedDepsFingerprintRef.current

        if (shouldInstall) {
          clearSandboxErrors()
          setError(null)
          await runNpmInstall(webContainer, '[reinstall] Installing dependencies')
          installedDepsFingerprintRef.current = depsFp
          installCompletedRef.current = true
          if (!serverReadyRef.current) {
            await startDevServerWithPortFallback(webContainer)
          } else {
            appendLine(
              `      (dev server still running on port ${activeDevPortRef.current ?? DEV_PORT_START})`
            )
          }
          setStatus(serverReadyRef.current ? 'ready' : 'starting')
        } else if (depsTouched && depsFp === installedDepsFingerprintRef.current) {
          appendLine('      dependencies unchanged — skipped npm install')
        }

        return patched
      })
    },
    [
      appendLine,
      clearSandboxErrors,
      pipeProcessOutput,
      runNpmInstall,
      startDevServerWithPortFallback,
    ]
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
    getErrorLines,
    clearBuildErrors: clearSandboxErrors,
    clearSandboxErrors,
    prepareNewProject,
  }
}
