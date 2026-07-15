import type { ImportPayload, IpcResult, ImageRecord } from '../shared/api'

declare global {
  interface Window {
    api: {
      getImages(): Promise<IpcResult<ImageRecord[]>>
      importImage(payload: ImportPayload): Promise<IpcResult<ImageRecord>>
      updateRating(id: string, rating: number): Promise<IpcResult>
      updateTags(id: string, tags: string[]): Promise<IpcResult>
      getFolders(): Promise<IpcResult<string[]>>
      getTags(): Promise<IpcResult<string[]>>
      selectImages(): Promise<IpcResult<string[]>>
      selectFile(): Promise<IpcResult<string>>
    }
  }
}

export {}
