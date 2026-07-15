import { useMemo } from 'react'
import { GeneratedImage, ViewMode } from '../types'
import { ImageCard } from './ImageCard'

interface MasonryGridProps {
  images: GeneratedImage[]
  onSelect: (image: GeneratedImage) => void
  viewMode: ViewMode
  columns?: number
}

export function MasonryGrid({ images, onSelect, viewMode, columns = 4 }: MasonryGridProps) {
  // 瀑布流:把图片按列分配,尽量让各列高度均衡
  const columnArrays = useMemo(() => {
    if (viewMode !== 'masonry') return []
    const cols: GeneratedImage[][] = Array.from({ length: columns }, () => [])
    images.forEach((img, i) => cols[i % columns].push(img))
    return cols
  }, [images, columns, viewMode])

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="text-lg">暂无图片</p>
          <p className="mt-1 text-sm">尝试修改筛选条件，或导入新图片</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'masonry') {
    return (
      <div className="flex gap-3">
        {columnArrays.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col">
            {col.map((img) => (
              <ImageCard key={img.id} image={img} onClick={() => onSelect(img)} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // 网格模式
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {images.map((img) => (
        <ImageCard key={img.id} image={img} onClick={() => onSelect(img)} />
      ))}
    </div>
  )
}
