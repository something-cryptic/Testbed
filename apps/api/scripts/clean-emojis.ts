import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(
  path.resolve(process.cwd(), 'analyzer.db')
)

// Regex that matches all emoji unicode ranges
function stripEmojis(str: string): string {
  return str.replace(
    /[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27FF}|\u{2300}-\u{23FF}|\u{2B00}-\u{2BFF}|\u{FE00}-\u{FEFF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FAFF}|\u{200D}|\u{20E3}|\u{FE0F}]/gu,
    ''
  ).replace(/\s{2,}/g, ' ').trim()
}

function cleanObject(obj: unknown): unknown {
  if (typeof obj === 'string') return stripEmojis(obj)
  if (Array.isArray(obj)) return obj.map(cleanObject)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, cleanObject(v)])
    )
  }
  return obj
}

const rows = db.prepare('SELECT id, result FROM analyses').all() as
  { id: string; result: string }[]

console.log(`Found ${rows.length} analyses to clean`)

let updated = 0
for (const row of rows) {
  try {
    const parsed = JSON.parse(row.result)
    const cleaned = cleanObject(parsed)
    const cleanedStr = JSON.stringify(cleaned)
    if (cleanedStr !== row.result) {
      db.prepare('UPDATE analyses SET result = ? WHERE id = ?')
        .run(cleanedStr, row.id)
      updated++
      console.log(`Cleaned analysis ${row.id}`)
    }
  } catch (err) {
    console.error(`Failed to clean analysis ${row.id}:`, err)
  }
}

console.log(`Done — updated ${updated} of ${rows.length} analyses`)
db.close()
