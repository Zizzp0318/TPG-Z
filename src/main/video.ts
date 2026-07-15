/**
 * 视频转 GIF — 调用系统 ffmpeg
 * 参数：16fps，最长边缩到 480，用两遍调色板法保证质量
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync, rmSync } from 'fs'

/** 预处理结果：落地用的路径 + 是否为需清理的临时文件 */
export interface ProcessedRef {
  path: string
  isTemp: boolean
}

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv']

/** 判断路径是否为视频文件 */
export function isVideoFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTS.includes(ext)
}

/** 运行 ffmpeg，返回 Promise（失败时 reject 带 stderr） */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('error', (err) => {
      // ffmpeg 未安装或无法启动
      reject(new Error(`无法启动 ffmpeg：${err.message}`))
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg 转换失败（退出码 ${code}）：${stderr.slice(-500)}`))
    })
  })
}

/**
 * 把视频转成 GIF。
 * @param srcPath 源视频绝对路径
 * @param destPath 输出 GIF 绝对路径
 * @param fps 帧率，默认 16
 * @param maxEdge 最长边像素，默认 480
 */
export async function convertVideoToGif(
  srcPath: string,
  destPath: string,
  fps = 16,
  maxEdge = 480
): Promise<void> {
  // 缩放滤镜：最长边限制到 maxEdge，保持比例，宽高取偶数（GIF 要求）
  // if(gt(a,1),...) 按宽高比判断横竖，长边设为 maxEdge，短边按比例(-2 保证偶数)
  const scale = `scale=w='if(gt(a,1),${maxEdge},-2)':h='if(gt(a,1),-2,${maxEdge})':flags=lanczos`

  const palette = join(tmpdir(), `tpgz-palette-${randomUUID()}.png`)
  try {
    // 第一遍：生成优化调色板
    await runFfmpeg([
      '-y',
      '-i', srcPath,
      '-vf', `fps=${fps},${scale},palettegen=stats_mode=diff`,
      palette
    ])

    // 第二遍：用调色板合成 GIF
    await runFfmpeg([
      '-y',
      '-i', srcPath,
      '-i', palette,
      '-lavfi', `fps=${fps},${scale} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`,
      destPath
    ])
  } finally {
    // 清理临时调色板
    if (existsSync(palette)) {
      try {
        rmSync(palette, { force: true })
      } catch {
        // 忽略
      }
    }
  }
}

/**
 * 预处理一批参考图路径：视频转成临时 GIF，图片原样返回。
 * 调用方拿到路径落地后，应对 isTemp=true 的临时文件调用 cleanupTemp 清理。
 */
export async function preprocessRefPaths(paths: string[]): Promise<ProcessedRef[]> {
  const results: ProcessedRef[] = []
  for (const p of paths) {
    if (!existsSync(p)) continue
    if (isVideoFile(p)) {
      const gifPath = join(tmpdir(), `tpgz-ref-${randomUUID()}.gif`)
      await convertVideoToGif(p, gifPath)
      results.push({ path: gifPath, isTemp: true })
    } else {
      results.push({ path: p, isTemp: false })
    }
  }
  return results
}

/** 清理预处理产生的临时文件 */
export function cleanupTemp(refs: ProcessedRef[]): void {
  for (const r of refs) {
    if (r.isTemp && existsSync(r.path)) {
      try {
        rmSync(r.path, { force: true })
      } catch {
        // 忽略
      }
    }
  }
}
