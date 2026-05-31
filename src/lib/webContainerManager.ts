import { WebContainer, type FileSystemTree } from '@webcontainer/api'
import { patchFilesForWebContainer, type WebContainerFiles } from '@/lib/patchWebContainerFiles'

const WC_WINDOW_KEY = '__RUNTIME42_WEBCONTAINER__'
const WC_BOOT_KEY = '__RUNTIME42_BOOT_PROMISE__'

type Runtime42Window = Window & {
  [WC_WINDOW_KEY]?: WebContainer
  [WC_BOOT_KEY]?: Promise<WebContainer>
}

function getRuntimeWindow(): Runtime42Window | undefined {
  return typeof window !== 'undefined' ? (window as Runtime42Window) : undefined
}

function syncFromWindow() {
  const w = getRuntimeWindow()
  if (w?.[WC_WINDOW_KEY]) {
    globalInstance = w[WC_WINDOW_KEY]
  }
}

let globalInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null
let globalListenersAttached = false
let serverReadyMultiplexerAttached = false
const serverReadyHandlers = new Set<(port: number, url: string) => void>()
let operationQueue: Promise<unknown> = Promise.resolve()

function ensureServerReadyMultiplexer(instance: WebContainer) {
  if (serverReadyMultiplexerAttached) return
  serverReadyMultiplexerAttached = true
  instance.on('server-ready', (port, url) => {
    serverReadyHandlers.forEach((handler) => handler(port, url))
  })
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = operationQueue.then(fn, fn)
  operationQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

function setNestedFile(tree: FileSystemTree, parts: string[], contents: string) {
  const [head, ...rest] = parts
  if (!head) return

  if (rest.length === 0) {
    tree[head] = { file: { contents } }
    return
  }

  const existing = tree[head]
  if (existing && 'directory' in existing) {
    setNestedFile(existing.directory, rest, contents)
    return
  }

  const dir: FileSystemTree = {}
  tree[head] = { directory: dir }
  setNestedFile(dir, rest, contents)
}

function toFileSystemTree(files: WebContainerFiles): FileSystemTree {
  const fsTree: FileSystemTree = {}

  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue
    setNestedFile(fsTree, parts, contents)
  }

  return fsTree
}

function attachGlobalListeners(instance: WebContainer) {
  if (globalListenersAttached) return
  globalListenersAttached = true

  instance.on('error', (event) => {
    const message =
      typeof event === 'object' && event && 'message' in event
        ? String((event as { message: string }).message)
        : String(event)
    console.error('[runtime42] WebContainer error:', message)
  })

  instance.on('preview-message', (message) => {
    console.error('[runtime42] Preview error:', message)
  })
}

function isAlreadyBootedError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  return /single WebContainer|already booted|Proxy has been released/i.test(msg)
}

export async function bootWebContainerOnce(): Promise<WebContainer> {
  syncFromWindow()
  if (globalInstance) return globalInstance

  const w = getRuntimeWindow()
  if (w?.[WC_WINDOW_KEY]) {
    globalInstance = w[WC_WINDOW_KEY]
    return globalInstance
  }

  if (bootPromise) return bootPromise
  if (w?.[WC_BOOT_KEY]) {
    bootPromise = w[WC_BOOT_KEY]
    return bootPromise
  }

  bootPromise = WebContainer.boot({ forwardPreviewErrors: true })
    .then((instance) => {
      globalInstance = instance
      attachGlobalListeners(instance)
      ensureServerReadyMultiplexer(instance)
      if (w) {
        w[WC_WINDOW_KEY] = instance
        delete w[WC_BOOT_KEY]
      }
      return instance
    })
    .catch((err) => {
      syncFromWindow()
      if (globalInstance) return globalInstance

      if (isAlreadyBootedError(err)) {
        const recovered = w?.[WC_WINDOW_KEY]
        if (recovered) {
          globalInstance = recovered
          attachGlobalListeners(recovered)
          return recovered
        }
        throw new Error(
          'WebContainer is already running. Refresh the page to reset the sandbox.'
        )
      }

      bootPromise = null
      if (w) delete w[WC_BOOT_KEY]
      throw err
    })

  if (w) w[WC_BOOT_KEY] = bootPromise

  return bootPromise
}

export function getWebContainerInstance() {
  syncFromWindow()
  return globalInstance
}

export function runWebContainerOp<T>(fn: () => Promise<T>): Promise<T> {
  return enqueue(fn)
}

export function buildFileSystemTree(files: WebContainerFiles): FileSystemTree {
  return toFileSystemTree(files)
}

export async function mountProjectFiles(files: WebContainerFiles): Promise<WebContainerFiles> {
  return runWebContainerOp(async () => {
    const patched = patchFilesForWebContainer(files)
    const instance = await bootWebContainerOnce()
    await instance.mount(toFileSystemTree(patched))
    return patched
  })
}

export function attachServerReady(handler: (port: number, url: string) => void) {
  serverReadyHandlers.add(handler)
  const instance = globalInstance ?? getRuntimeWindow()?.[WC_WINDOW_KEY]
  if (instance) ensureServerReadyMultiplexer(instance)
}

export function resetProjectRuntimeState() {
  // Reuse the single global WebContainer instance. Keep server-ready handlers
  // attached so the active editor can receive the preview URL after a reset.
}
