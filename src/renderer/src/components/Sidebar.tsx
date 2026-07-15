import { useState } from 'react'
import { Image, FolderOpen, Tag, FolderCog, Save, Loader2 } from 'lucide-react'

interface SidebarProps {
  selectedFolder: string
  onFolderChange: (f: string) => void
  selectedTags: string[]
  onTagToggle: (t: string) => void
  /** 来自数据库的文件夹列表（含"全部"） */
  folders: string[]
  /** 来自数据库的标签列表 */
  tags: string[]
}

export function Sidebar({
  selectedFolder,
  onFolderChange,
  selectedTags,
  onTagToggle,
  folders,
  tags
}: SidebarProps) {
  const [backingUp, setBackingUp] = useState(false)
  // 底部操作提示：成功/失败短暂显示
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const showNotice = (kind: 'ok' | 'err', text: string): void => {
    setNotice({ kind, text })
    setTimeout(() => setNotice(null), 4000)
  }

  const openDataDir = async (): Promise<void> => {
    const res = await window.api.openDataDir()
    if (!res.ok) showNotice('err', `打开失败：${res.error ?? '未知错误'}`)
  }

  const backupData = async (): Promise<void> => {
    setBackingUp(true)
    try {
      const res = await window.api.backupData()
      if (!res.ok) {
        showNotice('err', `备份失败：${res.error ?? '未知错误'}`)
      } else if (res.data) {
        showNotice('ok', `已备份到：${res.data}`)
      }
      // res.data 为空表示用户取消了选择，不提示
    } catch (e) {
      showNotice('err', `备份失败：${String(e)}`)
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-800 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* 文件夹 */}
        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-wider text-neutral-500">
            <FolderOpen size={12} />
            文件夹
          </div>
          <nav className="space-y-0.5 text-sm">
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFolderChange(f)}
                className={`w-full rounded-md px-3 py-1.5 text-left transition-colors ${
                  selectedFolder === f
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {f === '全部' ? (
                  <span className="flex items-center gap-1.5">
                    <Image size={13} />
                    全部图片
                  </span>
                ) : (
                  f
                )}
              </button>
            ))}
          </nav>
        </div>

        {tags.length > 0 && (
          <>
            <div className="mx-3 border-t border-neutral-800" />
            <div className="p-3">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-wider text-neutral-500">
                <Tag size={12} />
                标签
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagToggle(tag)}
                    className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 底部：数据目录操作 */}
      <div className="shrink-0 border-t border-neutral-800 p-3 space-y-1.5">
        {notice && (
          <p
            className={`mb-1 break-all rounded-md px-2 py-1.5 text-[11px] leading-snug ${
              notice.kind === 'ok'
                ? 'bg-emerald-900/40 text-emerald-300'
                : 'bg-red-900/40 text-red-400'
            }`}
          >
            {notice.text}
          </p>
        )}
        <button
          type="button"
          onClick={openDataDir}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <FolderCog size={14} />
          打开数据目录
        </button>
        <button
          type="button"
          onClick={backupData}
          disabled={backingUp}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
        >
          {backingUp ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {backingUp ? '备份中…' : '一键备份'}
        </button>
      </div>
    </aside>
  )
}
