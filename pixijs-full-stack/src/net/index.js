import axios from 'axios'

const TOKEN_KEY = 'authorize'
const api = axios.create({
  baseURL: ''
})

function storeAccessToken(token, expire, remember) {
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, JSON.stringify({ token, expire }))
}

export function takeAccessToken() {
  const raw = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function deleteAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function unauthorized() {
  const info = takeAccessToken()
  if (!info) return true
  const now = Date.now()
  const expire = new Date(info.expire).getTime()
  if (now >= expire) {
    deleteAccessToken()
    return true
  }
  return false
}

function accessHeader() {
  const info = takeAccessToken()
  if (!info) return {}
  return { Authorization: `Bearer ${info.token}` }
}

function internalPost(url, data, success, failure) {
  api.post(url, data, { headers: accessHeader() }).then(({ data }) => {
    if (data.code === 200) {
      success(data.data)
    } else if (data.code === 401) {
      deleteAccessToken()
      window.location.reload()
    } else {
      failure?.(data.message || '请求失败')
    }
  }).catch(err => {
    failure?.(err.response?.data?.message || err.message || '网络错误')
  })
}

function internalGet(url, success, failure) {
  api.get(url, { headers: accessHeader() }).then(({ data }) => {
    if (data.code === 200) {
      success(data.data)
    } else if (data.code === 401) {
      deleteAccessToken()
      window.location.reload()
    } else {
      failure?.(data.message || '请求失败')
    }
  }).catch(err => {
    failure?.(err.response?.data?.message || err.message || '网络错误')
  })
}

export function login(username, password, remember, success, failure) {
  api.post('/api/auth/login',
    `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  ).then(({ data }) => {
    if (data.code === 200) {
      const auth = data.data
      storeAccessToken(auth.token, auth.expire, remember)
      success?.(auth)
    } else {
      failure?.(data.message || '登录失败')
    }
  }).catch(err => {
    failure?.(err.response?.data?.message || err.message || '网络错误')
  })
}

export function logout(success, failure) {
  internalGet('/api/auth/logout', () => {
    deleteAccessToken()
    success?.()
  }, failure)
}

export function post(url, data, success, failure) {
  internalPost(url, data, success, failure)
}

export function get(url, success, failure) {
  internalGet(url, success, failure)
}
