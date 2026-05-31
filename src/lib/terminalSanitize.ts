import type { SandboxError } from '@/lib/sandboxErrors'

const ANSI_RE =
  /\u001b\[[0-9;]*[A-Za-z]|\u001b\][^\u0007]*\u0007|\u001b\][^\u001b\\]*\\|\u001b[()#;]?[0-9]{0,4}[A-Za-z]/g

const SPINNER_ONLY_RE = /^[\s|\\/\-]+$/

export function stripAnsi(text: string): string {
  let out = text.replace(ANSI_RE, '')
  out = out.replace(/\r(?!\n)/g, '')
  return out
}

export function sanitizeTerminalChunk(chunk: string): string {
  const normalized = stripAnsi(chunk.replace(/\r\n/g, '\n'))
  return normalized
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      if (SPINNER_ONLY_RE.test(t)) return false
      if (/\[1G|\[0K/.test(t)) return false
      return true
    })
    .join('\n')
}

function makeId(parts: string[]): string {
  return parts.filter(Boolean).join(':') || `err-${Date.now()}`
}

export function parseNpmErrors(terminal: string): SandboxError[] {
  const clean = stripAnsi(terminal)
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  const errors: SandboxError[] = []
  const seen = new Set<string>()

  let lastCode: string | undefined

  for (const line of lines) {
    const codeMatch = line.match(/npm error code\s+(\S+)/i)
    if (codeMatch) {
      lastCode = codeMatch[1]
      continue
    }

    const eioMatch = line.match(
      /EIO:.*?'([^']+)' not found in cache/i
    )
    if (eioMatch) {
      const pkgSpec = eioMatch[1]
      const [pkg, requested] = pkgSpec.includes('@')
        ? [pkgSpec.split('@')[0], pkgSpec.split('@').slice(1).join('@')]
        : [pkgSpec, '']
      const id = makeId(['EIO', pkg, requested])
      if (!seen.has(id)) {
        seen.add(id)
        errors.push({
          id,
          code: 'EIO',
          package: pkg,
          requested: requested || undefined,
          message: `npm cache error: ${pkgSpec}`,
          raw: line,
          fixHint:
            'Dependencies were re-pinned — click to fix package.json versions and reinstall.',
        })
      }
      continue
    }

    const notargetMatch = line.match(
      /notarget\s+No matching version found for\s+([^\s@]+)@(.+)/i
    )
    if (notargetMatch) {
      const pkg = notargetMatch[1]
      const requested = notargetMatch[2]
      const code = lastCode ?? 'ETARGET'
      const id = makeId([code, pkg, requested])
      if (seen.has(id)) continue
      seen.add(id)

      const fixHint =
        pkg === 'class-variance-authority'
          ? 'Use 0.7.1 — no 1.x version exists on npm.'
          : 'Use a published version from npm (check registry).'

      errors.push({
        id,
        code,
        package: pkg,
        requested,
        message: `${code}: No matching version for ${pkg}@${requested}`,
        raw: line,
        fixHint,
      })
      continue
    }

    const genericNpm = line.match(/npm error\s+(.+)/i)
    if (genericNpm && !/code\s+\S+/i.test(line)) {
      const msg = genericNpm[1].trim()
      if (msg.length < 8 || /complete log/i.test(msg)) continue
      const id = makeId([lastCode ?? 'npm', msg.slice(0, 80)])
      if (seen.has(id)) continue
      seen.add(id)
      errors.push({
        id,
        code: lastCode,
        message: lastCode ? `${lastCode}: ${msg}` : msg,
        raw: line,
      })
    }
  }

  const exitMatch = clean.match(/npm install failed \(exit code (\d+)\)/i)
  if (errors.length === 0 && exitMatch) {
    errors.push({
      id: makeId(['install', exitMatch[1]]),
      message: `npm install failed (exit code ${exitMatch[1]})`,
      fixHint: 'Check package.json dependency versions.',
    })
  }

  if (errors.length === 0 && /npm error|ERESOLVE|ETARGET|notarget/i.test(clean)) {
    const snippet = lines.find((l) => /npm error|notarget|ERESOLVE/i.test(l)) ?? lines[lines.length - 1]
    if (snippet) {
      errors.push({
        id: makeId(['npm', snippet.slice(0, 60)]),
        message: snippet.slice(0, 200),
        raw: snippet,
      })
    }
  }

  return errors
}

function extractComponentPath(line: string): string | undefined {
  const m =
    line.match(/(?:\.\/|eval \()([^)\s]+\.tsx)/) ??
    line.match(/(components\/[^\s:]+\.tsx)/) ??
    line.match(/(app\/[^\s:]+\.tsx)/)
  return m?.[1]
}

export function parseDevError(line: string): SandboxError | null {
  const trimmed = stripAnsi(line).trim()
  if (!trimmed) return null

  if (/webpack-internal:|vendor-chunks\/|\.next\/server\//i.test(trimmed)) {
    return null
  }

  if (/EADDRINUSE|address already in use/i.test(trimmed)) {
    const portMatch = trimmed.match(/:::?(\d{4,5})/)
    const port = portMatch?.[1] ?? '3000'
    return {
      id: 'dev-eaddrinuse',
      code: 'EADDRINUSE',
      message: `Port ${port} is already in use`,
      raw: trimmed.slice(0, 200),
      fixHint: 'Sandbox will try the next port (3001, 3002, …) automatically.',
    }
  }

  if (/unknown option ['"]?--webpack/i.test(trimmed)) {
    return {
      id: 'dev-unknown-webpack-flag',
      code: 'INVALID_DEV_FLAG',
      message: "Next.js 14 does not support the --webpack flag",
      raw: trimmed,
      fixHint: 'Set scripts.dev to: next dev --port 3000 and pin next to 14.2.29',
    }
  }

  if (/Module not found|Can't resolve/i.test(trimmed)) {
    const modMatch = trimmed.match(/Can't resolve '([^']+)'|Module not found: Can't resolve '([^']+)'/)
    const mod = modMatch?.[1] ?? modMatch?.[2] ?? 'unknown module'
    return {
      id: `dev-module-not-found:${mod}`,
      code: 'MODULE_NOT_FOUND',
      message: `Missing module: ${mod}`,
      raw: trimmed.slice(0, 200),
      fixHint:
        'Use components/site/ paths consistently and ensure app/page.tsx only imports files that exist.',
    }
  }

  if (/createContext.*is not a function/i.test(trimmed)) {
    const file = extractComponentPath(trimmed) ?? 'HeroSection.tsx'
    return {
      id: 'dev-rsc-createContext',
      code: 'RSC_CLIENT',
      message: `Client library used in Server Component (${file})`,
      raw: trimmed.slice(0, 200),
      fixHint: `Add 'use client' as the first line of ${file}, or remove framer-motion from server components.`,
    }
  }

  if (/framer-motion/i.test(trimmed) && /TypeError|Error/i.test(trimmed)) {
    const file = extractComponentPath(trimmed) ?? 'component using motion'
    return {
      id: 'dev-framer-motion-rsc',
      code: 'RSC_CLIENT',
      message: `framer-motion must run in a Client Component (${file})`,
      fixHint: `Add 'use client' at the top of ${file}.`,
    }
  }

  if (/^GET \/ \d{3}/i.test(trimmed)) {
    return null
  }

  if (/^digest:/i.test(trimmed) || /^○ Compiling|^✓ Compiled/i.test(trimmed)) {
    return null
  }

  if (
    /SyntaxError|Module not found|Cannot find module|TypeError|Turbopack is not supported/i.test(
      trimmed
    ) ||
    /^Error:/i.test(trimmed) ||
    /^⨯\s+TypeError/i.test(trimmed) ||
    /unknown option/i.test(trimmed)
  ) {
    const file = extractComponentPath(trimmed)
    return {
      id: makeId(['dev', trimmed.replace(/\s+/g, ' ').slice(0, 60)]),
      message: trimmed.replace(/^⨯\s*/, '').slice(0, 200),
      raw: trimmed,
      fixHint: file
        ? `Check ${file} for missing 'use client' or invalid imports.`
        : undefined,
    }
  }
  return null
}

/** Collapse repeated Next dev errors from a terminal buffer */
export function parseDevErrorsFromTerminal(terminal: string): SandboxError[] {
  const clean = stripAnsi(terminal)
  const lines = clean.split('\n')
  const byId = new Map<string, SandboxError>()
  for (const line of lines) {
    const err = parseDevError(line)
    if (!err) continue
    if (!byId.has(err.id)) byId.set(err.id, err)
  }
  return [...byId.values()]
}
