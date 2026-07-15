import { Film } from 'lucide-react'
import { isVideoPath } from '../../../shared/media'

interface RefThumbProps {
  /** 显示用的 URL（图片用 local:// URL；视频显示占位） */
  url: string
  /** 用于判断是否视频的原始路径（新增视频时传本地路径） */
  path?: string
  size?: number
}

/** 参考图缩略图：图片正常显示，视频显示占位（提示将转 GIF） */
export function RefThumb({ url, path, size = 64 }: RefThumbProps) {
  const isVideo = path ? isVideoPath(path) : false

  if (isVideo) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-md bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700"
        style={{ width: size, height: size }}
        title="视频将在导入时转换为 GIF"
      >
        <Film size={size * 0.32} />
        <span className="text-[9px] leading-none">转 GIF</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt="参考图"
      className="rounded-md object-cover ring-1 ring-neutral-700"
      style={{ width: size, height: size }}
    />
  )
}
