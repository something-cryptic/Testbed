import { v4 as uuidv4 } from 'uuid'
import { savePlatformTokens, updatePlatformTokens, getPlatformTokens } from '../db/index.js'

export function generateAuthUrl(userId: string): string {
  const scopes = [
    'user:read:email',
    'bits:read',
    'channel:read:subscriptions',
    'moderator:read:followers',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: process.env['TWITCH_CLIENT_ID'] ?? '',
    redirect_uri: process.env['TWITCH_REDIRECT_URI'] ?? 'http://localhost:8000/auth/twitch/callback',
    response_type: 'code',
    scope: scopes,
    state: userId,
  })

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
}

export async function exchangeCode(
  code: string,
  userId: string,
): Promise<{ userId: string; platform: string }> {
  const redirectUri = process.env['TWITCH_REDIRECT_URI'] ?? 'http://localhost:8000/auth/twitch/callback'
  const clientId = process.env['TWITCH_CLIENT_ID'] ?? ''
  const clientSecret = process.env['TWITCH_CLIENT_SECRET'] ?? ''

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: tokenBody,
  })
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Twitch token exchange failed: ${err}`)
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  const { access_token, refresh_token, expires_in } = tokenData

  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Client-Id': clientId,
    },
  })
  if (!userRes.ok) {
    const err = await userRes.text()
    throw new Error(`Twitch user info fetch failed: ${err}`)
  }
  const userData = (await userRes.json()) as {
    data: {
      id: string
      login: string
      display_name: string
      profile_image_url: string
      broadcaster_type: string
    }[]
  }
  const twitchUser = userData.data[0]
  if (!twitchUser) throw new Error('Twitch user data empty')

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
  savePlatformTokens(uuidv4(), userId, 'twitch', access_token, refresh_token, expiresAt)

  return { userId, platform: 'twitch' }
}

export async function refreshToken(userId: string): Promise<void> {
  const stored = getPlatformTokens(userId, 'twitch')
  if (!stored) throw new Error('No stored Twitch tokens')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
    client_id: process.env['TWITCH_CLIENT_ID'] ?? '',
    client_secret: process.env['TWITCH_CLIENT_SECRET'] ?? '',
  })

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twitch token refresh failed: ${err}`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  updatePlatformTokens(userId, 'twitch', data.access_token, newExpiresAt)
}
