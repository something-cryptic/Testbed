import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'
import { createUser, getUserByEmail, savePlatformTokens } from '../db/index.js'
import type { User } from '@analyzer/types'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
]

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET'],
    process.env['REDIRECT_URI'],
  )
}

export function generateAuthUrl(): string {
  const auth = makeOAuth2Client()
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function exchangeCode(
  code: string,
): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string; expiresAt: string } }> {
  const auth = makeOAuth2Client()
  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)

  // Get user email
  const oauth2 = google.oauth2({ version: 'v2', auth })
  const userInfo = await oauth2.userinfo.get()
  const email = userInfo.data.email
  if (!email) throw new Error('Could not retrieve user email from Google')

  // Upsert user
  let user = getUserByEmail(email)
  if (!user) {
    user = createUser(uuidv4(), email)
  }

  const accessToken = tokens.access_token ?? ''
  const refreshToken = tokens.refresh_token ?? ''
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600_000).toISOString()

  // Save platform tokens
  savePlatformTokens(uuidv4(), user.id, 'youtube', accessToken, refreshToken, expiresAt)

  return { user, tokens: { accessToken, refreshToken, expiresAt } }
}

export async function refreshTokens(userId: string): Promise<void> {
  const { getPlatformTokens, updatePlatformTokens } = await import('../db/index.js')
  const stored = getPlatformTokens(userId, 'youtube')
  if (!stored) throw new Error('No stored tokens')

  const auth = makeOAuth2Client()
  auth.setCredentials({ refresh_token: stored.refreshToken })
  const { credentials } = await auth.refreshAccessToken()

  const newAccessToken = credentials.access_token ?? ''
  const newExpiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600_000).toISOString()

  updatePlatformTokens(userId, 'youtube', newAccessToken, newExpiresAt)
}
