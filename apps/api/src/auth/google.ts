import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'
import { upsertGoogleUser, savePlatformTokens, updatePlatformTokens, getPlatformTokens } from '../db/index.js'
import type { User } from '@analyzer/types'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
]

function makeOAuth2Client() {
  const clientId = process.env['GOOGLE_CLIENT_ID']
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET']
  const redirectUri = process.env['REDIRECT_URI']

  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set — check your .env file')
  if (!clientSecret) throw new Error('GOOGLE_CLIENT_SECRET is not set — check your .env file')
  if (!redirectUri) throw new Error('REDIRECT_URI is not set — check your .env file')

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
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
  console.log('Step 1: exchanging code...')
  const auth = makeOAuth2Client()
  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)
  console.log('Step 2: got tokens:', JSON.stringify({
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    tokenType: tokens.token_type,
  }))

  console.log('Step 3: fetching user info from Google...')
  const oauth2 = google.oauth2({ version: 'v2', auth })
  const userInfo = await oauth2.userinfo.get()
  const googleId = userInfo.data.id
  const email = userInfo.data.email
  console.log('Step 3: got user email:', email, '| googleId:', googleId)

  if (!googleId) throw new Error('Could not retrieve Google user ID')
  if (!email) throw new Error('Could not retrieve user email from Google')

  console.log('Step 4: saving user to DB...')
  const user = upsertGoogleUser(uuidv4(), googleId, email)
  console.log('Step 4: user saved, id:', user.id)

  const accessToken = tokens.access_token ?? ''
  const refreshToken = tokens.refresh_token ?? ''
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600_000).toISOString()

  console.log('Step 5: saving platform tokens to DB...')
  savePlatformTokens(uuidv4(), user.id, 'youtube', accessToken, refreshToken, expiresAt)
  console.log('Step 6: done — platform tokens saved for userId:', user.id)

  return { user, tokens: { accessToken, refreshToken, expiresAt } }
}

export async function refreshTokens(userId: string): Promise<void> {
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
