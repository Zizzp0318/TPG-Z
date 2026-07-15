import { contextBridge, ipcRenderer } from 'electron'
import type { ImportPayload, UpdatePayload, IpcResult, ImageRecord } from '../shared/api'

// 暴露给渲染进程的 API
const api = {
  /** 获取所有图片 */
  getImages: (): Promise<IpcResult<ImageRecord[]>> =>
    ipcRenderer.invoke('images:getAll'),

  /** 导入一张图片 */
  importImage: (payload: ImportPayload): Promise<IpcResult<ImageRecord>> =>
    ipcRenderer.invoke('images:import', payload),

  /** 编辑图片信息 */
  updateImage: (payload: UpdatePayload): Promise<IpcResult<ImageRecord>> =>
    ipcRenderer.invoke('images:update', payload),

  /** 删除图片 */
  deleteImage: (id: string): Promise<IpcResult> =>
    ipcRenderer.invoke('images:delete', id),

  /** 更新评分 */
  updateRating: (id: string, rating: number): Promise<IpcResult> =>
    ipcRenderer.invoke('images:updateRating', id, rating),

  /** 更新标签 */
  updateTags: (id: string, tags: string[]): Promise<IpcResult> =>
    ipcRenderer.invoke('images:updateTags', id, tags),

  /** 获取所有文件夹 */
  getFolders: (): Promise<IpcResult<string[]>> =>
    ipcRenderer.invoke('meta:getFolders'),

  /** 获取所有标签 */
  getTags: (): Promise<IpcResult<string[]>> =>
    ipcRenderer.invoke('meta:getTags'),

  /** 打开文件选择对话框（多选） */
  selectImages: (): Promise<IpcResult<string[]>> =>
    ipcRenderer.invoke('dialog:selectImages'),

  /** 打开文件选择对话框（单选） */
  selectFile: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke('dialog:selectFile')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
