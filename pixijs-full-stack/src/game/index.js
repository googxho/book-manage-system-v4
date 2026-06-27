/**
 * 游戏管理器 — 愤怒的小鸟主控
 * 协调 PixiJS 渲染、matter.js 物理、游戏实体
 */
import { Container, Graphics, Text } from 'pixi.js'
import Matter from 'matter-js'
import PhysicsEngine from './PhysicsEngine.js'
import Bird from './Bird.js'
import Pig from './Pig.js'
import Block from './Block.js'
import Slingshot from './Slingshot.js'
import LEVELS, { getScaledLevel } from './Level.js'
import { playLaunchSound, playHitSound, playBreakSound, playVictorySound, playDefeatSound } from './sounds.js'

export default class GameManager {
  constructor(app) {
    this.app = app
    this.physics = new PhysicsEngine()
    this.gameContainer = new Container()
    this.app.stage.addChild(this.gameContainer)

    // 游戏状态
    this.currentLevel = 0
    this.birds = []
    this.pigs = []
    this.blocks = []
    this.activeBird = null
    this.slingshot = null
    this.score = 0
    this.totalPigs = 0
    this.birdIndex = 0
    this.state = 'idle'

    // 拖拽
    this.isDragging = false
    this.dragStart = { x: 0, y: 0 }
    this.dragEnd = { x: 0, y: 0 }

    // 轨迹预览
    this.trajectoryGraphics = null

    // 粒子系统
    this.particles = []
    this.particleGraphics = null

    // 登录框物理墙
    this.formWall = null
    this.formWallRestX = 0
    this.lastFormOffset = 0

    // 背景/其他
    this.background = null
    this.scoreText = null
    this.birdCountText = null
    this.levelText = null
    this.messageText = null

    this.onScoreChange = null
    this.onStateChange = null
    this.onFormHit = null

    this.width = app.screen.width
    this.height = app.screen.height
    this.gameRight = this.width * 0.72
  }

  /**
   * 初始化游戏
   */
  async init() {
    this._createBackground()
    this._createHUD()

    // 轨迹预览层
    this.trajectoryGraphics = new Graphics()
    this.gameContainer.addChild(this.trajectoryGraphics)

    // 粒子效果层
    this.particleGraphics = new Graphics()
    this.gameContainer.addChild(this.particleGraphics)

    const slingX = this.gameRight * 0.22
    const slingY = this.height - 140
    this.slingshot = new Slingshot(slingX, slingY)

    const groundY = this.height - 30
    this.physics.createGround(this.width, groundY)
    this.physics.createWalls(this.width, this.height)

    const groundVis = new Graphics()
    groundVis.rect(0, groundY - 12, this.width, 24)
    groundVis.fill({ color: 0x5D4037 })
    this.gameContainer.addChild(groundVis)

    const grass = new Graphics()
    grass.rect(0, groundY - 16, this.width, 8)
    grass.fill({ color: 0x4CAF50 })
    this.gameContainer.addChild(grass)

    this.gameContainer.addChild(this.slingshot.container)

    await this.loadLevel(0)
    this.physics.stabilize(300)

    this.physics.onCollisionStart((event) => {
      this._handleCollision(event)
    })

    // 创建登录框物理墙 — 位置对应屏幕中央的表单卡片
    const wallX = this.width * 0.5
    const wallY = this.height * 0.5
    const wallW = 320
    const wallH = 600
    const wallData = this.physics.createFormWall(wallX, wallY, wallW, wallH)
    this.formWall = wallData.wall
    this.formWallRestX = wallData.restX
    this.formWallConstraint = wallData.constraint
  }

  /**
   * 创建背景
   */
  _createBackground() {
    const bg = new Graphics()

    // 天空渐变
    const steps = 30
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const r = Math.round(135 + t * 80)
      const g = Math.round(206 - t * 40)
      const b = Math.round(235 - t * 30)
      const color = (r << 16) | (g << 8) | b
      bg.rect(0, (this.height * t) / 1.4, this.width, this.height / steps + 5)
      bg.fill({ color })
    }

    // 云朵（根据屏幕宽度分布）
    const cloudColor = 0xffffff
    const clouds = [
      { x: this.width * 0.1, y: 60, r: 35 },
      { x: this.width * 0.14, y: 45, r: 45 },
      { x: this.width * 0.07, y: 50, r: 38 },
      { x: this.width * 0.3, y: 80, r: 30 },
      { x: this.width * 0.34, y: 65, r: 42 },
      { x: this.width * 0.28, y: 72, r: 35 },
      { x: this.width * 0.5, y: 40, r: 40 },
      { x: this.width * 0.55, y: 28, r: 50 },
      { x: this.width * 0.48, y: 35, r: 36 }
    ]
    clouds.forEach(c => {
      bg.circle(c.x, c.y, c.r)
      bg.fill({ color: cloudColor, alpha: 0.8 })
    })

    // 远处山丘
    bg.moveTo(0, this.height - 100)
    for (let x = 0; x <= this.width; x += 20) {
      const y = this.height - 100 - Math.sin(x * 0.003) * 50 - Math.sin(x * 0.008) * 25
      bg.lineTo(x, y)
    }
    bg.lineTo(this.width, this.height - 30)
    bg.lineTo(0, this.height - 30)
    bg.closePath()
    bg.fill({ color: 0x66BB6A, alpha: 0.35 })

    // === 树木装饰 ===
    const trees = [
      { x: this.width * 0.05, s: 1.0 },
      { x: this.width * 0.38, s: 0.8 },
      { x: this.width * 0.42, s: 1.1 },
      { x: this.width * 0.60, s: 0.7 },
      { x: this.width * 0.65, s: 0.9 },
      { x: this.width * 0.85, s: 1.0 }
    ]
    const groundY = this.height - 30
    trees.forEach(t => {
      const s = t.s
      const tx = t.x
      const ty = groundY - 5
      // 树干
      bg.rect(tx - 4 * s, ty - 40 * s, 8 * s, 40 * s)
      bg.fill({ color: 0x5D4037 })
      // 树冠（3层)
      for (let i = 0; i < 3; i++) {
        const cy = ty - 40 * s - i * 20 * s
        const cr = (25 - i * 5) * s
        bg.circle(tx, cy, cr)
        bg.fill({ color: 0x388E3C, alpha: 0.6 + i * 0.1 })
      }
    })

    this.gameContainer.addChildAt(bg, 0)
    this.background = bg
  }

  /**
   * 创建 HUD
   */
  _createHUD() {
    this.scoreText = new Text({
      text: '分数: 0',
      style: { fontSize: 22, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } }
    })
    this.scoreText.x = 24
    this.scoreText.y = 24
    this.gameContainer.addChild(this.scoreText)

    this.birdCountText = new Text({
      text: '',
      style: { fontSize: 20, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold', stroke: { color: 0x000000, width: 2 } }
    })
    this.birdCountText.x = 24
    this.birdCountText.y = 56
    this.gameContainer.addChild(this.birdCountText)

    this.levelText = new Text({
      text: '',
      style: { fontSize: 18, fill: 0xffffff, fontFamily: 'Arial', stroke: { color: 0x000000, width: 1.5 } }
    })
    this.levelText.x = 24
    this.levelText.y = 86
    this.gameContainer.addChild(this.levelText)
  }

  /**
   * 加载关卡
   */
  async loadLevel(index) {
    this._clearLevel()
    this.currentLevel = index
    const level = getScaledLevel(index, this.width, this.height, this.gameRight)
    if (!level) {
      this.victory()
      return
    }

    this.birdIndex = 0
    this.state = 'idle'

    // 创建猪
    this.totalPigs = level.pigs.length
    level.pigs.forEach(p => {
      const pig = new Pig(p.x, p.y, p.radius)
      pig.attachToPhysics(this.physics)
      this.pigs.push(pig)
      this.gameContainer.addChild(pig.container)
    })

    // 创建砖块
    level.blocks.forEach(b => {
      const block = new Block(b.x, b.y, b.w, b.h, b.material)
      block.attachToPhysics(this.physics)
      this.blocks.push(block)
      this.gameContainer.addChild(block.container)
    })

    // 创建小鸟队列（使用放大后尺寸）
    const birdRadius = Math.max(28, Math.min(36, this.width * 0.018))
    this.birds = level.birds.map(type => new Bird(type, birdRadius))

    // 更新 HUD
    this.levelText.text = `${level.name}`
    this._updateHUD()

    // 稳定物理世界（让建筑自然沉降）
    this.physics.stabilize(300)

    // 准备第一只鸟
    this._nextBird()
  }

  /**
   * 下一只鸟
   */
  _nextBird() {
    if (this.birdIndex >= this.birds.length) {
      // 没有鸟了，检查是否胜利
      this._checkResult()
      return
    }

    const bird = this.birds[this.birdIndex]
    this.activeBird = bird
    const restPos = this.slingshot.getBirdRestPosition()
    bird.attachToPhysics(this.physics, restPos.x, restPos.y)
    bird.container.visible = true
    this.gameContainer.addChild(bird.container)
    this.slingshot.updateBand(restPos.x, restPos.y)
    this.state = 'idle'
    this._updateHUD()
    this._showMessage('拖拽小鸟发射！')
  }

  /**
   * 显示消息
   */
  _showMessage(text) {
    if (!this.messageText) {
      this.messageText = new Text({
        text,
        style: { fontSize: 32, fill: 0xffffff, fontFamily: 'Arial', fontWeight: 'bold', stroke: { color: 0x000000, width: 4 } }
      })
      this.messageText.anchor = { x: 0.5, y: 0.5 }
      this.messageText.x = this.gameRight / 2
      this.messageText.y = 120
      this.gameContainer.addChild(this.messageText)
    } else {
      this.messageText.text = text
    }

    // 3秒后淡出
    clearTimeout(this._messageTimeout)
    this.messageText.alpha = 1
    this._messageTimeout = setTimeout(() => {
      if (this.messageText) {
        this.messageText.alpha = 0
      }
    }, 3000)
  }

  /**
   * 更新 HUD
   */
  _updateHUD() {
    this.scoreText.text = `分数: ${this.score}`
    const remaining = this.birds.length - this.birdIndex
    this.birdCountText.text = `剩余小鸟: ${remaining}`
  }

  /**
   * 清除关卡
   */
  _clearLevel() {
    this.birds.forEach(b => b.destroy(this.physics))
    this.pigs.forEach(p => p.destroy(this.physics))
    this.blocks.forEach(b => b.destroy(this.physics))
    this.birds = []
    this.pigs = []
    this.blocks = []
    this.activeBird = null
    this.isDragging = false
  }

  /**
   * 处理鼠标/触摸按下
   */
  onPointerDown(x, y) {
    if (!this.activeBird || this.state !== 'idle') return
    const bird = this.activeBird
    const dx = x - bird.container.x
    const dy = y - bird.container.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // 只在点击小鸟附近时触发拖拽（范围随小鸟尺寸扩大）
    const hitRadius = Math.max(50, bird.radius * 1.8)
    if (dist < hitRadius) {
      this.isDragging = true
      this.state = 'aiming'
      this.dragStart = { x: bird.container.x, y: bird.container.y }
    }
  }

  /**
   * 处理鼠标/触摸移动
   */
  onPointerMove(x, y) {
    if (!this.isDragging || !this.activeBird) return

    const restPos = this.slingshot.getBirdRestPosition()

    // 限制拖拽距离
    let dx = x - restPos.x
    let dy = y - restPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDrag = Math.min(this.gameRight * 0.15, 250)

    if (dist > maxDrag) {
      dx = (dx / dist) * maxDrag
      dy = (dy / dist) * maxDrag
    }

    // 只允许向后（向左）拖拽，松开后弹向右方
    const birdX = restPos.x + Math.min(dx, 0)
    const birdY = restPos.y + dy

    // 更新小鸟位置（用物理体）
    Matter.Body.setPosition(this.activeBird.body, { x: birdX, y: birdY })
    this.activeBird.container.x = birdX
    this.activeBird.container.y = birdY

    // 更新橡皮筋
    this.slingshot.updateBand(birdX, birdY)

    // 更新轨迹预览
    this._drawTrajectory(birdX, birdY, dx, dy, maxDrag)

    this.dragEnd = { x: birdX, y: birdY }
  }

  /**
   * 绘制抛物线轨迹预览
   */
  _drawTrajectory(startX, startY, dx, dy, maxDist) {
    if (!this.trajectoryGraphics) return
    this.trajectoryGraphics.clear()

    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 15) return

    const power = Math.min(dist / maxDist, 1) * 30
    const vx = (-dx / dist) * power  // 反向发射
    const vy = (-dy / dist) * power

    const g = this.trajectoryGraphics
    const gravity = 1.2 * 0.001 // matter.js gravity scaled for prediction
    const dt = 0.016
    let px = startX
    let py = startY
    let pvx = vx
    let pvy = vy

    // 绘制10个轨迹点
    g.setStrokeStyle && g.setStrokeStyle(0)
    for (let i = 0; i < 25; i++) {
      pvx *= 0.995
      pvy += gravity * 60
      px += pvx
      py += pvy
      const alpha = 1 - i / 25
      const size = Math.max(2, 4 * alpha)
      g.circle(px, py, size)
      g.fill({ color: 0xffffff, alpha: alpha * 0.5 })
    }
  }

  _clearTrajectory() {
    if (this.trajectoryGraphics) {
      this.trajectoryGraphics.clear()
    }
  }

  /**
   * 生成碰撞粒子效果
   */
  _spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 4,
        color,
        alpha: 1,
        life: 30 + Math.random() * 20
      })
    }
  }

  /**
   * 更新粒子效果
   */
  _updateParticles() {
    if (!this.particleGraphics) return
    this.particleGraphics.clear()
    const g = this.particleGraphics

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.alpha -= 0.02
      p.life--
      if (p.life <= 0 || p.alpha <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      g.circle(p.x, p.y, p.radius * p.alpha)
      g.fill({ color: p.color, alpha: p.alpha })
    }
  }

  /**
   * 处理鼠标/触摸释放
   */
  onPointerUp() {
    if (!this.isDragging || !this.activeBird) return

    this.isDragging = false

    const restPos = this.slingshot.getBirdRestPosition()
    const dx = restPos.x - this.dragEnd.x
    const dy = restPos.y - this.dragEnd.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 15) {
      // 拖拽距离太小，不发射
      this._clearTrajectory()
      Matter.Body.setPosition(this.activeBird.body, restPos)
      this.activeBird.container.x = restPos.x
      this.activeBird.container.y = restPos.y
      this.slingshot.updateBand(restPos.x, restPos.y)
      this.state = 'idle'
      return
    }

    // 计算发射速度（基于拖拽距离）
    this._clearTrajectory()
    const maxDragDist = Math.min(this.gameRight * 0.12, 200)
    const power = Math.min(dist / maxDragDist, 1) * 30
    const vx = (dx / dist) * power
    const vy = (dy / dist) * power

    // 发射！
    playLaunchSound()
    this.activeBird.launch(vx, vy)
    this.slingshot.clearBand()
    this.state = 'flying'
    this.birdIndex++
  }

  /**
   * 处理碰撞
   */
  _handleCollision(event) {
    const pairs = event.pairs

    pairs.forEach(pair => {
      const labels = [pair.bodyA.label, pair.bodyB.label]
      const bodies = [pair.bodyA, pair.bodyB]

      // 计算碰撞速度
      const relativeVelocity = {
        x: pair.bodyA.velocity.x - pair.bodyB.velocity.x,
        y: pair.bodyA.velocity.y - pair.bodyB.velocity.y
      }
      const speed = Math.sqrt(relativeVelocity.x ** 2 + relativeVelocity.y ** 2)

      // 右侧区域的碰撞传导到登录框墙（使其抖动）
      const avgX = (pair.bodyA.position.x + pair.bodyB.position.x) / 2
      if (avgX > this.gameRight * 0.35 && speed > 2 && this.formWall && this.formWallConstraint) {
        // 施加脉冲力到墙上，使其物理抖动
        const impulse = speed * 0.025
        Matter.Body.applyForce(this.formWall, this.formWall.position, {
          x: impulse,
          y: -impulse * 0.2
        })
      }

      // 鸟撞到东西
      if (labels.includes('bird')) {
        const birdBody = bodies.find(b => b.label === 'bird')
        const otherBody = bodies.find(b => b.label !== 'bird')

        if (otherBody && speed > 2) {
          // 查找被撞的实体
          this._damageEntity(otherBody, speed)

          // 撞到登录框物理墙 — 更大的反弹和音效
          if (otherBody.label === 'form-wall' && speed > 2) {
            playHitSound()
            this._spawnParticles(
              otherBody.position.x - 20,
              otherBody.position.y,
              0xe74c3c, 8
            )
            // 直接撞击产生强脉冲
            Matter.Body.applyForce(this.formWall, this.formWall.position, {
              x: speed * 0.04,
              y: -speed * 0.01
            })
          }
        }
      }

      // 物体互撞（连锁反应）
      if (labels.includes('block') && labels.includes('block') || labels.includes('pig') && labels.includes('block')) {
        if (speed > 3) {
          const blockBody = bodies.find(b => b.label === 'block')
          const anyBody = bodies.find(b => b.label !== 'block')
          if (anyBody) {
            this._damageEntity(anyBody, speed)
          }
          if (blockBody) {
            this._damageEntity(blockBody, speed * 0.7)
          }
        }
      }

      if (labels.includes('pig') && labels.includes('pig')) {
        if (speed > 3) {
          bodies.filter(b => b.label === 'pig').forEach(b => {
            this._damageEntity(b, speed * 0.5)
          })
        }
      }
    })
  }

  /**
   * 对实体造成伤害
   */
  _damageEntity(body, speed) {
    const damage = Pig.calcDamage(speed)

    // 查找对应的猪
    const pig = this.pigs.find(p => p.body === body && p.alive)
    if (pig) {
      if (damage > 0) {
        pig.takeDamage(damage)
        if (damage >= 50) playHitSound()
        if (!pig.alive) {
          playBreakSound()
          this._spawnParticles(pig.container.x, pig.container.y, 0x2ecc71, 12)
          this.score += 100
          this._updateHUD()
          this.onScoreChange?.(this.score)
        }
      }
      return
    }

    // 查找对应的砖块
    const block = this.blocks.find(b => b.body === body && b.alive)
    if (block) {
      if (damage > 0) {
        block.takeDamage(damage)
        if (damage >= 30) playHitSound()
        if (!block.alive) {
          this._spawnParticles(block.container.x, block.container.y, block.mat.base, 10)
        }
      }
    }
  }

  /**
   * 检查结果
   */
  _checkResult() {
    const alivePigs = this.pigs.filter(p => p.alive)
    if (alivePigs.length === 0) {
      this.score += 500
      this._updateHUD()
      this.onScoreChange?.(this.score)

      // 还有下一关吗？
      if (this.currentLevel + 1 < LEVELS.length) {
        playVictorySound()
        this._showMessage(`🎉 通关！进入下一关`)
        setTimeout(() => {
          this.loadLevel(this.currentLevel + 1)
        }, 2000)
      } else {
        this.victory()
      }
    } else {
      this._showMessage('😢 小鸟用完了...')
      setTimeout(() => {
        this._showMessage('点击重置按钮重新挑战')
        this.state = 'lost'
        this.onStateChange?.('lost')
      }, 1500)
    }
  }

  /**
   * 全部通关
   */
  victory() {
    playVictorySound()
    this.state = 'won'
    this._showMessage(`🎉 全部通关！最终分数: ${this.score}`)
    this.onStateChange?.('won')
  }

  /**
   * 游戏主循环（每帧调用）
   */
  update(delta) {
    // 更新物理
    this.physics.update(delta)

    // 更新粒子效果
    this._updateParticles()

    // 跟踪登录框物理墙位置，同步到 Vue 表单
    if (this.formWall && this.onFormHit) {
      const offset = this.formWall.position.x - this.formWallRestX
      // 任何偏移都实时更新（让 DOM 与物理同步）
      if (this.lastFormOffset !== offset) {
        this.lastFormOffset = offset
        this.onFormHit(offset)
      }
    }

    // 同步所有实体位置
    this.pigs.forEach(p => {
      if (p.alive) p.syncFromPhysics()
    })

    this.blocks.forEach(b => {
      if (b.alive) b.syncFromPhysics()
    })

    if (this.activeBird && this.activeBird.launched && this.activeBird.alive) {
      this.activeBird.syncFromPhysics()

      // 检查小鸟是否飞出界或静止
      const bird = this.activeBird
      if (bird.body) {
        const speed = Math.sqrt(
          bird.body.velocity.x ** 2 + bird.body.velocity.y ** 2
        )

        // 如果速度很小且在地上，或者飞出边界
        if (
          (speed < 0.3 && bird.body.position.y > this.height - 50) ||
          bird.body.position.x > this.width + 50 ||
          bird.body.position.y > this.height + 50 ||
          bird.body.position.x < -50
        ) {
          this._afterBirdLaunch()
        }

        // 空中速度慢且飞行了一段时间
        if (this.state === 'flying' && speed < 0.5 && bird.body.position.y > this.height - 100) {
          this.state = 'settling'
          setTimeout(() => this._afterBirdLaunch(), 500)
        }
      }
    }
  }

  /**
   * 小鸟发射后的处理
   */
  _afterBirdLaunch() {
    if (this.activeBird) {
      this.activeBird.destroy(this.physics)
      this.activeBird = null
    }

    // 移除死亡的猪和砖块
    this._removeDeadEntities()

    // 检查是否所有猪都死了
    const alivePigs = this.pigs.filter(p => p.alive)

    if (alivePigs.length === 0) {
      this._checkResult()
    } else if (this.birdIndex >= this.birds.length) {
      this._checkResult()
    } else {
      this._nextBird()
    }
  }

  /**
   * 移除死亡的实体
   */
  _removeDeadEntities() {
    const deadPigs = this.pigs.filter(p => !p.alive)
    deadPigs.forEach(p => p.destroy(this.physics))

    const deadBlocks = this.blocks.filter(b => !b.alive)
    deadBlocks.forEach(b => b.destroy(this.physics))
  }

  /**
   * 重置当前关卡
   */
  resetLevel() {
    this.loadLevel(this.currentLevel)
  }

  /**
   * 重置所有（从第一关开始）
   */
  resetGame() {
    this.score = 0
    this._updateHUD()
    this.loadLevel(0)
    this.onScoreChange?.(this.score)
  }

  /**
   * 调整画布大小
   */
  resize(width, height) {
    this.width = width
    this.height = height
    this.gameRight = width * 0.72
    // 简单处理：重新加载当前关卡适配新尺寸
    // 但如果游戏正在运行中，跳过以免打断
    if (this.state === 'idle' || this.state === 'lost' || this.state === 'won') {
      this.loadLevel(this.currentLevel)
    }
  }

  /**
   * 销毁
   */
  destroy() {
    clearTimeout(this._messageTimeout)
    this._clearLevel()
    this.physics.destroy()
    if (this.gameContainer.parent) {
      this.gameContainer.parent.removeChild(this.gameContainer)
    }
    this.gameContainer.destroy({ children: true })
  }
}
