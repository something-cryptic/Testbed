import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

const ALLOWED_HOSTS = new Set([
  'yt3.ggpht.com',
  'lh3.googleusercontent.com',
  'graph.instagram.com',
  'static-cdn.jtvnw.net',
  'clips-media-assets2.twitch.tv',
])

router.get('/image', async (req: Request, res: Response) => {
  const raw = req.query['url'] as string | undefined
  if (!raw) {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }

  let parsed: URL
  try {
    parsed = new URL(decodeURIComponent(raw))
  } catch {
    res.status(400).json({ error: 'Invalid url parameter' })
    return
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    res.status(403).json({ error: `Host not allowed: ${parsed.hostname}` })
    return
  }

  try {
    const upstream = await fetch(parsed.toString())
    if (!upstream.ok) {
      res.status(upstream.status).end()
      return
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('Image proxy error:', err instanceof Error ? err.message : String(err))
    res.status(502).json({ error: 'Failed to fetch image' })
  }
})

export default router
