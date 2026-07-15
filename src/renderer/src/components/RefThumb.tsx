import { isVideoPath } from '../../../shared/media'

interface RefThumbProps {
  /** 显示用的 local:// URL（图片或视频均可） */
  url: string
  /** 用于判断是否视频的原始路径（新增视频时传本地路径） */
  path?: string
  size?: number
}

/** 参考素材缩略图：图片用 <img>，视频用 <video>（鼠标移入播放，移出暂停回首帧） */
export function RefThumb({ url, path, size = 64 }: RefThumbProps) {
  // 优先用原始路径判断；已存在的参考素材没有 path，回退用带扩展名的 url 判断
  const isVideo = isVideoPath(path ?? url)

  if (isVideo) {
    return (
      <video
        src={url}
        muted
        loop
        playsInline
        preload="metadata"
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => {
          e.currentTarget.pause()
          e.currentTarget.currentTime = 0
        }}
        className="rounded-md object-cover ring-1 ring-neutral-700 bg-black"
        style={{ width: size, height: size }}
      />
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
