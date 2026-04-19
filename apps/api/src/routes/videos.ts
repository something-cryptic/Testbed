import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { YouTubePlatform } from '../platforms/youtube.js'
import { getCachedPosts, savePosts } from '../db/index.js'
import type { NormalizedPost } from '@analyzer/types'

const router = Router()

router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    // Return cached posts if fresh (< 1 hour old)
    const cached = getCachedPosts(userId, 'youtube', 3600_000)
    if (cached) {
      res.json({ posts: cached, cached: true })
      return
    }

    const platform = new YouTubePlatform()
    const posts = await platform.getRecentPosts(userId)

    // Persist to cache
    savePosts(uuidv4(), userId, 'youtube', posts)

    res.json({ posts, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch videos'
    console.error('Videos error:', err)
    res.status(500).json({ error: message })
  }
})

export default router
