/**
 * IPC 处理器 — 注册所有主进程 ↔ 渲染进程的通信接口
 */
import { ipcMain, dialog, shell } from 'electron'
import {
  dbGetImages,
  dbImportImage,
  dbUpdateImage,
  dbDeleteImage,
  dbUpdateRating,
  dbUpdateTags,
  dbGetFolders,
  dbGetTags,
  getDataDir
} from './db'
import { cpSync } from 'fs'
import { preprocessRefPaths, cleanupTemp, isVideoFile, extractFirstFrame } from './video'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync, rmSync } from 'fs'
import type { ImportPayload, UpdatePayload, IpcResult, ImageRecord } from '../shared/api'

export function registerIpcHandlers(): void {
  // ---------- 图片列表 ----------
  ipcMain.handle('images:getAll', (): IpcResult<ImageRecord[]> => {
    try {
      return { ok: true, data: dbGetImages() }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 导入 ----------
  ipcMain.handle('images:import', async (_e, payload: ImportPayload): Promise<IpcResult<ImageRecord>> => {
    try {
      // 参考图预处理：视频转 GIF，图片原样
      const processed = await preprocessRefPaths(payload.refPaths)
      // 主文件是视频：抽首帧当缩略图源
      let framePath: string | undefined
      if (isVideoFile(payload.srcPath)) {
        framePath = join(tmpdir(), `tpgz-frame-${randomUUID()}.jpg`)
        try {
          await extractFirstFrame(payload.srcPath, framePath)
        } catch {
          framePath = undefined // 抽帧失败时退回默认逻辑
        }
      }
      try {
        const record = dbImportImage(
          { ...payload, refPaths: processed.map((r) => r.path) },
          framePath
        )
        return { ok: true, data: record }
      } finally {
        cleanupTemp(processed)
        if (framePath && existsSync(framePath)) {
          try { rmSync(framePath, { force: true }) } catch { /* 忽略 */ }
        }
      }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 编辑 ----------
  ipcMain.handle('images:update', async (_e, payload: UpdatePayload): Promise<IpcResult<ImageRecord>> => {
    try {
      // 新增参考图预处理：视频转 GIF，图片原样
      const processed = await preprocessRefPaths(payload.newRefPaths)
      try {
        const record = dbUpdateImage({ ...payload, newRefPaths: processed.map((r) => r.path) })
        return { ok: true, data: record }
      } finally {
        cleanupTemp(processed)
      }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 删除 ----------
  ipcMain.handle('images:delete', (_e, id: string): IpcResult => {
    try {
      dbDeleteImage(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 评分更新 ----------
  ipcMain.handle('images:updateRating', (_e, id: string, rating: number): IpcResult => {
    try {
      dbUpdateRating(id, rating)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 标签更新 ----------
  ipcMain.handle('images:updateTags', (_e, id: string, tags: string[]): IpcResult => {
    try {
      dbUpdateTags(id, tags)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 元数据查询 ----------
  ipcMain.handle('meta:getFolders', (): IpcResult<string[]> => {
    try {
      return { ok: true, data: dbGetFolders() }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('meta:getTags', (): IpcResult<string[]> => {
    try {
      return { ok: true, data: dbGetTags() }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 文件选择对话框 ----------
  ipcMain.handle('dialog:selectImages', async (): Promise<IpcResult<string[]>> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择参考图或视频',
        filters: [
          {
            name: '图片和视频',
            extensions: [
              'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp',
              'mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv'
            ]
          }
        ],
        properties: ['openFile', 'multiSelections']
      })
      if (result.canceled) return { ok: true, data: [] }
      return { ok: true, data: result.filePaths }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('dialog:selectFile', async (): Promise<IpcResult<string>> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择图片',
        filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) return { ok: true, data: '' }
      return { ok: true, data: result.filePaths[0] }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('dialog:selectVideo', async (): Promise<IpcResult<string>> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择视频',
        filters: [
          {
            name: '视频',
            extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv']
          }
        ],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) return { ok: true, data: '' }
      return { ok: true, data: result.filePaths[0] }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 打开数据目录 ----------
  ipcMain.handle('data:openDir', async (): Promise<IpcResult> => {
    try {
      const err = await shell.openPath(getDataDir())
      // openPath 成功返回空串，失败返回错误信息
      if (err) return { ok: false, error: err }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 一键备份（复制整个数据目录到用户选定位置） ----------
  ipcMain.handle('data:backup', async (): Promise<IpcResult<string>> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择备份保存位置',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return { ok: true, data: '' }

      // 目标：<所选目录>/tpg-z-backup-YYYYMMDD-HHmmss
      const now = new Date()
      const pad = (n: number): string => String(n).padStart(2, '0')
      const stamp =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const destDir = join(result.filePaths[0], `tpg-z-backup-${stamp}`)

      cpSync(getDataDir(), destDir, { recursive: true })
      return { ok: true, data: destDir }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })
}
