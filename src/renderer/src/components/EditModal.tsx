import { useState, useCallback } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { UpdatePayload } from '../../../shared/api'
import { toLocalUrl } from '../../../shared/url'
import { isVideoPath } from '../../../shared/media'
import { RefThumb } from './RefThumb'
import { GeneratedImage } from '../types'

interface EditModalProps {
  image: GeneratedImage
  onClose: () => void
  onSaved: () => void // 保存成功后刷新
}

// 已有参考图（带 id）与新增参考图（带本地路径）统一表示
interface RefItem {
  key: string
  url: string
  existingId?: string // 已有参考图的 id
  newPath?: string // 新增参考图的绝对路径
}

export function EditModal({ image, onClose, onSaved }: EditModalProps) {
  const [title, setTitle] = useState(image.title)
  const [prompt, setPrompt] = useState(image.prompt)
  const [type, setType] = useState<'text2img' | 'img2img'>(image.type)
  const [folder, setFolder] = useState(image.folder)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(image.tags)
  const [refs, setRefs] = useState<RefItem[]>(
    image.referenceImages.map((r) => ({ key: r.id, url: r.thumb, existingId: r.id }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pickRefImages = useCallback(async () => {
    const result = await window.api.selectImages()
    if (!result.ok || !result.data?.length) return
    const newItems: RefItem[] = result.data.map((p, i) => ({
      key: `new-${Date.now()}-${i}`,
      url: toLocalUrl(p),
      newPath: p
    }))
    setRefs((prev) => [...prev, ...newItems].slice(0, 8))
  }, [])

  const removeRef = (key: string) => setRefs((prev) => prev.filter((r) => r.key !== key))

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const payload: UpdatePayload = {
        id: image.id,
        title: title || '未命名',
        prompt,
        type,
        folder,
        tags,
        keepRefIds: type === 'img2img' ? refs.filter((r) => r.existingId).map((r) => r.existingId!) : [],
        newRefPaths: type === 'img2img' ? refs.filter((r) => r.newPath).map((r) => r.newPath!) : []
      }
      const result = await window.api.updateImage(payload)
      if (!result.ok) { setError(result.error ?? '保存失败'); return }
      onSaved()
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[720px] max-w-[95vw] flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-100">编辑图片信息</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-4 text-sm">
          {/* 生成方式 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">生成方式</label>
            <div className="flex gap-2">
              {(['text2img', 'img2img'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    type === t ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {t === 'text2img' ? '✍️ 文生图' : '🖼 图生图'}
                </button>
              ))}
            </div>
          </div>

          {/* 参考图（图生图模式） */}
          {type === 'img2img' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">参考图（可多张）</label>
              <div className="flex flex-wrap gap-2">
                {refs.map((ref) => (
                  <div key={ref.key} className="group relative">
                    <RefThumb url={ref.url} path={ref.newPath} size={64} />
                    <button
                      onClick={() => removeRef(ref.key)}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-red-600 p-0.5 text-white group-hover:flex"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {refs.length < 8 && (
                  <button
                    onClick={pickRefImages}
                    className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-neutral-700 text-neutral-500 hover:border-indigo-500 hover:text-indigo-400"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-indigo-500"
            />
          </div>

          {/* 提示词 */}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">提示词</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-indigo-500"
            />
          </div>

          {/* 文件夹 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">文件夹</label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-indigo-500"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">标签</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="输入标签后按 Enter 添加"
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-indigo-500"
              />
              <button onClick={addTag} className="rounded-md bg-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-600">
                添加
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-indigo-600/30 px-2 py-0.5 text-xs text-indigo-300">
                    {tag}
                    <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="text-indigo-400 hover:text-white">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-400">{error}</p>}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {loading
              ? refs.some((r) => r.newPath && isVideoPath(r.newPath))
                ? '转换视频中…'
                : '保存中…'
              : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
