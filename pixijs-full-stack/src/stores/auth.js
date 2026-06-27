import { reactive } from 'vue'
import { takeAccessToken } from '@/net'

const auth = reactive({
  username: '',
  role: '',
  isLoggedIn: false
})

export function updateAuth(userInfo) {
  auth.username = userInfo.username || ''
  auth.role = userInfo.role || ''
  auth.isLoggedIn = true
}

export function clearAuth() {
  auth.username = ''
  auth.role = ''
  auth.isLoggedIn = false
}

export function loadAuthFromToken() {
  const info = takeAccessToken()
  if (info && info.token) {
    try {
      const payload = JSON.parse(atob(info.token.split('.')[1]))
      auth.username = payload.name || ''
      auth.role = payload.authorities?.[0] || ''
      auth.isLoggedIn = true
    } catch {
      auth.isLoggedIn = false
    }
  }
}

export default auth
