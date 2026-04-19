import type { NormalizedPost, PostMetrics, ChannelAnalytics } from '@analyzer/types'
import { BasePlatform } from './base.js'
import { getPlatformTokens } from '../db/index.js'

const BASE = 'https://graph.instagram.com'

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w]+/g)
  return matches ? matches.map((t) => t.slice(1).toLowerCase()) : []
}

function getMetricValue(insights: { name: string; values?: { value: number }[] }[], name: string): number {
  const metric = insights.find((m) => m.name === name)
  if (!metric?.values?.length) return 0
  // Sum all period values for totals
  return metric.values.reduce((sum, v) => sum + (v.value ?? 0), 0)
}

export class InstagramPlatform extends BasePlatform {
  private async getToken(userId: string): Promise<string> {
    const tokens = getPlatformTokens(userId, 'instagram')
    if (!tokens) throw new Error(`No Instagram tokens for user ${userId}`)
    return tokens.accessToken
  }

  private async apiFetch<T>(path: string, token: string, extraParams?: Record<string, string>): Promise<T> {
    const params = new URLSearchParams({ access_token: token, ...extraParams })
    const res = await fetch(`${BASE}${path}?${params.toString()}`)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Instagram API error [${path}]: ${err}`)
    }
    return res.json() as Promise<T>
  }

  async getRecentPosts(userId: string): Promise<NormalizedPost[]> {
    const token = await this.getToken(userId)

    // 1. Fetch media list
    const mediaRes = await this.apiFetch<{
      data: {
        id: string
        caption?: string
        media_type: string
        timestamp: string
        permalink: string
        thumbnail_url?: string
        media_url?: string
      }[]
    }>('/me/media', token, {
      fields: 'id,caption,media_type,timestamp,permalink,thumbnail_url,media_url',
      limit: '50',
    })

    const posts: NormalizedPost[] = []

    for (const media of mediaRes.data) {
      // 2. Fetch per-post insights
      let insights: { name: string; values?: { value: number }[] }[] = []
      try {
        const insightMetrics = [
          'impressions',
          'reach',
          'likes',
          'comments',
          'shares',
          'saved',
          'video_views',
          'total_interactions',
        ].join(',')
        const insightRes = await this.apiFetch<{ data: typeof insights }>(
          `/${media.id}/insights`,
          token,
          { metric: insightMetrics },
        )
        insights = insightRes.data
      } catch {
        // Insights not available for all media types (e.g. old posts) — continue with zeros
      }

      const reach = getMetricValue(insights, 'reach')
      const likes = getMetricValue(insights, 'likes')
      const comments = getMetricValue(insights, 'comments')
      const shares = getMetricValue(insights, 'shares')
      const videoViews = getMetricValue(insights, 'video_views')
      const impressions = getMetricValue(insights, 'impressions')

      const views = videoViews > 0 ? videoViews : reach
      const engagementRate = reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0

      const caption = media.caption ?? ''
      const title = caption.slice(0, 60) || `${media.media_type} post`

      posts.push({
        platform: 'instagram',
        postId: media.id,
        title,
        description: caption,
        tags: extractHashtags(caption),
        publishedAt: media.timestamp,
        thumbnailUrl: media.thumbnail_url ?? media.media_url ?? '',
        metrics: {
          views,
          likes,
          comments,
          shares,
          watchTimeSeconds: 0,
          impressions,
          clickThroughRate: 0,
          engagementRate,
          averageViewPercentage: 0,
        },
      })
    }

    return posts
  }

  async getPostAnalytics(_userId: string, postId: string): Promise<PostMetrics> {
    // Re-fetch insights for a single post using the stored token
    // postId here is the instagram media id; userId unused since token is per-platform
    const token = await this.getToken(_userId)

    const metrics = [
      'impressions', 'reach', 'likes', 'comments', 'shares',
      'saved', 'video_views', 'total_interactions',
    ].join(',')

    try {
      const res = await this.apiFetch<{
        data: { name: string; values?: { value: number }[] }[]
      }>(`/${postId}/insights`, token, { metric: metrics })

      const insights = res.data
      const reach = getMetricValue(insights, 'reach')
      const likes = getMetricValue(insights, 'likes')
      const comments = getMetricValue(insights, 'comments')
      const shares = getMetricValue(insights, 'shares')
      const videoViews = getMetricValue(insights, 'video_views')
      const impressions = getMetricValue(insights, 'impressions')
      const views = videoViews > 0 ? videoViews : reach

      return {
        views,
        likes,
        comments,
        shares,
        watchTimeSeconds: 0,
        impressions,
        clickThroughRate: 0,
        engagementRate: reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0,
        averageViewPercentage: 0,
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
    const token = await this.getToken(userId)

    // 1. Basic account fields
    const meRes = await this.apiFetch<{
      followers_count: number
      follows_count: number
      media_count: number
    }>('/me', token, { fields: 'followers_count,follows_count,media_count' })

    // 2. Profile-level insights (last 90 days summed over daily periods)
    const since = Math.floor((Date.now() - 90 * 86400_000) / 1000).toString()
    const until = Math.floor(Date.now() / 1000).toString()

    let profileViews = 0
    let websiteClicks = 0
    try {
      const insightRes = await this.apiFetch<{
        data: { name: string; values: { value: number }[] }[]
      }>('/me/insights', token, {
        metric: 'profile_views,website_clicks',
        period: 'day',
        since,
        until,
      })
      profileViews = getMetricValue(insightRes.data, 'profile_views')
      websiteClicks = getMetricValue(insightRes.data, 'website_clicks')
    } catch {
      // Business account insights may not be available for all accounts
    }

    return {
      totalViews: profileViews,
      totalWatchTime: 0,
      subscribersGained: meRes.followers_count,
      subscribersLost: 0,
      period: 'last_90_days',
    }
  }
}
