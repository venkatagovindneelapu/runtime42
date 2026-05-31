/** Patterns that require a Client Component in Next.js App Router */
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

export function fileNeedsUseClient(path: string, content: string): boolean {
  if (!/\.(tsx|jsx)$/.test(path)) return false
  if (/^['"]use client['"]\s*;?/m.test(content)) return false
  if (CLIENT_MODULE_PATTERNS.some((re) => re.test(content))) return true
  if (CLIENT_HOOK_PATTERNS.some((re) => re.test(content))) return true
  return false
}

export function ensureUseClientDirective(path: string, content: string): string {
  if (!fileNeedsUseClient(path, content)) return content
  const trimmed = content.trimStart()
  if (/^['"]use client['"]\s*;?/m.test(trimmed)) return content
  return `'use client';\n\n${content}`
}
