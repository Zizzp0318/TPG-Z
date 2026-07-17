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

  /** 重命名文件夹 */
  renameFolder: (oldName: string, newName: string): Promise<IpcResult> =>
    ipcRenderer.invoke('meta:renameFolder', oldName, newName),

  /** 重命名标签 */
  renameTag: (oldName: string, newName: string): Promise<IpcResult> =>
    ipcRenderer.invoke('meta:renameTag', oldName, newName),

  /** 保存文件夹自定义顺序 */
  reorderFolders: (order: string[]): Promise<IpcResult> =>
    ipcRenderer.invoke('meta:reorderFolders', order),

  /** 保存标签自定义顺序 */
  reorderTags: (order: string[]): Promise<IpcResult> =>
    ipcRenderer.invoke('meta:reorderTags', order),

  /** 打开文件选择对话框（多选） */
  selectImages: (): Promise<IpcResult<string[]>> =>
    ipcRenderer.invoke('dialog:selectImages'),

  /** 打开文件选择对话框（单选，仅图片） */
  selectFile: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke('dialog:selectFile'),

  /** 打开文件选择对话框（单选，仅视频） */
  selectVideo: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke('dialog:selectVideo'),

  /** 文件另存为：弹出保存对话框，把 local:// 指向的文件复制到用户选定位置 */
  saveFileAs: (localUrl: string, defaultName: string): Promise<IpcResult> =>
    ipcRenderer.invoke('files:saveAs', localUrl, defaultName),
  openDataDir: (): Promise<IpcResult> =>
    ipcRenderer.invoke('data:openDir'),

  /** 一键备份：把数据目录复制到用户选定位置，返回备份路径 */
  backupData: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke('data:backup')
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
