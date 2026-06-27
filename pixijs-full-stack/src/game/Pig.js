/**
 * 猪类 — 重绘版：渐变身体、立体五官、受伤反馈
 */
import { Graphics, Container } from 'pixi.js'
import Matter from 'matter-js'

export default class Pig {
  constructor(x, y, radius = 30) {
    this.radius = radius
    this.maxHp = radius <= 22 ? 60 : (radius <= 28 ? 100 : 150)
    this.hp = this.maxHp
    this.alive = true
    this.body = null
    this.container = new Container()
    this.container.x = x
    this.container.y = y
    this.deathTimer = 0
    this._createGraphics()
  }

  _createGraphics() {
    const g = new Graphics()
    const r = this.radius

    // === 阴影 ===
    g.circle(2, 3, r)
    g.fill({ color: 0x000000, alpha: 0.12 })

    // === 身体（主色） ===
    g.circle(0, 0, r)
    g.fill({ color: 0x2ecc71 })

    // === 身体高光 ===
    g.circle(-r * 0.3, -r * 0.3, r * 0.35)
    g.fill({ color: 0x58d68d, alpha: 0.4 })

    // === 腹部浅色区域 ===
    g.ellipse(0, r * 0.15, r * 0.5, r * 0.4)
    g.fill({ color: 0x27ae60, alpha: 0.35 })

    // === 耳朵（左右） ===
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * (r - 6)
      const ey = -r + 5
      // 外耳
      g.circle(ex, ey, r * 0.22)
      g.fill({ color: 0x27ae60 })
      // 内耳
      g.circle(ex, ey, r * 0.12)
      g.fill({ color: 0x1e8449, alpha: 0.6 })
    }

    // === 眼睛 ===
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * (r * 0.3)
      const ey = -r * 0.25
      // 眼白
      g.circle(ex, ey, r * 0.2)
      g.fill({ color: 0xffffff })
      g.circle(ex, ey, r * 0.2)
      g.stroke({ width: 1.5, color: 0x1e8449 })
      // 瞳孔
      g.circle(ex + side * 2, ey, r * 0.1)
      g.fill({ color: 0x2c3e50 })
      // 瞳孔高光
      g.circle(ex + side * 3, ey - 1.5, r * 0.04)
      g.fill({ color: 0xffffff })
    }

    // === 鼻子（椭圆） ===
    g.ellipse(0, r * 0.12, r * 0.28, r * 0.18)
    g.fill({ color: 0x1e8449 })
    // 鼻孔
    for (let side = -1; side <= 1; side += 2) {
      g.circle(side * r * 0.1, r * 0.14, r * 0.06)
      g.fill({ color: 0x145a32 })
    }

    // === 嘴巴（微笑） ===
    g.arc(0, r * 0.05, r * 0.15, 0.2, Math.PI - 0.2, false)
    g.stroke({ width: 1.5, color: 0x1e8449 })

    // === 腮红 ===
    for (let side = -1; side <= 1; side += 2) {
      g.circle(side * r * 0.45, r * 0.1, r * 0.1)
      g.fill({ color: 0xff9999, alpha: 0.2 })
    }

    this.container.addChild(g)
    this.graphics = g
  }

  /**
   * 连接到物理引擎
   */
  attachToPhysics(physics) {
    this.body = physics.createCircle(this.container.x, this.container.y, this.radius, {
      label: 'pig',
      restitution: 0.2,
      friction: 0.5,
      density: 0.0015
    })
  }

  /**
   * 受到伤害
   */
  takeDamage(damage) {
    if (!this.alive) return
    this.hp -= damage

    // 闪烁效果
    if (this.graphics) {
      this.graphics.alpha = 0.5
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
   * 获取碰撞损伤量（基于速度）
   */
  static calcDamage(speed) {
    if (speed < 2) return 0
    if (speed < 5) return 20
    if (speed < 10) return 50
    return 100
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
