import { v4 as uuidv4 } from 'uuid'
import { upsertGoogleUser, savePlatformTokens, updatePlatformTokens, getPlatformTokens } from '../db/index.js'
import type { User } from '@analyzer/types'

const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
].join(',')

export function generateAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env['META_APP_ID'] ?? '',
    redirect_uri: process.env['INSTAGRAM_REDIRECT_URI'] ?? 'http://localhost:8000/auth/instagram/callback',
    scope: SCOPES,
    response_type: 'code',
  })
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCode(
  code: string,
): Promise<{ userId: string; tokens: { accessToken: string; expiresAt: string } }> {
  const redirectUri = process.env['INSTAGRAM_REDIRECT_URI'] ?? 'http://localhost:8000/auth/instagram/callback'

  // 1. Exchange code for short-lived token
  const tokenBody = new URLSearchParams({
    client_id: process.env['META_APP_ID'] ?? '',
    client_secret: process.env['META_APP_SECRET'] ?? '',
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })

  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: tokenBody,
  })
  if (!shortRes.ok) {
    const err = await shortRes.text()
    throw new Error(`Instagram token exchange failed: ${err}`)
  }
  const shortData = (await shortRes.json()) as { access_token: string; user_id: number }
  const shortToken = shortData.access_token

  // 2. Exchange short-lived token for long-lived token (60 days)
  const longParams = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env['META_APP_SECRET'] ?? '',
    access_token: shortToken,
  })
  const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`)
  if (!longRes.ok) {
    const err = await longRes.text()
    throw new Error(`Instagram long-lived token exchange failed: ${err}`)
  }
  const longData = (await longRes.json()) as { access_token: string; expires_in: number }
  const accessToken = longData.access_token
  const expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString()

  // 3. Get Instagram user info
  const meParams = new URLSearchParams({ fields: 'id,username', access_token: accessToken })
  const meRes = await fetch(`https://graph.instagram.com/me?${meParams.toString()}`)
  if (!meRes.ok) throw new Error('Failed to fetch Instagram user info')
  const meData = (await meRes.json()) as { id: string; username: string }

  // 4. Upsert user — use instagram ID as stable unique key, pseudo-email as identifier
  const pseudoEmail = `instagram:${meData.id}@instagram.local`
  const user = upsertGoogleUser(uuidv4(), `ig:${meData.id}`, pseudoEmail)

  // 5. Store tokens (no refresh token for Instagram long-lived tokens)
  savePlatformTokens(uuidv4(), user.id, 'instagram', accessToken, '', expiresAt)

  return { userId: user.id, tokens: { accessToken, expiresAt } }
}

export async function refreshToken(userId: string): Promise<void> {
  const stored = getPlatformTokens(userId, 'instagram')
  if (!stored) throw new Error('No stored Instagram tokens')

  // Instagram long-lived tokens can be refreshed before they expire
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: stored.accessToken,
  })
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Instagram token refresh failed: ${err}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  updatePlatformTokens(userId, 'instagram', data.access_token, newExpiresAt)
}
