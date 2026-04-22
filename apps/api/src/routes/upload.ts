import { Router } from 'express'
import type { Request, Response } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { getUserProfile, updateUserProfile } from '../db/index.js'
import { invalidateProfileCache } from './users.js'

const router = Router()

// ── Upload directory ──────────────────────────────────────────────────────────
// Resolved relative to the project root (process.cwd()), not the source file.
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars')

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}

// ── Multer: memory storage, 5 MB limit, image MIME only ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('WRONG_TYPE'))
    }
  },
})

// ── Magic-byte validation ─────────────────────────────────────────────────────
function validateMagicBytes(buf: Buffer): boolean {
  if (buf.length < 4) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // WebP: 52 49 46 46 (RIFF)
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true
  return false
}

// ── POST /upload/avatar/:userId ───────────────────────────────────────────────
router.post(
  '/avatar/:userId',
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    // 1. Magic-byte check
    if (!validateMagicBytes(req.file.buffer)) {
      res.status(400).json({ error: 'Please upload a JPEG, PNG, WebP, or GIF' })
      return
    }

    try {
      await ensureUploadDir()

      // 2. Process with sharp: resize → webp → strip metadata
      // sharp strips all EXIF/metadata by default when no .withMetadata() is called
      const processed = await sharp(req.file.buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()

      // 3. Generate safe random filename
      const filename = `${randomUUID()}.webp`
      const filePath = join(UPLOAD_DIR, filename)

      // 4. Write to disk
      await writeFile(filePath, processed)

      // 5. Update DB
      const avatarUrl = `/uploads/avatars/${filename}`
      const prevProfile = getUserProfile(userId)
      const prevAvatarUrl = prevProfile?.customAvatarUrl ?? null

      updateUserProfile(userId, { customAvatarUrl: avatarUrl })
      invalidateProfileCache(userId)

      // 6. Delete old local upload if it was one we stored
      if (prevAvatarUrl?.startsWith('/uploads/avatars/')) {
        const oldFile = join(process.cwd(), prevAvatarUrl)
        unlink(oldFile).catch(() => {
          // best-effort — don't fail the request if old file is already gone
        })
      }

      res.json({ avatarUrl })
    } catch (err) {
      console.error('Avatar upload error:', err instanceof Error ? err.message : String(err))
      res.status(500).json({ error: 'Upload failed, please try again' })
    }
  },
)

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err: unknown, _req: Request, res: Response, next: (e: unknown) => void) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Image must be under 5MB' })
    return
  }
  if (err instanceof Error && err.message === 'WRONG_TYPE') {
    res.status(400).json({ error: 'Please upload a JPEG, PNG, WebP, or GIF' })
    return
  }
  next(err)
})

export default router
