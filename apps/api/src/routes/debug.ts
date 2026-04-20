// DEBUG ROUTES — remove this file and its import in index.ts before launch
import { Router } from 'express'
import type { Request, Response } from 'express'
import { getAllUsers, getUser, getConnectedPlatforms, getAllPlatformRows } from '../db/index.js'

const router = Router()

router.get('/users/all', (_req: Request, res: Response) => {
  res.json(getAllUsers())
})

router.get('/db/:userId', (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string }
  const user = getUser(userId) ?? null
  const platforms = getConnectedPlatforms(userId)
  res.json({ user, platforms })
})

router.get('/db', (_req: Request, res: Response) => {
  res.json({
    users: getAllUsers(),
    platforms: getAllPlatformRows(),
  })
})

export default router
