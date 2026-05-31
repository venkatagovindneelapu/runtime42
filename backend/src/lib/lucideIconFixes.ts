/** AI often uses Phosphor (Pi*) or wrong casing — map to real lucide-react exports */
export const LUCIDE_ICON_RENAMES: Record<string, string> = {
  PiSparkle: 'Sparkles',
  PiStar: 'Star',
  PiHeart: 'Heart',
  PiArrowRight: 'ArrowRight',
  PiCheck: 'Check',
  YouTube: 'Youtube',
  LinkedIn: 'Linkedin',
  GitHub: 'Github',
  Facebook: 'Facebook',
  Twitter: 'Twitter',
  Instagram: 'Instagram',
}

/** Fix lucide-react import names and JSX identifiers in source */
export function fixLucideIconNames(content: string): string {
  let body = content

  body = body.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g,
    (match, importList: string) => {
      const parts = importList.split(',').map((part: string) => {
        const trimmed = part.trim()
        if (!trimmed) return trimmed
        const asMatch = trimmed.match(/^(\w+)(\s+as\s+(\w+))?$/)
        if (!asMatch) return trimmed
        const original = asMatch[1]
        const alias = asMatch[3]
        const fixed = resolveLucideIconName(original)
        if (alias) return `${fixed} as ${alias}`
        if (fixed !== original) return fixed
        return trimmed
      })
      return `import { ${parts.join(', ')} } from 'lucide-react'`
    }
  )

  for (const [wrong, correct] of Object.entries(LUCIDE_ICON_RENAMES)) {
    body = body.replace(new RegExp(`\\b${wrong}\\b`, 'g'), correct)
  }

  body = body.replace(/\bPi([A-Z][A-Za-z0-9]*)\b/g, (full, rest: string) => {
    if (LUCIDE_ICON_RENAMES[full]) return LUCIDE_ICON_RENAMES[full]
    return rest
  })

  return body
}

function resolveLucideIconName(name: string): string {
  if (LUCIDE_ICON_RENAMES[name]) return LUCIDE_ICON_RENAMES[name]
  if (name.startsWith('Pi') && name.length > 2) {
    const stripped = name.slice(2)
    return LUCIDE_ICON_RENAMES[name] ?? stripped
  }
  return name
}
