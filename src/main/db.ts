/**
 * 数据库模块 — 使用 Node.js 内置 sqlite（无需安装原生模块）
 * Electron 43 内置 Node 22+，node:sqlite 已稳定可用
 */
import { DatabaseSync } from 'node:sqlite'
import { join, dirname } from 'path'
import { app } from 'electron'
import { mkdirSync, copyFileSync, existsSync, rmSync, cpSync, accessSync, constants } from 'fs'
import { randomUUID } from 'crypto'
import { nativeImage } from 'electron'
import { writeFileSync } from 'fs'
import type { ImageRecord, ImportPayload, UpdatePayload } from '../shared/api'
import { toLocalUrl } from '../shared/url'

let db: DatabaseSync | null = null
let dataDir = ''

export function getDataDir(): string {
  return dataDir
}

/** 检测目录是否可写：目录不存在则尝试创建，再用 accessSync 验证写权限 */
function isWritable(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true })
    accessSync(dir, constants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 解析数据目录：
 * - 开发模式：项目根目录下的 data/（跟随项目，不进 C 盘用户目录）
 * - 打包后（便携模式）：exe 所在目录下的 data/，数据跟软件走，整体可搬移。
 *   若该目录不可写（如装在 Program Files 需管理员权限），回退到系统 userData/tpg-z，
 *   保证导入功能不因无写权限而失败。
 */
function resolveDataDir(): string {
  if (app.isPackaged) {
    // app.getPath('exe') 是主程序 exe 的完整路径，其所在目录即安装目录
    const portableDir = join(dirname(app.getPath('exe')), 'data')
    if (isWritable(portableDir)) return portableDir
    console.warn(`[db] 安装目录不可写，回退到 userData: ${portableDir}`)
    return join(app.getPath('userData'), 'tpg-z')
  }
  // 开发模式：process.cwd() 即运行 npm run dev 的项目根目录
  return join(process.cwd(), 'data')
}

/**
 * 首次迁移：若新数据目录为空（无数据库），且旧的 userData 目录存在数据库，
 * 则把旧数据整体复制过来（只复制不删除，旧数据作为保险保留）。
 */
function migrateFromUserData(target: string): void {
  const legacyDir = join(app.getPath('userData'), 'tpg-z')
  const legacyDb = join(legacyDir, 'tpg.db')
  const targetDb = join(target, 'tpg.db')
  // 目标已有数据库，或旧目录不存在数据库，或二者是同一目录 → 不迁移
  if (existsSync(targetDb) || !existsSync(legacyDb) || legacyDir === target) return
  try {
    // 整目录复制（含 images/thumbs/refs 和 tpg.db、-wal、-shm）
    cpSync(legacyDir, target, { recursive: true })
    console.log(`[db] 已从旧数据目录迁移: ${legacyDir} -> ${target}`)
  } catch (e) {
    console.error('[db] 数据迁移失败:', e)
  }
}

/** 初始化数据库，在 app.whenReady() 之后调用 */
export function initDb(): void {
  dataDir = resolveDataDir()
  mkdirSync(dataDir, { recursive: true })

  // 首次启动时尝试从旧的 C 盘用户目录迁移历史数据
  migrateFromUserData(dataDir)

  mkdirSync(join(dataDir, 'images'), { recursive: true })
  mkdirSync(join(dataDir, 'thumbs'), { recursive: true })
  mkdirSync(join(dataDir, 'refs'), { recursive: true })

  console.log(`[db] 数据目录: ${dataDir}`)
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

/**
 * 导入一件作品，返回新记录
 * @param payload 表单数据
 * @param thumbSrcPath 缩略图源图路径（视频作品传抽好的首帧 JPEG；不传则用主文件本身）
 */
export function dbImportImage(payload: ImportPayload, thumbSrcPath?: string): ImageRecord {
  const d = getDb()
  const id = randomUUID()
  const ext = payload.srcPath.split('.').pop() ?? 'jpg'
  const filename = `${id}.${ext}`
  const thumbName = `${id}_thumb.jpg`

  // 复制主文件（图片或视频）
  copyFileSync(payload.srcPath, join(dataDir, 'images', filename))
  // 生成缩略图：视频用首帧 JPEG，图片用自身
  makeThumbnail(thumbSrcPath ?? payload.srcPath, join(dataDir, 'thumbs', thumbName))

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

/** 重设一张图片的标签（先清空再写入） */
function setImageTags(id: string, tags: string[]): void {
  const d = getDb()
  d.prepare(`DELETE FROM image_tags WHERE image_id = ?`).run(id)
  for (const tagName of tags) {
    const name = tagName.trim()
    if (!name) continue
    d.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).run(name)
    const tag = d.prepare(`SELECT id FROM tags WHERE name = ?`).get(name) as { id: number }
    d.prepare(`INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`).run(id, tag.id)
  }
}

export function dbUpdateTags(id: string, tags: string[]): void {
  setImageTags(id, tags)
  pruneOrphanTags()
}

/** 编辑图片信息：标题/提示词/类型/文件夹/标签/参考图 */
export function dbUpdateImage(payload: UpdatePayload): ImageRecord {
  const d = getDb()
  const { id } = payload

  // 更新主表字段
  d.prepare(
    `UPDATE images SET title = ?, prompt = ?, type = ?, folder = ? WHERE id = ?`
  ).run(payload.title || '未命名', payload.prompt, payload.type, payload.folder || '未分类', id)

  // 标签
  setImageTags(id, payload.tags)

  // 参考图：删除不在保留列表内的旧参考图（含文件）
  const existingRefs = d
    .prepare(`SELECT id, filename FROM reference_images WHERE image_id = ?`)
    .all(id) as Array<{ id: string; filename: string }>
  for (const ref of existingRefs) {
    if (!payload.keepRefIds.includes(ref.id)) {
      safeUnlink(join(dataDir, 'refs', ref.filename))
      d.prepare(`DELETE FROM reference_images WHERE id = ?`).run(ref.id)
    }
  }

  // 当前最大排序值，新增参考图接在后面
  const maxOrderRow = d
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM reference_images WHERE image_id = ?`)
    .get(id) as { m: number }
  let order = maxOrderRow.m + 1

  for (const refPath of payload.newRefPaths) {
    if (!existsSync(refPath)) continue
    const refId = randomUUID()
    const refExt = refPath.split('.').pop() ?? 'jpg'
    const refFilename = `${refId}.${refExt}`
    copyFileSync(refPath, join(dataDir, 'refs', refFilename))
    d.prepare(`INSERT INTO reference_images (id, image_id, filename, sort_order) VALUES (?, ?, ?, ?)`)
      .run(refId, id, refFilename, order++)
  }

  return rowToRecord(d.prepare(`SELECT * FROM images WHERE id = ?`).get(id) as Record<string, unknown>)
}

/** 删除一张图片：数据库记录 + 本地图片/缩略图/参考图文件 */
export function dbDeleteImage(id: string): void {
  const d = getDb()
  const row = d.prepare(`SELECT filename, thumb_name FROM images WHERE id = ?`).get(id) as
    | { filename: string; thumb_name: string }
    | undefined
  if (!row) return

  // 先收集参考图文件名（外键 CASCADE 会删表记录，但文件要手动删）
  const refs = d
    .prepare(`SELECT filename FROM reference_images WHERE image_id = ?`)
    .all(id) as Array<{ filename: string }>

  // 删数据库记录（image_tags、reference_images 由 ON DELETE CASCADE 自动清理）
  d.prepare(`DELETE FROM images WHERE id = ?`).run(id)

  // 清理因这次删除而不再被任何图片引用的孤儿标签
  pruneOrphanTags()

  // 删本地文件
  safeUnlink(join(dataDir, 'images', row.filename))
  safeUnlink(join(dataDir, 'thumbs', row.thumb_name))
  for (const ref of refs) {
    safeUnlink(join(dataDir, 'refs', ref.filename))
  }
}

/** 安全删除文件，不存在或失败时忽略 */
function safeUnlink(filePath: string): void {
  try {
    rmSync(filePath, { force: true })
  } catch {
    // 忽略删除失败
  }
}

export function dbGetFolders(): string[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT folder FROM images ORDER BY folder`)
    .all() as Array<{ folder: string }>
  return rows.map((r) => r.folder)
}

export function dbGetTags(): string[] {
  // 只返回仍被图片引用的标签：没有任何图片使用的标签不再显示，
  // 与文件夹（从 images 表 DISTINCT 派生）行为保持一致。
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT t.name FROM tags t
       JOIN image_tags it ON t.id = it.tag_id
       ORDER BY t.name`
    )
    .all() as Array<{ name: string }>
  return rows.map((r) => r.name)
}

/** 清理孤儿标签：删除 tags 表中不再被任何图片引用的行 */
function pruneOrphanTags(): void {
  getDb()
    .prepare(`DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM image_tags)`)
    .run()
}

/**
 * 重命名文件夹：把所有属于旧文件夹的图片改到新文件夹。
 * 若新名称已存在，等价于把两个文件夹合并（图片归入同名文件夹）。
 */
export function dbRenameFolder(oldName: string, newName: string): void {
  const from = oldName.trim()
  const to = newName.trim()
  if (!from || !to || from === to) return
  getDb().prepare(`UPDATE images SET folder = ? WHERE folder = ?`).run(to, from)
}

/**
 * 重命名标签：改 tags.name。
 * 若新名称已存在（UNIQUE 冲突），则合并两个标签——把旧标签的图片关联转到
 * 已有标签上，再删除旧标签。
 */
export function dbRenameTag(oldName: string, newName: string): void {
  const d = getDb()
  const from = oldName.trim()
  const to = newName.trim()
  if (!from || !to || from === to) return

  const oldTag = d.prepare(`SELECT id FROM tags WHERE name = ?`).get(from) as
    | { id: number }
    | undefined
  if (!oldTag) return

  const existing = d.prepare(`SELECT id FROM tags WHERE name = ?`).get(to) as
    | { id: number }
    | undefined

  if (!existing) {
    // 目标名未占用：直接改名
    d.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(to, oldTag.id)
    return
  }

  // 目标名已存在：合并。把旧标签的关联转到已有标签（忽略重复），再删旧标签
  d.prepare(
    `UPDATE OR IGNORE image_tags SET tag_id = ? WHERE tag_id = ?`
  ).run(existing.id, oldTag.id)
  d.prepare(`DELETE FROM image_tags WHERE tag_id = ?`).run(oldTag.id)
  d.prepare(`DELETE FROM tags WHERE id = ?`).run(oldTag.id)
}
