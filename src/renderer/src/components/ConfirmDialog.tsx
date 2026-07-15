import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-80 rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          {danger && (
            <div className="mt-0.5 shrink-0 rounded-full bg-red-900/40 p-1.5 text-red-400">
              <AlertTriangle size={16} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-1.5 text-sm font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
