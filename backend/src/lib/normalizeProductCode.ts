import type { GeneratedFiles } from './projectStructure.js'

/** Wrong import specifiers the AI often emits → correct installed package */
const IMPORT_PATH_FIXES: Record<string, string> = {
  'react-slot': '@radix-ui/react-slot',
  '@radix-ui/slot': '@radix-ui/react-slot',
  'radix-ui/react-slot': '@radix-ui/react-slot',
  '@radix-ui/react-slot/lib': '@radix-ui/react-slot',
}

const CLIENT_MODULE_PATTERNS = [
  /from\s+['"]framer-motion['"]/,
  /from\s+['"]@radix-ui\//,
  /from\s+['"]lucide-react['"]/,
]

const CLIENT_HOOK_PATTERNS = [
  /\buseState\s*\(/,
  /\buseEffect\s*\(/,
  /\buseRef\s*\(/,
  /\buseCallback\s*\(/,
  /\buseMemo\s*\(/,
  /\buseContext\s*\(/,
  /\bonClick\s*=/,
  /\bonChange\s*=/,
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function fileNeedsUseClient(path: string, content: string): boolean {
  if (!/\.(tsx|jsx)$/.test(path)) return false
  if (/^['"]use client['"]\s*;?/m.test(content)) return false
  if (CLIENT_MODULE_PATTERNS.some((re) => re.test(content))) return true
  if (CLIENT_HOOK_PATTERNS.some((re) => re.test(content))) return true
  return false
}

function ensureUseClientDirective(path: string, content: string): string {
  if (!fileNeedsUseClient(path, content)) return content
  const trimmed = content.trimStart()
  if (/^['"]use client['"]\s*;?/m.test(trimmed)) return content
  return `'use client';\n\n${content}`
}

function fixImportPaths(content: string): string {
  let body = content
  for (const [wrong, correct] of Object.entries(IMPORT_PATH_FIXES)) {
    body = body.replace(
      new RegExp(`from\\s+['"]${escapeRegExp(wrong)}['"]`, 'g'),
      `from '${correct}'`
    )
  }
  return body
}

function fixUiImportCasing(content: string, availablePaths: Set<string>): string {
  return content.replace(
    /from\s+['"]@\/components\/ui\/([^'"]+)['"]/g,
    (match, name: string) => {
      if (/^[A-Z]/.test(name)) return match
      const pascal = name.charAt(0).toUpperCase() + name.slice(1)
      const candidates = [`components/ui/${pascal}.tsx`, `components/ui/${pascal}.ts`]
      if (candidates.some((p) => availablePaths.has(p))) {
        return `from '@/components/ui/${pascal}'`
      }
      return match
    }
  )
}

function normalizeSourceFile(path: string, content: string, availablePaths: Set<string>): string {
  if (!/\.(tsx|jsx|ts|js)$/.test(path)) return content
  let body = fixImportPaths(content)
  body = fixUiImportCasing(body, availablePaths)
  body = ensureUseClientDirective(path, body)
  return body
}

/** Normalize AI product code to match the fixed WebContainer scaffold */
export function normalizeProductCode(files: GeneratedFiles): GeneratedFiles {
  const availablePaths = new Set(Object.keys(files))
  const out: GeneratedFiles = {}

  for (const [path, content] of Object.entries(files)) {
    out[path] = normalizeSourceFile(path, content, availablePaths)
  }

  return out
}
