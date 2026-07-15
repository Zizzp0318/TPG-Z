import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Copy, Check, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { GeneratedImage } from '../types'
import { StarRating } from './StarRating'
import { isVideoType } from '../../../shared/media'

// 生成方式徽标文案
const TYPE_LABEL: Record<GeneratedImage['type'], string> = {
  text2img: '✍️ 文生图',
  img2img: '🖼 图生图',
  text2video: '🎬 文生视频',
  ref2video: '🎞 参考生视频'
}

interface DetailViewProps {
  image: GeneratedImage
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
  /** 评分变更回调，会同步到数据库 */
  onRatingChange?: (id: string, rating: number) => void
  /** 点击编辑按钮 */
  onEdit?: () => void
  /** 点击删除按钮 */
  onDelete?: () => void
}

interface Transform {
  scale: number
  x: number
  y: number
}

export function DetailView({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onRatingChange,
  onEdit,
  onDelete
}: DetailViewProps) {
  const [copied, setCopied] = useState(false)
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  // 悬浮预览的参考图：记录 url 和缩略图在屏幕上的位置，用于 fixed 定位
  const [hoveredRef, setHoveredRef] = useState<{ url: string; rect: DOMRect } | null>(null)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLDivElement>(null)

  // 关闭时重置缩放
  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 })
  }, [image.id])

  // ESC 关闭 / 左右箭头切换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // 一键复制提示词
  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(image.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级:创建临时 textarea
      const ta = document.createElement('textarea')
      ta.value = image.prompt
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [image.prompt])

  // 滚轮缩放
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setTransform((prev) => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const next = Math.min(Math.max(prev.scale * factor, 0.3), 5)
      return { ...prev, scale: next }
    })
  }, [])

  // 拖拽平移
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0 })
  const zoomIn = () => setTransform((p) => ({ ...p, scale: Math.min(p.scale * 1.25, 5) }))
  const zoomOut = () => setTransform((p) => ({ ...p, scale: Math.max(p.scale / 1.25, 0.3) }))

  const isVideo = isVideoType(image.type)
  // 是否有参考图区域（图生图 / 参考生视频）
  const hasRefs = image.type === 'img2img' || image.type === 'ref2video'

  const dateStr = new Date(image.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    // 全屏遮罩
    <div
      className="fixed inset-0 z-50 flex bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* 参考图悬浮预览：fixed 定位在缩略图左侧，按原图比例显示，不被面板遮挡 */}
      {hoveredRef && (
        <div
          className="pointer-events-none fixed z-[70] overflow-hidden rounded-lg bg-neutral-900 shadow-2xl ring-1 ring-neutral-600"
          style={{
            right: window.innerWidth - hoveredRef.rect.left + 12,
            top: Math.max(8, Math.min(hoveredRef.rect.top, window.innerHeight - 320))
          }}
        >
          <img
            src={hoveredRef.url}
            alt="参考图预览"
            className="block max-h-[300px] max-w-[300px] object-contain"
          />
        </div>
      )}

      {/* 左侧：预览区（视频用原生播放器，图片支持缩放拖拽） */}
      <div
        ref={imgRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/60 select-none"
        onWheel={isVideo ? undefined : onWheel}
        onMouseDown={isVideo ? undefined : onMouseDown}
        onMouseMove={isVideo ? undefined : onMouseMove}
        onMouseUp={isVideo ? undefined : onMouseUp}
        onMouseLeave={isVideo ? undefined : onMouseUp}
        style={{ cursor: isVideo ? 'default' : dragging.current ? 'grabbing' : 'grab' }}
      >
        {isVideo ? (
          <video
            src={image.full}
            controls
            autoPlay
            loop
            className="max-h-full max-w-full rounded shadow-2xl"
          />
        ) : (
          <img
            src={image.full}
            alt={image.title}
            draggable={false}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: dragging.current ? 'none' : 'transform 0.1s ease'
            }}
            className="max-h-full max-w-full rounded object-contain shadow-2xl"
          />
        )}

        {/* 图片缩放工具栏（视频不显示） */}
        {!isVideo && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <button onClick={zoomOut} className="rounded-full p-1 text-white/70 hover:text-white" title="缩小">
              <ZoomOut size={16} />
            </button>
            <span className="min-w-[44px] text-center text-xs text-white/70">
              {Math.round(transform.scale * 100)}%
            </span>
            <button onClick={zoomIn} className="rounded-full p-1 text-white/70 hover:text-white" title="放大">
              <ZoomIn size={16} />
            </button>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <button onClick={resetTransform} className="rounded-full p-1 text-white/70 hover:text-white" title="重置">
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {/* 上一张 */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/80 hover:text-white"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* 下一张 */}
        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/80 hover:text-white"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* 右侧：信息面板 */}
      <div className="flex w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-neutral-100">{image.title}</h2>
          <div className="ml-2 flex shrink-0 items-center gap-0.5">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                title="编辑"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded p-1.5 text-neutral-400 hover:bg-red-900/40 hover:text-red-400"
                title="删除"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 text-sm">
          {/* 生成方式 badge */}
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isVideo
                  ? 'bg-purple-600/30 text-purple-300'
                  : image.type === 'img2img'
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'bg-emerald-600/30 text-emerald-300'
              }`}
            >
              {TYPE_LABEL[image.type]}
            </span>
          </div>

          {/* 图生图 / 参考生视频：参考图区域 */}
          {hasRefs && image.referenceImages.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                参考图
              </div>
              <div className="flex flex-wrap gap-2">
                {image.referenceImages.map((ref) => (
                  <img
                    key={ref.id}
                    src={ref.thumb}
                    alt="参考图"
                    onMouseEnter={(e) =>
                      setHoveredRef({ url: ref.full, rect: e.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() => setHoveredRef(null)}
                    className="h-16 w-16 cursor-pointer rounded-md object-cover ring-1 ring-neutral-700 transition hover:ring-indigo-500"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 提示词 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                提示词
              </span>
              <button
                onClick={copyPrompt}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                  copied
                    ? 'bg-emerald-600/30 text-emerald-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <p className="rounded-md bg-neutral-900 p-2.5 text-xs leading-relaxed text-neutral-300 select-all">
              {image.prompt}
            </p>
          </div>

          {/* 评分 */}
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
              评分
            </div>
            <StarRating
              value={image.rating}
              size={16}
              onChange={onRatingChange ? (v) => onRatingChange(image.id, v) : undefined}
            />
          </div>

          {/* 标签 */}
          {image.tags.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                标签
              </div>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div className="text-xs text-neutral-500 space-y-1 border-t border-neutral-800 pt-3">
            <div className="flex justify-between">
              <span>文件夹</span>
              <span className="text-neutral-400">{image.folder}</span>
            </div>
            <div className="flex justify-between">
              <span>生成日期</span>
              <span className="text-neutral-400">{dateStr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
