<template>
  <view></view>
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('自律搭子 App 启动')
  // 检查本地是否存有 token，自动恢复登录态
  const token = uni.getStorageSync('token')
  if (token) {
    console.log('已检测到登录状态')
  }
})

onShow(() => {
  console.log('App 显示')
})

onHide(() => {
  console.log('App 隐藏')
})
</script>

<style lang="scss">
/* ===== 全局 CSS 变量 & 基础样式 ===== */
page {
  --primary: #2C3E50;
  --primary-dark: #1A252F;
  --primary-light: #E8ECF1;
  --accent: #FF9800;
  --danger: #F44336;
  --bg: #F5F7FA;
  --card-bg: #FFFFFF;
  --text: #2C3E50;
  --text-light: #7F8C8D;
  --border: #E8ECF1;
  --radius: 16px;
  --shadow: 0 4rpx 24rpx rgba(0,0,0,0.06);

  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
  font-size: 28rpx;
  line-height: 1.6;
  min-height: 100vh;
}

/* 通用工具类 */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 30rpx;
  margin: 20rpx;
  box-shadow: var(--shadow);
}

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-center { text-align: center; }
.text-light { color: var(--text-light); }
.font-bold { font-weight: 600; }
.mt-10 { margin-top: 10rpx; }
.mt-20 { margin-top: 20rpx; }
.mt-30 { margin-top: 30rpx; }
.mb-20 { margin-bottom: 20rpx; }
.p-20 { padding: 20rpx; }
.p-30 { padding: 30rpx; }
</style>
