import { Router } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { pages } from '../db/schema'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const userPages = await db.query.pages.findMany({
      where: eq(pages.userId, req.user!.id),
      orderBy: [desc(pages.createdAt)],
    })
    res.json(userPages)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pages' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { prompt, title } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })

    const [page] = await db
      .insert(pages)
      .values({
        userId: req.user!.id,
        prompt,
        title: title ?? 'Untitled',
        status: 'pending',
      })
      .returning()

    res.status(201).json(page)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create page' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const page = await db.query.pages.findFirst({
      where: and(
        eq(pages.id, req.params.id),
        eq(pages.userId, req.user!.id)
      ),
    })
    if (!page) return res.status(404).json({ error: 'Page not found' })
    res.json(page)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch page' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db
      .delete(pages)
      .where(
        and(
          eq(pages.id, req.params.id),
          eq(pages.userId, req.user!.id)
        )
      )
      .returning()

    if (!deleted.length) return res.status(404).json({ error: 'Page not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete page' })
  }
})

export { router as pagesRouter }
