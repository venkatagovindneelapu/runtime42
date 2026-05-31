export type SandboxError = {
  id: string
  code?: string
  package?: string
  requested?: string
  message: string
  raw?: string
  fixHint?: string
}

export function dedupeSandboxErrors(errors: SandboxError[]): SandboxError[] {
  const byId = new Map<string, SandboxError>()
  for (const err of errors) {
    if (!byId.has(err.id)) byId.set(err.id, err)
  }
  return [...byId.values()]
}

export function sandboxErrorTitle(err: SandboxError): string {
  if (err.code === 'RSC_CLIENT') {
    return err.message.slice(0, 100)
  }
  if (err.code && err.package) {
    return `${err.code}: ${err.package}${err.requested ? `@${err.requested}` : ''}`
  }
  return err.message.slice(0, 120)
}

export function sandboxErrorsToMessages(errors: SandboxError[]): string[] {
  return dedupeSandboxErrors(errors).map((e) => e.message)
}

export function sandboxErrorsToSuggestions(errors: SandboxError[]): string[] {
  const unique = dedupeSandboxErrors(errors)
  const seen = new Set<string>()
  const out: string[] = []

  for (const e of unique) {
    const text = e.fixHint
      ? `${sandboxErrorTitle(e)} — ${e.fixHint}`
      : `Fix: ${sandboxErrorTitle(e)}`
    const key = e.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }

  return out
}
