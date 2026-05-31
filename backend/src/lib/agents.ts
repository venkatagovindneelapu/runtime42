import { callOpenAI } from './openai.js'
import { normalizeProjectArchitecture } from './projectStructure.js'
import { normalizeProductCode } from './normalizeProductCode.js'
import {
  mergeScaffoldWithProductFiles,
  stripScaffoldPaths,
  buildScaffoldContract,
  type ExtraDependency,
} from './scaffold.js'

export type GeneratedFiles = Record<string, string>
export type { ExtraDependency }
export { mergeScaffoldWithProductFiles, stripScaffoldPaths }

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

const SCAFFOLD_CONTRACT = buildScaffoldContract()

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

${SCAFFOLD_CONTRACT}

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

const DEPENDENCY_PLANNER_SYSTEM = `You decide if the user's app request needs npm packages beyond the fixed base template.

${SCAFFOLD_CONTRACT}

Return ONLY valid JSON:
{
  "extraPackages": [
    { "name": "package-name", "version": "exact-version", "section": "dependencies" }
  ]
}

Rules:
- Return empty extraPackages [] if base template is sufficient (most landing pages need nothing extra)
- Only add packages truly required by the user request (e.g. recharts for charts, date-fns for dates)
- Use exact versions, never "latest"
- Never re-add packages already in INSTALLED DEPENDENCIES above
- section is "dependencies" or "devDependencies"
No markdown.`

const CODING_SYSTEM = `You are an expert Next.js developer. Generate production-ready Next.js 14 App Router code with TypeScript and Tailwind CSS.

${SCAFFOLD_CONTRACT}

IMPORTANT: A fixed scaffold already exists (package.json, configs, app/layout.tsx, app/globals.css, lib/utils.ts).
DO NOT return scaffold files. Return ONLY product/application files you create or change.

Follow the coding plan EXACTLY. Use only packages from INSTALLED DEPENDENCIES. Follow codingInstructions. Avoid everything in avoidList.

Required project layout (use these exact path keys as flat strings):
- app/page.tsx (main page — you SHOULD return this)
- components/site/<SectionName>.tsx for page sections (HeroSection, FeatureCards, etc.)
- components/ui/<Name>.tsx for reusable UI primitives only
- lib/ as needed under lib/*.ts (never lib/utils.ts — scaffold owns it)

NEVER return: package.json, next.config.js, tsconfig.json, tailwind.config.js, postcss.config.js, lib/utils.ts, app/layout.tsx, app/globals.css, package-lock.json

ARCHITECTURE CONSISTENCY (critical on edits):
- NEVER switch folder layout between runs (no components/sections/, no src/components/)
- If existingFiles use components/site/, keep using components/site/ with the SAME file names
- app/page.tsx may ONLY import paths that exist in your JSON output or in existingFiles
- If you add a section, create the .tsx file AND import it in app/page.tsx in the same response
- If you rename a component file, update every import in app/page.tsx to match

WEBCONTAINER RULES:
- scripts.dev: next dev --port 3000 (Next 14 — no --webpack flag)
- next.config.js: CommonJS module.exports only, no turbopack
- Use <img> for external images, not next/image with unconfigured domains
- framer-motion@11.11.17 only in Client Components ('use client' first line)
- Copy shadcn component source into components/ui/ — do NOT use shadcn CLI

COMMON ERROR PREVENTION:
- Slot MUST be from '@radix-ui/react-slot' — NEVER 'react-slot'
- cn() from '@/lib/utils' — file already exists, do not recreate
- Icons from 'lucide-react' only
- Server components must not import framer-motion or @radix-ui/*
- ALL .js config files use module.exports only
- Use next/font in layout OR system-ui — no @import Google Fonts in CSS

OUTPUT PATH RULES:
- Forward slashes only (app/page.tsx not app\\page.tsx)
- No CDN script tags; all deps must be in INSTALLED DEPENDENCIES

Output format:
- Return ONLY a single JSON object
- Keys = file paths relative to project root (strings)
- Values = complete file source code (strings only, never nested objects)
- Do NOT wrap in { "files": { ... } }
- If existingFiles provided, return ONLY changed files
- Real content only, no Lorem Ipsum

No markdown. No explanation.`

const FIXER_SYSTEM = `You are a senior debugging engineer. Fix specific errors in a Next.js app.

${SCAFFOLD_CONTRACT}

Return ONLY a JSON object of files that need to change. Do not return unchanged files. No markdown.

MODULE NOT FOUND / import path errors:
- 'react-slot' → '@radix-ui/react-slot'
- Align app/page.tsx imports with actual files under components/site/ (never components/sections/)
- Create missing section files or remove broken imports and JSX in the same fix
- cn() from '@/lib/utils' (already in scaffold)

RSC / createContext ERRORS:
- Add 'use client' to the component file (e.g. components/site/HeroSection.tsx), not only app/page.tsx
- Or remove framer-motion from that file and use CSS animations

DEV SCRIPT ERRORS (unknown option '--webpack'):
- Next 14.x does not support --webpack; use "next dev --port 3000" only

DEPENDENCY ERRORS (ETARGET, EIO, notarget, ERESOLVE):
- Fix ONLY package.json with exact scaffold versions from INSTALLED DEPENDENCIES
- Remove package-lock.json from output if present
- Never use @radix-ui/*@1.0.x — use scaffold versions
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

export interface DependencyPlan {
  extraPackages: ExtraDependency[]
}

export async function runDependencyPlanner(
  prompt: string,
  intent: ChunkedIntent,
  plan: CodingPlan
): Promise<ExtraDependency[]> {
  const userContent = JSON.stringify({ prompt, intent, planSummary: plan.dependencyList })
  const raw = await callOpenAI(NANO_MODEL, DEPENDENCY_PLANNER_SYSTEM, userContent)
  const parsed = parseJsonResponse<DependencyPlan>(raw)
  return Array.isArray(parsed.extraPackages) ? parsed.extraPackages : []
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

  return normalizeProductCode(normalizeProjectArchitecture(result))
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
  return stripScaffoldPaths(parseFilesObject(raw))
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
  return stripScaffoldPaths(parseFilesObject(raw))
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
