// 生成彩色渐变 SVG 占位图,返回 data URI(不依赖网络)
export function makePlaceholder(
  w: number,
  h: number,
  c1: string,
  c2: string,
  label: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="50%" y="50%" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="${Math.round(w / 12)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// 预设一组配色
export const palettes: [string, string][] = [
  ['#6366f1', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#3b82f6'],
  ['#8b5cf6', '#6366f1'],
  ['#f43f5e', '#f59e0b'],
  ['#14b8a6', '#22c55e'],
  ['#0ea5e9', '#8b5cf6'],
  ['#ec4899', '#8b5cf6'],
  ['#eab308', '#84cc16']
]
