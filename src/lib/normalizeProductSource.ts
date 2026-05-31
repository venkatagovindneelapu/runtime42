import { ensureUseClientDirective } from '@/lib/ensureUseClient'

/** Wrong import specifiers the AI often emits → correct installed package */
const IMPORT_PATH_FIXES: Record<string, string> = {
  'react-slot': '@radix-ui/react-slot',
  '@radix-ui/slot': '@radix-ui/react-slot',
  'radix-ui/react-slot': '@radix-ui/react-slot',
  '@radix-ui/react-slot/lib': '@radix-ui/react-slot',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

export function normalizeProductSource(
  path: string,
  content: string,
  availablePaths: Set<string>
): string {
  if (!/\.(tsx|jsx|ts|js)$/.test(path)) return content
  let body = fixImportPaths(content)
  body = fixUiImportCasing(body, availablePaths)
  return ensureUseClientDirective(path, body)
}

export function normalizeProductFiles(
  files: Record<string, string>
): Record<string, string> {
  const availablePaths = new Set(Object.keys(files))
  const out: Record<string, string> = {}
  for (const [path, content] of Object.entries(files)) {
    out[path] = normalizeProductSource(path, content, availablePaths)
  }
  return out
}
