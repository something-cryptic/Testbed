import { v4 as uuidv4 } from 'uuid'
import { upsertGoogleUser, savePlatformTokens, updatePlatformTokens, getPlatformTokens, getUser } from '../db/index.js'

export function generateAuthUrl(state?: string): string {
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',')

  const params = new URLSearchParams({
    client_id: process.env['META_APP_ID'] ?? '',
    redirect_uri: process.env['INSTAGRAM_REDIRECT_URI'] ?? 'http://localhost:8000/auth/instagram/callback',
    scope: scopes,
    response_type: 'code',
  })
  if (state) params.set('state', state)

  return `https://api.instagram.com/oauth/authorize?${params.toString()}`
}

export async function exchangeCode(
  code: string,
  existingUserId?: string,
): Promise<{ userId: string; tokens: { accessToken: string; expiresAt: string } }> {
  const redirectUri = process.env['INSTAGRAM_REDIRECT_URI'] ?? 'http://localhost:8000/auth/instagram/callback'

  console.log('Instagram Step 1: exchanging code for short-lived token...')
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
  console.log('Instagram Step 1: got short-lived token, ig user_id:', shortData.user_id)

  console.log('Instagram Step 2: exchanging for long-lived token (60 days)...')
  const longParams = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env['META_APP_SECRET'] ?? '',
    access_token: shortData.access_token,
  })
  const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`)
  if (!longRes.ok) {
    const err = await longRes.text()
    throw new Error(`Instagram long-lived token exchange failed: ${err}`)
  }
  const longData = (await longRes.json()) as { access_token: string; expires_in: number }
  const accessToken = longData.access_token
  const expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString()
  console.log('Instagram Step 2: got long-lived token, expires:', expiresAt)

  console.log('Instagram Step 3: fetching Instagram user info...')
  const meParams = new URLSearchParams({ fields: 'id,username', access_token: accessToken })
  const meRes = await fetch(`https://graph.instagram.com/me?${meParams.toString()}`)
  if (!meRes.ok) throw new Error('Failed to fetch Instagram user info')
  const meData = (await meRes.json()) as { id: string; username: string }
  console.log('Instagram Step 3: ig user id:', meData.id, '| username:', meData.username)

  console.log('Instagram Step 4: resolving app user...')
  let userId: string

  if (existingUserId && getUser(existingUserId)) {
    // Link Instagram to an already-logged-in user (connected from Dashboard)
    userId = existingUserId
    console.log('Instagram Step 4: linking to existing userId:', userId)
  } else {
    // Standalone Instagram sign-in — upsert by ig ID
    const pseudoEmail = `instagram:${meData.id}@instagram.local`
    const user = upsertGoogleUser(uuidv4(), `ig:${meData.id}`, pseudoEmail)
    userId = user.id
    console.log('Instagram Step 4: upserted user, id:', userId)
  }

  console.log('Instagram Step 5: saving platform tokens to DB...')
  savePlatformTokens(uuidv4(), userId, 'instagram', accessToken, '', expiresAt)
  console.log('Instagram Step 6: done — instagram tokens saved for userId:', userId)

  return { userId, tokens: { accessToken, expiresAt } }
}

export async function refreshToken(userId: string): Promise<void> {
  const stored = getPlatformTokens(userId, 'instagram')
  if (!stored) throw new Error('No stored Instagram tokens')

  // Only refresh if token expires within 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(stored.expiresAt).getTime()
  if (expiresAt - Date.now() > sevenDaysMs) {
    console.log('Instagram token still valid for > 7 days, skipping refresh')
    return
  }

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
  console.log('Instagram token refreshed, new expiry:', newExpiresAt)
}
