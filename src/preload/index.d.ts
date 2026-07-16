import type { ImportPayload, UpdatePayload, IpcResult, ImageRecord } from '../shared/api'

declare global {
  interface Window {
    api: {
      getImages(): Promise<IpcResult<ImageRecord[]>>
      importImage(payload: ImportPayload): Promise<IpcResult<ImageRecord>>
      updateImage(payload: UpdatePayload): Promise<IpcResult<ImageRecord>>
      deleteImage(id: string): Promise<IpcResult>
      updateRating(id: string, rating: number): Promise<IpcResult>
      updateTags(id: string, tags: string[]): Promise<IpcResult>
      getFolders(): Promise<IpcResult<string[]>>
      getTags(): Promise<IpcResult<string[]>>
      renameFolder(oldName: string, newName: string): Promise<IpcResult>
      renameTag(oldName: string, newName: string): Promise<IpcResult>
      saveFileAs(localUrl: string, defaultName: string): Promise<IpcResult>
      selectImages(): Promise<IpcResult<string[]>>
      selectFile(): Promise<IpcResult<string>>
      selectVideo(): Promise<IpcResult<string>>
      openDataDir(): Promise<IpcResult>
      backupData(): Promise<IpcResult<string>>
    }
  }
}

export {}
