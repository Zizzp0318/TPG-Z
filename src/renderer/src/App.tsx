import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, LayoutGrid, Columns, Plus, SlidersHorizontal, Image as ImageIcon } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { MasonryGrid } from './components/MasonryGrid'
import { DetailView } from './components/DetailView'
import { ImportModal } from './components/ImportModal'
import type { ImageRecord } from '../../shared/api'
import { GeneratedImage, ViewMode } from './types'

type FilterType = 'all' | 'text2img' | 'img2img'

/** 把 ImageRecord（主进程格式）转成渲染层用的 GeneratedImage */
function toGenerated(r: ImageRecord): GeneratedImage {
  return {
    id: r.id,
    title: r.title,
    thumb: r.thumbPath,
    full: r.imagePath,
    prompt: r.prompt,
    type: r.type,
    referenceImages: r.referenceImages.map((ref) => ({
      id: ref.id,
      thumb: ref.path,
      full: ref.path
    })),
    tags: r.tags,
    rating: r.rating,
    folder: r.folder,
    createdAt: r.createdAt
  }
}

export default function App(): React.JSX.Element {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [folders, setFolders] = useState<string[]>(['全部'])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('全部')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showImport, setShowImport] = useState(false)

  // 从数据库加载图片和元数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [imgRes, folderRes, tagRes] = await Promise.all([
        window.api.getImages(),
        window.api.getFolders(),
        window.api.getTags()
      ])
      if (imgRes.ok && imgRes.data) {
        setImages(imgRes.data.map(toGenerated))
      }
      if (folderRes.ok && folderRes.data) {
        setFolders(['全部', ...folderRes.data])
      }
      if (tagRes.ok && tagRes.data) {
        setAllTags(tagRes.data)
      }
    } catch (e) {
      console.error('加载数据失败', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  // 筛选逻辑
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (selectedFolder !== '全部' && img.folder !== selectedFolder) return false
      if (typeFilter !== 'all' && img.type !== typeFilter) return false
      if (selectedTags.length > 0 && !selectedTags.every((t) => img.tags.includes(t))) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          img.title.toLowerCase().includes(q) ||
          img.prompt.toLowerCase().includes(q) ||
          img.tags.some((t) => t.toLowerCase().includes(q))
        if (!hit) return false
      }
      return true
    })
  }, [images, selectedFolder, typeFilter, selectedTags, search])

  const selectedIdx = selectedImage
    ? filteredImages.findIndex((img) => img.id === selectedImage.id)
    : -1

  const openImage = useCallback((img: GeneratedImage) => setSelectedImage(img), [])
  const closeDetail = useCallback(() => setSelectedImage(null), [])
  const prevImage = useCallback(() => {
    if (selectedIdx > 0) setSelectedImage(filteredImages[selectedIdx - 1])
  }, [selectedIdx, filteredImages])
  const nextImage = useCallback(() => {
    if (selectedIdx < filteredImages.length - 1) setSelectedImage(filteredImages[selectedIdx + 1])
  }, [selectedIdx, filteredImages])

  // 评分更新（同步到数据库）
  const handleRatingChange = useCallback(async (id: string, rating: number) => {
    await window.api.updateRating(id, rating)
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, rating } : img))
    if (selectedImage?.id === id) setSelectedImage((prev) => prev ? { ...prev, rating } : prev)
  }, [selectedImage])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      {/* 顶部栏 */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-800 px-4">
        <div className="flex items-center gap-2 mr-2">
          <ImageIcon size={20} className="text-indigo-400" />
          <span className="text-sm font-semibold tracking-tight">AI 图片管理</span>
        </div>

        <div className="mx-2 h-5 w-px bg-neutral-700" />

        {/* 类型筛选 */}
        <div className="flex gap-1 text-xs">
          {(['all', 'text2img', 'img2img'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {t === 'all' ? '全部' : t === 'text2img' ? '文生图' : '图生图'}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* 搜索框 */}
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题、提示词、标签…"
            className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-neutral-500 focus:border-indigo-500"
          />
        </div>

        {/* 视图模式 */}
        <div className="flex gap-0.5 rounded-md bg-neutral-800 p-0.5">
          <button
            onClick={() => setViewMode('masonry')}
            className={`rounded p-1.5 ${viewMode === 'masonry' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
            title="瀑布流"
          >
            <Columns size={14} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
            title="网格"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* 导入按钮 */}
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={14} />
          导入图片
        </button>
      </header>

      {/* 主体 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedFolder={selectedFolder}
          onFolderChange={setSelectedFolder}
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          folders={folders}
          tags={allTags}
        />

        <main className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-neutral-500 text-sm">加载中…</div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  共 {filteredImages.length} 张图片
                  {selectedTags.length > 0 && (
                    <span>
                      {' '}· 标签：{selectedTags.map((t) => <span key={t} className="text-indigo-400">{t} </span>)}
                      <button onClick={() => setSelectedTags([])} className="underline hover:text-white">清除</button>
                    </span>
                  )}
                </p>
              </div>
              <MasonryGrid images={filteredImages} onSelect={openImage} viewMode={viewMode} columns={4} />
            </>
          )}
        </main>
      </div>

      {/* 详情预览 */}
      {selectedImage && (
        <DetailView
          image={selectedImage}
          onClose={closeDetail}
          onPrev={prevImage}
          onNext={nextImage}
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < filteredImages.length - 1}
          onRatingChange={handleRatingChange}
        />
      )}

      {/* 导入模态 */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={loadData}
        />
      )}
    </div>
  )
}
