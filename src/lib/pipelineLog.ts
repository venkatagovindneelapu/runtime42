import type { PipelineCheckpoint } from './api'

export function logCheckpoint(checkpoint: PipelineCheckpoint) {
  const time = new Date().toISOString()
  console.info('[runtime42]', {
    time,
    type: checkpoint.type,
    agent: checkpoint.agent,
    label: checkpoint.label,
    status: checkpoint.status,
    detail: checkpoint.detail,
    paths: checkpoint.paths?.length,
  })
}

export function logTerminal(source: string, line: string) {
  const trimmed = line.trimEnd()
  if (!trimmed) return
  console.info(`[runtime42][terminal][${source}]`, trimmed)
}

export function logWebContainerStatus(status: string, detail?: string) {
  console.info('[runtime42][webcontainer]', status, detail ?? '')
}
