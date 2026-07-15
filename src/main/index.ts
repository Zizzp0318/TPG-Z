import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc'
import { parseLocalUrl } from '../shared/url'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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

  // 注册 local:// 协议，从本地文件系统读取图片
  protocol.handle('local', (request) => {
    const filePath = parseLocalUrl(request.url)
    try {
      if (!filePath) return new Response('Bad request', { status: 400 })
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime =
        ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/jpeg'
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
