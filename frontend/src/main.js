import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useUserStore } from '@/store/user'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 自动恢复登录态 — 从本地 token 获取用户信息
  const userStore = useUserStore()
  userStore.init()

  return { app, pinia }
}
