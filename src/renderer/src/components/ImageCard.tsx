import type { ReactNode } from 'react'
import { GeneratedImage } from '../types'
import { StarRating } from './StarRating'
import { Images, Film, Play, Type } from 'lucide-react'

interface ImageCardProps {
  image: GeneratedImage
  onClick: () => void
}

// 类型徽标配置
const TYPE_BADGE: Partial<Record<GeneratedImage['type'], { label: string; icon: ReactNode }>> = {
  text2img:  { label: '文生图',   icon: <Type size={10} /> },
  img2img:   { label: '图生图',   icon: <Images size={10} /> },
  text2video: { label: '文生视频', icon: <Film size={10} /> },
  ref2video:  { label: '参考生视频', icon: <Film size={10} /> },
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const isVideo = image.type === 'text2video' || image.type === 'ref2video'
  const badge = TYPE_BADGE[image.type]

  return (
    <div
      className="group relative mb-3 cursor-pointer overflow-hidden rounded-lg bg-neutral-800"
      onClick={onClick}
    >
      {/* 主体：缩略图（视频用首帧，叠加播放角标） */}
      <img
        src={image.thumb}
        alt={image.title}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        draggable={false}
      />
      {isVideo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/30 backdrop-blur-sm">
            <Play size={20} className="translate-x-0.5 fill-white text-white" />
          </span>
        </div>
      )}

      {/* 悬浮遮罩 */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="p-2.5">
          <p className="truncate text-sm font-medium text-white">{image.title}</p>
          <div className="mt-1 flex items-center justify-between">
            <StarRating value={image.rating} size={12} />
            {badge && (
              <span className="flex items-center gap-1 rounded bg-indigo-600/80 px-1.5 py-0.5 text-[10px] text-white">
                {badge.icon}
                {badge.label}
              </span>
            )}
          </div>
          {/* 标签 */}
          {image.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {image.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
