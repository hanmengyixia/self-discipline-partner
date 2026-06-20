/**
 * 网络请求封装 — 自动携带 Token、统一错误处理
 *
 * 使用方式:
 *   import { get, post } from '@/api/request'
 *   const res = await post('/api/user/login', { username, password })
 *   // res 结构: { code: 200, msg: 'success', data: {...} }
 */

// ==================== 配置 ====================
const BASE_URL = ''  // 使用 Vite proxy 代理 /api → localhost:3000
const TOKEN_KEY = 'token'

// ==================== 存储助手 (H5 用 sessionStorage 隔离多标签页) ====================
const isH5 = typeof window !== 'undefined' && !!window.sessionStorage

function readToken() {
  if (isH5) {
    // 优先 sessionStorage（标签页隔离），没有则尝试 localStorage（首次打开恢复登录）
    return window.sessionStorage.getItem(TOKEN_KEY)
        || window.localStorage.getItem(TOKEN_KEY)
        || ''
  }
  return uni.getStorageSync(TOKEN_KEY) || ''
}

function writeToken(token) {
  if (isH5) {
    window.sessionStorage.setItem(TOKEN_KEY, token)   // 当前标签页生效
    window.localStorage.setItem(TOKEN_KEY, token)      // 新标签页时可恢复
  }
  uni.setStorageSync(TOKEN_KEY, token)
}

function deleteToken() {
  if (isH5) {
    window.sessionStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(TOKEN_KEY)
  }
  uni.removeStorageSync(TOKEN_KEY)
}

// ==================== 拦截器钩子 ====================
let onUnauthorized = null  // 401 回调 — 由页面层注册

/**
 * 注册未登录回调 (跳转登录页)
 * @param {Function} fn
 */
export function onTokenExpired(fn) {
  onUnauthorized = fn
}

// ==================== 核心请求方法 ====================

/**
 * 发起 HTTP 请求
 * @param {string} url
 * @param {object} options  - { method, data, header, ... }
 * @returns {Promise<{code:number, msg:string, data:any}>}
 */
function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const token = readToken()
  const silent = options.silent === true  // 静默模式：不自动弹出 toast

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...(options.header || {})
      },
      timeout: 15000,
      success(res) {
        const { statusCode, data } = res

        // HTTP 200 + 业务码 200 = 成功
        if (statusCode === 200 && data.code === 200) {
          resolve(data)
          return
        }

        // 401 未登录 — token 过期或无效
        if (data.code === 401 || statusCode === 401) {
          deleteToken()
          if (onUnauthorized) {
            onUnauthorized()
          } else {
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/login' })
            }, 1500)
          }
          reject(data)
          return
        }

        // 其他业务错误 — 静默模式下不弹 toast
        if (!silent) {
          uni.showToast({ title: data.msg || '请求失败', icon: 'none', duration: 2000 })
        }
        reject(data)
      },
      fail(err) {
        console.error('📡 网络请求失败:', url, err)
        if (!silent) {
          uni.showToast({ title: '网络异常，请检查连接', icon: 'none', duration: 2000 })
        }
        reject(err)
      }
    })
  })
}

// ==================== 快捷方法 ====================

export function get(url, params = {}, options = {}) {
  // 将 params 转为 query string
  const qs = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  const fullUrl = qs ? `${url}?${qs}` : url
  return request(fullUrl, { method: 'GET', ...options })
}

export function post(url, data = {}, options = {}) {
  return request(url, { method: 'POST', data, ...options })
}

export function put(url, data = {}, options = {}) {
  return request(url, { method: 'PUT', data, ...options })
}

export function del(url, data = {}, options = {}) {
  return request(url, { method: 'DELETE', data, ...options })
}

// ==================== 工具方法 ====================

/** 保存 Token 到本地 */
export function saveToken(token) {
  writeToken(token)
}

/** 获取本地 Token */
export function getToken() {
  return readToken()
}

/** 清除登录态 */
export function clearToken() {
  deleteToken()
}

/** 是否已登录 */
export function isLoggedIn() {
  return !!readToken()
}

export default { get, post, put, del, saveToken, getToken, clearToken, isLoggedIn, onTokenExpired }
