/**
 * Exact dependency versions verified for WebContainer + Next 14.2.29 + shadcn/ui.
 * AI must use these — never @radix-ui/*@1.0.x or class-variance-authority@^1.0.0.
 */
export const WEBCONTAINER_SCAFFOLD_DEPS: Record<string, string> = {
  next: '14.2.29',
  react: '18.3.1',
  'react-dom': '18.3.1',
  typescript: '5.3.3',
  '@types/react': '18.3.1',
  '@types/node': '20.11.5',
  tailwindcss: '3.4.1',
  autoprefixer: '10.4.17',
  postcss: '8.4.33',
  'class-variance-authority': '0.7.1',
  clsx: '2.1.1',
  'tailwind-merge': '2.6.0',
  'tailwindcss-animate': '1.0.7',
  'lucide-react': '0.462.0',
  '@radix-ui/react-slot': '1.2.3',
  '@radix-ui/react-dialog': '1.1.14',
  '@radix-ui/react-dropdown-menu': '2.1.15',
  '@radix-ui/react-label': '2.1.7',
  '@radix-ui/react-separator': '1.1.7',
  '@radix-ui/react-tabs': '1.1.12',
  '@radix-ui/react-toast': '1.2.14',
  '@radix-ui/react-tooltip': '1.2.7',
  '@radix-ui/react-accordion': '1.2.11',
  '@radix-ui/react-checkbox': '1.3.2',
  '@radix-ui/react-select': '2.2.5',
  '@radix-ui/react-popover': '1.1.14',
  '@radix-ui/react-avatar': '1.1.10',
  '@radix-ui/react-switch': '1.2.5',
  '@radix-ui/react-scroll-area': '1.2.9',
  'framer-motion': '11.11.17',
}

export const WEBCONTAINER_SCAFFOLD_DEV_DEPS: Record<string, string> = {}

/** One-line hint for agents / chat suggestions */
export const SCAFFOLD_VERSION_HINT =
  'Use Next 14.2.29, exact shadcn deps (class-variance-authority@0.7.1, @radix-ui/react-slot@1.2.3, etc.) — see WEBCONTAINER_SCAFFOLD_DEPS.'

export function normalizeRadixVersion(packageName: string, version: string): string {
  if (WEBCONTAINER_SCAFFOLD_DEPS[packageName]) {
    return WEBCONTAINER_SCAFFOLD_DEPS[packageName]
  }
  if (!packageName.startsWith('@radix-ui/')) return version

  const bare = version.replace(/^[\^~>=<]+/, '').trim()
  if (/^1\.0\./.test(bare) || bare === 'latest' || version === 'latest') {
    if (packageName.includes('slot')) return '1.2.3'
    if (packageName.includes('dropdown-menu') || packageName.includes('select')) return '2.1.15'
    return '1.1.14'
  }
  if (/^[\^~]/.test(version)) return bare
  return version
}

export function packageJsonDepsFingerprint(pkgJson: string): string {
  try {
    const pkg = JSON.parse(pkgJson) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const merged = { ...pkg.dependencies, ...pkg.devDependencies }
    const keys = Object.keys(merged).sort()
    return keys.map((k) => `${k}@${merged[k]}`).join('|')
  } catch {
    return pkgJson
  }
}
