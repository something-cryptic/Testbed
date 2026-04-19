import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { YouTubePlatform } from '../platforms/youtube.js'
import { getCachedPosts, savePosts, saveAnalysis, getLatestAnalysis } from '../db/index.js'
import { analyzeChannel } from '../analyzer/index.js'
import type { NormalizedPost } from '@analyzer/types'

const router = Router()

router.post('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    const platform = new YouTubePlatform()

    // Use cached posts or fetch fresh
    let posts = getCachedPosts(userId, 'youtube') as NormalizedPost[] | null
    if (!posts) {
      posts = await platform.getRecentPosts(userId)
      savePosts(uuidv4(), userId, 'youtube', posts)
    }

    const channelAnalytics = await platform.getChannelAnalytics(userId)
    const result = await analyzeChannel(posts, channelAnalytics, 'youtube')

    saveAnalysis(uuidv4(), userId, ['youtube'], result)

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
