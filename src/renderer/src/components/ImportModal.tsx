import { useState, useCallback } from 'react'
import { X, Upload, Plus, Image as ImageIcon, Trash2 } from 'lucide-react'
import type { ImportPayload } from '../../../shared/api'
import { toLocalUrl } from '../../../shared/url'
import { isVideoPath } from '../../../shared/media'
import { RefThumb } from './RefThumb'

interface ImportModalProps {
  onClose: () => void
  onImported: () => void // 导入成功后刷新列表
}

interface RefPreview {
  path: string
  dataUrl: string
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [srcPath, setSrcPath] = useState('')
  const [srcPreview, setSrcPreview] = useState('')
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<'text2img' | 'img2img'>('text2img')
  const [folder, setFolder] = useState('未分类')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [refs, setRefs] = useState<RefPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 选择主图
  const pickMainImage = useCallback(async () => {
    const result = await window.api.selectFile()
    if (!result.ok || !result.data) return
    const path = result.data
    setSrcPath(path)
    setSrcPreview(toLocalUrl(path))
    // 用文件名作为默认标题
    const name = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? '未命名'
    if (!title) setTitle(name)
  }, [title])

  // 选择参考图
  const pickRefImages = useCallback(async () => {
    const result = await window.api.selectImages()
    if (!result.ok || !result.data?.length) return
    const newRefs: RefPreview[] = result.data.map((p) => ({
      path: p,
      dataUrl: toLocalUrl(p)
    }))
    setRefs((prev) => [...prev, ...newRefs].slice(0, 8)) // 最多8张参考图
  }, [])

  const removeRef = (idx: number) => setRefs((prev) => prev.filter((_, i) => i !== idx))

  // 添加标签
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  // 提交导入
  const handleImport = async () => {
    if (!srcPath) { setError('请先选择图片'); return }
    setLoading(true)
    setError('')
    try {
      const payload: ImportPayload = {
        srcPath,
        title: title || '未命名',
        prompt,
        type,
        folder,
        tags,
        refPaths: refs.map((r) => r.path)
      }
      const result = await window.api.importImage(payload)
      if (!result.ok) { setError(result.error ?? '导入失败'); return }
      onImported()
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[780px] max-w-[95vw] flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-100">导入 AI 生成图片</h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左：图片选择 */}
          <div className="flex w-64 shrink-0 flex-col border-r border-neutral-800 p-4 gap-4">
            {/* 主图 */}
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">生成结果图片</p>
              {srcPreview ? (
                <div className="relative">
                  <img
                    src={srcPreview}
                    alt="预览"
                    className="h-44 w-full rounded-lg object-cover ring-1 ring-neutral-700"
                  />
                  <button
                    onClick={() => { setSrcPath(''); setSrcPreview('') }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/80 hover:bg-black/90"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={pickMainImage}
                  className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-700 text-neutral-500 hover:border-indigo-500 hover:text-indigo-400"
                >
                  <Upload size={24} />
                  <span className="text-xs">点击选择图片</span>
                </button>
              )}
            </div>

            {/* 参考图（图生图模式） */}
            {type === 'img2img' && (
              <div className="flex-1">
                <p className="mb-2 text-xs font-medium text-neutral-500">参考图（可多张）</p>
                <div className="flex flex-wrap gap-2">
                  {refs.map((ref, i) => (
                    <div key={i} className="group relative">
                      <RefThumb url={ref.dataUrl} path={ref.path} size={64} />
                      <button
                        onClick={() => removeRef(i)}
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
          </div>

          {/* 右：表单 */}
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

            {/* 标题 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给这张图片起个名字"
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-indigo-500"
              />
            </div>

            {/* 提示词 */}
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">提示词</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="粘贴或输入生成这张图片时使用的提示词…"
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
                placeholder="输入文件夹名称，如：人物"
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

            {/* 错误提示 */}
            {error && (
              <p className="rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-400">{error}</p>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {srcPath && <span className="flex items-center gap-1"><ImageIcon size={12} />{srcPath.split(/[\\/]/).pop()}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white">
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !srcPath}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {loading
                ? refs.some((r) => isVideoPath(r.path))
                  ? '转换视频中…'
                  : '导入中…'
                : '导入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
