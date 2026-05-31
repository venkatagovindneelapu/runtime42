import type { GeneratedFiles } from './projectStructure.js'
import { SITE_COMPONENTS_DIR } from './projectStructure.js'
import { SCAFFOLD_UI_PATHS } from './scaffoldUi.js'

type PlanLike = {
  projectStructure: { files: Array<{ path: string; purpose?: string; components?: string[]; complexity?: string; dependencies?: string[] }> }
  componentPlan?: Array<{ name?: string; file: string; props?: string[]; styling?: string; animations?: string }>
}

const PAGE_PATH = 'app/page.tsx'

/** Standard site section file names the planner may choose from */
export const SITE_SECTION_SLOTS = [
  'HeroSection',
  'FeaturesSection',
  'HowItWorksSection',
  'TestimonialsSection',
  'PricingSection',
  'FAQSection',
  'CTASection',
  'FooterSection',
  'NavigationBar',
  'StatsSection',
  'LogosSection',
  'ComparisonSection',
] as const

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function isAllowedSitePath(path: string): boolean {
  const p = normalizePath(path)
  if (!p.startsWith(`${SITE_COMPONENTS_DIR}/`)) return false
  if (!/\.(tsx|jsx)$/.test(p)) return false
  const name = p.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') ?? ''
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

/** Paths the coding agent is allowed to return */
export function getAllowedProductPaths(
  plan: PlanLike,
  existingFiles?: GeneratedFiles | null
): Set<string> {
  const allowed = new Set<string>([PAGE_PATH])

  for (const entry of plan.projectStructure?.files ?? []) {
    const path = normalizePath(entry.path)
    if (path === PAGE_PATH || isAllowedSitePath(path)) {
      allowed.add(path)
    }
  }

  if (existingFiles) {
    for (const path of Object.keys(existingFiles)) {
      const p = normalizePath(path)
      if (p === PAGE_PATH || isAllowedSitePath(p)) {
        allowed.add(p)
      }
    }
  }

  return allowed
}

/** Drop any AI output outside the fixed product tree */
export function filterToAllowedProductFiles(
  files: GeneratedFiles,
  allowed: Set<string>
): GeneratedFiles {
  const out: GeneratedFiles = {}
  const dropped: string[] = []

  for (const [rawPath, content] of Object.entries(files)) {
    const path = normalizePath(rawPath)

    if (SCAFFOLD_UI_PATHS.has(path)) {
      dropped.push(path)
      continue
    }
    if (path.startsWith('components/ui/')) {
      dropped.push(path)
      continue
    }
    if (path.startsWith('components/providers/')) {
      dropped.push(path)
      continue
    }
    if (path.startsWith('lib/')) {
      dropped.push(path)
      continue
    }
    if (!allowed.has(path)) {
      dropped.push(path)
      continue
    }

    out[path] = content
  }

  if (dropped.length > 0) {
    console.log(
      `[runtime42][fileTree] dropped ${dropped.length} paths outside allowlist: ${dropped.slice(0, 8).join(', ')}${dropped.length > 8 ? '…' : ''}`
    )
  }

  return out
}

export function buildAllowedTreePrompt(plan: PlanLike, allowed: Set<string>): string {
  const paths = [...allowed].sort()
  const site = paths.filter((p) => p.startsWith(`${SITE_COMPONENTS_DIR}/`))
  const uiList = [...SCAFFOLD_UI_PATHS].sort().join(', ')

  return `FIXED FILE TREE (strict — you may ONLY return these paths):

ALREADY IN SCAFFOLD (do NOT return — import only):
- ${uiList}
- lib/utils.ts (import { cn } from '@/lib/utils')
- app/layout.tsx, app/globals.css, all config files

YOU MAY WRITE (only these product paths):
- ${PAGE_PATH} — compose sections; Server Component; import site sections only
${site.map((p) => `- ${p} — landing section component`).join('\n')}

FORBIDDEN paths (will be discarded):
- components/ui/* (use scaffold imports: @/components/ui/Button, Badge, Card, Input, SectionHeading, Accordion)
- lib/*, src/*, components/sections/*, pages/*, any config/package files

SECTION FILE FORMAT (every components/site/*.tsx):
\`\`\`tsx
'use client'; // required if using motion, hooks, Radix, or lucide-react
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
// ... other scaffold UI imports only

export function SectionName() {
  return ( ... JSX with Tailwind ... );
}
\`\`\`

PAGE FORMAT (app/page.tsx):
\`\`\`tsx
import { HeroSection } from '@/components/site/HeroSection';
// ... one import per site section from allowlist

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />
      {/* ... */}
    </main>
  );
}
\`\`\`

Plan sections: ${site.map((p) => p.split('/').pop()).join(', ') || 'see allowlist'}`
}

/** Remove UI paths from planner output — UI is scaffold-owned */
export function sanitizePlanFilePaths<T extends PlanLike>(plan: T): T {
  const files = (plan.projectStructure?.files ?? []).filter((f) => {
    const p = normalizePath(f.path)
    if (p.startsWith('components/ui/')) return false
    if (p.startsWith('lib/')) return false
    return p === PAGE_PATH || isAllowedSitePath(p)
  })

  if (!files.some((f) => normalizePath(f.path) === PAGE_PATH)) {
    files.unshift({
      path: PAGE_PATH,
      purpose: 'Main page composing site sections',
      components: [],
      complexity: 'low',
      dependencies: [],
    })
  }

  return {
    ...plan,
    projectStructure: { files },
    componentPlan: (plan.componentPlan ?? []).filter((c) => {
      const p = normalizePath(c.file)
      return p === PAGE_PATH || isAllowedSitePath(p)
    }),
  } as T
}
