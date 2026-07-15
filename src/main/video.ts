/**
 * 视频转 GIF — 调用内置 ffmpeg（ffmpeg-static，随软件分发，用户无需自行安装）
 * 参数：16fps，最长边缩到 480，用两遍调色板法保证质量
 */
import { spawn } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync, rmSync } from 'fs'
import { app } from 'electron'
import ffmpegStatic from 'ffmpeg-static'

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

/**
 * 解析 ffmpeg 可执行文件路径：
 * - ffmpeg-static 返回 node_modules 里的绝对路径
 * - 打包后二进制被 asarUnpack 解压到 app.asar.unpacked，需要修正路径
 * - 找不到内置二进制时兜底回退系统 PATH 上的 ffmpeg
 */
let cachedFfmpeg: string | null = null
function ffmpegBin(): string {
  if (cachedFfmpeg) return cachedFfmpeg
  let p = (ffmpegStatic as unknown as string) || ''
  // ffmpeg-static 返回的路径基于其模块的 __dirname 计算；打包后二进制被
  // asarUnpack 解压，需把 app.asar 修正为 app.asar.unpacked。
  if (p && app.isPackaged) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  // 兜底：打包时若 ffmpeg-static 被内联进主进程 bundle，其 __dirname 会指向
  // out/main 而非 node_modules，导致上面算出的路径不存在。此时直接按解压后的
  // 固定位置定位真实二进制（resources/app.asar.unpacked/node_modules/ffmpeg-static）。
  if (app.isPackaged && (!p || !existsSync(p))) {
    const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    const guess = join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'ffmpeg-static',
      exe
    )
    if (existsSync(guess)) p = guess
  }
  cachedFfmpeg = p && existsSync(p) ? p : 'ffmpeg'
  console.log(`[video] 使用 ffmpeg: ${cachedFfmpeg}`)
  return cachedFfmpeg
}

/** 运行 ffmpeg，返回 Promise（失败时 reject 带 stderr） */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args, { windowsHide: true })
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
 * 抽取视频首帧，保存为 JPEG（用作列表缩略图 / 导入预览）。
 * @param srcPath 源视频绝对路径
 * @param destPath 输出 JPEG 绝对路径
 * @param maxEdge 最长边像素，默认 420
 */
export async function extractFirstFrame(
  srcPath: string,
  destPath: string,
  maxEdge = 420
): Promise<void> {
  const scale = `scale=w='if(gt(a,1),${maxEdge},-2)':h='if(gt(a,1),-2,${maxEdge})':flags=lanczos`
  // -frames:v 1 只输出一帧（首帧），-q:v 3 高质量 JPEG
  await runFfmpeg([
    '-y',
    '-i', srcPath,
    '-vf', scale,
    '-frames:v', '1',
    '-q:v', '3',
    destPath
  ])
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
