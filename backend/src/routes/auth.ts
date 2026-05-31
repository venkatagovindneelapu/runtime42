import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { id, email, name } = req.user!
    const { avatarUrl, githubUsername } = req.body

    await db
      .insert(users)
      .values({
        id,
        email,
        name: name ?? req.body.name ?? null,
        avatarUrl: avatarUrl ?? null,
        githubUsername: githubUsername ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          name: name ?? req.body.name ?? null,
          avatarUrl: avatarUrl ?? null,
          githubUsername: githubUsername ?? null,
          updatedAt: new Date(),
        },
      })

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })

    res.json(user)
  } catch (err) {
    console.error('Sync error:', err)
    res.status(500).json({ error: 'Failed to sync user' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

export { router as authRouter }
