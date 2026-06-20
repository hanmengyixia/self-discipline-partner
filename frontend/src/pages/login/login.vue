<template>
  <view class="login-page">
    <!-- Logo 区域 -->
    <view class="logo-section">
      <view class="logo-icon">律</view>
      <text class="app-name">自律搭子</text>
      <text class="app-slogan">自律给你自由</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section card">
      <view class="form-tabs">
        <text
          class="tab-item"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >登录</text>
        <text
          class="tab-item"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >注册</text>
      </view>

      <view class="input-group">
        <text class="input-label">用户名</text>
        <input
          class="input-field"
          v-model="username"
          placeholder="请输入用户名"
          placeholder-style="color:#BDC3C7"
        />
      </view>

      <view class="input-group">
        <text class="input-label">密码</text>
        <input
          class="input-field"
          v-model="password"
          type="password"
          placeholder="请输入密码 (6-30位)"
          placeholder-style="color:#BDC3C7"
        />
      </view>

      <button
        class="submit-btn"
        :class="{ loading: submitting }"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '处理中...' : (mode === 'login' ? '登 录' : '注 册') }}
      </button>

      <!-- 测试账号提示 -->
      <view class="test-tip">
        <text class="tip-title">测试账号</text>
        <text class="tip-text">zhangsan / 123456</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const mode = ref('login')      // 'login' | 'register'
const username = ref('')
const password = ref('')
const submitting = ref(false)

async function handleSubmit() {
  // 参数校验
  if (!username.value.trim()) {
    return uni.showToast({ title: '请输入用户名', icon: 'none' })
  }
  if (!password.value) {
    return uni.showToast({ title: '请输入密码', icon: 'none' })
  }
  if (password.value.length < 6) {
    return uni.showToast({ title: '密码至少6位', icon: 'none' })
  }

  submitting.value = true
  try {
    if (mode.value === 'login') {
      await userStore.login(username.value.trim(), password.value)
      uni.showToast({ title: '登录成功', icon: 'success' })
    } else {
      await userStore.register(username.value.trim(), password.value)
      uni.showToast({ title: '注册成功', icon: 'success' })
    }
    // 跳转到首页
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 800)
  } catch (e) {
    // request.js 已自动 toast 错误信息
    console.error('登录/注册失败:', e)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  background: linear-gradient(180deg, #E8F5E9 0%, #F5F7FA 60%);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;

  .logo-icon {
    width: 140rpx;
    height: 140rpx;
    line-height: 140rpx;
    text-align: center;
    font-size: 64rpx;
    font-weight: 700;
    color: #FFFFFF;
    background: #2C3E50;
    border-radius: 36rpx;
    margin-bottom: 20rpx;
  }

  .app-name {
    font-size: 52rpx;
    font-weight: 700;
    color: #2C3E50;
    letter-spacing: 4rpx;
  }

  .app-slogan {
    font-size: 26rpx;
    color: #7F8C8D;
    margin-top: 10rpx;
    letter-spacing: 8rpx;
  }
}

.form-section {
  width: 100%;
  max-width: 600rpx;
}

.form-tabs {
  display: flex;
  margin-bottom: 40rpx;
  border-bottom: 2px solid #E8ECF1;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 32rpx;
    color: #95A5A6;
    position: relative;
    transition: all 0.3s;

    &.active {
      color: #4CAF50;
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 60rpx;
        height: 4rpx;
        background: #4CAF50;
        border-radius: 2rpx;
      }
    }
  }
}

.input-group {
  margin-bottom: 30rpx;

  .input-label {
    display: block;
    font-size: 26rpx;
    color: #7F8C8D;
    margin-bottom: 12rpx;
  }

  .input-field {
    width: 100%;
    height: 88rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 30rpx;
    color: #2C3E50;
    box-sizing: border-box;
  }
}

.submit-btn {
  width: 100%;
  height: 90rpx;
  line-height: 90rpx;
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
  color: #FFFFFF;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  margin-top: 20rpx;
  letter-spacing: 8rpx;

  &.loading {
    opacity: 0.7;
  }

  &:active {
    opacity: 0.85;
  }
}

.test-tip {
  margin-top: 30rpx;
  padding: 20rpx;
  background: #FFF8E1;
  border-radius: 10rpx;
  text-align: center;

  .tip-title {
    display: block;
    font-size: 24rpx;
    color: #F57C00;
    margin-bottom: 6rpx;
  }

  .tip-text {
    font-size: 26rpx;
    color: #666;
    font-family: monospace;
  }
}
</style>
