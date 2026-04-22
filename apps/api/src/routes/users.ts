import { Router } from 'express'
import type { Request, Response } from 'express'
import { google } from 'googleapis'
import {
  getUser,
  getPlatformTokens,
  getLastAnalyzedByPlatform,
  updatePlatformTokens,
  getUserProfile,
  updateUserProfile,
} from '../db/index.js'
import { refreshToken as refreshTwitchToken } from '../auth/twitch.js'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env['DATABASE_PATH'] ?? join(__dirname, '../../../../analyzer.db')
const db = new Database(dbPath)

const router = Router()

// ── In-memory profile cache (5 min TTL) ──────────────────────────────────────
const profileCache = new Map<string, { data: object; expiresAt: number }>()

export function invalidateProfileCache(userId: string) {
  profileCache.delete(userId)
}

interface PlatformProfile {
  platform: string
  channelName: string
  customUrl: string | null
  avatarUrl: string
  subscriberCount: number
  videoCount: number
  lastAnalyzed: string | null
}

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

async function getYouTubeProfile(userId: string): Promise<PlatformProfile> {
  const fallback: PlatformProfile = {
    platform: 'youtube',
    channelName: 'YouTube Channel',
    customUrl: null,
    avatarUrl: '',
    subscriberCount: 0,
    videoCount: 0,
    lastAnalyzed: null,
  }

  try {
    const auth = makeYouTubeAuthClient(userId)
    const youtube = google.youtube({ version: 'v3', auth })

    const res = await youtube.channels.list({ part: ['snippet', 'statistics'], mine: true })
    const channel = res.data.items?.[0]
    if (!channel) return fallback

    const thumbnails = channel.snippet?.thumbnails
    const avatarUrl = thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? ''

    return {
      platform: 'youtube',
      channelName: channel.snippet?.title ?? 'YouTube Channel',
      customUrl: channel.snippet?.customUrl ?? null,
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
    customUrl: null,
    avatarUrl: '',
    subscriberCount: 0,
    videoCount: 0,
    lastAnalyzed: null,
  }

  try {
    const tokens = getPlatformTokens(userId, 'instagram')
    if (!tokens) return fallback

    const params = new URLSearchParams({
      fields: 'username,profile_picture_url,followers_count,media_count',
      access_token: tokens.accessToken,
    })
    const res = await fetch(`https://graph.instagram.com/me?${params.toString()}`)
    if (!res.ok) return fallback

    const data = (await res.json()) as {
      username?: string
      profile_picture_url?: string
      followers_count?: number
      media_count?: number
    }

    return {
      platform: 'instagram',
      channelName: data.username ? `@${data.username}` : 'Instagram Account',
      customUrl: null,
      avatarUrl: data.profile_picture_url ?? '',
      subscriberCount: data.followers_count ?? 0,
      videoCount: data.media_count ?? 0,
      lastAnalyzed: null,
    }
  } catch (err) {
    console.error('getInstagramProfile error:', err instanceof Error ? err.message : String(err))
    return fallback
  }
}

async function getTwitchProfile(userId: string, tokenExpiresAt: string): Promise<PlatformProfile> {
  const fallback: PlatformProfile = {
    platform: 'twitch',
    channelName: 'Twitch Channel',
    customUrl: null,
    avatarUrl: '',
    subscriberCount: 0,
    videoCount: 0,
    lastAnalyzed: null,
  }

  try {
    // Refresh token if expired before making any API calls
    if (new Date(tokenExpiresAt) < new Date()) {
      try {
        await refreshTwitchToken(userId)
      } catch (refreshErr) {
        console.error('Twitch token refresh failed:', refreshErr instanceof Error ? refreshErr.message : String(refreshErr))
      }
    }

    // Re-fetch token from DB after potential refresh
    const tokens = getPlatformTokens(userId, 'twitch')
    if (!tokens) return fallback

    const clientId = process.env['TWITCH_CLIENT_ID'] ?? ''
    const headers = {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Client-Id': clientId,
    }

    // Step 1 — get user info
    const userRes = await fetch('https://api.twitch.tv/helix/users', { headers })
    if (!userRes.ok) {
      const errBody = await userRes.text()
      console.error('Twitch users endpoint failed:', userRes.status, errBody)
      return fallback
    }

    const userData = (await userRes.json()) as {
      data: { id: string; display_name: string; profile_image_url: string }[]
    }
    const twitchUser = userData.data[0]
    if (!twitchUser) return fallback

    // Step 2 — get follower count
    let followerCount = 0
    try {
      const followerParams = new URLSearchParams({ broadcaster_id: twitchUser.id })
      const followerRes = await fetch(
        `https://api.twitch.tv/helix/channels/followers?${followerParams.toString()}`,
        { headers },
      )
      if (followerRes.ok) {
        const followerData = (await followerRes.json()) as { total: number }
        followerCount = followerData.total ?? 0
      } else {
        const errBody = await followerRes.text()
        console.warn('Twitch followers endpoint failed:', followerRes.status, errBody)
      }
    } catch (err) {
      console.error('Twitch follower fetch error:', err instanceof Error ? err.message : String(err))
    }

    // Step 3 — get VOD count by reading data.length
    // pagination.total is not populated by Twitch on the videos endpoint
    let vodCount = 0
    try {
      const vodParams = new URLSearchParams({ user_id: twitchUser.id, first: '100' })
      const vodRes = await fetch(
        `https://api.twitch.tv/helix/videos?${vodParams.toString()}`,
        { headers },
      )
      if (vodRes.ok) {
        const vodData = (await vodRes.json()) as { data: { id: string }[] }
        vodCount = vodData.data?.length ?? 0
      } else {
        const errBody = await vodRes.text()
        console.warn('Twitch videos endpoint failed:', vodRes.status, errBody)
      }
    } catch (err) {
      console.error('Twitch VOD count fetch error:', err instanceof Error ? err.message : String(err))
    }

    return {
      platform: 'twitch',
      channelName: twitchUser.display_name,
      customUrl: null,
      avatarUrl: twitchUser.profile_image_url,
      subscriberCount: followerCount,
      videoCount: vodCount,
      lastAnalyzed: null,
    }
  } catch (err) {
    console.error('getTwitchProfile error:', err instanceof Error ? err.message : String(err))
    return fallback
  }
}

// GET /users/:userId/profile
router.get('/:userId/profile', async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }

  try {
    const cached = profileCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.data)
      return
    }

    const user = getUser(userId)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const userProfile = getUserProfile(userId)

    const platforms = db.prepare(
      'SELECT * FROM connected_platforms WHERE user_id = ?'
    ).all(userId) as {
      id: string; user_id: string; platform: string
      access_token: string; refresh_token: string; expires_at: string
    }[]

    const lastAnalyzed = getLastAnalyzedByPlatform(userId)

    const profilePromises = platforms.map((cp) => {
      if (cp.platform === 'youtube') return getYouTubeProfile(userId)
      if (cp.platform === 'instagram') return getInstagramProfile(userId)
      if (cp.platform === 'twitch') return getTwitchProfile(userId, cp.expires_at)
      return Promise.resolve<PlatformProfile>({
        platform: cp.platform, channelName: cp.platform, customUrl: null,
        avatarUrl: '', subscriberCount: 0, videoCount: 0, lastAnalyzed: null,
      })
    })

    const profiles = await Promise.all(profilePromises)
    const connectedPlatforms: PlatformProfile[] = profiles.map((p) => ({
      ...p,
      lastAnalyzed: lastAnalyzed[p.platform] ?? null,
    }))

    const displayEmail = user.email.startsWith('instagram:') ? null : user.email

    const effectiveAvatarUrl = userProfile?.customAvatarUrl ?? user.avatarUrl ?? null
    const effectiveName = userProfile?.username ?? user.name ?? null

    const responseBody = {
      name: effectiveName,
      googleName: user.name ?? null,
      email: displayEmail,
      avatarUrl: effectiveAvatarUrl,
      googleAvatarUrl: user.avatarUrl ?? null,
      username: userProfile?.username ?? null,
      customAvatarUrl: userProfile?.customAvatarUrl ?? null,
      preferences: userProfile?.preferences ?? null,
      connectedPlatforms,
      lastHolisticAnalysis: lastAnalyzed['all'] ?? null,
    }

    profileCache.set(userId, { data: responseBody, expiresAt: Date.now() + 5 * 60 * 1000 })
    res.json(responseBody)
  } catch (err) {
    console.error('Profile error:', err instanceof Error ? err.message : String(err))
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

// PUT /users/:userId/profile
router.put('/:userId/profile', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const body = req.body as { username?: unknown; customAvatarUrl?: unknown; preferences?: unknown }

  const updates: { username?: string; customAvatarUrl?: string | null; preferences?: string } = {}

  if ('username' in body) {
    if (body.username !== null && body.username !== undefined) {
      const u = String(body.username).trim()
      if (u.length > 32) { res.status(400).json({ error: 'Username must be 32 characters or fewer' }); return }
      if (u.length > 0 && !/^[a-zA-Z0-9_]+$/.test(u)) {
        res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores' }); return
      }
      updates.username = u.length > 0 ? u : undefined
    } else {
      updates.username = undefined
    }
  }

  if ('customAvatarUrl' in body) {
    if (body.customAvatarUrl === null || body.customAvatarUrl === '') {
      updates.customAvatarUrl = null
    } else {
      const urlStr = String(body.customAvatarUrl).trim()
      try {
        new URL(urlStr)
      } catch {
        res.status(400).json({ error: 'customAvatarUrl must be a valid URL' }); return
      }
      updates.customAvatarUrl = urlStr
    }
  }

  if ('preferences' in body && body.preferences !== null && body.preferences !== undefined) {
    updates.preferences = JSON.stringify(body.preferences)
  }

  const updated = updateUserProfile(userId, updates)
  if (!updated) { res.status(404).json({ error: 'User not found' }); return }

  invalidateProfileCache(userId)

  res.json({
    username: updated.username,
    customAvatarUrl: updated.customAvatarUrl,
    preferences: updated.preferences,
  })
})

export default router
