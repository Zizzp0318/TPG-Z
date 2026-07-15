// 渲染进程与主进程共享的接口类型

/** 数据库中一张图片的完整记录 */
export interface ImageRecord {
  id: string
  title: string
  /** local:// 协议 URL，供渲染进程直接用在 <img> src */
  imagePath: string
  thumbPath: string
  prompt: string
  type: 'text2img' | 'img2img'
  folder: string
  rating: number
  createdAt: string
  tags: string[]
  referenceImages: Array<{ id: string; path: string }>
}

/** 导入一张图片所需的表单数据 */
export interface ImportPayload {
  /** 原始图片在本地的绝对路径 */
  srcPath: string
  title: string
  prompt: string
  type: 'text2img' | 'img2img'
  folder: string
  tags: string[]
  /** 参考图的绝对路径列表（图生图模式） */
  refPaths: string[]
}

/** IPC 通用返回包装 */
export interface IpcResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}
