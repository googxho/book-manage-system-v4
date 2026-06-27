<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PixiGameCanvas from '@/components/PixiGameCanvas.vue'
import { post, get } from '@/net'

const router = useRouter()
const canvasRef = ref(null)
const score = ref(0)

const username = ref('')
const password = ref('')
const passwordRepeat = ref('')
const email = ref('')
const code = ref('')
const loading = ref(false)
const errorMsg = ref('')
const codeSending = ref(false)
const codeSent = ref(false)
const countdown = ref(0)

function onScoreChange(val) {
  score.value = val
}

function sendCode() {
  if (!email.value.trim()) {
    errorMsg.value = '请先输入邮箱'
    return
  }
  codeSending.value = true
  errorMsg.value = ''
  get(`/api/auth/ask-code?email=${encodeURIComponent(email.value)}&type=register`, () => {
    codeSending.value = false
    codeSent.value = true
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
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
    router.push('/')
  }, (msg) => {
    loading.value = false
    errorMsg.value = msg || '注册失败'
  })
}
</script>

<template>
  <div class="login-page">
    <PixiGameCanvas ref="canvasRef" :showForm="true" @scoreChange="onScoreChange" />
    <div class="form-overlay">
      <div class="form-card">
        <div class="form-header">
          <h1 class="form-title">创建账号</h1>
          <p class="form-subtitle">注册以体验完整功能</p>
        </div>

        <form @submit.prevent="handleRegister" class="form-body">
          <div class="input-group">
            <label for="username">用户名</label>
            <input id="username" v-model="username" type="text" placeholder="2-8位中文/英文/数字" maxlength="10" />
          </div>

          <div class="input-group">
            <label for="email">邮箱</label>
            <div class="input-with-btn">
              <input id="email" v-model="email" type="email" placeholder="请输入邮箱" />
              <button type="button" class="code-btn" :disabled="codeSending || codeSent" @click="sendCode">
                {{ codeSent ? `${countdown}s` : (codeSending ? '发送中...' : '获取验证码') }}
              </button>
            </div>
          </div>

          <div class="input-group">
            <label for="code">验证码</label>
            <input id="code" v-model="code" type="text" placeholder="6位验证码" maxlength="6" />
          </div>

          <div class="input-group">
            <label for="password">密码</label>
            <input id="password" v-model="password" type="password" placeholder="6-20位密码" maxlength="20" autocomplete="new-password" />
          </div>

          <div class="input-group">
            <label for="passwordRepeat">确认密码</label>
            <input id="passwordRepeat" v-model="passwordRepeat" type="password" placeholder="再次输入密码" maxlength="20" autocomplete="new-password" />
          </div>

          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

          <button type="submit" class="login-button" :disabled="loading">
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <div class="form-links">
          <router-link to="/" class="form-link">已有账号？登录</router-link>
        </div>

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
  justify-content: flex-end;
  padding-right: 6%;
  z-index: 1;
  pointer-events: none;
}

.form-card {
  width: 340px;
  background: var(--bg-overlay);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  pointer-events: auto;
  transition: transform 0.3s ease;
}

.form-card:hover {
  transform: translateY(-2px);
}

.form-header {
  margin-bottom: 22px;
  text-align: center;
}

.form-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.3px;
}

.form-subtitle {
  font-size: 13px;
  color: var(--text-light);
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.3px;
}

.input-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
}

.input-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  background: #fff;
}

.input-group input::placeholder {
  color: #bbb;
}

.input-with-btn {
  display: flex;
  gap: 8px;
}

.input-with-btn input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  padding: 10px 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.code-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.code-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fff0f0;
  border: 1px solid #ffd4d4;
  color: var(--primary);
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}

.login-button:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.login-button:active {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.form-links {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.form-link {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.form-link:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

.game-info {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  text-align: center;
}

.score-badge {
  font-size: 13px;
  color: var(--text-light);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .form-overlay {
    justify-content: center;
    padding-right: 0;
  }
  .form-card {
    width: 90%;
    max-width: 340px;
    padding: 24px 20px;
  }
}
</style>
