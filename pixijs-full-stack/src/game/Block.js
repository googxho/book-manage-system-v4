/**
 * 砖块类 — 不同材质（木/石/玻璃）
 * 重绘版：立体阴影、精致纹理、材质特色效果
 */
import { Graphics, Container } from 'pixi.js'
import Matter from 'matter-js'

const MATERIALS = {
  wood: {
    base: 0x8B4513, light: 0xA0522D, dark: 0x6B3410, highlight: 0xC07A3B,
    hp: 120, density: 0.002, restitution: 0.1
  },
  stone: {
    base: 0x808080, light: 0x999999, dark: 0x606060, highlight: 0xB0B0B0,
    hp: 220, density: 0.004, restitution: 0.05
  },
  glass: {
    base: 0x87CEEB, light: 0xB0E0F0, dark: 0x5F9EA0, highlight: 0xE0F4FF,
    hp: 60, density: 0.001, restitution: 0.2, alpha: 0.7
  }
}

export default class Block {
  constructor(x, y, w, h, material = 'wood') {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.material = material
    this.mat = MATERIALS[material]
    this.maxHp = this.mat.hp
    this.hp = this.maxHp
    this.alive = true
    this.body = null
    this.container = new Container()
    this.container.x = x
    this.container.y = y
    this._createGraphics()
  }

  _createGraphics() {
    const g = new Graphics()
    const w = this.w
    const h = this.h
    const m = this.mat
    const hw = w / 2
    const hh = h / 2

    // === 阴影 ===
    g.rect(-hw + 2, -hh + 3, w, h)
    g.fill({ color: 0x000000, alpha: 0.1 })

    // === 主体 ===
    g.rect(-hw, -hh, w, h)
    g.fill({ color: m.base, alpha: m.alpha || 1 })

    // === 顶部高光边 ===
    g.rect(-hw, -hh, w, Math.max(2, h * 0.08))
    g.fill({ color: m.highlight, alpha: 0.35 })

    // === 左侧高光 ===
    g.rect(-hw, -hh, Math.max(2, w * 0.06), h)
    g.fill({ color: m.highlight, alpha: 0.2 })

    // === 底部暗边 ===
    g.rect(-hw, hh - Math.max(2, h * 0.08), w, Math.max(2, h * 0.08))
    g.fill({ color: m.dark, alpha: 0.25 })

    // === 边框 ===
    g.rect(-hw, -hh, w, h)
    g.stroke({ width: 1.5, color: m.dark, alpha: 0.5 })

    // === 材质纹理 ===
    if (this.material === 'wood') {
      // 木纹年轮线
      for (let i = 0; i < 4; i++) {
        const yOff = -hh + (h / 5) * (i + 1)
        g.moveTo(-hw + 3, yOff)
        g.lineTo(hw - 3, yOff)
        g.stroke({ width: 1.5, color: m.dark, alpha: 0.15 + i * 0.05 })
      }
      // 木节
      const knotX = -hw + w * 0.3
      const knotY = -hh + h * 0.35
      g.ellipse(knotX, knotY, 4, 6)
      g.fill({ color: m.dark, alpha: 0.25 })
      g.ellipse(knotX, knotY, 2, 3)
      g.fill({ color: m.dark, alpha: 0.4 })
    } else if (this.material === 'stone') {
      // 石纹 — 交叉裂纹
      g.moveTo(-hw + 4, -hh + 4)
      g.lineTo(hw - 4, hh - 4)
      g.stroke({ width: 1, color: m.dark, alpha: 0.2 })
      g.moveTo(hw - 4, -hh + 4)
      g.lineTo(-hw + 4, hh - 4)
      g.stroke({ width: 1, color: m.dark, alpha: 0.2 })
      // 额外裂纹
      g.moveTo(-hw + w * 0.3, -hh + h * 0.2)
      g.lineTo(-hw + w * 0.5, -hh + h * 0.8)
      g.stroke({ width: 0.8, color: m.dark, alpha: 0.15 })
    } else if (this.material === 'glass') {
      // 玻璃反光
      g.rect(-hw + 3, -hh + 3, w * 0.4, Math.max(4, h * 0.25))
      g.fill({ color: 0xffffff, alpha: 0.25 })
      // 小高光点
      g.circle(-hw + 6, -hh + 6, 3)
      g.fill({ color: 0xffffff, alpha: 0.4 })
    }

    this.container.addChild(g)
    this.graphics = g
  }

  /**
   * 连接到物理引擎
   */
  attachToPhysics(physics) {
    this.body = physics.createRectangle(this.x, this.y, this.w, this.h, {
      label: 'block',
      restitution: this.mat.restitution,
      density: this.mat.density,
      friction: 0.8
    })
  }

  /**
   * 受到伤害
   */
  takeDamage(damage) {
    if (!this.alive) return
    this.hp -= damage

    // 闪烁
    if (this.graphics && !this.graphics.destroyed) {
      this.graphics.alpha = 0.4
      setTimeout(() => {
        if (this.graphics && !this.graphics.destroyed) {
          this.graphics.alpha = 1
        }
      }, 100)
    }

    if (this.hp <= 0) {
      this.alive = false
    }
  }

  /**
   * 从物理体同步图形位置
   */
  syncFromPhysics() {
    if (this.body && this.alive) {
      this.container.x = this.body.position.x
      this.container.y = this.body.position.y
      this.container.rotation = this.body.angle
    }
  }

  /**
   * 销毁
   */
  destroy(physics) {
    this.alive = false
    if (this.body) {
      physics.removeBody(this.body)
      this.body = null
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container)
    }
    this.container.destroy({ children: true })
  }
}
