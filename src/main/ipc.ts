/**
 * IPC 处理器 — 注册所有主进程 ↔ 渲染进程的通信接口
 */
import { ipcMain, dialog } from 'electron'
import {
  dbGetImages,
  dbImportImage,
  dbUpdateImage,
  dbDeleteImage,
  dbUpdateRating,
  dbUpdateTags,
  dbGetFolders,
  dbGetTags
} from './db'
import { preprocessRefPaths, cleanupTemp } from './video'
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
      try {
        const record = dbImportImage({ ...payload, refPaths: processed.map((r) => r.path) })
        return { ok: true, data: record }
      } finally {
        cleanupTemp(processed)
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
}
