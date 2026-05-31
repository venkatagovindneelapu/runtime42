import { callOpenAI } from './openai.js'
import { normalizeProjectArchitecture } from './projectStructure.js'

export type GeneratedFiles = Record<string, string>

export interface ChunkedIntent {
  appName: string
  appType: string
  targetAudience: string
  corePurpose: string
  sections: string[]
  designStyle: {
    theme: string
    mood: string
    colorPalette: Record<string, string>
    typography: string
    visualStyle: string
  }
  features: string[]
  components: string[]
  animations: string
  hasAuth: boolean
  hasDashboard: boolean
  hasPricing: boolean
  dependencies: {
    ui: string[]
    data: string[]
    other: string[]
  }
  brandPersonality: string
  contentTone: string
  keyMessages: string[]
  userMentionedColors: string[]
  userMentionedFonts: string[]
  specialRequirements: string[]
}

export interface CodingPlan {
  projectStructure: {
    files: Array<{
      path: string
      purpose: string
      components: string[]
      complexity: string
      dependencies: string[]
    }>
  }
  componentPlan: Array<{
    name: string
    file: string
    props: string[]
    styling: string
    animations: string
  }>
  colorSystem: {
    css_variables: Record<string, string>
    tailwind_extend: Record<string, unknown>
  }
  fontPlan: {
    heading: string
    body: string
    google_fonts_url: string
  }
  dependencyList: {
    npm_packages: string[]
    shadcn_components: string[]
  }
  codingInstructions: string[]
  avoidList: string[]
  estimatedFiles: number
}

export interface GenerationSummary {
  headline: string
  whatWasBuilt: string
  filesSummary: Array<{ file: string; description: string }>
  highlights: string[]
  nextSuggestions: string[]
}

const NANO_MODEL = 'gpt-5.4-nano-2026-03-17'
const CODEX_MODEL = 'gpt-5.1-codex-mini'

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```json\n?/, '')
    .replace(/^```\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = stripCodeFences(raw)
  const parsed = JSON.parse(cleaned)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OpenAI returned invalid JSON')
  }
  return parsed as T
}

const CHUNKER_SYSTEM = `You are an expert product analyst. Extract structured intent from the user's app request.

Return ONLY valid JSON matching this structure:
{
  "appName": "string",
  "appType": "landing-page | saas-app | portfolio | ecommerce | blog | dashboard | other",
  "targetAudience": "string",
  "corePurpose": "string",
  "sections": ["hero", "features", ...],
  "designStyle": {
    "theme": "dark | light | auto",
    "mood": "professional | playful | minimal | bold | elegant | technical",
    "colorPalette": { "primary": "", "secondary": "", "accent": "", "background": "" },
    "typography": "modern-sans | classic-serif | geometric | humanist",
    "visualStyle": "glassmorphism | flat | gradient | brutalist | minimal | rich"
  },
  "features": [],
  "components": [],
  "animations": "none | subtle | moderate | rich",
  "hasAuth": false,
  "hasDashboard": false,
  "hasPricing": false,
  "dependencies": { "ui": [], "data": [], "other": [] },
  "brandPersonality": "string",
  "contentTone": "formal | casual | technical | inspirational | friendly",
  "keyMessages": [],
  "userMentionedColors": [],
  "userMentionedFonts": [],
  "specialRequirements": []
}

Extract every design detail the user mentions. No markdown.`

const PLANNER_SYSTEM = `You are a senior Next.js architect. Create a detailed technical plan from the structured intent JSON.

FIXED PROJECT ARCHITECTURE (never use components/sections/ or other folders):
- Landing sections: components/site/<PascalName>.tsx (e.g. components/site/HeroSection.tsx)
- Shared UI: components/ui/<PascalName>.tsx
- app/page.tsx composes imports from @/components/site/<Name> only
- Every component imported in app/page.tsx MUST appear in projectStructure.files with that exact path

Return ONLY valid JSON:
{
  "projectStructure": { "files": [{ "path": "", "purpose": "", "components": [], "complexity": "high|medium|low", "dependencies": [] }] },
  "componentPlan": [{ "name": "", "file": "", "props": [], "styling": "", "animations": "" }],
  "colorSystem": { "css_variables": {}, "tailwind_extend": {} },
  "fontPlan": { "heading": "", "body": "", "google_fonts_url": "" },
  "dependencyList": { "npm_packages": [], "shadcn_components": [] },
  "codingInstructions": [],
  "avoidList": [
    "Never use turbopack in any next.config.js settings",
    "Never add experimental.turbo to next.config.js"
  ],
  "estimatedFiles": 0
}

Always include the turbopack avoidList entries above in avoidList (merge with any other items). No markdown.`

const CODING_SYSTEM = `You are an expert Next.js developer. Generate production-ready Next.js 14 App Router code with TypeScript and Tailwind CSS.

Follow the coding plan EXACTLY. Use only listed dependencies. Follow codingInstructions. Avoid everything in avoidList.

Required project layout (use these exact path keys as flat strings):
- package.json
- next.config.js
- tsconfig.json
- tailwind.config.js
- postcss.config.js
- app/layout.tsx
- app/page.tsx
- app/globals.css
- components/site/<SectionName>.tsx for page sections (HeroSection, FeatureCards, etc.)
- components/ui/<Name>.tsx for reusable UI primitives only
- lib/ as needed under lib/*.ts

ARCHITECTURE CONSISTENCY (critical on edits):
- NEVER switch folder layout between runs (no components/sections/, no src/components/)
- If existingFiles use components/site/, keep using components/site/ with the SAME file names
- app/page.tsx may ONLY import paths that exist in your JSON output or in existingFiles
- If you add a section, create the .tsx file AND import it in app/page.tsx in the same response
- If you rename a component file, update every import in app/page.tsx to match

WEBCONTAINERS COMPATIBILITY RULES — NON-NEGOTIABLE:

PACKAGE.JSON RULES:
- scripts.dev MUST be: next dev --port 3000 (Next 14.2.29 — do NOT use --webpack; that flag does not exist on Next 14)
- scripts.build MUST be: next build
- scripts.start MUST be: next start --port 3000
- next version MUST be exactly: 14.2.29 (not latest)
- react version MUST be exactly: 18.3.1 (not latest)
- react-dom version MUST be exactly: 18.3.1 (not latest)
- typescript MUST be exactly: 5.3.3
- @types/react MUST be exactly: 18.3.1
- @types/node MUST be exactly: 20.11.5
- tailwindcss MUST be exactly: 3.4.1
- autoprefixer MUST be exactly: 10.4.17
- postcss MUST be exactly: 8.4.33
- Do NOT use latest for any package version
- Do NOT include native Node.js addons or packages requiring native binaries
- Do NOT use packages requiring filesystem access outside the project (e.g. sharp)
- Do NOT generate package-lock.json — the preview sandbox runs npm install without a lockfile

NEXT.CONFIG.JS RULES:
- MUST use CommonJS module.exports syntax (NOT export default, NOT .mjs)
- MUST NOT enable turbopack or experimental.turbo
- MUST NOT use images.domains requiring external fetch at build time
- Keep minimal:
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true }
module.exports = nextConfig

TYPESCRIPT RULES (tsconfig.json):
- compilerOptions: target ES2017, lib [dom, dom.iterable, esnext], allowJs true, skipLibCheck true, strict false, forceConsistentCasingInFileNames true, noEmit true, esModuleInterop true, module esnext, moduleResolution bundler, resolveJsonModule true, isolatedModules true, jsx preserve, incremental true, plugins [{ name: next }], paths { "@/*": ["./*"] }
- include: next-env.d.ts, **/*.ts, **/*.tsx, .next/types/**/*.ts
- exclude: node_modules

TAILWIND RULES (tailwind.config.js):
- CommonJS module.exports only
- content MUST include: ./app/**/*.{js,ts,jsx,tsx,mdx}, ./components/**/*.{js,ts,jsx,tsx,mdx}, ./pages/**/*.{js,ts,jsx,tsx,mdx}

POSTCSS RULES (postcss.config.js):
- CommonJS module.exports with tailwindcss and autoprefixer plugins

APP DIRECTORY RULES:
- app/layout.tsx with html and body tags, imports ./globals.css (Server Component — no hooks, no framer-motion)
- app/page.tsx as main page (Server OK — import client sections as children)
- app/globals.css with @tailwind base; @tailwind components; @tailwind utilities;
- ANY file importing framer-motion, @radix-ui/*, or using useState/useEffect/onClick MUST start with 'use client' as line 1
- components/site/*.tsx with motion or interactivity MUST be Client Components ('use client')
- Do NOT use components/sections/ — use components/site/ only
- Server components MUST NOT import framer-motion or @radix-ui/*

IMAGE RULES:
- Do NOT use next/image for external URLs unless domains configured in next.config.js
- Use <img src="https://picsum.photos/W/H" /> or CSS placeholders for external images

IMPORT RULES:
- No node:* imports in client components
- No fs, path, os in client code; server logic in app/api/ routes only
- lucide-react and shadcn-style components OK if dependencies listed

SHADCN/UI RULES (EXACT versions — WebContainer scaffold):
- next@14.2.29, react@18.3.1, react-dom@18.3.1, typescript@5.3.3
- class-variance-authority@0.7.1, clsx@2.1.1, tailwind-merge@2.6.0, tailwindcss-animate@1.0.7, lucide-react@0.462.0
- @radix-ui/react-slot@1.2.3 (NEVER 1.0.x), @radix-ui/react-dialog@1.1.14, @radix-ui/react-dropdown-menu@2.1.15
- @radix-ui/react-label@2.1.7, @radix-ui/react-separator@1.1.7, @radix-ui/react-tabs@1.1.12, @radix-ui/react-toast@1.2.14
- @radix-ui/react-tooltip@1.2.7, @radix-ui/react-accordion@1.2.11, @radix-ui/react-checkbox@1.3.2, @radix-ui/react-select@2.2.5
- @radix-ui/react-popover@1.1.14, @radix-ui/react-avatar@1.1.10, @radix-ui/react-switch@1.2.5, @radix-ui/react-scroll-area@1.2.9
- Do NOT use ^ or latest; use exact versions above. Do NOT include package-lock.json (sandbox generates it).
- Copy component source into components/ui/ — do NOT reference shadcn CLI

FRAMER-MOTION (WebContainer):
- framer-motion@11.11.17 only in Client Components ('use client' first line)
- Never import motion from framer-motion in app/page.tsx unless page.tsx has 'use client'
- Prefer splitting: server page imports <HeroSection /> where HeroSection.tsx has 'use client'

COMMON ERROR PREVENTION:
- async server components must be async
- client hooks need 'use client'
- No process.env in client components; use NEXT_PUBLIC_ for client env
- No dynamic import with ssr:false in app dir — use 'use client'
- ALL .js config files use module.exports only

FONT RULES:
- Use next/font in layout.tsx OR system-ui only — no @import Google Fonts in CSS

OUTPUT PATH RULES:
- Use forward slashes only (app/page.tsx not app\\page.tsx)
- No CDN script imports; all deps in package.json only

Output format:
- Return ONLY a single JSON object
- Keys = file paths relative to project root (strings)
- Values = complete file source code (strings only, never nested objects)
- Do NOT wrap in { "files": { ... } }
- If existingFiles provided, return ONLY changed files
- Real content only, no Lorem Ipsum

No markdown. No explanation.`

const FIXER_SYSTEM = `You are a senior debugging engineer. Fix specific errors in a Next.js app.

Return ONLY a JSON object of files that need to change. Do not return unchanged files. No markdown.

MODULE NOT FOUND / import path errors:
- Align app/page.tsx imports with actual files under components/site/ (never components/sections/)
- Create missing section files or remove broken imports and JSX in the same fix

RSC / createContext ERRORS:
- Add 'use client' to the component file (e.g. components/site/HeroSection.tsx), not only app/page.tsx
- Or remove framer-motion from that file and use CSS animations

DEV SCRIPT ERRORS (unknown option '--webpack'):
- Next 14.x does not support --webpack; use "next dev --port 3000" only
- Pin next to 14.2.29 and fix package.json scripts.dev

DEPENDENCY ERRORS (ETARGET, EIO, notarget, ERESOLVE):
- Fix ONLY package.json with exact scaffold versions (Next 14.2.29, @radix-ui/react-slot@1.2.3, class-variance-authority@0.7.1, etc.)
- Remove package-lock.json from output if present
- Never use @radix-ui/*@1.0.x — bump to scaffold versions
- Do NOT regenerate the whole app for a single bad dependency version

OTHER ERRORS:
- Change only files required to fix the error
- Keep existing design and unrelated files untouched`

const SUMMARIZER_SYSTEM = `You summarize what was built for a friendly chat UI.

Return ONLY valid JSON:
{
  "headline": "short one-line summary",
  "whatWasBuilt": "2-3 sentences",
  "filesSummary": [{ "file": "path", "description": "..." }],
  "highlights": [],
  "nextSuggestions": ["short actionable follow-up question without Try prefix", ...]
}

No markdown.`

export async function runInputChunker(prompt: string): Promise<ChunkedIntent> {
  const raw = await callOpenAI(NANO_MODEL, CHUNKER_SYSTEM, prompt)
  return parseJsonResponse<ChunkedIntent>(raw)
}

export async function runPlanner(intent: ChunkedIntent): Promise<CodingPlan> {
  const raw = await callOpenAI(
    NANO_MODEL,
    PLANNER_SYSTEM,
    JSON.stringify(intent, null, 2)
  )
  return parseJsonResponse<CodingPlan>(raw)
}

export function normalizeGeneratedFiles(raw: unknown): GeneratedFiles {
  let source = raw

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const obj = source as Record<string, unknown>
    if (obj.files && typeof obj.files === 'object' && !Array.isArray(obj.files)) {
      source = obj.files
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Coding agent returned invalid files format: expected object')
  }

  const result: GeneratedFiles = {}

  for (const [path, value] of Object.entries(source as Record<string, unknown>)) {
    if (!path || typeof path !== 'string') continue
    const normalizedPath = path.replace(/\\/g, '/').replace(/^\.\//, '')

    let contents: string
    if (typeof value === 'string') {
      contents = value
    } else if (value === null || value === undefined) {
      continue
    } else if (typeof value === 'object') {
      contents = JSON.stringify(value, null, 2)
    } else {
      contents = String(value)
    }

    result[normalizedPath] = contents
  }

  if (Object.keys(result).length === 0) {
    throw new Error('Coding agent returned invalid files format: no file paths')
  }

  const sample = Object.keys(result).slice(0, 5)
  console.log(
    `[runtime42][parse] normalized ${Object.keys(result).length} files; sample: ${sample.join(', ')}`
  )

  return normalizeProjectArchitecture(result)
}

function parseFilesObject(raw: string): GeneratedFiles {
  const parsed = parseJsonResponse<unknown>(raw)
  return normalizeGeneratedFiles(parsed)
}

export async function runCodingAgent(
  intent: ChunkedIntent,
  plan: CodingPlan,
  existingFiles: GeneratedFiles | null,
  originalPrompt: string
): Promise<GeneratedFiles> {
  const userContent = JSON.stringify({
    originalPrompt,
    chunkedIntent: intent,
    codingPlan: plan,
    existingFiles,
  })

  const raw = await callOpenAI(CODEX_MODEL, CODING_SYSTEM, userContent, 0.4)
  return parseFilesObject(raw)
}

export async function runErrorFixer(
  errorMessages: string[],
  currentFiles: GeneratedFiles,
  plan: CodingPlan
): Promise<GeneratedFiles> {
  const userContent = JSON.stringify({
    errors: errorMessages,
    currentFiles,
    plan,
  })
  const raw = await callOpenAI(CODEX_MODEL, FIXER_SYSTEM, userContent, 0.2)
  return parseFilesObject(raw)
}

export async function runSummarizer(
  originalPrompt: string,
  intent: ChunkedIntent,
  filesList: string[],
  plan: CodingPlan
): Promise<GenerationSummary> {
  const userContent = JSON.stringify({
    originalPrompt,
    intent,
    filesList,
    planSummary: plan,
  })
  const raw = await callOpenAI(NANO_MODEL, SUMMARIZER_SYSTEM, userContent)
  return parseJsonResponse<GenerationSummary>(raw)
}
