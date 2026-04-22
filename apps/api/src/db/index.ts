import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { User, ConnectedPlatform } from '@analyzer/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env['DATABASE_PATH'] ?? join(__dirname, '../../../analyzer.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
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
    UNIQUE (user_id, platform),
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

// ── Migrations (safe to run on every startup) ────────────────────────────────
try { db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN name TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN username TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN custom_avatar_url TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN preferences TEXT`) } catch { /* already exists */ }
try { db.exec(`ALTER TABLE analyses ADD COLUMN platform TEXT NOT NULL DEFAULT 'all'`) } catch { /* already exists */ }

// Add unique index on connected_platforms(user_id, platform) if the table was
// created before this constraint existed. The ON CONFLICT upsert requires it.
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_platforms_user_platform
    ON connected_platforms(user_id, platform)
  `)
  console.log('DB migration: unique index on connected_platforms OK')
} catch (e) {
  console.warn('DB migration warning (connected_platforms index):', e)
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface Preferences {
  theme: string
  sidebarCollapsed: boolean
  defaultPlatform: 'youtube' | 'instagram' | 'all'
  emailNotifications: boolean
  showSubscriberCount: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'lavender',
  sidebarCollapsed: false,
  defaultPlatform: 'all',
  emailNotifications: false,
  showSubscriberCount: true,
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  username: string | null
  customAvatarUrl: string | null
  preferences: Preferences
  createdAt: string
}

type UserRow = {
  id: string
  google_id: string | null
  email: string
  name: string | null
  avatar_url: string | null
  username: string | null
  custom_avatar_url: string | null
  preferences: string | null
  created_at: string
}

function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name ?? null, avatarUrl: row.avatar_url ?? null, createdAt: row.created_at }
}

function rowToUserProfile(row: UserRow): UserProfile {
  let prefs: Preferences = DEFAULT_PREFERENCES
  if (row.preferences) {
    try { prefs = { ...DEFAULT_PREFERENCES, ...(JSON.parse(row.preferences) as Partial<Preferences>) } } catch { /* keep defaults */ }
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    avatarUrl: row.avatar_url ?? null,
    username: row.username ?? null,
    customAvatarUrl: row.custom_avatar_url ?? null,
    preferences: prefs,
    createdAt: row.created_at,
  }
}

export function getUserProfile(userId: string): UserProfile | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined
  if (!row) return undefined
  return rowToUserProfile(row)
}

export function updateUserProfile(
  userId: string,
  updates: { username?: string; customAvatarUrl?: string | null; preferences?: string },
): UserProfile | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if ('username' in updates) { fields.push('username = ?'); values.push(updates.username ?? null) }
  if ('customAvatarUrl' in updates) { fields.push('custom_avatar_url = ?'); values.push(updates.customAvatarUrl ?? null) }
  if ('preferences' in updates) { fields.push('preferences = ?'); values.push(updates.preferences) }
  if (fields.length === 0) return getUserProfile(userId)
  values.push(userId)
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getUserProfile(userId)
}

export function getUser(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  if (!row) return undefined
  return rowToUser(row)
}

export function getUserByGoogleId(googleId: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as UserRow | undefined
  if (!row) return undefined
  return rowToUser(row)
}

export function getUserByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
  if (!row) return undefined
  return rowToUser(row)
}

/**
 * Look up by google_id first (authoritative). If not found, fall back to
 * email (handles accounts that existed before google_id was stored).
 * Creates a new user if neither matches.
 */
export function upsertGoogleUser(
  id: string,
  googleId: string,
  email: string,
  name: string | null = null,
  avatarUrl: string | null = null,
): User {
  const createdAt = new Date().toISOString()

  // 1. Lookup by google_id — most reliable
  let row = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as UserRow | undefined

  // 2. Fall back to email for accounts that predate google_id storage
  if (!row) {
    row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined

    if (row) {
      // Backfill google_id so future lookups are by google_id
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, row.id)
    }
  }

  if (row) {
    // Always refresh name and avatarUrl from Google in case they changed
    db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(name, avatarUrl, row.id)
    return rowToUser({ ...row, name, avatar_url: avatarUrl })
  }

  // 3. New user
  db.prepare(
    'INSERT INTO users (id, google_id, email, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, googleId, email, name, avatarUrl, createdAt)

  return { id, email, name, avatarUrl, createdAt }
}

// ── DEBUG — remove before launch ──────────────────────────────────────────────

export function getAllUsers(): { id: string; googleId: string | null; email: string; createdAt: string }[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as {
    id: string
    google_id: string | null
    email: string
    created_at: string
  }[]
  return rows.map((r) => ({ id: r.id, googleId: r.google_id, email: r.email, createdAt: r.created_at }))
}

export function getAllPlatformRows(): object[] {
  return db.prepare('SELECT id, user_id, platform, expires_at FROM connected_platforms ORDER BY user_id').all() as object[]
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
  try {
    const info = db.prepare(`
      INSERT INTO connected_platforms
        (id, user_id, platform, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, platform) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = CASE
          WHEN excluded.refresh_token != '' THEN excluded.refresh_token
          ELSE connected_platforms.refresh_token
        END,
        expires_at = excluded.expires_at
    `).run(id, userId, platform, accessToken, refreshToken, expiresAt)
  } catch (e) {
    console.error(`savePlatformTokens FAILED for userId=${userId} platform=${platform}:`, e instanceof Error ? e.message : e)
    throw e
  }
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

export function getConnectedPlatforms(userId: string): ConnectedPlatform[] {
  const rows = db
    .prepare('SELECT * FROM connected_platforms WHERE user_id = ?')
    .all(userId) as {
      id: string
      user_id: string
      platform: string
      access_token: string
      refresh_token: string
      expires_at: string
    }[]
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    platform: row.platform as ConnectedPlatform['platform'],
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
  }))
}

export function clearPlatformTokens(userId: string): void {
  db.prepare('DELETE FROM connected_platforms WHERE user_id = ?').run(userId)
}

export function deletePlatformTokens(userId: string, platform: string): void {
  db.prepare('DELETE FROM connected_platforms WHERE user_id = ? AND platform = ?').run(userId, platform)
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
  // `platform` column stores the canonical key used for retrieval:
  // single-platform runs store that platform name; multi-platform runs store 'all'
  const platform = platforms.length === 1 ? platforms[0]! : 'all'
  db.prepare(`
    INSERT INTO analyses (id, user_id, platforms, platform, result, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, platforms.join(','), platform, JSON.stringify(result), new Date().toISOString())
}

export function getLatestAnalysis(userId: string, platform?: string): unknown | null {
  const key = platform && platform !== 'all' ? platform : 'all'
  const row = db
    .prepare('SELECT result FROM analyses WHERE user_id = ? AND platform = ? ORDER BY created_at DESC LIMIT 1')
    .get(userId, key) as { result: string } | undefined
  if (!row) return null
  return JSON.parse(row.result)
}


export function getLastAnalyzedByPlatform(userId: string): Record<string, string> {
  const rows = db
    .prepare(
      'SELECT platform, MAX(created_at) as last_run FROM analyses WHERE user_id = ? GROUP BY platform',
    )
    .all(userId) as { platform: string; last_run: string }[]

  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.platform] = row.last_run
  }
  return result
}
