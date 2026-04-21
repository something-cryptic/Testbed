import './env.js'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.js'
import videosRouter from './routes/videos.js'
import analyzeRouter from './routes/analyze.js'
import usersRouter from './routes/users.js'
import proxyRouter from './routes/proxy.js'
import debugRouter from './routes/debug.js' // TODO: remove before launch

const app = express()
const PORT = process.env['PORT'] ?? 8000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/auth', authRouter)
app.use('/videos', videosRouter)
app.use('/analyze', analyzeRouter)
app.use('/users', usersRouter)
app.use('/proxy', proxyRouter)
app.use('/debug', debugRouter) // TODO: remove before launch

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
