<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import PixiGameCanvas from '@/components/PixiGameCanvas.vue'
import { login, post, get } from '@/net'
import { updateAuth } from '@/stores/auth'

const router = useRouter()
const canvasRef = ref(null)
const score = ref(0)
const loading = ref(false)
const errorMsg = ref('')
const formOffset = ref(0) // 小鸟击退偏移量
let codeTimer = null

// 小鸟击退登录框 — 物理引擎驱动
// formOffset 直接由 matter.js 物理墙的位置驱动
function onFormHit(offsetPixels) {
  formOffset.value = offsetPixels
}

const formStyle = computed(() => {
  const moving = Math.abs(formOffset.value) > 2
  return {
    transform: `translateX(${formOffset.value}px)`,
    // 物理弹簧效果：被撞时快速移动，回弹时有弹性缓动
    transition: 'transform 0.05s linear',
    boxShadow: moving
      ? '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.1) inset, 0 0 100px rgba(231,76,60,0.45)'
      : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.1) inset, 0 0 40px rgba(231,76,60,0.08)',
    borderColor: moving ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.3)'
  }
})

// ========== 模式切换 ==========
const mode = ref('login') // 'login' | 'register' | 'forget'
const formTitle = ref('欢迎回来')
const formSubtitle = ref('登录以继续')

function switchMode(newMode) {
  mode.value = newMode
  errorMsg.value = ''
  // 清理验证码定时器
  if (codeTimer) {
    clearInterval(codeTimer)
    codeTimer = null
  }
  // 重置所有表单字段
  username.value = ''
  password.value = ''
  passwordRepeat.value = ''
  email.value = ''
  code.value = ''
  remember.value = false
  codeSent.value = false
  countdown.value = 0
  registerStep.value = 1

  if (newMode === 'login') {
    formTitle.value = '欢迎回来'
    formSubtitle.value = '登录以继续'
  } else if (newMode === 'register') {
    formTitle.value = '创建账号'
    formSubtitle.value = '注册以体验完整功能'
  } else {
    formTitle.value = '重置密码'
    formSubtitle.value = '验证您的邮箱'
  }
}

// ========== 登录 ==========
const username = ref('')
const password = ref('')
const passwordRepeat = ref('')
const remember = ref(false)

function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  login(username.value.trim(), password.value.trim(), remember.value, (data) => {
    loading.value = false
    updateAuth(data)
    router.push('/index')
  }, (msg) => {
    loading.value = false
    errorMsg.value = msg || '登录失败，请重试'
  })
}

// ========== 注册 ==========
const email = ref('')
const code = ref('')
const codeSending = ref(false)
const codeSent = ref(false)
const countdown = ref(0)

function sendCode(type) {
  if (!email.value.trim()) {
    errorMsg.value = '请先输入邮箱'
    return
  }
  codeSending.value = true
  errorMsg.value = ''
  get(`/api/auth/ask-code?email=${encodeURIComponent(email.value)}&type=${type}`, () => {
    codeSending.value = false
    codeSent.value = true
    countdown.value = 60
    codeTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(codeTimer)
        codeTimer = null
        codeSent.value = false
      }
    }, 1000)
  }, (msg) => {
    codeSending.value = false
    errorMsg.value = msg || '发送验证码失败'
  })
}

function handleRegister() {
  if (!username.value.trim() || !password.value.trim() || !email.value.trim() || !code.value.trim()) {
    errorMsg.value = '请填写所有字段'
    return
  }
  if (password.value !== passwordRepeat.value) {
    errorMsg.value = '两次密码不一致'
    return
  }
  if (password.value.length < 6 || password.value.length > 20) {
    errorMsg.value = '密码长度需 6-20 位'
    return
  }
  loading.value = true
  errorMsg.value = ''
  post('/api/auth/register', {
    username: username.value.trim(),
    password: password.value,
    email: email.value.trim(),
    code: code.value.trim()
  }, () => {
    loading.value = false
    switchMode('login')
  }, (msg) => {
    loading.value = false
    errorMsg.value = msg || '注册失败'
  })
}

// ========== 重置密码 ==========
const registerStep = ref(1) // 1: 验证邮箱, 2: 重置密码

function handleResetConfirm() {
  if (!email.value.trim() || !code.value.trim()) {
    errorMsg.value = '请填写邮箱和验证码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  post('/api/auth/reset-confirm', {
    email: email.value.trim(),
    code: code.value.trim()
  }, () => {
    loading.value = false
    registerStep.value = 2
    formSubtitle.value = '设置新密码'
  }, (msg) => {
    loading.value = false
    errorMsg.value = msg || '验证失败'
  })
}

function handleResetPassword() {
  if (password.value.length < 6 || password.value.length > 20) {
    errorMsg.value = '密码长度需 6-20 位'
    return
  }
  if (password.value !== passwordRepeat.value) {
    errorMsg.value = '两次密码不一致'
    return
  }
  loading.value = true
  errorMsg.value = ''
  post('/api/auth/reset-password', {
    email: email.value.trim(),
    code: code.value.trim(),
    password: password.value
  }, () => {
    loading.value = false
    switchMode('login')
  }, (msg) => {
    loading.value = false
    errorMsg.value = msg || '重置失败'
  })
}

function onScoreChange(val) {
  score.value = val
}
</script>

<template>
  <div class="login-page">
    <PixiGameCanvas ref="canvasRef" :showForm="true" @scoreChange="onScoreChange" @formHit="onFormHit" />

    <div class="form-overlay">
      <div class="form-card" :style="formStyle">
        <div class="form-header">
          <h1 class="form-title">{{ formTitle }}</h1>
          <p class="form-subtitle">{{ formSubtitle }}</p>
        </div>

        <!-- ===== 登录模式 ===== -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="form-body">
          <div class="input-group">
            <label for="username">用户名 / 邮箱</label>
            <input id="username" v-model="username" type="text" placeholder="请输入用户名或邮箱" maxlength="30" autocomplete="username" />
          </div>
          <div class="input-group">
            <label for="password">密码</label>
            <input id="password" v-model="password" type="password" placeholder="请输入密码" maxlength="30" autocomplete="current-password" />
          </div>
          <div class="input-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="remember" />
              <span class="checkbox-text">记住我</span>
            </label>
          </div>
          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
          <button type="submit" class="login-button" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
          <div class="form-links">
            <span class="form-link" @click="switchMode('register')">没有账号？注册</span>
            <span class="form-link" @click="switchMode('forget')">忘记密码？</span>
          </div>
        </form>

        <!-- ===== 注册模式 ===== -->
        <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="form-body">
          <div class="input-group">
            <label for="reg-username">用户名</label>
            <input id="reg-username" v-model="username" type="text" placeholder="2-8位中文/英文/数字" maxlength="10" />
          </div>
          <div class="input-group">
            <label for="reg-email">邮箱</label>
            <div class="input-with-btn">
              <input id="reg-email" v-model="email" type="email" placeholder="请输入邮箱" />
              <button type="button" class="code-btn" :disabled="codeSending || codeSent" @click="sendCode('register')">
                {{ codeSent ? `${countdown}s` : (codeSending ? '发送中...' : '获取验证码') }}
              </button>
            </div>
          </div>
          <div class="input-group">
            <label for="reg-code">验证码</label>
            <input id="reg-code" v-model="code" type="text" placeholder="6位验证码" maxlength="6" />
          </div>
          <div class="input-group">
            <label for="reg-password">密码</label>
            <input id="reg-password" v-model="password" type="password" placeholder="6-20位密码" maxlength="20" autocomplete="new-password" />
          </div>
          <div class="input-group">
            <label for="reg-password2">确认密码</label>
            <input id="reg-password2" v-model="passwordRepeat" type="password" placeholder="再次输入密码" maxlength="20" autocomplete="new-password" />
          </div>
          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
          <button type="submit" class="login-button" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
          <div class="form-links">
            <span class="form-link" @click="switchMode('login')">已有账号？登录</span>
          </div>
        </form>

        <!-- ===== 重置密码模式 ===== -->
        <form v-else-if="mode === 'forget'" @submit.prevent="registerStep === 1 ? handleResetConfirm() : handleResetPassword()" class="form-body">
          <!-- 步骤指示器 -->
          <div class="step-indicator">
            <div class="step-dot" :class="{ active: registerStep === 1, done: registerStep > 1 }">1</div>
            <div class="step-line" :class="{ done: registerStep > 1 }"></div>
            <div class="step-dot" :class="{ active: registerStep === 2 }">2</div>
          </div>

          <!-- 步骤1：验证邮箱 -->
          <template v-if="registerStep === 1">
            <div class="input-group">
              <label for="forget-email">邮箱</label>
              <div class="input-with-btn">
                <input id="forget-email" v-model="email" type="email" placeholder="请输入注册时使用的邮箱" />
                <button type="button" class="code-btn" :disabled="codeSending || codeSent" @click="sendCode('reset')">
                  {{ codeSent ? `${countdown}s` : (codeSending ? '发送中...' : '获取验证码') }}
                </button>
              </div>
            </div>
            <div class="input-group">
              <label for="forget-code">验证码</label>
              <input id="forget-code" v-model="code" type="text" placeholder="6位验证码" maxlength="6" />
            </div>
          </template>

          <!-- 步骤2：重置密码 -->
          <template v-if="registerStep === 2">
            <div class="input-group">
              <label for="forget-password">新密码</label>
              <input id="forget-password" v-model="password" type="password" placeholder="6-20位新密码" maxlength="20" autocomplete="new-password" />
            </div>
            <div class="input-group">
              <label for="forget-password2">确认密码</label>
              <input id="forget-password2" v-model="passwordRepeat" type="password" placeholder="再次输入新密码" maxlength="20" autocomplete="new-password" />
            </div>
          </template>

          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
          <button type="submit" class="login-button" :disabled="loading">
            <template v-if="registerStep === 1">{{ loading ? '验证中...' : '验证' }}</template>
            <template v-else>{{ loading ? '重置中...' : '重置密码' }}</template>
          </button>
          <div class="form-links">
            <span class="form-link" @click="switchMode('login')">返回登录</span>
          </div>
        </form>

        <div class="game-info">
          <span class="score-badge">🎮 愤怒小鸟 · 分数: {{ score }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  position: relative;
}
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}
.form-card {
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 0 40px rgba(231, 76, 60, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.form-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset,
    0 0 60px rgba(231, 76, 60, 0.12);
}
.form-header { margin-bottom: 22px; text-align: center; }
.form-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
.form-subtitle { font-size: 13px; color: var(--text-light); }
.form-body { display: flex; flex-direction: column; gap: 14px; }
.input-group { display: flex; flex-direction: column; gap: 4px; }
.input-group label { font-size: 12px; font-weight: 600; color: var(--text); letter-spacing: 0.3px; }
.input-group input {
  width: 100%; padding: 10px 14px; border: 1.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px; font-size: 14px; outline: none; transition: all 0.25s ease;
  background: rgba(255, 255, 255, 0.85); box-sizing: border-box;
}
.input-group input:focus {
  border-color: var(--primary); box-shadow: 0 0 0 4px rgba(231,76,60,0.12);
  background: #fff; transform: scale(1.01);
}
.input-group input::placeholder { color: #bbb; }
.input-with-btn { display: flex; gap: 8px; }
.input-with-btn input { flex: 1; }
.code-btn {
  flex-shrink: 0; padding: 10px 12px; background: var(--primary); color: white;
  border: none; border-radius: 10px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: all 0.2s ease;
}
.code-btn:hover:not(:disabled) { background: var(--primary-hover); }
.code-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.input-options { display: flex; align-items: center; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }
.checkbox-text { font-size: 14px; color: var(--text-light); }
.error-message {
  background: #fff0f0; border: 1px solid #ffd4d4; color: var(--primary);
  padding: 10px 16px; border-radius: 10px; font-size: 13px; text-align: center;
}
.login-button {
  width: 100%; padding: 12px; background: var(--primary); color: white;
  border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease; letter-spacing: 0.5px;
}
.login-button:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 15px rgba(231,76,60,0.3); }
.login-button:active { transform: translateY(0); }
.login-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.step-indicator { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 18px; }
.step-dot {
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 13px; font-weight: 700; background: #eee; color: #999;
  transition: all 0.3s ease;
}
.step-dot.active { background: var(--primary); color: white; box-shadow: 0 2px 10px rgba(231,76,60,0.3); }
.step-dot.done { background: #27ae60; color: white; }
.step-line { width: 50px; height: 3px; background: #eee; border-radius: 2px; transition: all 0.3s ease; }
.step-line.done { background: #27ae60; }
.game-info { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); text-align: center; }
.score-badge { font-size: 13px; color: var(--text-light); display: inline-flex; align-items: center; gap: 4px; }
.form-links { display: flex; justify-content: center; gap: 20px; margin-top: 4px; }
.form-link { font-size: 13px; color: var(--primary); cursor: pointer; transition: color 0.2s ease; }
.form-link:hover { color: var(--primary-hover); text-decoration: underline; }

@media (max-width: 768px) {
  .form-overlay { justify-content: center; }
  .form-card { width: 90%; max-width: 320px; padding: 24px 20px; }
}
</style>
