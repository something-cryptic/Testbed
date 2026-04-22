import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { YouTubePlatform } from '../platforms/youtube.js'
import { InstagramPlatform } from '../platforms/instagram.js'
import { TwitchPlatform } from '../platforms/twitch.js'
import { getCachedPosts, savePosts, getConnectedPlatforms } from '../db/index.js'
import type { NormalizedPost } from '@analyzer/types'

const router = Router()

router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const platformParam = req.query['platform'] as string | undefined

  try {
    const connected = getConnectedPlatforms(userId).map((p) => p.platform)

    // If a specific platform is requested, filter to just that one
    const targets = platformParam
      ? connected.filter((p) => p === platformParam)
      : connected

    if (platformParam && targets.length === 0) {
      res.status(400).json({ error: `Platform '${platformParam}' is not connected` })
      return
    }

    // Single-platform request: return { platform, posts }
    if (platformParam) {
      const platform = platformParam
      let posts: NormalizedPost[] = []

      const cached = getCachedPosts(userId, platform, 3600_000) as NormalizedPost[] | null
      if (cached) {
        posts = cached
      } else if (platform === 'youtube') {
        const yt = new YouTubePlatform()
        posts = await yt.getRecentPosts(userId)
        savePosts(uuidv4(), userId, 'youtube', posts)
      } else if (platform === 'instagram') {
        const ig = new InstagramPlatform()
        posts = await ig.getRecentPosts(userId)
        savePosts(uuidv4(), userId, 'instagram', posts)
      } else if (platform === 'twitch') {
        const tw = new TwitchPlatform()
        posts = await tw.getRecentPosts(userId)
        savePosts(uuidv4(), userId, 'twitch', posts)
      }

      posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      res.json({ platform, posts })
      return
    }

    // No platform param: fetch all connected platforms, return combined feed
    const fetchers: Promise<NormalizedPost[]>[] = []

    if (targets.includes('youtube')) {
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

    if (targets.includes('instagram')) {
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

    if (targets.includes('twitch')) {
      const cached = getCachedPosts(userId, 'twitch', 3600_000) as NormalizedPost[] | null
      if (cached) {
        fetchers.push(Promise.resolve(cached))
      } else {
        const tw = new TwitchPlatform()
        fetchers.push(
          tw.getRecentPosts(userId).then((posts) => {
            savePosts(uuidv4(), userId, 'twitch', posts)
            return posts
          }),
        )
      }
    }

    // Fallback: no platforms connected — try YouTube directly
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

    allPosts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    res.json({ posts: allPosts, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch videos'
    console.error('Videos error:', err)
    res.status(500).json({ error: message })
  }
})

export default router
