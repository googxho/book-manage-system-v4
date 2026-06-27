<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Application } from 'pixi.js'
import GameManager from '@/game'

const props = defineProps({
  showForm: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['scoreChange', 'stateChange', 'formHit'])

const canvasContainer = ref(null)
let app = null
let gameManager = null
let animFrameId = null

onMounted(async () => {
  // 创建 PixiJS 应用
  app = new Application()
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x87CEEB,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  // 设置交互模式
  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen

  canvasContainer.value.appendChild(app.canvas)

  // 初始化游戏
  gameManager = new GameManager(app)

  gameManager.onScoreChange = (score) => {
    emit('scoreChange', score)
  }

  gameManager.onStateChange = (state) => {
    emit('stateChange', state)
  }

  gameManager.onFormHit = (intensity) => {
    emit('formHit', intensity)
  }

  await gameManager.init()

  // 事件监听
  app.stage.on('pointerdown', (e) => {
    if (props.showForm) {
      // 表单在右侧，游戏区域在左侧（左70%为游戏交互区）
      const interactiveX = window.innerWidth * 0.7
      if (e.global.x < interactiveX) {
        gameManager.onPointerDown(e.global.x, e.global.y)
      }
    } else {
      gameManager.onPointerDown(e.global.x, e.global.y)
    }
  })

  app.stage.on('pointermove', (e) => {
    gameManager.onPointerMove(e.global.x, e.global.y)
  })

  app.stage.on('pointerup', () => {
    gameManager.onPointerUp()
  })

  app.stage.on('pointerupoutside', () => {
    gameManager.onPointerUp()
  })

  // 主循环
  const gameLoop = (time) => {
    const delta = app.ticker.deltaMS
    gameManager.update(delta)
    animFrameId = requestAnimationFrame(gameLoop)
  }
  animFrameId = requestAnimationFrame(gameLoop)

  // 窗口大小变化
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
  }
  if (gameManager) {
    gameManager.destroy()
  }
  if (app) {
    app.destroy(true)
  }
  window.removeEventListener('resize', onResize)
})

function onResize() {
  if (app) {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    app.stage.hitArea = app.screen
    gameManager?.resize(window.innerWidth, window.innerHeight)
  }
}

function resetGame() {
  gameManager?.resetGame()
}

defineExpose({ resetGame })
</script>

<template>
  <div ref="canvasContainer" class="pixi-canvas-container"></div>
</template>

<style scoped>
.pixi-canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 0;
}
</style>
