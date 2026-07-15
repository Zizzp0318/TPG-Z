/**
 * 本地文件 URL 工具 — 主进程与渲染进程共用
 *
 * 用查询参数携带编码后的绝对路径，避免 Windows 盘符(D:)和反斜杠
 * 破坏 standard scheme 的 host/path 解析。
 * 形如: local://f/?p=<encodeURIComponent(absolutePath)>
 */
export function toLocalUrl(absPath: string): string {
  return `local://f/?p=${encodeURIComponent(absPath)}`
}

/** 从 local:// URL 中解析出原始绝对路径，失败返回空串 */
export function parseLocalUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.searchParams.get('p') ?? ''
  } catch {
    return ''
  }
}
