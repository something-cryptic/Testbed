import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { YouTubePlatform } from '../platforms/youtube.js'
import { InstagramPlatform } from '../platforms/instagram.js'
import { getCachedPosts, savePosts, getConnectedPlatforms } from '../db/index.js'
import type { NormalizedPost } from '@analyzer/types'

const router = Router()

router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    const connected = getConnectedPlatforms(userId).map((p) => p.platform)

    const fetchers: Promise<NormalizedPost[]>[] = []

    if (connected.includes('youtube')) {
      const cached = getCachedPosts(userId, 'youtube', 3600_000) as NormalizedPost[] | null
      if (cached) {
        fetchers.push(Promise.resolve(cached))
      } else {
        const yt = new YouTubePlatform()
        fetchers.push(
          yt.getRecentPosts(userId).then((posts) => {
            savePosts(uuidv4(), userId, 'youtube', posts)
            return posts
          }),
        )
      }
    }

    if (connected.includes('instagram')) {
      const cached = getCachedPosts(userId, 'instagram', 3600_000) as NormalizedPost[] | null
      if (cached) {
        fetchers.push(Promise.resolve(cached))
      } else {
        const ig = new InstagramPlatform()
        fetchers.push(
          ig.getRecentPosts(userId).then((posts) => {
            savePosts(uuidv4(), userId, 'instagram', posts)
            return posts
          }),
        )
      }
    }

    // Fallback: no platforms connected yet — try YouTube directly
    if (fetchers.length === 0) {
      const yt = new YouTubePlatform()
      const posts = await yt.getRecentPosts(userId)
      savePosts(uuidv4(), userId, 'youtube', posts)
      res.json({ posts, cached: false })
      return
    }

    const results = await Promise.allSettled(fetchers)
    const allPosts: NormalizedPost[] = results.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : [],
    )

    // Sort combined feed by publish date descending
    allPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    res.json({ posts: allPosts, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch videos'
    console.error('Videos error:', err)
    res.status(500).json({ error: message })
  }
})

export default router
