import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { readFileSync, statSync, createReadStream } from 'fs'
import { Readable } from 'stream'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc'
import { parseLocalUrl } from '../shared/url'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv']

function isVideoExt(ext: string): boolean {
  return VIDEO_EXTS.includes(ext)
}

/** 扩展名 → MIME 类型 */
function mimeForExt(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    case 'gif': return 'image/gif'
    case 'bmp': return 'image/bmp'
    case 'mp4':
    case 'm4v': return 'video/mp4'
    case 'webm': return 'video/webm'
    case 'mov': return 'video/quicktime'
    case 'avi': return 'video/x-msvideo'
    case 'mkv': return 'video/x-matroska'
    case 'flv': return 'video/x-flv'
    case 'wmv': return 'video/x-ms-wmv'
    default: return 'image/jpeg'
  }
}

// 注册自定义协议 local:// 用于渲染进程访问本地图片
// 必须在 app.whenReady 之前调用
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { standard: true, secure: true, bypassCSP: true, supportFetchAPI: true } }
])

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'TPG-Z 图片管理',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev ? process.execPath : 'com.tpgz.app')
  }

  // 注册 local:// 协议，从本地文件系统读取图片 / 视频
  protocol.handle('local', (request) => {
    const filePath = parseLocalUrl(request.url)
    try {
      if (!filePath) return new Response('Bad request', { status: 400 })
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime = mimeForExt(ext)

      // 视频：支持 Range 请求（<video> 拖动进度条、边下边播需要）
      if (isVideoExt(ext)) {
        const size = statSync(filePath).size
        const range = request.headers.get('range')
        if (range) {
          const match = /bytes=(\d*)-(\d*)/.exec(range)
          const start = match && match[1] ? parseInt(match[1], 10) : 0
          const end = match && match[2] ? parseInt(match[2], 10) : size - 1
          const chunk = createReadStream(filePath, { start, end })
          return new Response(Readable.toWeb(chunk) as ReadableStream, {
            status: 206,
            headers: {
              'Content-Type': mime,
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(end - start + 1)
            }
          })
        }
        const stream = createReadStream(filePath)
        return new Response(Readable.toWeb(stream) as ReadableStream, {
          headers: {
            'Content-Type': mime,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(size)
          }
        })
      }

      // 图片：直接整块返回
      const data = readFileSync(filePath)
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  // 初始化数据库
  try {
    initDb()
  } catch (e) {
    console.error('数据库初始化失败:', e)
  }

  // 注册所有 IPC 处理器
  registerIpcHandlers()

  // F5 / Ctrl+R 仅在开发模式刷新
  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (!isDev && (input.key === 'F5' || (input.control && input.key === 'r'))) {
        event.preventDefault()
      }
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
