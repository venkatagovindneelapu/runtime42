import { Router } from 'express'
import { eq, and, desc, asc } from 'drizzle-orm'
import { db } from '../db'
import { projects, chatMessages } from '../db/schema'
import { runGenerationPipeline, formatSseEvent } from '../lib/pipeline'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, req.user!.id),
      orderBy: [desc(projects.createdAt)],
    })
    res.json(userProjects)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { prompt, title } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })

    const [project] = await db
      .insert(projects)
      .values({
        userId: req.user!.id,
        prompt,
        title: title ?? 'Untitled',
        status: 'pending',
      })
      .returning()

    res.status(201).json(project)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' })
  }
})

router.get('/:id/messages', async (req, res) => {
  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, req.params.id),
        eq(projects.userId, req.user!.id)
      ),
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.projectId, req.params.id),
      orderBy: [asc(chatMessages.createdAt)],
    })
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

router.post('/:id/messages', async (req, res) => {
  try {
    const { role, content, messageType, metadata } = req.body
    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' })
    }

    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, req.params.id),
        eq(projects.userId, req.user!.id)
      ),
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const [message] = await db
      .insert(chatMessages)
      .values({
        projectId: req.params.id,
        role,
        content,
        messageType: messageType ?? 'text',
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning()

    res.status(201).json(message)
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, req.params.id),
        eq(projects.userId, req.user!.id)
      ),
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

router.post('/:id/generate/stream', async (req, res) => {
  const projectId = req.params.id
  const userId = req.user!.id
  const { prompt, errors: errorMessages } = req.body

  if (!prompt) return res.status(400).json({ error: 'prompt is required' })

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) return res.status(404).json({ error: 'Project not found' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  try {
    const payload = await runGenerationPipeline({
      projectId,
      userId,
      prompt,
      errorMessages,
      onEvent: (event) => {
        res.write(formatSseEvent(event))
      },
    })
    res.write(formatSseEvent({ type: 'checkpoint', label: 'Complete', status: 'done' }, payload))
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate project'
    res.write(
      formatSseEvent({ type: 'error', label: message, status: 'error' })
    )
    res.end()
  }
})

router.post('/:id/generate', async (req, res) => {
  const projectId = req.params.id
  const userId = req.user!.id

  try {
    const { prompt, errors: errorMessages } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })

    const payload = await runGenerationPipeline({
      projectId,
      userId,
      prompt,
      errorMessages,
    })

    res.json({
      files: payload.files,
      summary: payload.summary,
      intent: payload.intent,
      plan: payload.plan,
      projectId: payload.projectId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate project'
    res.status(500).json({ error: message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body
    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' })
    }

    const [project] = await db
      .update(projects)
      .set({
        title: title.trim() || 'Untitled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, req.params.id),
          eq(projects.userId, req.user!.id)
        )
      )
      .returning()

    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, req.params.id),
          eq(projects.userId, req.user!.id)
        )
      )
      .returning()

    if (!deleted.length) return res.status(404).json({ error: 'Project not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

export { router as projectsRouter }
