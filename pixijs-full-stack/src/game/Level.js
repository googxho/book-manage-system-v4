/**
 * 关卡配置 — 直立建筑结构
 * 坐标基于 1920×1080 参考分辨率，getScaledLevel 自动适配屏幕
 * 所有物体底边锚定地面，构建稳定的站立结构
 */

export const REF_W = 1920
export const REF_H = 1080
const GROUND_OFFSET = 30
const REF_GROUND_Y = REF_H - GROUND_OFFSET

// 辅助函数：计算将物体放在地面上的 y 坐标
// groundTop = 地面顶部 y
// for blocks: y = groundTop - h/2 (底边在地面)
// for circles (pigs): y = groundTop - radius (底边在地面)
const gnd = REF_GROUND_Y

const LEVELS = [
  {
    name: '第一关',
    birds: ['red', 'red', 'blue'],
    pigs: [
      { x: 780, y: gnd - 25, radius: 25 },  // 在左侧建筑内
      { x: 1050, y: gnd - 25, radius: 25 }   // 在右侧建筑内
    ],
    blocks: [
      // === 左侧建筑 ===
      // 左柱（立在地面）
      { x: 730, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      // 右柱
      { x: 830, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      // 横梁（架在柱子上方）
      { x: 780, y: gnd - 130, w: 100, h: 20, material: 'wood' },

      // === 右侧建筑 ===
      // 左柱
      { x: 1000, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      // 右柱
      { x: 1100, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      // 横梁
      { x: 1050, y: gnd - 130, w: 100, h: 20, material: 'wood' }
    ]
  },
  {
    name: '第二关',
    birds: ['red', 'yellow', 'blue', 'red'],
    pigs: [
      { x: 870, y: gnd - 22, radius: 22 },
      { x: 1080, y: gnd - 28, radius: 28 },
      { x: 1230, y: gnd - 20, radius: 20 }
    ],
    blocks: [
      // === 左侧建筑（石头地基 + 木头） ===
      { x: 820, y: gnd - 65, w: 30, h: 130, material: 'stone' },  // 左石柱
      { x: 920, y: gnd - 65, w: 30, h: 130, material: 'stone' },  // 右石柱
      { x: 870, y: gnd - 140, w: 110, h: 22, material: 'wood' },  // 木头横梁
      // 二层
      { x: 870, y: gnd - 185, w: 25, h: 55, material: 'glass' },  // 玻璃柱
      { x: 870, y: gnd - 215, w: 80, h: 16, material: 'glass' },  // 玻璃顶

      // === 中间建筑（纯木头） ===
      { x: 1030, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      { x: 1130, y: gnd - 60, w: 25, h: 120, material: 'wood' },
      { x: 1080, y: gnd - 130, w: 100, h: 20, material: 'wood' },

      // === 右侧小型建筑 ===
      { x: 1190, y: gnd - 50, w: 20, h: 100, material: 'wood' },
      { x: 1270, y: gnd - 50, w: 20, h: 100, material: 'wood' },
      { x: 1230, y: gnd - 110, w: 80, h: 18, material: 'glass' }
    ]
  }
]

export function getScaledLevel(index, screenW, screenH, gameRight) {
  const level = LEVELS[index]
  if (!level) return null

  const scaleX = gameRight / REF_W
  const groundY = screenH - GROUND_OFFSET
  const scale = Math.min(scaleX, 1.5)

  const scaleYPos = (refY) => {
    const distFromGround = refY - REF_GROUND_Y
    return groundY + distFromGround * scale
  }

  return {
    name: level.name,
    birds: level.birds,
    pigs: level.pigs.map(p => ({
      x: p.x * scale,
      y: scaleYPos(p.y),
      radius: p.radius * scale
    })),
    blocks: level.blocks.map(b => ({
      x: b.x * scale,
      y: scaleYPos(b.y),
      w: b.w * scale,
      h: b.h * scale,
      material: b.material
    }))
  }
}

export default LEVELS
