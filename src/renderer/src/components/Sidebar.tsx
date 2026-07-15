import { Image, FolderOpen, Tag } from 'lucide-react'

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
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-800 overflow-y-auto">
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
    </aside>
  )
}
