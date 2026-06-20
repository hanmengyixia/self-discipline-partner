/**
 * 用户状态管理 - Pinia Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { post, get, saveToken, clearToken, getToken } from '@/api/request'

export const useUserStore = defineStore('user', () => {
  // ==================== State ====================
  const user = ref(null)         // { id, username, avatar_url }
  const token = ref(getToken())
  const isLogin = computed(() => !!token.value && !!user.value)

  // ==================== Actions ====================

  /** 注册 */
  async function register(username, password) {
    const res = await post('/api/user/register', { username, password })
    token.value = res.data.token
    user.value = res.data.user
    saveToken(res.data.token)
    return res
  }

  /** 登录 */
  async function login(username, password) {
    const res = await post('/api/user/login', { username, password })
    token.value = res.data.token
    user.value = res.data.user
    saveToken(res.data.token)
    return res
  }

  /** 获取个人信息 */
  async function fetchProfile() {
    if (!token.value) return
    const res = await get('/api/user/profile')
    user.value = res.data
  }

  /** 退出登录 */
  function logout() {
    token.value = ''
    user.value = null
    clearToken()
    uni.reLaunch({ url: '/pages/login/login' })
  }

  /** 初始化 — 从本地恢复登录态 */
  async function init() {
    const savedToken = getToken()
    if (savedToken) {
      token.value = savedToken
      try {
        await fetchProfile()
      } catch (e) {
        // token 过期, 清理
        token.value = ''
        user.value = null
        clearToken()
      }
    }
  }

  return {
    user,
    token,
    isLogin,
    register,
    login,
    fetchProfile,
    logout,
    init
  }
})
