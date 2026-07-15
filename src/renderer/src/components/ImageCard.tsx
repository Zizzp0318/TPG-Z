import { GeneratedImage } from '../types'
import { StarRating } from './StarRating'
import { Images } from 'lucide-react'

interface ImageCardProps {
  image: GeneratedImage
  onClick: () => void
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  return (
    <div
      className="group relative mb-3 cursor-pointer overflow-hidden rounded-lg bg-neutral-800"
      onClick={onClick}
    >
      {/* 图片 */}
      <img
        src={image.thumb}
        alt={image.title}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        draggable={false}
      />

      {/* 悬浮遮罩 */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="p-2.5">
          <p className="truncate text-sm font-medium text-white">{image.title}</p>
          <div className="mt-1 flex items-center justify-between">
            <StarRating value={image.rating} size={12} />
            {image.type === 'img2img' && (
              <span className="flex items-center gap-1 rounded bg-indigo-600/80 px-1.5 py-0.5 text-[10px] text-white">
                <Images size={10} />
                图生图
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
