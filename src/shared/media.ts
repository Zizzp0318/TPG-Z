// 媒体类型判断 — 主进程与渲染进程共用

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv']

/** 根据扩展名判断是否为视频 */
export function isVideoPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTS.includes(ext)
}

/** 根据生成类型判断是否为视频类作品 */
export function isVideoType(type: string): boolean {
  return type === 'text2video' || type === 'ref2video'
}
