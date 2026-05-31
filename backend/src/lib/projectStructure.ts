export type GeneratedFiles = Record<string, string>

/** Canonical layout — do not switch to components/sections or other folders */
export const SITE_COMPONENTS_DIR = 'components/site'
export const UI_COMPONENTS_DIR = 'components/ui'

const IMPORT_ALIAS_MAP: Record<string, string> = {
  FeaturesSection: 'FeatureCards',
  FeatureSection: 'FeatureCards',
  Features: 'FeatureCards',
  ValueSection: 'ValueProposition',
  ValueProps: 'ValueProposition',
  HowItWorksSection: 'HowItWorks',
  CTASection: 'HowItWorks',
  CtaSection: 'HowItWorks',
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function siteComponentName(filePath: string): string {
  const base = filePath.split('/').pop() ?? ''
  return base.replace(/\.tsx$/, '')
}

export function listSiteComponentPaths(files: GeneratedFiles): string[] {
  return Object.keys(files).filter(
    (p) => p.startsWith(`${SITE_COMPONENTS_DIR}/`) && /\.(tsx|jsx)$/.test(p)
  )
}

function resolveImportToPath(importName: string, files: GeneratedFiles): string | null {
  const sitePaths = listSiteComponentPaths(files)
  const names = new Set(sitePaths.map(siteComponentName))

  if (names.has(importName)) {
    return sitePaths.find((p) => siteComponentName(p) === importName) ?? null
  }

  const alias = IMPORT_ALIAS_MAP[importName]
  if (alias && names.has(alias)) {
    return sitePaths.find((p) => siteComponentName(p) === alias) ?? null
  }

  return null
}

/** Rewrite legacy paths and align app/page.tsx imports with files that exist */
export function normalizeProjectArchitecture(files: GeneratedFiles): GeneratedFiles {
  const out: GeneratedFiles = {}

  for (const [rawPath, content] of Object.entries(files)) {
    let path = normalizePath(rawPath)
    let body = content

    if (path.startsWith('components/sections/')) {
      path = path.replace(/^components\/sections\//, `${SITE_COMPONENTS_DIR}/`)
    }

    body = body.replace(/@\/components\/sections\//g, `@/${SITE_COMPONENTS_DIR}/`)
    body = body.replace(
      /from\s+['"]\.\.\/\.\.\/components\/sections\//g,
      `from '../../${SITE_COMPONENTS_DIR}/`
    )

    out[path] = body
  }

  if (out['app/page.tsx']) {
    out['app/page.tsx'] = reconcileAppPage(out['app/page.tsx'], out)
  }

  return out
}

function reconcileAppPage(page: string, files: GeneratedFiles): string {
  const toRemove = new Set<string>()
  const newImports: string[] = []
  const otherLines: string[] = []

  const importRe = /^import\s+\{([^}]+)\}\s+from\s+['"](@\/[^'"]+)['"];?\s*$/

  for (const line of page.split('\n')) {
    const m = line.match(importRe)
    if (!m) {
      otherLines.push(line)
      continue
    }

    const fromPath = m[2]
    if (!fromPath.includes('components/')) {
      otherLines.push(line)
      continue
    }

    const names = m[1].split(',').map((n) => n.trim())
    for (const name of names) {
      const path = resolveImportToPath(name, files)
      if (!path) {
        toRemove.add(name)
        continue
      }
      const actual = siteComponentName(path)
      const importPath = `@/${path.replace(/\.tsx$/, '')}`
      if (actual === name) {
        newImports.push(`import { ${name} } from '${importPath}';`)
      } else {
        newImports.push(`import { ${actual} as ${name} } from '${importPath}';`)
      }
    }
  }

  let body = otherLines.join('\n')
  for (const name of toRemove) {
    const selfClosing = new RegExp(`<${name}\\b[^>]*/>\\s*`, 'g')
    const paired = new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?</${name}>\\s*`, 'g')
    body = body.replace(paired, '').replace(selfClosing, '')
  }

  const header = [...new Set(newImports)].join('\n')
  const result = header ? `${header}\n\n${body.trim()}` : body.trim()
  return `${result}\n`
}
