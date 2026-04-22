import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateAuthUrl, exchangeCode } from '../auth/google.js'
import { generateAuthUrl as generateInstagramAuthUrl, exchangeCode as exchangeInstagramCode } from '../auth/meta.js'
import { generateAuthUrl as generateTwitchAuthUrl, exchangeCode as exchangeTwitchCode } from '../auth/twitch.js'
import { getConnectedPlatforms, clearPlatformTokens, deletePlatformTokens } from '../db/index.js'
import { invalidateProfileCache } from './users.js'

const router = Router()

// ── Google / YouTube ──────────────────────────────────────────────────────────

router.get('/login', (_req: Request, res: Response) => {
  const url = generateAuthUrl()
  res.redirect(url)
})

router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string | undefined
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  try {
    const { user } = await exchangeCode(code)
    invalidateProfileCache(user.id)
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'

    res.cookie('userId', user.id, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    res.redirect(`${frontendUrl}/dashboard?userId=${user.id}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

// ── Instagram / Meta ──────────────────────────────────────────────────────────

router.get('/instagram/login', (req: Request, res: Response) => {
  // Prefer userId from query param (passed by the frontend connect button),
  // fall back to cookie for standalone Instagram sign-in.
  const queryUserId = req.query['userId'] as string | undefined
  const cookieUserId = (req.cookies as Record<string, string | undefined>)['userId']
  const state = queryUserId ?? cookieUserId ?? undefined

  const url = generateInstagramAuthUrl(state)
  res.redirect(url)
})

router.get('/instagram/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string | undefined
  const state = req.query['state'] as string | undefined

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  try {
    // Pass the state (existingUserId) so exchangeCode can link to the right user
    const { userId } = await exchangeInstagramCode(code, state)
    invalidateProfileCache(userId)
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'

    res.cookie('userId', userId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    res.redirect(`${frontendUrl}/dashboard?userId=${userId}`)
  } catch (err) {
    console.error('Instagram OAuth callback error:', err)
    res.status(500).json({ error: 'Instagram authentication failed' })
  }
})

// ── Twitch ────────────────────────────────────────────────────────────────────

router.get('/twitch/login', (req: Request, res: Response) => {
  const queryUserId = req.query['userId'] as string | undefined
  const cookieUserId = (req.cookies as Record<string, string | undefined>)['userId']
  const userId = queryUserId ?? cookieUserId ?? ''

  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  const url = generateTwitchAuthUrl(userId)
  res.redirect(url)
})

router.get('/twitch/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string | undefined
  const state = req.query['state'] as string | undefined

  if (!code || !state) {
    res.status(400).json({ error: 'Missing authorization code or state' })
    return
  }

  try {
    const { userId } = await exchangeTwitchCode(code, state)
    invalidateProfileCache(userId)
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'

    res.cookie('userId', userId, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    res.redirect(`${frontendUrl}/dashboard?userId=${userId}`)
  } catch (err) {
    console.error('Twitch OAuth callback error:', err)
    res.status(500).json({ error: 'Twitch authentication failed' })
  }
})

// ── Disconnect a single platform ──────────────────────────────────────────────

router.delete('/:platform/:userId', (req: Request, res: Response) => {
  const { platform, userId } = req.params as { platform: string; userId: string }
  try {
    deletePlatformTokens(userId, platform)
    invalidateProfileCache(userId)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error(`Disconnect ${platform} error:`, err)
    res.status(500).json({ error: 'Failed to disconnect platform' })
  }
})

// ── Logout (all platforms) ────────────────────────────────────────────────────

router.post('/logout/:userId', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  clearPlatformTokens(userId)
  res.clearCookie('userId')
  res.status(200).json({ ok: true })
})

// ── Connected platforms status ────────────────────────────────────────────────

router.get('/status/:userId', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const platforms = getConnectedPlatforms(userId).map((p) => p.platform)
  res.json({ platforms })
})

export default router
