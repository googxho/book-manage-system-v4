/**
 * 小鸟类 — 由 PixiJS 图形 + matter.js 物理体组成
 * 重绘版：渐变身体、精细五官、阴影效果
 */
import { Graphics, Container } from 'pixi.js'
import Matter from 'matter-js'

const BIRD_COLORS = {
  red: { body: 0xe74c3c, dark: 0xc0392b, light: 0xff6b6b, eye: 0xffffff, pupil: 0x2c3e50, beak: 0xf39c12, beakDark: 0xe67e22 },
  blue: { body: 0x3498db, dark: 0x2471a3, light: 0x5dade2, eye: 0xffffff, pupil: 0x2c3e50, beak: 0xf39c12, beakDark: 0xe67e22 },
  yellow: { body: 0xf1c40f, dark: 0xd4ac0d, light: 0xf7dc6f, eye: 0xffffff, pupil: 0x2c3e50, beak: 0xe67e22, beakDark: 0xd35400 }
}

export default class Bird {
  constructor(type = 'red', radius = 32) {
    this.type = type
    this.colors = BIRD_COLORS[type] || BIRD_COLORS.red
    this.radius = radius
    this.body = null
    this.container = new Container()
    this.launched = false
    this.alive = true
    this.trail = []
    this._createGraphics()
  }

  _createGraphics() {
    const g = new Graphics()
    const r = this.radius
    const c = this.colors

    // === 阴影 ===
    g.circle(2, 3, r)
    g.fill({ color: 0x000000, alpha: 0.15 })

    // === 身体（主色圆形） ===
    g.circle(0, 0, r)
    g.fill({ color: c.body })

    // === 身体渐变高光 ===
    g.circle(-r * 0.25, -r * 0.3, r * 0.4)
    g.fill({ color: c.light, alpha: 0.35 })

    // === 腹部亮区 ===
    g.ellipse(0, r * 0.25, r * 0.5, r * 0.35)
    g.fill({ color: c.light, alpha: 0.2 })

    // === 尾巴（3根羽毛） ===
    const tailX = -r + 2
    for (let i = -1; i <= 1; i++) {
      g.moveTo(tailX, i * 3)
      g.lineTo(tailX - r * 0.35, i * 6 - 2)
      g.stroke({ width: 3, color: c.dark })
    }

    // === 眼睛 - 白色 ===
    g.circle(r * 0.15, -r * 0.22, r * 0.22)
    g.fill({ color: 0xffffff })
    g.circle(r * 0.15, -r * 0.22, r * 0.22)
    g.stroke({ width: 1.5, color: 0x2c3e50 })

    // === 瞳孔 ===
    const px = r * 0.22
    const py = -r * 0.2
    g.circle(px, py, r * 0.1)
    g.fill({ color: 0x2c3e50 })
    // 瞳孔高光
    g.circle(px + 1.5, py - 1.5, r * 0.04)
    g.fill({ color: 0xffffff })

    // === 愤怒眉毛 ===
    g.moveTo(-r * 0.2, -r * 0.5)
    g.lineTo(r * 0.5, -r * 0.65)
    g.stroke({ width: Math.max(2, r * 0.08), color: 0x2c3e50, alpha: 0.9 })
    // 第二道更粗的眉毛（愤怒加倍）
    g.moveTo(-r * 0.15, -r * 0.42)
    g.lineTo(r * 0.55, -r * 0.55)
    g.stroke({ width: Math.max(1.5, r * 0.05), color: 0x2c3e50, alpha: 0.6 })

    // === 喙 ===
    const beakLen = r * 0.35
    g.moveTo(r * 0.05, -r * 0.05)
    g.lineTo(r + beakLen, r * 0.08)
    g.lineTo(r * 0.05, r * 0.22)
    g.closePath()
    g.fill({ color: c.beak })
    // 喙中线
    g.moveTo(r * 0.05, r * 0.08)
    g.lineTo(r + beakLen, r * 0.08)
    g.stroke({ width: 1.5, color: c.beakDark })

    // === 头冠（几根小羽毛） ===
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i - 1) * 0.25
      const sx = Math.cos(angle) * r * 0.5
      const sy = Math.sin(angle) * r * 0.5
      g.moveTo(sx, sy)
      g.lineTo(sx + Math.cos(angle - 0.3) * r * 0.25, sy + Math.sin(angle - 0.3) * r * 0.25)
      g.stroke({ width: 2.5, color: c.dark })
    }

    // === 底部小圆（肚皮点缀） ===
    g.circle(0, r * 0.55, r * 0.08)
    g.fill({ color: 0xffffff, alpha: 0.2 })

    this.container.addChild(g)
    this.graphics = g
  }

  setPosition(x, y) {
    this.container.x = x
    this.container.y = y
    if (this.body) {
      Matter.Body.setPosition(this.body, { x, y })
    }
  }

  syncFromPhysics() {
    if (this.body) {
      this.container.x = this.body.position.x
      this.container.y = this.body.position.y
      this.container.rotation = this.body.angle
      if (this.launched && this.alive) {
        this.trail.push({ x: this.body.position.x, y: this.body.position.y })
      }
    }
  }

  attachToPhysics(physics, x, y, options = {}) {
    this.body = physics.createCircle(x, y, this.radius, {
      label: 'bird',
      restitution: 0.3,
      density: 0.004,
      ...options
    })
    Matter.Body.setStatic(this.body, true)
    this.container.x = x
    this.container.y = y
  }

  launch(velocityX, velocityY) {
    if (!this.body || this.launched) return
    Matter.Body.setStatic(this.body, false)
    Matter.Body.setVelocity(this.body, { x: velocityX, y: velocityY })
    this.launched = true
  }

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
