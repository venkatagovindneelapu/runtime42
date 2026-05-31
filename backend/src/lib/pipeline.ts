import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { projects, chatMessages } from '../db/schema'
import {
  runInputChunker,
  runPlanner,
  runDependencyPlanner,
  runCodingAgent,
  runErrorFixer,
  runSummarizer,
  mergeScaffoldWithProductFiles,
  type ChunkedIntent,
  type CodingPlan,
  type GeneratedFiles,
  type GenerationSummary,
  type ExtraDependency,
} from './agents'
import { applyExtrasToPackageJson, ensureScaffoldFiles } from './scaffold'

export type CheckpointStatus = 'active' | 'done' | 'error'

export interface PipelineStep {
  agent: number
  label: string
  status: CheckpointStatus
  detail?: string
}

export interface PipelineCheckpoint {
  type: 'checkpoint' | 'files_delta' | 'complete' | 'error'
  agent?: number
  label: string
  detail?: string
  status?: CheckpointStatus
  paths?: string[]
  /** Partial file contents for live preview patching */
  files?: GeneratedFiles
}

export interface PipelineCompletePayload {
  files: GeneratedFiles
  summary: GenerationSummary
  intent: ChunkedIntent
  plan: CodingPlan
  projectId: string
}

const AGENT_LABELS: Record<number, string> = {
  1: 'Analyzing requirements',
  2: 'Planning file architecture',
  6: 'Selecting dependencies',
  3: 'Writing application code',
  4: 'Fixing build errors',
  5: 'Summarizing results',
}

function logCheckpoint(projectId: string, agent: number, label: string, status: string) {
  console.log(`[runtime42][${projectId}][agent-${agent}] ${label} (${status})`)
}

export type PipelineEventHandler = (event: PipelineCheckpoint) => void

async function updateThinkingSteps(
  projectId: string,
  thinkingMessageId: string,
  steps: PipelineStep[]
) {
  await db
    .update(chatMessages)
    .set({
      metadata: JSON.stringify({ steps }),
      content: steps.find(s => s.status === 'active')?.label ?? 'Processing...',
    })
    .where(eq(chatMessages.id, thinkingMessageId))
}

async function emitCheckpoint(
  projectId: string,
  thinkingMessageId: string,
  steps: PipelineStep[],
  agent: number,
  status: CheckpointStatus,
  detail: string | undefined,
  onEvent?: PipelineEventHandler
) {
  const label = AGENT_LABELS[agent] ?? `Agent ${agent}`
  const idx = steps.findIndex(s => s.agent === agent)
  if (idx >= 0) {
    steps[idx] = { agent, label, status, detail }
  } else {
    steps.push({ agent, label, status, detail })
  }
  for (const s of steps) {
    if (s.agent !== agent && s.status === 'active') s.status = 'done'
  }
  logCheckpoint(projectId, agent, label, status)
  await updateThinkingSteps(projectId, thinkingMessageId, steps)
  onEvent?.({
    type: 'checkpoint',
    agent,
    label,
    detail,
    status,
  })
}

function emitFileDeltas(
  productFiles: GeneratedFiles,
  onEvent?: PipelineEventHandler
) {
  const paths = Object.keys(productFiles)
  if (paths.length === 0) return

  // Emit one delta per file so the editor can patch live
  for (const path of paths) {
    onEvent?.({
      type: 'files_delta',
      label: `Wrote ${path}`,
      paths: [path],
      files: { [path]: productFiles[path] },
      status: 'done',
    })
  }
}

function mergeWithExisting(
  existingFiles: GeneratedFiles | null,
  productFiles: GeneratedFiles,
  extras: ExtraDependency[],
  isFirstGeneration: boolean
): GeneratedFiles {
  if (isFirstGeneration || !existingFiles || Object.keys(existingFiles).length === 0) {
    return ensureScaffoldFiles(mergeScaffoldWithProductFiles(productFiles, extras))
  }

  const merged: GeneratedFiles = { ...existingFiles, ...productFiles }
  if (extras.length > 0 && merged['package.json']) {
    merged['package.json'] = applyExtrasToPackageJson(merged['package.json'], extras)
  }
  return ensureScaffoldFiles(merged)
}

export interface RunPipelineOptions {
  projectId: string
  userId: string
  prompt: string
  errorMessages?: string[]
  onEvent?: PipelineEventHandler
  skipUserMessage?: boolean
}

export async function runGenerationPipeline(
  options: RunPipelineOptions
): Promise<PipelineCompletePayload> {
  const { projectId, userId, prompt, errorMessages, onEvent, skipUserMessage } = options

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) throw new Error('Project not found')

  if (!skipUserMessage) {
    await db.insert(chatMessages).values({
      projectId,
      role: 'user',
      content: prompt,
      messageType: 'text',
    })
  }

  await db
    .update(projects)
    .set({ status: 'generating', errorMessage: null, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  const [thinkingRow] = await db
    .insert(chatMessages)
    .values({
      projectId,
      role: 'assistant',
      content: AGENT_LABELS[1],
      messageType: 'thinking',
      metadata: JSON.stringify({ steps: [] }),
    })
    .returning()

  const thinkingMessageId = thinkingRow.id
  const steps: PipelineStep[] = []

  const existingFiles = project.files
    ? (JSON.parse(project.files) as GeneratedFiles)
    : null

  const isFirstGeneration =
    !existingFiles || Object.keys(existingFiles).length === 0

  let intent: ChunkedIntent
  let plan: CodingPlan
  let mergedFiles: GeneratedFiles

  try {
    await emitCheckpoint(projectId, thinkingMessageId, steps, 1, 'active', undefined, onEvent)
    intent = await runInputChunker(prompt)
    await emitCheckpoint(projectId, thinkingMessageId, steps, 1, 'done', undefined, onEvent)

    await emitCheckpoint(projectId, thinkingMessageId, steps, 2, 'active', undefined, onEvent)
    plan = await runPlanner(intent)
    await emitCheckpoint(projectId, thinkingMessageId, steps, 2, 'done', undefined, onEvent)

    const useErrorFixer =
      Array.isArray(errorMessages) &&
      errorMessages.length > 0 &&
      existingFiles &&
      Object.keys(existingFiles).length > 0

    if (useErrorFixer) {
      await emitCheckpoint(projectId, thinkingMessageId, steps, 4, 'active', undefined, onEvent)
      const planFromDb = project.codingPlan ? JSON.parse(project.codingPlan) : plan
      const fixed = await runErrorFixer(errorMessages!, existingFiles!, planFromDb)
      mergedFiles = ensureScaffoldFiles({ ...existingFiles!, ...fixed })
      emitFileDeltas(fixed, onEvent)
      await emitCheckpoint(projectId, thinkingMessageId, steps, 4, 'done', undefined, onEvent)
    } else {
      await emitCheckpoint(projectId, thinkingMessageId, steps, 6, 'active', undefined, onEvent)
      const extras = await runDependencyPlanner(prompt, intent, plan)
      await emitCheckpoint(
        projectId,
        thinkingMessageId,
        steps,
        6,
        'done',
        extras.length > 0 ? `+${extras.length} packages` : 'Base template sufficient',
        onEvent
      )

      await emitCheckpoint(projectId, thinkingMessageId, steps, 3, 'active', undefined, onEvent)
      const productFiles = await runCodingAgent(intent, plan, existingFiles, prompt)
      mergedFiles = mergeWithExisting(existingFiles, productFiles, extras, isFirstGeneration)
      emitFileDeltas(productFiles, onEvent)
      await emitCheckpoint(projectId, thinkingMessageId, steps, 3, 'done', undefined, onEvent)
    }

    await emitCheckpoint(projectId, thinkingMessageId, steps, 5, 'active', undefined, onEvent)
    const summary = await runSummarizer(prompt, intent, Object.keys(mergedFiles), plan)
    await emitCheckpoint(projectId, thinkingMessageId, steps, 5, 'done', undefined, onEvent)

    await db
      .update(projects)
      .set({
        files: JSON.stringify(mergedFiles),
        chunkedIntent: JSON.stringify(intent),
        codingPlan: JSON.stringify(plan),
        chatTitle: intent.appName || project.title,
        status: 'ready',
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

    await db.insert(chatMessages).values({
      projectId,
      role: 'assistant',
      content: summary.headline,
      messageType: 'summary',
      metadata: JSON.stringify(summary),
    })

    const payload: PipelineCompletePayload = {
      files: mergedFiles,
      summary,
      intent,
      plan,
      projectId,
    }

    return payload
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate project'
    logCheckpoint(projectId, 0, message, 'error')

    const activeStep = steps.find(s => s.status === 'active')
    if (activeStep) {
      activeStep.status = 'error'
      activeStep.detail = message
      await updateThinkingSteps(projectId, thinkingMessageId, steps)
    }

    await db
      .update(projects)
      .set({
        status: 'failed',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

    await db.insert(chatMessages).values({
      projectId,
      role: 'assistant',
      content: message,
      messageType: 'error',
    })

    onEvent?.({ type: 'error', label: message, status: 'error' })
    throw err
  }
}

export function formatSseEvent(
  event: PipelineCheckpoint,
  complete?: PipelineCompletePayload
): string {
  if (complete) {
    return `data: ${JSON.stringify({ type: 'complete', ...complete })}\n\n`
  }
  return `data: ${JSON.stringify(event)}\n\n`
}
