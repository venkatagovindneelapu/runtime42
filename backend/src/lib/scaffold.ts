import type { GeneratedFiles } from './agents.js'

/** Exact dependency versions verified for WebContainer + Next 14.2.29 */
export const SCAFFOLD_DEPS: Record<string, string> = {
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

const PACKAGE_JSON = JSON.stringify(
  {
    name: 'runtime42-app',
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev --port 3000',
      build: 'next build',
      start: 'next start --port 3000',
    },
    dependencies: SCAFFOLD_DEPS,
  },
  null,
  2
)

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = nextConfig
`

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  },
  null,
  2
)

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
}
`

const POSTCSS_CONFIG = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

body {
  color: hsl(var(--foreground));
  background: hsl(var(--background));
}
`

const LAYOUT_TSX = `import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'runtime42 App',
  description: 'Built with runtime42',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`

const PAGE_TSX = `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
      <p className="mt-4 text-muted-foreground text-lg">Your app is loading…</p>
    </main>
  )
}
`

const LIB_UTILS = `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`

/** Fixed scaffold — never AI-generated. Always installs clean. */
export const BASE_NEXT_SCAFFOLD: GeneratedFiles = {
  'package.json': PACKAGE_JSON,
  'next.config.js': NEXT_CONFIG,
  'tsconfig.json': TSCONFIG,
  'tailwind.config.js': TAILWIND_CONFIG,
  'postcss.config.js': POSTCSS_CONFIG,
  'lib/utils.ts': LIB_UTILS,
  'app/globals.css': GLOBALS_CSS,
  'app/layout.tsx': LAYOUT_TSX,
  'app/page.tsx': PAGE_TSX,
}

/** Paths the AI must never overwrite — scaffold owns these */
export const SCAFFOLD_LOCKED_PATHS = new Set([
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'lib/utils.ts',
])

export interface ExtraDependency {
  name: string
  version: string
  section: 'dependencies' | 'devDependencies'
}

function pinVersion(name: string, version: string): string {
  if (SCAFFOLD_DEPS[name]) return SCAFFOLD_DEPS[name]
  if (name.startsWith('@radix-ui/')) {
    const bare = version.replace(/^[\^~>=<]+/, '').trim()
    if (/^1\.0\./.test(bare) || bare === 'latest' || version === 'latest') {
      if (name.includes('slot')) return '1.2.3'
      if (name.includes('dropdown-menu') || name.includes('select')) return '2.1.15'
      return '1.1.14'
    }
    return bare
  }
  if (version === 'latest') return '1.0.0'
  return version.replace(/^[\^~]+/, '') || version
}

/** Merge extra packages into scaffold package.json */
export function buildPackageJsonWithExtras(extras: ExtraDependency[]): string {
  const pkg = JSON.parse(BASE_NEXT_SCAFFOLD['package.json']) as {
    dependencies: Record<string, string>
    devDependencies?: Record<string, string>
  }

  for (const extra of extras) {
    const pinned = pinVersion(extra.name, extra.version)
    if (extra.section === 'devDependencies') {
      pkg.devDependencies = pkg.devDependencies ?? {}
      pkg.devDependencies[extra.name] = pinned
    } else {
      pkg.dependencies[extra.name] = pinned
    }
  }

  return JSON.stringify(pkg, null, 2)
}

/** Merge scaffold + optional extra deps + AI product files */
export function mergeScaffoldWithProductFiles(
  productFiles: GeneratedFiles,
  extras: ExtraDependency[] = []
): GeneratedFiles {
  const merged: GeneratedFiles = { ...BASE_NEXT_SCAFFOLD }

  if (extras.length > 0) {
    merged['package.json'] = buildPackageJsonWithExtras(extras)
  }

  for (const [path, content] of Object.entries(productFiles)) {
    if (SCAFFOLD_LOCKED_PATHS.has(path)) continue
    if (path === 'package.json') continue
    if (path === 'package-lock.json') continue
    merged[path] = content
  }

  return merged
}

/** Apply extra packages onto an existing package.json string */
export function applyExtrasToPackageJson(
  existingPkgJson: string,
  extras: ExtraDependency[]
): string {
  if (extras.length === 0) return existingPkgJson
  try {
    const pkg = JSON.parse(existingPkgJson) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    for (const extra of extras) {
      const pinned = pinVersion(extra.name, extra.version)
      if (extra.section === 'devDependencies') {
        pkg.devDependencies = pkg.devDependencies ?? {}
        pkg.devDependencies[extra.name] = pinned
      } else {
        pkg.dependencies = pkg.dependencies ?? {}
        pkg.dependencies[extra.name] = pinned
      }
    }
    return JSON.stringify(pkg, null, 2)
  } catch {
    return buildPackageJsonWithExtras(extras)
  }
}

export function stripScaffoldPaths(files: GeneratedFiles): GeneratedFiles {
  const out: GeneratedFiles = {}
  for (const [path, content] of Object.entries(files)) {
    if (SCAFFOLD_LOCKED_PATHS.has(path)) continue
    if (path === 'package.json' || path === 'package-lock.json') continue
    out[path] = content
  }
  return out
}

const IMPORT_CONTRACT = `
IMPORT CONTRACT (use EXACT package names — wrong names break the preview):
- Slot → import { Slot } from '@radix-ui/react-slot'  (NEVER 'react-slot')
- Radix primitives → '@radix-ui/react-dialog', '@radix-ui/react-accordion', etc.
- cn() helper → import { cn } from '@/lib/utils'  (lib/utils.ts exists in scaffold — do NOT return it)
- Icons → import from 'lucide-react' only (NOT react-icons, NOT @radix-ui/react-icons)
- Navigation → 'next/link', 'next/navigation' (NOT react-router-dom)
- Class names → clsx + tailwind-merge via cn(); tailwindcss-animate is available
`.trim()

/** Dynamic scaffold contract injected into coding agent prompts */
export function buildScaffoldContract(): string {
  const deps = Object.entries(SCAFFOLD_DEPS)
    .map(([name, version]) => `- ${name}@${version}`)
    .join('\n')

  return `RUNTIME42 SCAFFOLD CONTRACT — ONLY use packages listed below. Never invent package names.

INSTALLED DEPENDENCIES:
${deps}

${IMPORT_CONTRACT}

FORBIDDEN (will not resolve in WebContainer):
- react-slot, @radix-ui/slot, radix-ui/* shorthand imports
- react-icons, @radix-ui/react-icons, styled-components, @mui/material
- sharp, bcrypt, sqlite3, or any native Node addon
- package.json, next.config.js, tsconfig.json, tailwind.config.js, postcss.config.js, lib/utils.ts, app/layout.tsx, app/globals.css

PROJECT LAYOUT:
- app/page.tsx — main page (Server Component; import client sections as children)
- components/site/<Name>.tsx — page sections (HeroSection, etc.)
- components/ui/<Name>.tsx — reusable UI primitives
- Path alias: @/* maps to project root

CLIENT COMPONENT RULE:
- Any file using framer-motion, @radix-ui/*, lucide-react, useState, useEffect, or onClick MUST start with 'use client' as line 1`
}
