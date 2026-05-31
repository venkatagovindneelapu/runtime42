import type { WebContainerFiles } from '@/lib/patchWebContainerFiles'

/** Mirror of backend BASE_NEXT_SCAFFOLD for early sandbox boot */
export const BASE_NEXT_SCAFFOLD: WebContainerFiles = {
  'package.json': JSON.stringify(
    {
      name: 'runtime42-app',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev --port 3000',
        build: 'next build',
        start: 'next start --port 3000',
      },
      dependencies: {
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
      },
    },
    null,
    2
  ),
  'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = nextConfig
`,
  'tsconfig.json': JSON.stringify(
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
  ),
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [require('tailwindcss-animate')],
}
`,
  'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
  'lib/utils.ts': `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`,
  'app/globals.css': `@tailwind base;
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
`,
  'app/layout.tsx': `import './globals.css'
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
`,
  'app/page.tsx': `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
      <p className="mt-4 text-lg text-muted-foreground">Your app is loading…</p>
    </main>
  )
}
`,
}
