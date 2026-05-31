import { callOpenAI } from './openai.js'

export type GeneratedFiles = Record<string, string>

const SYSTEM_PROMPT = `You are an expert Next.js developer. Generate a complete, beautiful, production-ready Next.js 14 app using App Router, TypeScript, and Tailwind CSS.

Return ONLY a valid JSON object where:
- Keys are file paths relative to project root (e.g. 'app/page.tsx', 'package.json')
- Values are the complete file contents as strings

Always include these files:
- package.json (with next, react, react-dom, typescript, tailwindcss, autoprefixer, postcss, @types/react, @types/node as dependencies, with scripts: dev: next dev --port 3000, build: next build, start: next start)
- next.config.js
- tsconfig.json
- tailwind.config.js
- postcss.config.js
- app/layout.tsx
- app/page.tsx
- app/globals.css

The package.json scripts must be exactly:
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start"
  }
}

The next.config.js must be exactly:
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig

Do not use next.config.mjs. Use next.config.js only.

Generate beautiful modern UI with:
- Professional typography and spacing
- Responsive design mobile first
- Smooth animations
- Real content matching the user's prompt
- No placeholder text like 'Lorem ipsum'

If existingFiles is provided, return ONLY the files that need to change. Do not return unchanged files.

Return ONLY the JSON object. No markdown, no explanation.`

function parseFilesResponse(raw: string): GeneratedFiles {
  const cleaned = raw
    .replace(/^```json\n?/, '')
    .replace(/^```\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OpenAI returned an invalid files object')
  }

  for (const [path, contents] of Object.entries(parsed)) {
    if (typeof path !== 'string' || typeof contents !== 'string') {
      throw new Error('OpenAI returned files in an invalid format')
    }
  }

  return parsed as GeneratedFiles
}

export async function generateNextApp(
  prompt: string,
  existingFiles: GeneratedFiles | null
): Promise<GeneratedFiles> {
  const userContent = existingFiles
    ? `User request:\n${prompt}\n\nExisting files JSON:\n${JSON.stringify(existingFiles)}`
    : `User request:\n${prompt}`

  const raw = await callOpenAI('gpt-5.1-codex-mini', SYSTEM_PROMPT, userContent, 0.4)
  return parseFilesResponse(raw)
}
