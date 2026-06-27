<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '@/net'
import auth, { loadAuthFromToken, clearAuth } from '@/stores/auth'

const router = useRouter()
const loggingOut = ref(false)

onMounted(() => {
  loadAuthFromToken()
})

function handleLogout() {
  loggingOut.value = true
  logout(() => {
    clearAuth()
    router.push('/')
  }, () => {
    loggingOut.value = false
  })
}
</script>

<template>
  <div class="index-page">
    <div class="welcome-container">
      <div class="avatar">
        {{ (auth.username || '?')[0].toUpperCase() }}
      </div>
      <h1 class="welcome-title">欢迎回来，{{ auth.username || '用户' }}</h1>
      <p class="welcome-role">角色: {{ auth.role || 'user' }}</p>
      <p class="welcome-desc">你已经成功登录系统</p>
      <button
        class="logout-button"
        @click="handleLogout"
        :disabled="loggingOut"
      >
        {{ loggingOut ? '退出中...' : '退出登录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.index-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.welcome-container {
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 60px 50px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 420px;
  width: 90%;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #e67e22);
  color: white;
  font-size: 36px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 4px 20px rgba(231, 76, 60, 0.3);
}

.welcome-title {
  font-size: 26px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.welcome-role {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.welcome-desc {
  font-size: 15px;
  color: #666;
  margin-bottom: 32px;
}

.logout-button {
  padding: 12px 40px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-button:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.logout-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
