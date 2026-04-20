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

const DEFAULT_ANALYTICS: ChannelAnalytics = {
  totalViews: 0,
  totalWatchTime: 0,
  subscribersGained: 0,
  subscribersLost: 0,
  period: 'last_90_days',
}

router.post('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  // ?platform=youtube | instagram | all (default: all)
  const platformParam = (req.query['platform'] as string | undefined) ?? 'all'

  try {
    const allConnected = getConnectedPlatforms(userId).map((p) => p.platform)

    // Determine which platforms to include in this run
    const targetPlatforms =
      platformParam === 'all'
        ? allConnected
        : allConnected.filter((p) => p === platformParam)

    if (targetPlatforms.length === 0) {
      res.status(400).json({ error: `No connected platform matching '${platformParam}'` })
      return
    }

    const fetchers: Promise<NormalizedPost[]>[] = []
    const analyticsMap: Record<string, Promise<ChannelAnalytics>> = {}

    if (targetPlatforms.includes('youtube')) {
      const yt = new YouTubePlatform()
      const cached = getCachedPosts(userId, 'youtube') as NormalizedPost[] | null
      fetchers.push(
        cached
          ? Promise.resolve(cached)
          : yt.getRecentPosts(userId).then((posts) => {
              savePosts(uuidv4(), userId, 'youtube', posts)
              return posts
            }),
      )
      analyticsMap['youtube'] = yt.getChannelAnalytics(userId).catch((err) => {
        console.warn('YouTube getChannelAnalytics error:', err instanceof Error ? err.message : err)
        return DEFAULT_ANALYTICS
      })
    }

    if (targetPlatforms.includes('instagram')) {
      const ig = new InstagramPlatform()
      const cached = getCachedPosts(userId, 'instagram') as NormalizedPost[] | null
      fetchers.push(
        cached
          ? Promise.resolve(cached)
          : ig.getRecentPosts(userId).then((posts) => {
              savePosts(uuidv4(), userId, 'instagram', posts)
              return posts
            }),
      )
      analyticsMap['instagram'] = ig.getChannelAnalytics(userId).catch((err) => {
        console.warn('Instagram getChannelAnalytics error:', err instanceof Error ? err.message : err)
        return DEFAULT_ANALYTICS
      })
    }

    const postResults = await Promise.allSettled(fetchers)
    const allPosts: NormalizedPost[] = postResults.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : [],
    )

    const primaryPlatform = targetPlatforms.includes('youtube') ? 'youtube' : targetPlatforms[0]!
    const channelAnalytics = await (analyticsMap[primaryPlatform] ?? Promise.resolve(DEFAULT_ANALYTICS))

    const result = await analyzeChannel(allPosts, channelAnalytics, targetPlatforms)
    saveAnalysis(uuidv4(), userId, targetPlatforms, result)

    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('Analyze error:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: message })
  }
})

router.get('/:userId/latest', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const platform = req.query['platform'] as string | undefined

  const analysis = getLatestAnalysis(userId, platform)
  res.status(200).json({ analysis: analysis ?? null })
})

export default router
