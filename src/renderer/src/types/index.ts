// 生成方式（图片 / 视频）
export type GenerationType = 'text2img' | 'img2img' | 'text2video' | 'ref2video'

// 参考图(图生图模式使用)
export interface ReferenceImage {
  id: string
  thumb: string // 缩略图 URL / data URI
  full: string // 大图 URL / data URI
}

// 一张 AI 生成图片的完整信息
export interface GeneratedImage {
  id: string
  title: string
  thumb: string // 列表缩略图
  full: string // 详情大图
  prompt: string // 正向提示词
  type: GenerationType // 文生图 / 图生图
  referenceImages: ReferenceImage[] // 图生图的参考图,文生图为空数组
  tags: string[]
  rating: number // 0-5 星
  folder: string // 所属文件夹 / 相册
  createdAt: string // ISO 日期字符串
}
