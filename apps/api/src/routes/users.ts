import { Router } from 'express'
import type { Request, Response } from 'express'
import { google } from 'googleapis'
import { getUser, getPlatformTokens, getLastAnalyzedByPlatform, updatePlatformTokens } from '../db/index.js'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env['DATABASE_PATH'] ?? join(__dirname, '../../../../analyzer.db')
const db = new Database(dbPath)

const router = Router()

interface PlatformProfile {
  platform: string
  channelName: string
  avatarUrl: string
  subscriberCount: number
  videoCount: number
  lastAnalyzed: string | null
}

// Matches the getAuthClient pattern in platforms/youtube.ts exactly:
// initializes OAuth2, sets stored credentials, and wires the tokens
// event so any refreshed access token is persisted back to the DB.
function makeYouTubeAuthClient(userId: string) {
  const tokens = getPlatformTokens(userId, 'youtube')
  if (!tokens) throw new Error(`No YouTube tokens for user ${userId}`)

  const auth = new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET'],
    process.env['REDIRECT_URI'],
  )
  auth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: new Date(tokens.expiresAt).getTime(),
  })

  // Persist any auto-refreshed token back to DB so it's not lost
  auth.on('tokens', (newTokens) => {
    if (newTokens.access_token) {
      const expiresAt = newTokens.expiry_date
        ? new Date(newTokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600_000).toISOString()
      updatePlatformTokens(userId, 'youtube', newTokens.access_token, expiresAt)
      console.log('YouTube token auto-refreshed and saved for userId:', userId)
    }
  })

  return auth
}

async function getYouTubeProfile(userId: string): Promise<PlatformProfile> {
  const fallback: PlatformProfile = {
    platform: 'youtube',
    channelName: 'YouTube Channel',
    avatarUrl: '',
    subscriberCount: 0,
    videoCount: 0,
    lastAnalyzed: null,
  }

  try {
    const auth = makeYouTubeAuthClient(userId)
    const youtube = google.youtube({ version: 'v3', auth })

    console.log('Fetching YouTube channel details...')
    const res = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    })
    console.log('YouTube channel snippet:', JSON.stringify(res.data.items?.[0]?.snippet))

    const channel = res.data.items?.[0]
    if (!channel) {
      console.log('YouTube channel response contained no items')
      return fallback
    }

    const thumbnails = channel.snippet?.thumbnails
    const avatarUrl =
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url ??
      ''
    console.log('YouTube avatar URL resolved:', avatarUrl)

    return {
      platform: 'youtube',
      channelName: channel.snippet?.title ?? 'YouTube Channel',
      avatarUrl,
      subscriberCount: parseInt(channel.statistics?.subscriberCount ?? '0'),
      videoCount: parseInt(channel.statistics?.videoCount ?? '0'),
      lastAnalyzed: null,
    }
  } catch (err) {
    console.error('getYouTubeProfile error:', err instanceof Error ? err.message : String(err))
    return fallback
  }
}

async function getInstagramProfile(userId: string): Promise<PlatformProfile> {
  const fallback: PlatformProfile = {
    platform: 'instagram',
    channelName: 'Instagram Account',
    avatarUrl: '',
    subscriberCount: 0,
    videoCount: 0,
    lastAnalyzed: null,
  }

  try {
    const tokens = getPlatformTokens(userId, 'instagram')
    if (!tokens) {
      console.log('getInstagramProfile: no tokens found for userId:', userId)
      return fallback
    }

    const params = new URLSearchParams({
      fields: 'username,profile_picture_url,followers_count,media_count',
      access_token: tokens.accessToken,
    })
    const res = await fetch(`https://graph.instagram.com/me?${params.toString()}`)
    if (!res.ok) {
      console.error('Instagram Graph API returned', res.status)
      return fallback
    }

    const data = (await res.json()) as {
      username?: string
      profile_picture_url?: string
      followers_count?: number
      media_count?: number
    }

    return {
      platform: 'instagram',
      channelName: data.username ? `@${data.username}` : 'Instagram Account',
      avatarUrl: data.profile_picture_url ?? '',
      subscriberCount: data.followers_count ?? 0,
      videoCount: data.media_count ?? 0,
      lastAnalyzed: null,
    }
  } catch (err) {
    console.error('getInstagramProfile unexpected error:', err instanceof Error ? err.message : String(err))
    return fallback
  }
}

router.get('/:userId/profile', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    const user = getUser(userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const platforms = db.prepare(
      'SELECT * FROM connected_platforms WHERE user_id = ?'
    ).all(userId) as {
      id: string
      user_id: string
      platform: string
      access_token: string
      refresh_token: string
      expires_at: string
    }[]
    console.log('Raw platform query result:', platforms)

    const lastAnalyzed = getLastAnalyzedByPlatform(userId)

    const profilePromises = platforms.map((cp) => {
      if (cp.platform === 'youtube') return getYouTubeProfile(userId)
      if (cp.platform === 'instagram') return getInstagramProfile(userId)
      return Promise.resolve<PlatformProfile>({
        platform: cp.platform,
        channelName: cp.platform,
        avatarUrl: '',
        subscriberCount: 0,
        videoCount: 0,
        lastAnalyzed: null,
      })
    })

    const profiles = await Promise.all(profilePromises)
    const connectedPlatforms: PlatformProfile[] = profiles.map((p) => ({
      ...p,
      lastAnalyzed: lastAnalyzed[p.platform] ?? null,
    }))

    console.log('connectedPlatforms being returned:', JSON.stringify(connectedPlatforms))

    const displayEmail = user.email.startsWith('instagram:')
      ? null
      : user.email

    res.json({
      name: user.name ?? null,
      email: displayEmail,
      avatarUrl: user.avatarUrl ?? null,
      connectedPlatforms,
      lastHolisticAnalysis: lastAnalyzed['all'] ?? null,
    })
  } catch (err) {
    console.error('Profile error:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

export default router
