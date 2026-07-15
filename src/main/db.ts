/**
 * 数据库模块 — 使用 Node.js 内置 sqlite（无需安装原生模块）
 * Electron 43 内置 Node 22+，node:sqlite 已稳定可用
 */
import { DatabaseSync } from 'node:sqlite'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync, copyFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { nativeImage } from 'electron'
import { writeFileSync } from 'fs'
import type { ImageRecord, ImportPayload } from '../shared/api'
import { toLocalUrl } from '../shared/url'

let db: DatabaseSync | null = null
let dataDir = ''

export function getDataDir(): string {
  return dataDir
}

/** 初始化数据库，在 app.whenReady() 之后调用 */
export function initDb(): void {
  dataDir = join(app.getPath('userData'), 'tpg-z')
  mkdirSync(join(dataDir, 'images'), { recursive: true })
  mkdirSync(join(dataDir, 'thumbs'), { recursive: true })
  mkdirSync(join(dataDir, 'refs'), { recursive: true })

  db = new DatabaseSync(join(dataDir, 'tpg.db'))

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS images (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL DEFAULT '未命名',
      filename     TEXT NOT NULL,
      thumb_name   TEXT NOT NULL,
      prompt       TEXT NOT NULL DEFAULT '',
      type         TEXT NOT NULL DEFAULT 'text2img',
      folder       TEXT NOT NULL DEFAULT '未分类',
      rating       INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_images (
      id         TEXT PRIMARY KEY,
      image_id   TEXT NOT NULL,
      filename   TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS image_tags (
      image_id TEXT    NOT NULL,
      tag_id   INTEGER NOT NULL,
      PRIMARY KEY (image_id, tag_id),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
    );
  `)
}

function getDb(): DatabaseSync {
  if (!db) throw new Error('数据库未初始化')
  return db
}

/** 生成缩略图（最大宽度 420px），保存为 JPEG */
function makeThumbnail(srcPath: string, destPath: string): void {
  try {
    const img = nativeImage.createFromPath(srcPath)
    const { width } = img.getSize()
    const maxW = 420
    const resized = width > maxW ? img.resize({ width: maxW }) : img
    // toJPEG(quality)
    writeFileSync(destPath, resized.toJPEG(85))
  } catch {
    // 缩略图生成失败时直接复制原图
    copyFileSync(srcPath, destPath)
  }
}

// ---------- 查询 ----------

/** 把数据库行组装成 ImageRecord（含标签和参考图） */
function rowToRecord(row: Record<string, unknown>): ImageRecord {
  const id = row['id'] as string
  const d = getDb()

  // 标签
  const tagRows = d
    .prepare(`SELECT t.name FROM tags t JOIN image_tags it ON t.id = it.tag_id WHERE it.image_id = ?`)
    .all(id) as Array<{ name: string }>

  // 参考图
  const refRows = d
    .prepare(`SELECT id, filename FROM reference_images WHERE image_id = ? ORDER BY sort_order`)
    .all(id) as Array<{ id: string; filename: string }>

  return {
    id,
    title: row['title'] as string,
    imagePath: toLocalUrl(join(dataDir, 'images', row['filename'] as string)),
    thumbPath: toLocalUrl(join(dataDir, 'thumbs', row['thumb_name'] as string)),
    prompt: row['prompt'] as string,
    type: row['type'] as 'text2img' | 'img2img',
    folder: row['folder'] as string,
    rating: row['rating'] as number,
    createdAt: row['created_at'] as string,
    tags: tagRows.map((t) => t.name),
    referenceImages: refRows.map((r) => ({
      id: r.id,
      path: toLocalUrl(join(dataDir, 'refs', r.filename))
    }))
  }
}

/** 获取所有图片 */
export function dbGetImages(): ImageRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM images ORDER BY created_at DESC`)
    .all() as Array<Record<string, unknown>>
  return rows.map(rowToRecord)
}

// ---------- 导入 ----------

/** 导入一张图片，返回新记录 */
export function dbImportImage(payload: ImportPayload): ImageRecord {
  const d = getDb()
  const id = randomUUID()
  const ext = payload.srcPath.split('.').pop() ?? 'jpg'
  const filename = `${id}.${ext}`
  const thumbName = `${id}_thumb.jpg`

  // 复制原图
  copyFileSync(payload.srcPath, join(dataDir, 'images', filename))
  // 生成缩略图
  makeThumbnail(payload.srcPath, join(dataDir, 'thumbs', thumbName))

  const now = new Date().toISOString()

  d.prepare(`
    INSERT INTO images (id, title, filename, thumb_name, prompt, type, folder, rating, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, payload.title || '未命名', filename, thumbName, payload.prompt, payload.type, payload.folder || '未分类', now)

  // 标签
  for (const tagName of payload.tags) {
    d.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).run(tagName)
    const tag = d.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName) as { id: number }
    d.prepare(`INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`).run(id, tag.id)
  }

  // 参考图
  payload.refPaths.forEach((refPath, i) => {
    if (!existsSync(refPath)) return
    const refId = randomUUID()
    const refExt = refPath.split('.').pop() ?? 'jpg'
    const refFilename = `${refId}.${refExt}`
    copyFileSync(refPath, join(dataDir, 'refs', refFilename))
    d.prepare(`INSERT INTO reference_images (id, image_id, filename, sort_order) VALUES (?, ?, ?, ?)`)
      .run(refId, id, refFilename, i)
  })

  return rowToRecord(d.prepare(`SELECT * FROM images WHERE id = ?`).get(id) as Record<string, unknown>)
}

// ---------- 更新 ----------

export function dbUpdateRating(id: string, rating: number): void {
  getDb().prepare(`UPDATE images SET rating = ? WHERE id = ?`).run(rating, id)
}

export function dbUpdateTags(id: string, tags: string[]): void {
  const d = getDb()
  d.prepare(`DELETE FROM image_tags WHERE image_id = ?`).run(id)
  for (const tagName of tags) {
    d.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).run(tagName)
    const tag = d.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName) as { id: number }
    d.prepare(`INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`).run(id, tag.id)
  }
}

export function dbGetFolders(): string[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT folder FROM images ORDER BY folder`)
    .all() as Array<{ folder: string }>
  return rows.map((r) => r.folder)
}

export function dbGetTags(): string[] {
  const rows = getDb()
    .prepare(`SELECT name FROM tags ORDER BY name`)
    .all() as Array<{ name: string }>
  return rows.map((r) => r.name)
}
