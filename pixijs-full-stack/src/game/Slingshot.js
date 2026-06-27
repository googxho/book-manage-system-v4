/**
 * 弹弓类 — 绘制弹弓和橡皮筋
 * 重绘版：立体木质纹理、精细结构
 */
import { Graphics, Container } from 'pixi.js'

export default class Slingshot {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.forkWidth = 52
    this.forkHeight = 85
    this.armLength = 65
    this.container = new Container()

    this.leftFork = { x: x - this.forkWidth / 2, y: y - this.forkHeight }
    this.rightFork = { x: x + this.forkWidth / 2, y: y - this.forkHeight }
    this.basePoint = { x, y }

    this.bandLeft = null
    this.bandRight = null
    this.birdPosition = null

    this._createGraphics()
  }

  _createGraphics() {
    const g = new Graphics()
    const lx = this.leftFork.x
    const rx = this.rightFork.x
    const topY = this.leftFork.y
    const bottomY = this.basePoint.y + 15
    const baseBottom = this.basePoint.y + 40

    // 阴影
    g.moveTo(lx + 3, topY + 3)
    g.lineTo(this.basePoint.x - 2, bottomY + 3)
    g.stroke({ width: 10, color: 0x000000, alpha: 0.1 })
    g.moveTo(rx + 3, topY + 3)
    g.lineTo(this.basePoint.x + 4, bottomY + 3)
    g.stroke({ width: 10, color: 0x000000, alpha: 0.1 })

    // 底座暗部
    g.moveTo(this.basePoint.x - 6, bottomY)
    g.lineTo(this.basePoint.x, baseBottom)
    g.lineTo(this.basePoint.x + 6, bottomY)
    g.stroke({ width: 12, color: 0x4E342E })
    // 底座亮部
    g.moveTo(this.basePoint.x - 4, bottomY)
    g.lineTo(this.basePoint.x, baseBottom - 2)
    g.lineTo(this.basePoint.x + 4, bottomY)
    g.stroke({ width: 6, color: 0x6D4C41 })

    // 左叉
    g.moveTo(lx, topY)
    g.lineTo(this.basePoint.x - 5, bottomY)
    g.stroke({ width: 10, color: 0x5D4037 })
    g.moveTo(lx + 1, topY + 1)
    g.lineTo(this.basePoint.x - 3, bottomY - 2)
    g.stroke({ width: 3, color: 0x795548, alpha: 0.6 })

    // 右叉
    g.moveTo(rx, topY)
    g.lineTo(this.basePoint.x + 5, bottomY)
    g.stroke({ width: 10, color: 0x5D4037 })
    g.moveTo(rx + 1, topY + 1)
    g.lineTo(this.basePoint.x + 4, bottomY - 2)
    g.stroke({ width: 3, color: 0x795548, alpha: 0.6 })

    // 叉枝顶部装饰
    for (const pt of [this.leftFork, this.rightFork]) {
      g.circle(pt.x, pt.y, 7)
      g.fill({ color: 0x6D4C41 })
      g.circle(pt.x, pt.y, 4)
      g.fill({ color: 0x8D6E63 })
      g.circle(pt.x - 1, pt.y - 1, 2)
      g.fill({ color: 0xA1887F, alpha: 0.5 })
    }

    this.container.addChild(g)
    this.staticGraphics = g

    this.bandGraphics = new Graphics()
    this.container.addChild(this.bandGraphics)
  }

  updateBand(birdX, birdY) {
    this.birdPosition = { x: birdX, y: birdY }
    this.bandGraphics.clear()
    this.bandGraphics.moveTo(this.leftFork.x, this.leftFork.y)
    this.bandGraphics.lineTo(birdX, birdY)
    this.bandGraphics.stroke({ width: 5, color: 0x3E2723, alpha: 0.85 })
    this.bandGraphics.moveTo(this.rightFork.x, this.rightFork.y)
    this.bandGraphics.lineTo(birdX, birdY)
    this.bandGraphics.stroke({ width: 5, color: 0x3E2723, alpha: 0.85 })
    this.bandGraphics.circle(birdX, birdY, 4)
    this.bandGraphics.fill({ color: 0x3E2723, alpha: 0.7 })
  }

  clearBand() {
    this.bandGraphics.clear()
    this.birdPosition = null
  }

  getBirdRestPosition() {
    return {
      x: this.x,
      y: this.y - this.forkHeight - 10
    }
  }
}
