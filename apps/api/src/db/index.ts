import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { User, ConnectedPlatform } from '@analyzer/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env['DATABASE_PATH'] ?? join(__dirname, '../../../analyzer.db')

const db = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connected_platforms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    post_id TEXT NOT NULL,
    data TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platforms TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

// ── Users ────────────────────────────────────────────────────────────────────

export function getUser(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | { id: string; email: string; created_at: string }
    | undefined
  if (!row) return undefined
  return { id: row.id, email: row.email, createdAt: row.created_at }
}

export function getUserByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | { id: string; email: string; created_at: string }
    | undefined
  if (!row) return undefined
  return { id: row.id, email: row.email, createdAt: row.created_at }
}

export function createUser(id: string, email: string): User {
  const createdAt = new Date().toISOString()
  db.prepare('INSERT OR REPLACE INTO users (id, email, created_at) VALUES (?, ?, ?)').run(
    id,
    email,
    createdAt,
  )
  return { id, email, createdAt }
}

// ── Platform tokens ───────────────────────────────────────────────────────────

export function savePlatformTokens(
  id: string,
  userId: string,
  platform: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
): void {
  db.prepare(`
    INSERT OR REPLACE INTO connected_platforms
      (id, user_id, platform, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, platform, accessToken, refreshToken, expiresAt)
}

export function getPlatformTokens(
  userId: string,
  platform: string,
): ConnectedPlatform | undefined {
  const row = db
    .prepare('SELECT * FROM connected_platforms WHERE user_id = ? AND platform = ?')
    .get(userId, platform) as
    | {
        id: string
        user_id: string
        platform: string
        access_token: string
        refresh_token: string
        expires_at: string
      }
    | undefined
  if (!row) return undefined
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform as ConnectedPlatform['platform'],
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
  }
}

export function updatePlatformTokens(
  userId: string,
  platform: string,
  accessToken: string,
  expiresAt: string,
): void {
  db.prepare(`
    UPDATE connected_platforms
    SET access_token = ?, expires_at = ?
    WHERE user_id = ? AND platform = ?
  `).run(accessToken, expiresAt, userId, platform)
}

// ── Posts cache ───────────────────────────────────────────────────────────────

export function savePosts(id: string, userId: string, platform: string, data: unknown): void {
  db.prepare(`
    INSERT OR REPLACE INTO posts (id, user_id, platform, post_id, data, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, platform, id, JSON.stringify(data), new Date().toISOString())
}

export function getCachedPosts(
  userId: string,
  platform: string,
  maxAgeMs = 3600_000,
): unknown[] | null {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString()
  const rows = db
    .prepare(
      'SELECT data FROM posts WHERE user_id = ? AND platform = ? AND fetched_at > ? ORDER BY fetched_at DESC LIMIT 1',
    )
    .get(userId, platform, cutoff) as { data: string } | undefined
  if (!rows) return null
  return JSON.parse(rows.data) as unknown[]
}

// ── Analyses ──────────────────────────────────────────────────────────────────

export function saveAnalysis(
  id: string,
  userId: string,
  platforms: string[],
  result: unknown,
): void {
  db.prepare(`
    INSERT INTO analyses (id, user_id, platforms, result, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, platforms.join(','), JSON.stringify(result), new Date().toISOString())
}

export function getLatestAnalysis(userId: string): unknown | null {
  const row = db
    .prepare(
      'SELECT result FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(userId) as { result: string } | undefined
  if (!row) return null
  return JSON.parse(row.result)
}
