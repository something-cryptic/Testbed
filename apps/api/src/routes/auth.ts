import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateAuthUrl, exchangeCode } from '../auth/google.js'

const router = Router()

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

    // Set cookie (domain=localhost so it's accessible on both ports in dev)
    res.cookie('userId', user.id, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Also pass as query param as a reliable fallback
    res.redirect(`${frontendUrl}/dashboard?userId=${user.id}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

export default router
