import { normalizeProductFiles } from '@/lib/normalizeProductSource'

/** Mirror backend normalizeProjectArchitecture for files loaded only on the client */
function rewriteSectionsPaths(files: WebContainerFiles): WebContainerFiles {
  const out: WebContainerFiles = {}
  for (const [path, content] of Object.entries(files)) {
    let p = path.replace(/\\/g, '/').replace(/^\.\//, '')
    if (p.startsWith('components/sections/')) {
      p = p.replace(/^components\/sections\//, 'components/site/')
    }
    out[p] = content.replace(/@\/components\/sections\//g, '@/components/site/')
  }
  return out
}
import {
  WEBCONTAINER_SCAFFOLD_DEPS,
  WEBCONTAINER_SCAFFOLD_DEV_DEPS,
  normalizeRadixVersion,
  packageJsonDepsFingerprint,
} from '@/lib/webContainerScaffold'

export type WebContainerFiles = Record<string, string>

export { packageJsonDepsFingerprint }

export function parseNextMajor(version: string): number {
  const cleaned = version.replace(/^[\^~>=<]+/, '').trim()
  const major = parseInt(cleaned.split('.')[0] ?? '', 10)
  return Number.isFinite(major) ? major : 14
}

export function getWebContainerDevScript(nextVersion: string): string {
  const major = parseNextMajor(nextVersion)
  if (major >= 15) {
    return 'next dev --webpack --port 3000'
  }
  return 'next dev --port 3000'
}

function getNextVersionFromPkg(pkg: Record<string, unknown>): string {
  for (const section of ['dependencies', 'devDependencies'] as const) {
    const deps = pkg[section] as Record<string, string> | undefined
    if (deps?.next) return deps.next
  }
  return WEBCONTAINER_SCAFFOLD_DEPS.next
}

function pinPackageEntry(name: string, version: string): string {
  if (WEBCONTAINER_SCAFFOLD_DEPS[name]) return WEBCONTAINER_SCAFFOLD_DEPS[name]
  if (WEBCONTAINER_SCAFFOLD_DEV_DEPS[name]) return WEBCONTAINER_SCAFFOLD_DEV_DEPS[name]
  if (name.startsWith('@radix-ui/')) return normalizeRadixVersion(name, version)
  if (name === 'next') return WEBCONTAINER_SCAFFOLD_DEPS.next
  if (name === 'class-variance-authority' && /^[\^~]?1\./.test(version)) {
    return '0.7.1'
  }
  if (version === 'latest') {
    return WEBCONTAINER_SCAFFOLD_DEPS[name] ?? normalizeRadixVersion(name, '1.1.14')
  }
  return version.replace(/^[\^~]+/, '') || version
}

function applyScaffoldDependencies(pkg: Record<string, unknown>): boolean {
  let changed = false

  for (const section of ['dependencies', 'devDependencies'] as const) {
    const bucket = { ...((pkg[section] as Record<string, string>) ?? {}) }
    for (const [name, version] of Object.entries(bucket)) {
      const pinned = pinPackageEntry(name, version)
      if (version !== pinned) {
        bucket[name] = pinned
        changed = true
      }
    }
    for (const [name, ver] of Object.entries(
      section === 'dependencies' ? WEBCONTAINER_SCAFFOLD_DEPS : WEBCONTAINER_SCAFFOLD_DEV_DEPS
    )) {
      if (!bucket[name]) {
        bucket[name] = ver
        changed = true
      }
    }
    if (Object.keys(bucket).length > 0) {
      pkg[section] = bucket
    }
  }

  return changed
}

function fixDevScript(pkg: Record<string, unknown>): boolean {
  const scripts = (pkg.scripts as Record<string, string>) ?? {}
  const nextVer = getNextVersionFromPkg(pkg)
  const dev = getWebContainerDevScript(nextVer)
  const target = {
    ...scripts,
    dev,
    build: 'next build',
    start: 'next start --port 3000',
  }
  const changed =
    scripts.dev !== target.dev ||
    scripts.build !== target.build ||
    scripts.start !== target.start
  if (changed) {
    pkg.scripts = target
  }
  return changed
}

export function patchFilesForWebContainer(files: WebContainerFiles): WebContainerFiles {
  const patched: WebContainerFiles = normalizeProductFiles(
    rewriteSectionsPaths({ ...files })
  )
  let depsChanged = false

  if (patched['package.json']) {
    try {
      const pkg = JSON.parse(patched['package.json']) as Record<string, unknown>
      depsChanged =
        applyScaffoldDependencies(pkg) || fixDevScript(pkg)
      patched['package.json'] = JSON.stringify(pkg, null, 2)
      console.log('[runtime42] Patched package.json for WebContainer')
    } catch (e) {
      console.warn('[runtime42] Could not patch package.json:', e)
    }
  }

  if (depsChanged) {
    delete patched['package-lock.json']
    console.log('[runtime42] Removed package-lock.json for clean npm resolve')
  }

  if (patched['next.config.js'] && /turbo|turbopack|export\s+default/i.test(patched['next.config.js'])) {
    patched['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = nextConfig
`
    console.log('[runtime42] Reset next.config.js for WebContainer')
  }

  return patched
}

export function depsChangedInFiles(
  before: WebContainerFiles | null,
  after: WebContainerFiles
): boolean {
  const paths = ['package.json', 'package-lock.json'] as const
  for (const p of paths) {
    if (p in after && after[p] !== before?.[p]) return true
  }
  return false
}
