import { GeneratedImage } from '../types'
import { makePlaceholder, palettes } from './placeholder'

// 生成占位图(thumb 小，full 大)
function ph(idx: number, w: number, h: number, label: string) {
  const [c1, c2] = palettes[idx % palettes.length]
  return makePlaceholder(w, h, c1, c2, label)
}

export const mockImages: GeneratedImage[] = [
  {
    id: '1',
    title: '赛博朋克街头女孩',
    thumb: ph(0, 400, 560, 'cyberpunk'),
    full: ph(0, 800, 1120, 'cyberpunk'),
    prompt:
      'cyberpunk girl standing in neon-lit alley, rain reflections on wet pavement, ultra detailed, cinematic lighting, 8k',
    type: 'text2img',
    referenceImages: [],
    tags: ['赛博朋克', '人物', '夜景'],
    rating: 5,
    folder: '人物',
    createdAt: '2026-07-10T14:20:00Z'
  },
  {
    id: '2',
    title: '奇幻森林精灵',
    thumb: ph(1, 400, 400, 'fantasy'),
    full: ph(1, 800, 800, 'fantasy'),
    prompt:
      'ethereal forest elf surrounded by glowing fireflies, ancient trees, soft bioluminescent light, fantasy art style',
    type: 'img2img',
    referenceImages: [
      {
        id: 'r2-1',
        thumb: ph(6, 80, 80, 'ref1'),
        full: ph(6, 400, 400, 'ref1')
      },
      {
        id: 'r2-2',
        thumb: ph(7, 80, 80, 'ref2'),
        full: ph(7, 400, 400, 'ref2')
      }
    ],
    tags: ['奇幻', '人物', '森林'],
    rating: 4,
    folder: '人物',
    createdAt: '2026-07-11T09:15:00Z'
  },
  {
    id: '3',
    title: '未来都市全景',
    thumb: ph(2, 400, 260, 'cityscape'),
    full: ph(2, 900, 580, 'cityscape'),
    prompt:
      'futuristic megacity skyline at dusk, flying vehicles, holographic advertisements, photorealistic, artstation trending',
    type: 'text2img',
    referenceImages: [],
    tags: ['建筑', '科幻', '城市'],
    rating: 3,
    folder: '风景',
    createdAt: '2026-07-11T16:40:00Z'
  },
  {
    id: '4',
    title: '机甲战士',
    thumb: ph(3, 400, 500, 'mecha'),
    full: ph(3, 800, 1000, 'mecha'),
    prompt:
      'massive battle mech in destroyed urban landscape, battle damage, dynamic pose, hard sci-fi, concept art',
    type: 'img2img',
    referenceImages: [
      {
        id: 'r4-1',
        thumb: ph(4, 80, 80, 'ref-mecha'),
        full: ph(4, 400, 400, 'ref-mecha')
      }
    ],
    tags: ['机甲', '科幻', '战斗'],
    rating: 5,
    folder: '机甲',
    createdAt: '2026-07-12T10:00:00Z'
  },
  {
    id: '5',
    title: '梦幻海底世界',
    thumb: ph(4, 400, 320, 'ocean'),
    full: ph(4, 800, 640, 'ocean'),
    prompt:
      'magical underwater kingdom, glowing coral, friendly whale, shafts of light from above, dreamlike, Hayao Miyazaki style',
    type: 'text2img',
    referenceImages: [],
    tags: ['海洋', '奇幻', '动画风'],
    rating: 4,
    folder: '风景',
    createdAt: '2026-07-12T20:30:00Z'
  },
  {
    id: '6',
    title: '古风仙人坐莲',
    thumb: ph(5, 400, 600, 'wuxia'),
    full: ph(5, 800, 1200, 'wuxia'),
    prompt:
      '古风仙人，端坐莲台，云雾缭绕，衣袂飘飘，工笔重彩，高清，8k，精致细节',
    type: 'text2img',
    referenceImages: [],
    tags: ['古风', '人物', '仙侠'],
    rating: 5,
    folder: '古风',
    createdAt: '2026-07-13T08:00:00Z'
  },
  {
    id: '7',
    title: '末日废土载具',
    thumb: ph(6, 400, 280, 'vehicle'),
    full: ph(6, 900, 630, 'vehicle'),
    prompt:
      'post-apocalyptic armored vehicle, rust and battle scars, desert wasteland background, hyper detailed, Mad Max style',
    type: 'img2img',
    referenceImages: [
      {
        id: 'r7-1',
        thumb: ph(9, 80, 80, 'sketch'),
        full: ph(9, 400, 400, 'sketch')
      },
      {
        id: 'r7-2',
        thumb: ph(0, 80, 80, 'ref-car'),
        full: ph(0, 400, 400, 'ref-car')
      },
      {
        id: 'r7-3',
        thumb: ph(1, 80, 80, 'style'),
        full: ph(1, 400, 400, 'style')
      }
    ],
    tags: ['载具', '废土', '后启示录'],
    rating: 3,
    folder: '载具',
    createdAt: '2026-07-13T14:00:00Z'
  },
  {
    id: '8',
    title: '空中浮岛城堡',
    thumb: ph(7, 400, 340, 'castle'),
    full: ph(7, 900, 760, 'castle'),
    prompt:
      'floating island castle above clouds, waterfalls cascading into the sky, fantasy setting, Studio Ghibli inspired',
    type: 'text2img',
    referenceImages: [],
    tags: ['奇幻', '建筑', '动画风'],
    rating: 4,
    folder: '风景',
    createdAt: '2026-07-14T07:30:00Z'
  },
  {
    id: '9',
    title: '赛博格肖像',
    thumb: ph(8, 400, 480, 'cyborg'),
    full: ph(8, 800, 960, 'cyborg'),
    prompt:
      'close-up portrait of cyborg woman, chrome implants glowing blue, intense gaze, dramatic lighting, cinematic, bokeh',
    type: 'img2img',
    referenceImages: [
      {
        id: 'r9-1',
        thumb: ph(2, 80, 80, 'pose-ref'),
        full: ph(2, 400, 400, 'pose-ref')
      }
    ],
    tags: ['赛博朋克', '人物', '特写'],
    rating: 4,
    folder: '人物',
    createdAt: '2026-07-14T19:00:00Z'
  },
  {
    id: '10',
    title: '禅意山水',
    thumb: ph(9, 400, 250, 'landscape'),
    full: ph(9, 900, 560, 'landscape'),
    prompt:
      '极简水墨山水，远山层叠，薄雾轻绕，一叶扁舟，空灵意境，传统中国画风格',
    type: 'text2img',
    referenceImages: [],
    tags: ['山水', '水墨', '极简'],
    rating: 5,
    folder: '古风',
    createdAt: '2026-07-15T06:00:00Z'
  }
]

// 所有文件夹列表
export const folders = ['全部', '人物', '风景', '机甲', '古风', '载具']

// 所有标签
export const allTags = Array.from(new Set(mockImages.flatMap((img) => img.tags))).sort()
