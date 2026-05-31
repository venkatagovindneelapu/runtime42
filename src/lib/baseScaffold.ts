import type { WebContainerFiles } from '@/lib/patchWebContainerFiles'
import { SCAFFOLD_UI_FILES, SCAFFOLD_UI_PATHS, SCAFFOLD_PROVIDER_FILES, SCAFFOLD_PROVIDER_PATHS } from '@/lib/scaffoldUi'

/** Paths always forced from scaffold — never trust AI/DB to include these */
export const SCAFFOLD_INJECT_PATHS = [
  'lib/utils.ts',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'app/globals.css',
  'app/layout.tsx',
  'components/providers/AppProviders.tsx',
  ...SCAFFOLD_UI_PATHS,
] as const

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
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
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
  ...SCAFFOLD_UI_FILES,
  ...SCAFFOLD_PROVIDER_FILES,
  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  body::-webkit-scrollbar {
    display: none;
  }
}
`,
  'app/layout.tsx': `import './globals.css'
import type { Metadata } from 'next'
import { AppProviders } from '@/components/providers/AppProviders'

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
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
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

/** Merge required scaffold files so imports like @/lib/utils always resolve */
export function ensureScaffoldFiles(files: WebContainerFiles): WebContainerFiles {
  const out = { ...files }
  for (const path of SCAFFOLD_INJECT_PATHS) {
    out[path] = BASE_NEXT_SCAFFOLD[path]
  }
  if (!out['package.json']) {
    out['package.json'] = BASE_NEXT_SCAFFOLD['package.json']
  }
  return out
}

