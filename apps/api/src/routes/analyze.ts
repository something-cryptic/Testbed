import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { YouTubePlatform } from '../platforms/youtube.js'
import { InstagramPlatform } from '../platforms/instagram.js'
import {
  getCachedPosts,
  savePosts,
  saveAnalysis,
  getLatestAnalysis,
  getConnectedPlatforms,
} from '../db/index.js'
import { analyzeChannel } from '../analyzer/index.js'
import type { NormalizedPost, ChannelAnalytics } from '@analyzer/types'

const router = Router()

router.post('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    const connected = getConnectedPlatforms(userId).map((p) => p.platform)

    // Fetch posts from all connected platforms concurrently
    const fetchers: Promise<NormalizedPost[]>[] = []
    const analyticsMap: Record<string, Promise<ChannelAnalytics>> = {}

    if (connected.includes('youtube')) {
      const yt = new YouTubePlatform()
      const cached = getCachedPosts(userId, 'youtube') as NormalizedPost[] | null
      if (cached) {
        fetchers.push(Promise.resolve(cached))
      } else {
        const fresh = yt.getRecentPosts(userId).then((posts) => {
          savePosts(uuidv4(), userId, 'youtube', posts)
          return posts
        })
        fetchers.push(fresh)
      }
      analyticsMap['youtube'] = yt.getChannelAnalytics(userId)
    }

    if (connected.includes('instagram')) {
      const ig = new InstagramPlatform()
      const cached = getCachedPosts(userId, 'instagram') as NormalizedPost[] | null
      if (cached) {
        fetchers.push(Promise.resolve(cached))
      } else {
        const fresh = ig.getRecentPosts(userId).then((posts) => {
          savePosts(uuidv4(), userId, 'instagram', posts)
          return posts
        })
        fetchers.push(fresh)
      }
      analyticsMap['instagram'] = ig.getChannelAnalytics(userId)
    }

    if (fetchers.length === 0) {
      res.status(400).json({ error: 'No connected platforms found' })
      return
    }

    // Resolve all fetches concurrently
    const postResults = await Promise.allSettled(fetchers)
    const allPosts: NormalizedPost[] = postResults.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : [],
    )

    // Use first platform's analytics (or YouTube if available)
    const primaryPlatform = connected.includes('youtube') ? 'youtube' : connected[0]!
    const channelAnalytics = await (analyticsMap[primaryPlatform] ?? Promise.resolve({
      totalViews: 0,
      totalWatchTime: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      period: 'unknown',
    }))

    const result = await analyzeChannel(allPosts, channelAnalytics, connected)
    saveAnalysis(uuidv4(), userId, connected, result)

    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('Analyze error:', err)
    res.status(500).json({ error: message })
  }
})

router.get('/:userId/latest', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  const analysis = getLatestAnalysis(userId)
  if (!analysis) {
    res.status(404).json({ error: 'No analysis found' })
    return
  }
  res.json(analysis)
})

export default router
