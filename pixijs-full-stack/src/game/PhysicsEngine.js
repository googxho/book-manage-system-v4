/**
 * matter.js 物理引擎封装
 */
import Matter from 'matter-js'

const { Engine, World, Bodies, Body, Events, Vector, Constraint } = Matter

export default class PhysicsEngine {
  constructor() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.2 }
    })
    this.bodies = []
  }

  /**
   * 创建地面（静态，位于底部）
   */
  createGround(width, y) {
    const ground = Bodies.rectangle(width / 2, y, width, 40, {
      isStatic: true,
      friction: 0.8,
      restitution: 0.2,
      label: 'ground'
    })
    World.add(this.engine.world, ground)
    this.bodies.push(ground)
    return ground
  }

  /**
   * 创建左右墙壁（防止物体出界）
   */
  createWalls(width, height) {
    const wallThickness = 40
    const leftWall = Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, {
      isStatic: true,
      label: 'wall'
    })
    const rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, {
      isStatic: true,
      label: 'wall'
    })
    World.add(this.engine.world, [leftWall, rightWall])
    this.bodies.push(leftWall, rightWall)
    return [leftWall, rightWall]
  }

  /**
   * 创建一个圆形物理体
   */
  createCircle(x, y, radius, options = {}) {
    const body = Bodies.circle(x, y, radius, {
      restitution: 0.3,
      friction: 0.5,
      density: 0.002,
      ...options
    })
    World.add(this.engine.world, body)
    this.bodies.push(body)
    return body
  }

  /**
   * 创建一个带弹簧约束的动态矩形体（用于登录框物理墙）
   * 被撞击后会偏移，然后被弹簧拉回原位
   */
  createFormWall(x, y, w, h) {
    const wall = Bodies.rectangle(x, y, w, h, {
      label: 'form-wall',
      restitution: 0.5,
      friction: 0.2,
      density: 0.0008
    })
    const constraint = Constraint.create({
      pointA: { x, y },
      bodyB: wall,
      pointB: { x: 0, y: 0 },
      stiffness: 0.008,
      damping: 0.04,
      length: 0
    })
    World.add(this.engine.world, [wall, constraint])
    this.bodies.push(wall)
    return { wall, constraint, restX: x, restY: y }
  }

  /**
   * 创建一个矩形物理体
   */
  createRectangle(x, y, w, h, options = {}) {
    const body = Bodies.rectangle(x, y, w, h, {
      restitution: 0.1,
      friction: 0.8,
      density: 0.002,
      ...options
    })
    World.add(this.engine.world, body)
    this.bodies.push(body)
    return body
  }

  /**
   * 施加力（用于发射小鸟）
   */
  applyForce(body, force) {
    Body.applyForce(body, body.position, force)
  }

  /**
   * 设置速度
   */
  setVelocity(body, velocity) {
    Body.setVelocity(body, velocity)
  }

  /**
   * 更新物理世界
   */
  update(delta) {
    // 限制 delta 避免 matter-js 警告（最大 16.667ms = 60fps）
    const clampedDelta = Math.min(delta, 16.667)
    Engine.update(this.engine, clampedDelta)
  }

  /**
   * 注册碰撞事件
   */
  onCollisionStart(callback) {
    Events.on(this.engine, 'collisionStart', callback)
  }

  onCollisionEnd(callback) {
    Events.on(this.engine, 'collisionEnd', callback)
  }

  /**
   * 从世界中移除物体
   */
  removeBody(body) {
    World.remove(this.engine.world, body)
    const idx = this.bodies.indexOf(body)
    if (idx !== -1) this.bodies.splice(idx, 1)
  }

  /**
   * 稳定物理世界 — 运行多次快速迭代让物体自然沉降
   * 注册碰撞事件前调用，避免初始碰撞误触
   */
  stabilize(iterations = 200) {
    const originalCollision = this.engine.events?.collisionStart
    // 运行物理步进，让所有物体自然沉降
    for (let i = 0; i < iterations; i++) {
      Engine.update(this.engine, 16.667)
    }
  }

  /**
   * 清除所有物体
   */
  clear() {
    World.clear(this.engine.world)
    Engine.clear(this.engine)
    this.bodies = []
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.2 }
    })
  }

  /**
   * 销毁
   */
  destroy() {
    this.clear()
  }
}
