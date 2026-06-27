import { createRouter, createWebHistory } from 'vue-router'
import { unauthorized } from '@/net'

const routes = [
  {
    path: '/',
    name: 'login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/index',
    name: 'index',
    component: () => import('@/views/IndexView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const isLoggedIn = !unauthorized()
  if (isLoggedIn && to.name === 'login') {
    return { name: 'index' }
  }
  if (!isLoggedIn && to.name === 'index') {
    return { name: 'login' }
  }
})

export default router
