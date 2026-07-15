import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Plus, SlidersHorizontal, Image as ImageIcon } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { MasonryGrid } from './components/MasonryGrid'
import { DetailView } from './components/DetailView'
import { ImportModal } from './components/ImportModal'
import { EditModal } from './components/EditModal'
import { ConfirmDialog } from './components/ConfirmDialog'
import type { ImageRecord } from '../../shared/api'
import { GeneratedImage } from './types'

type FilterType = 'all' | 'text2img' | 'img2img' | 'text2video' | 'ref2video'

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

  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('全部')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<GeneratedImage | null>(null)
  const [deleting, setDeleting] = useState<GeneratedImage | null>(null)

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

  // 重命名文件夹：成功后修正选中态并刷新
  const renameFolder = useCallback(async (oldName: string, newName: string) => {
    const to = newName.trim()
    if (!to || to === oldName) return
    const res = await window.api.renameFolder(oldName, to)
    if (!res.ok) return
    setSelectedFolder((cur) => (cur === oldName ? to : cur))
    await loadData()
  }, [loadData])

  // 重命名标签：成功后修正已选标签并刷新
  const renameTag = useCallback(async (oldName: string, newName: string) => {
    const to = newName.trim()
    if (!to || to === oldName) return
    const res = await window.api.renameTag(oldName, to)
    if (!res.ok) return
    setSelectedTags((prev) => {
      // 改名后若与已有标签合并，去重
      const mapped = prev.map((t) => (t === oldName ? to : t))
      return Array.from(new Set(mapped))
    })
    await loadData()
  }, [loadData])

  // 筛选逻辑
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (selectedFolder !== '全部' && img.folder !== selectedFolder) return false
      if (typeFilter !== 'all' && img.type !== typeFilter) return false
      // 多标签取并集：含任意一个选中标签即显示
      if (selectedTags.length > 0 && !selectedTags.some((t) => img.tags.includes(t))) return false
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

  // 编辑保存后：重新加载数据，并用最新记录刷新详情页
  const handleEditSaved = useCallback(async () => {
    const editingId = editing?.id
    await loadData()
    if (editingId) {
      const res = await window.api.getImages()
      if (res.ok && res.data) {
        const updated = res.data.find((r) => r.id === editingId)
        if (updated && selectedImage?.id === editingId) {
          setSelectedImage(toGenerated(updated))
        }
      }
    }
  }, [editing, loadData, selectedImage])

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!deleting) return
    const delId = deleting.id
    const idx = filteredImages.findIndex((img) => img.id === delId)
    const result = await window.api.deleteImage(delId)
    setDeleting(null)
    if (!result.ok) return

    // 详情页开着这张图：切到下一张（没有则上一张，都没有则关闭）
    if (selectedImage?.id === delId) {
      const rest = filteredImages.filter((img) => img.id !== delId)
      if (rest.length === 0) {
        setSelectedImage(null)
      } else {
        const nextIdx = Math.min(idx, rest.length - 1)
        setSelectedImage(rest[nextIdx])
      }
    }
    await loadData()
  }, [deleting, filteredImages, selectedImage, loadData])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      {/* 顶部栏 */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-800 px-4">
        <div className="flex items-center gap-2 mr-2">
          <ImageIcon size={20} className="text-indigo-400" />
          <span className="text-sm font-semibold tracking-tight">AI 作品管理</span>
        </div>

        <div className="mx-2 h-5 w-px bg-neutral-700" />

        {/* 类型筛选 */}
        <div className="flex gap-1 text-xs">
          {(['all', 'text2img', 'img2img', 'text2video', 'ref2video'] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {t === 'all' ? '全部'
                : t === 'text2img' ? '文生图'
                : t === 'img2img' ? '图生图'
                : t === 'text2video' ? '文生视频'
                : '参考生视频'}
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

        {/* 导入按钮 */}
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={14} />
          导入作品
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
          onRenameFolder={renameFolder}
          onRenameTag={renameTag}
        />

        <main className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-neutral-500 text-sm">加载中…</div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  共 {filteredImages.length} 个作品
                  {selectedTags.length > 0 && (
                    <span>
                      {' '}· 标签：{selectedTags.map((t) => <span key={t} className="text-indigo-400">{t} </span>)}
                      <button onClick={() => setSelectedTags([])} className="underline hover:text-white">清除</button>
                    </span>
                  )}
                </p>
              </div>
              <MasonryGrid images={filteredImages} onSelect={openImage} columns={4} />
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
          onEdit={() => setEditing(selectedImage)}
          onDelete={() => setDeleting(selectedImage)}
        />
      )}

      {/* 导入模态 */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={loadData}
          existingFolders={folders.filter((f) => f !== '全部')}
          existingTags={allTags}
        />
      )}

      {/* 编辑模态 */}
      {editing && (
        <EditModal
          image={editing}
          onClose={() => setEditing(null)}
          onSaved={handleEditSaved}
          existingFolders={folders.filter((f) => f !== '全部')}
          existingTags={allTags}
        />
      )}

      {/* 删除确认 */}
      {deleting && (
        <ConfirmDialog
          danger
          title="删除这张图片？"
          message={`「${deleting.title}」将被永久删除，包括本地图片文件和缩略图，无法恢复。`}
          confirmText="删除"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
