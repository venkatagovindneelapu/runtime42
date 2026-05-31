import { Router } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { projects } from '../db/schema'

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
