import { google } from 'googleapis'
import type { NormalizedPost, PostMetrics, ChannelAnalytics } from '@analyzer/types'
import { BasePlatform } from './base.js'
import { getPlatformTokens, updatePlatformTokens } from '../db/index.js'

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET'],
    process.env['REDIRECT_URI'],
  )
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0')
}

export class YouTubePlatform extends BasePlatform {
  private async getAuthClient(userId: string) {
    const tokens = getPlatformTokens(userId, 'youtube')
    if (!tokens) throw new Error(`No YouTube tokens for user ${userId}`)

    const auth = makeOAuth2Client()
    auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: new Date(tokens.expiresAt).getTime(),
    })

    // Auto-refresh if needed
    auth.on('tokens', (newTokens) => {
      if (newTokens.access_token) {
        const expiresAt = newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : new Date(Date.now() + 3600_000).toISOString()
        updatePlatformTokens(userId, 'youtube', newTokens.access_token, expiresAt)
      }
    })

    return auth
  }

  async getRecentPosts(userId: string): Promise<NormalizedPost[]> {
    const auth = await this.getAuthClient(userId)
    const youtube = google.youtube({ version: 'v3', auth })

    // 1. Get uploads playlist ID
    const channelRes = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true,
    })
    const uploadsPlaylistId =
      channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) return []

    // 2. Fetch playlist items (up to 50)
    const playlistRes = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
    })
    const videoIds = (playlistRes.data.items ?? [])
      .map((i) => i.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id))

    if (videoIds.length === 0) return []

    // 3. Batch-fetch video details (50 at a time)
    const posts: NormalizedPost[] = []
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50)
      const videosRes = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: batch,
      })
      for (const v of videosRes.data.items ?? []) {
        const snippet = v.snippet ?? {}
        const stats = v.statistics ?? {}
        const content = v.contentDetails ?? {}

        const views = parseInt(stats.viewCount ?? '0')
        const likes = parseInt(stats.likeCount ?? '0')
        const comments = parseInt(stats.commentCount ?? '0')
        const durationSec = parseDuration(content.duration ?? '')
        const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0

        posts.push({
          platform: 'youtube',
          postId: v.id ?? '',
          title: snippet.title ?? '',
          description: snippet.description ?? '',
          tags: snippet.tags ?? [],
          publishedAt: snippet.publishedAt ?? '',
          thumbnailUrl:
            snippet.thumbnails?.medium?.url ??
            snippet.thumbnails?.default?.url ??
            `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
          metrics: {
            views,
            likes,
            comments,
            shares: 0,
            watchTimeSeconds: durationSec,
            impressions: 0,
            clickThroughRate: 0,
            engagementRate,
            averageViewPercentage: 0,
          },
        })
      }
    }

    return posts
  }

  async getPostAnalytics(userId: string, postId: string): Promise<PostMetrics> {
    const auth = await this.getAuthClient(userId)
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth })

    const endDate = new Date().toISOString().split('T')[0]!
    const startDate = new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0]!

    try {
      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics:
          'views,likes,comments,estimatedMinutesWatched,impressions,impressionClickThroughRate,averageViewPercentage',
        dimensions: 'video',
        filters: `video==${postId}`,
      })

      const row = res.data.rows?.[0]
      if (!row) {
        return {
          views: 0, likes: 0, comments: 0, shares: 0,
          watchTimeSeconds: 0, impressions: 0, clickThroughRate: 0,
          engagementRate: 0, averageViewPercentage: 0,
        }
      }

      const views = Number(row[1] ?? 0)
      const likes = Number(row[2] ?? 0)
      const comments = Number(row[3] ?? 0)
      return {
        views,
        likes,
        comments,
        shares: 0,
        watchTimeSeconds: Number(row[4] ?? 0) * 60,
        impressions: Number(row[5] ?? 0),
        clickThroughRate: Number(row[6] ?? 0),
        engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
        averageViewPercentage: Number(row[7] ?? 0),
      }
    } catch {
      return {
        views: 0, likes: 0, comments: 0, shares: 0,
        watchTimeSeconds: 0, impressions: 0, clickThroughRate: 0,
        engagementRate: 0, averageViewPercentage: 0,
      }
    }
  }

  async getChannelAnalytics(userId: string): Promise<ChannelAnalytics> {
    const defaultAnalytics: ChannelAnalytics = {
      totalViews: 0,
      totalWatchTime: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      period: 'last_90_days',
    }

    try {
      const auth = await this.getAuthClient(userId)
      const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth })

      const endDate = new Date().toISOString().split('T')[0]!
      const startDate = new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0]!

      const res = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
      })

      const row = res.data.rows?.[0] ?? [0, 0, 0, 0]
      return {
        totalViews: Number(row[0] ?? 0),
        totalWatchTime: Number(row[1] ?? 0),
        subscribersGained: Number(row[2] ?? 0),
        subscribersLost: Number(row[3] ?? 0),
        period: `${startDate} to ${endDate}`,
      }
    } catch (err) {
      console.warn('getChannelAnalytics failed, using defaults:', err instanceof Error ? err.message : err)
      return defaultAnalytics
    }
  }
}
