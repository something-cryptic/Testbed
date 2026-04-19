import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateAuthUrl, exchangeCode } from '../auth/google.js'
import { generateAuthUrl as generateInstagramAuthUrl, exchangeCode as exchangeInstagramCode } from '../auth/meta.js'
import { getConnectedPlatforms } from '../db/index.js'

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
  // If a userId cookie exists, pass it as state so we can link the
  // Instagram account to the existing user after the callback
  const existingUserId = (req.cookies as Record<string, string | undefined>)['userId']
  const url = generateInstagramAuthUrl()
  // Append state param with existing userId for account linking
  const separator = url.includes('?') ? '&' : '?'
  res.redirect(existingUserId ? `${url}${separator}state=${existingUserId}` : url)
})

router.get('/instagram/callback', async (req: Request, res: Response) => {
  const code = req.query['code'] as string | undefined
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' })
    return
  }

  try {
    const { userId } = await exchangeInstagramCode(code)
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

// ── Connected platforms status ────────────────────────────────────────────────

router.get('/status/:userId', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const platforms = getConnectedPlatforms(userId).map((p) => p.platform)
  res.json({ platforms })
})

export default router
