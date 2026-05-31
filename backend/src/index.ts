import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { authRouter } from './routes/auth'
import { projectsRouter } from './routes/projects'
import { requireAuth } from './middleware/requireAuth'

const app = express()
const PORT = process.env.PORT || 3001
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
])

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())

app.get('/api/health', (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/projects', requireAuth, projectsRouter)

app.use((_, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Runtime42 backend running on port ${PORT}`)
})
