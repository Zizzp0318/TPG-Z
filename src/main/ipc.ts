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
  ipcMain.handle('images:import', (_e, payload: ImportPayload): IpcResult<ImageRecord> => {
    try {
      const record = dbImportImage(payload)
      return { ok: true, data: record }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // ---------- 编辑 ----------
  ipcMain.handle('images:update', (_e, payload: UpdatePayload): IpcResult<ImageRecord> => {
    try {
      const record = dbUpdateImage(payload)
      return { ok: true, data: record }
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
        title: '选择图片',
        filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
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
