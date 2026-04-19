import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { join, dirname } from 'path'

// Load .env from monorepo root
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../../../.env') })

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.js'
import videosRouter from './routes/videos.js'
import analyzeRouter from './routes/analyze.js'

const app = express()
const PORT = process.env['PORT'] ?? 8000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/auth', authRouter)
app.use('/videos', videosRouter)
app.use('/analyze', analyzeRouter)

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
