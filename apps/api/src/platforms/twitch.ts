import type { NormalizedPost, PostMetrics, ChannelAnalytics } from '@analyzer/types'
import { BasePlatform } from './base.js'
import { getPlatformTokens } from '../db/index.js'

function getTwitchHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env['TWITCH_CLIENT_ID'] ?? '',
  }
}

// Parse Twitch duration strings like '3h20m10s', '45m30s', '1h' to seconds
function parseDuration(duration: string): number {
  const hours = duration.match(/(\d+)h/)
  const minutes = duration.match(/(\d+)m/)
  const seconds = duration.match(/(\d+)s/)
  return (
    (hours ? parseInt(hours[1]!) * 3600 : 0) +
    (minutes ? parseInt(minutes[1]!) * 60 : 0) +
    (seconds ? parseInt(seconds[1]!) : 0)
  )
}

interface TwitchVod {
  id: string
  title: string
  description: string
  created_at: string
  duration: string
  view_count: number
  thumbnail_url: string
  url: string
}

// Fetch videos with no type filter — returns all VOD types (archive, highlight, upload)
async function fetchAllVideos(
  broadcasterId: string,
  accessToken: string,
  first = 100,
): Promise<TwitchVod[]> {
  const params = new URLSearchParams({ user_id: broadcasterId, first: String(first) })
  const url = `https://api.twitch.tv/helix/videos?${params.toString()}`

  const res = await fetch(url, { headers: getTwitchHeaders(accessToken) })
  if (!res.ok) {
    const err = await res.text()
    console.warn(`Twitch /helix/videos failed (${res.status}):`, err)
    return []
  }

  const data = (await res.json()) as { data: TwitchVod[] }
  return data.data ?? []
}

const ZERO_METRICS: PostMetrics = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  watchTimeSeconds: 0,
  impressions: 0,
  clickThroughRate: 0,
  engagementRate: 0,
  averageViewPercentage: 0,
}

export class TwitchPlatform extends BasePlatform {
  private async getTokens(userId: string): Promise<{ accessToken: string }> {
    const tokens = getPlatformTokens(userId, 'twitch')
    if (!tokens) throw new Error(`No Twitch tokens for user ${userId}`)
    return { accessToken: tokens.accessToken }
  }

  private async getBroadcasterId(accessToken: string): Promise<string> {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: getTwitchHeaders(accessToken),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Twitch /helix/users failed: ${err}`)
    }
    const data = (await res.json()) as { data: { id: string }[] }
    const id = data.data[0]?.id
    if (!id) throw new Error('Twitch broadcaster ID not found')
    return id
  }

  async getRecentPosts(userId: string): Promise<NormalizedPost[]> {
    const { accessToken } = await this.getTokens(userId)
    const broadcasterId = await this.getBroadcasterId(accessToken)

    // No type filter — returns all VOD types; first=100 to maximise coverage
    const vods = await fetchAllVideos(broadcasterId, accessToken, 100)

    // Step 2 — get top clips (best-effort only, for future enrichment)
    let topClipIds = new Set<string>()
    try {
      const clipParams = new URLSearchParams({ broadcaster_id: broadcasterId, first: '5' })
      const clipRes = await fetch(`https://api.twitch.tv/helix/clips?${clipParams.toString()}`, {
        headers: getTwitchHeaders(accessToken),
      })
      if (clipRes.ok) {
        const clipData = (await clipRes.json()) as { data: { video_id: string }[] }
        topClipIds = new Set(clipData.data.map((c) => c.video_id))
      }
    } catch {
      // Non-fatal
    }

    void topClipIds

    return vods.map((vod) => ({
      platform: 'twitch',
      postId: vod.id,
      title: vod.title,
      description: vod.description ?? '',
      tags: [],
      publishedAt: vod.created_at,
      thumbnailUrl: vod.thumbnail_url
        .replace('%{width}', '640')
        .replace('%{height}', '360'),
      metrics: {
        views: vod.view_count,
        likes: 0,
        comments: 0,
        shares: 0,
        watchTimeSeconds: parseDuration(vod.duration),
        impressions: vod.view_count,
        clickThroughRate: 0,
        engagementRate: 0,
        averageViewPercentage: 0,
      },
    }))
  }

  async getPostAnalytics(_userId: string, postId: string): Promise<PostMetrics> {
    const { accessToken } = await this.getTokens(_userId)

    try {
      const res = await fetch(`https://api.twitch.tv/helix/videos?id=${postId}`, {
        headers: getTwitchHeaders(accessToken),
      })
      if (!res.ok) return ZERO_METRICS

      const data = (await res.json()) as {
        data: { view_count: number; duration: string }[]
      }
      const vod = data.data[0]
      if (!vod) return ZERO_METRICS

      return {
        views: vod.view_count,
        likes: 0,
        comments: 0,
        shares: 0,
        watchTimeSeconds: parseDuration(vod.duration),
        impressions: vod.view_count,
        clickThroughRate: 0,
        engagementRate: 0,
        averageViewPercentage: 0,
      }
    } catch {
      return ZERO_METRICS
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
      const { accessToken } = await this.getTokens(userId)
      const broadcasterId = await this.getBroadcasterId(accessToken)

      // Channel info — validates token/scope before continuing
      const channelParams = new URLSearchParams({ broadcaster_id: broadcasterId })
      const channelRes = await fetch(`https://api.twitch.tv/helix/channels?${channelParams.toString()}`, {
        headers: getTwitchHeaders(accessToken),
      })
      if (!channelRes.ok) return defaultAnalytics

      // Follower count
      let followerCount = 0
      try {
        const followerParams = new URLSearchParams({ broadcaster_id: broadcasterId })
        const followerRes = await fetch(
          `https://api.twitch.tv/helix/channels/followers?${followerParams.toString()}`,
          { headers: getTwitchHeaders(accessToken) },
        )
        if (followerRes.ok) {
          const followerData = (await followerRes.json()) as { total: number }
          followerCount = followerData.total ?? 0
        }
      } catch {
        // Follower endpoint may require elevated scope on some accounts
      }

      // Sum views and watch time across all VODs
      const allVods = await fetchAllVideos(broadcasterId, accessToken, 100)

      let totalViews = 0
      let totalWatchTime = 0
      for (const vod of allVods) {
        totalViews += vod.view_count
        totalWatchTime += parseDuration(vod.duration)
      }

      return {
        totalViews,
        totalWatchTime,
        subscribersGained: followerCount,
        subscribersLost: 0,
        period: 'last_90_days',
      }
    } catch (err) {
      console.warn('getChannelAnalytics (twitch) failed, using defaults:', err instanceof Error ? err.message : err)
      return defaultAnalytics
    }
  }
}
