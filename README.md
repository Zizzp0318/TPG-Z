# TPG-Z · AI 生成作品管理器

一款本地优先的桌面应用，用来收藏、整理和检索 AI 生成的**图片与视频**作品，并把每张作品与它的提示词、参考素材关联在一起。基于 Electron + React + TypeScript 构建，数据全部保存在本地，不上传任何服务器。

> 适合经常用 Midjourney、Stable Diffusion、可灵、即梦等工具生成大量图片/视频，需要一个地方把「成品 + 提示词 + 参考图」归档管理的人。

## 功能特性

- **瀑布流图库** — 缩略图预览，悬停显示标题、星级评分与生成方式徽标
- **四种生成方式** — 文生图 / 图生图 / 文生视频 / 参考生视频，各自带徽标标记
- **详情预览** — 大图支持缩放、拖拽；视频用原生播放器播放
- **参考素材关联** — 每件作品可挂多张参考图或参考视频，悬停即放大预览、视频悬停播放
- **提示词管理** — 保存生成时用的提示词，一键复制到剪贴板
- **组织管理** — 文件夹分类、多标签、星级评分
- **筛选与搜索** — 按文件夹、生成方式、标签（并集）筛选，按标题/提示词关键词搜索
- **文件夹 / 标签重命名** — 侧栏就地改名，同名自动合并，空标签自动清理
- **视频首帧缩略图** — 视频作品自动抽首帧作封面
- **便携模式** — 免安装 zip 版把数据存在程序目录旁，随身携带
- **一键备份** — 把整个数据目录导出到指定位置

## 下载使用

前往 [Releases](../../releases) 下载最新版本：

- **安装版** `TPG-Z-Setup-x.x.x.exe` — 常规安装，可选安装目录
- **便携版** `TPG-Z-x.x.x-win.zip` — 解压即用，数据保存在程序目录旁的 `data` 文件夹，方便随身携带或放到 U 盘

> 目前仅提供 Windows x64 版本。

## 开发

依赖 Node.js 20+ 与 npm。

```bash
# 安装依赖
npm install

# 启动开发环境（热重载）
npm run dev

# 类型检查
npm run typecheck

# 打包（生成便携 zip + 安装 exe，输出到 release/）
npm run dist
```

## 技术栈

- **[Electron](https://www.electronjs.org/)** — 桌面外壳
- **[React 19](https://react.dev/)** + **TypeScript** — 界面
- **[Vite](https://vitejs.dev/)** / **[electron-vite](https://electron-vite.org/)** — 构建
- **[Tailwind CSS](https://tailwindcss.com/)** — 样式
- **[`node:sqlite`](https://nodejs.org/api/sqlite.html)** — Node.js 内置 SQLite，无需原生模块
- **[ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)** — 视频首帧抽取（内置，无需另装）
- **[lucide-react](https://lucide.dev/)** — 图标

## 数据存储

所有数据保存在本地，不联网：

- **安装版** — 数据在系统用户数据目录（`%APPDATA%/TPG-Z`）
- **便携版** — 数据在程序 exe 同级的 `data` 目录

`data` 目录下包含 SQLite 数据库、原图、缩略图和参考素材。可用侧栏「一键备份」整体导出。

## 许可证

[MIT](./LICENSE)
