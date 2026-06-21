<template>
  <view class="page-focus">
    <!-- ========== 状态栏 ========== -->
    <view class="status-bar" :class="'status-' + timerState">
      <text class="status-text">{{ statusText }}</text>
    </view>

    <!-- ========== 倒计时圆环 ========== -->
    <view class="timer-section">
      <CircularProgress
        :progress="displayProgress"
        :size="420"
        :strokeWidth="10"
        :color="ringColor"
        bgColor="#E8ECF1"
      >
        <text class="timer-display" :class="{ blinking: timerState === 'running' && remaining <= 60 }">
          {{ formatTime(remaining) }}
        </text>
        <text class="timer-label">{{ currentTag }}</text>
      </CircularProgress>
    </view>

    <!-- ========== 标签选择 ========== -->
    <view class="tag-section" v-if="timerState === 'idle'">
      <text class="section-label">选择专注类型</text>
      <view class="tag-grid">
        <view
          v-for="tag in tags"
          :key="tag.name"
          class="tag-item"
          :class="{ active: selectedTag === tag.name }"
          :style="selectedTag === tag.name ? { background: tag.color, borderColor: tag.color } : { borderColor: tag.color }"
          @click="selectedTag = tag.name"
        >
          <text class="tag-icon">{{ tag.icon }}</text>
          <text class="tag-name" :style="selectedTag === tag.name ? { color: '#FFF' } : { color: tag.color }">
            {{ tag.name }}
          </text>
        </view>
      </view>
    </view>

    <!-- ========== 时长设置 ========== -->
    <view class="duration-section" v-if="timerState === 'idle'">
      <text class="section-label">专注时长</text>
      <view class="duration-options">
        <view
          v-for="d in durations"
          :key="d.value"
          class="duration-item"
          :class="{ active: totalDuration === d.value }"
          @click="totalDuration = d.value; remaining = d.value"
        >
          <text>{{ d.label }}</text>
        </view>
      </view>
    </view>

    <!-- ========== 控制按钮 ========== -->
    <view class="control-section">
      <!-- 未开始: 开始按钮 -->
      <view v-if="timerState === 'idle'" class="btn-start" @click="startFocus">
        <text class="btn-start-icon">▷</text>
        <text class="btn-start-text">开始专注</text>
      </view>

      <!-- 运行中: 暂停 + 放弃 -->
      <view v-if="timerState === 'running'" class="btn-row">
        <view class="btn-secondary" @click="pauseFocus">
          <text>暂停</text>
        </view>
        <view class="btn-danger" @click="abandonFocus">
          <text>放弃</text>
        </view>
      </view>

      <!-- 暂停中: 继续 + 放弃 -->
      <view v-if="timerState === 'paused'" class="btn-row">
        <view class="btn-start" @click="resumeFocus">
          <text class="btn-start-icon">▷</text>
          <text class="btn-start-text">继续</text>
        </view>
        <view class="btn-secondary" @click="abandonFocus">
          <text>放弃</text>
        </view>
      </view>

      <!-- 已完成 -->
      <view v-if="timerState === 'finished'" class="finished-section">
        <view class="celebration-icon">✓</view>
        <text class="celebration-text">专注完成</text>
        <text class="celebration-detail">{{ currentTag }} {{ totalDuration / 60 }} 分钟</text>
        <view class="btn-start mt-30" @click="resetFocus">
          <text class="btn-start-icon">↻</text>
          <text class="btn-start-text">再来一组</text>
        </view>
      </view>
    </view>

    <!-- ========== 今日专注小结 ========== -->
    <view class="today-summary card" v-if="todayMinutes > 0">
      <text class="summary-title">今日专注</text>
      <view class="summary-stats">
        <view class="stat-item">
          <text class="stat-value">{{ todayMinutes }}</text>
          <text class="stat-unit">分钟</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ todaySessions }}</text>
          <text class="stat-unit">次</text>
        </view>
      </view>
    </view>

    <!-- ========== 放弃确认弹窗 ========== -->
    <view v-if="showAbandonDialog" class="dialog-mask" @click="showAbandonDialog = false">
      <view class="dialog-card" @click.stop>
        <text class="dialog-title">确定要放弃吗？</text>
        <text class="dialog-desc">放弃后本次专注记录将不会保存</text>
        <view class="dialog-actions">
          <button class="btn-cancel" @click="showAbandonDialog = false">继续专注</button>
          <button class="btn-danger-dialog" @click="confirmAbandon">确认放弃</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { post, get } from '@/api/request'
import CircularProgress from '@/components/CircularProgress.vue'

const userStore = useUserStore()

// ==================== 状态定义 ====================
const timerState = ref('idle')     // idle | running | paused | finished
const selectedTag = ref('学习')
const totalDuration = ref(25 * 60) // 默认25分钟 (秒)
const remaining = ref(25 * 60)
let timerInterval = null

const showAbandonDialog = ref(false)
const todayMinutes = ref(0)
const todaySessions = ref(0)

// ==================== 配置 ====================
const tags = [
  { name: '学习', icon: '§', color: '#4CAF50' },
  { name: '工作', icon: '☷', color: '#3498DB' },
  { name: '运动', icon: '△', color: '#FF6B6B' },
  { name: '冥想', icon: '○', color: '#9B59B6' }
]

const durations = [
  { label: '15 分钟', value: 15 * 60 },
  { label: '25 分钟', value: 25 * 60 },
  { label: '35 分钟', value: 35 * 60 },
  { label: '45 分钟', value: 45 * 60 }
]

// ==================== 计算属性 ====================
const displayProgress = computed(() => {
  if (timerState.value === 'idle') return 100
  return Math.round((remaining.value / totalDuration.value) * 100)
})

const currentTag = computed(() => selectedTag.value)

const ringColor = computed(() => {
  const tag = tags.find(t => t.name === selectedTag.value)
  if (timerState.value === 'finished') return '#4CAF50'
  if (timerState.value === 'paused') return '#FF9800'
  if (remaining.value <= 60 && timerState.value === 'running') return '#F44336'
  return tag ? tag.color : '#4CAF50'
})

const statusText = computed(() => {
  switch (timerState.value) {
    case 'idle': return '准备开始'
    case 'running': return '专注中...'
    case 'paused': return '已暂停'
    case 'finished': return '已完成'
    default: return ''
  }
})

// ==================== 计时器逻辑 ====================
function startFocus() {
  timerState.value = 'running'
  uni.showToast({ title: '开始专注，加油', icon: 'none', duration: 1500 })
  startCountdown()
}

function pauseFocus() {
  timerState.value = 'paused'
  clearInterval(timerInterval)
}

function resumeFocus() {
  timerState.value = 'running'
  startCountdown()
}

function abandonFocus() {
  showAbandonDialog.value = true
}

function confirmAbandon() {
  showAbandonDialog.value = false
  clearInterval(timerInterval)
  timerState.value = 'idle'
  remaining.value = totalDuration.value
  uni.showToast({ title: '已放弃本次专注', icon: 'none' })
}

function resetFocus() {
  timerState.value = 'idle'
  remaining.value = totalDuration.value
}

function startCountdown() {
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (remaining.value <= 0) {
      clearInterval(timerInterval)
      timerState.value = 'finished'
      uploadFocusRecord()
      // 震动反馈
      uni.vibrateLong({ success: () => {} })
      return
    }
    remaining.value--
  }, 1000)
}

// ==================== API 交互 ====================
async function uploadFocusRecord() {
  try {
    await post('/api/focus/upload', {
      tag: selectedTag.value,
      duration: Math.round(totalDuration.value / 60)
    })
    console.log('✅ 专注记录已上传')
    fetchTodaySummary()
  } catch (e) {
    console.error('上传专注记录失败:', e)
  }
}

async function fetchTodaySummary() {
  try {
    const res = await get('/api/focus/today')
    todayMinutes.value = res.data.total_minutes
    todaySessions.value = res.data.total_sessions
  } catch (e) {
    // ignore
  }
}

// ==================== 工具 ====================
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ==================== 生命周期 ====================
onShow(() => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  fetchTodaySummary()
})

onHide(() => {
  // 页面隐藏时不清除计时器，保持后台运行
})
</script>

<style lang="scss" scoped>
.page-focus {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 40rpx;
}

/* ===== 状态栏 ===== */
.status-bar {
  width: 100%;
  text-align: center;
  padding: 24rpx 0;
  transition: all 0.4s;

  &.status-idle { background: transparent; }
  &.status-running { background: rgba(76,175,80,0.08); }
  &.status-paused { background: rgba(255,152,0,0.08); }
  &.status-finished { background: rgba(76,175,80,0.1); }

  .status-text {
    font-size: 26rpx;
    font-weight: 600;
    letter-spacing: 4rpx;
  }
}

/* ===== 计时器 ===== */
.timer-section {
  margin: 20rpx 0 30rpx;
}

.timer-display {
  font-size: 80rpx;
  font-weight: 800;
  font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
  color: #2C3E50;
  letter-spacing: 6rpx;

  &.blinking {
    animation: blink 0.6s ease-in-out infinite;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.timer-label {
  font-size: 26rpx;
  color: #7F8C8D;
  margin-top: 8rpx;
}

/* ===== 标签 ===== */
.section-label {
  display: block;
  font-size: 24rpx;
  color: #7F8C8D;
  margin-bottom: 16rpx;
  padding: 0 30rpx;
  align-self: flex-start;
}

.tag-section {
  width: 100%;
  padding: 0 30rpx;
  margin-bottom: 24rpx;
}

.tag-grid {
  display: flex;
  gap: 16rpx;
}

.tag-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 10rpx;
  border-radius: 16rpx;
  border: 2rpx solid #4CAF50;
  background: #FFFFFF;
  transition: all 0.3s;

  &.active {
    transform: translateY(-4rpx);
    box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12);
  }

  .tag-icon {
    font-size: 40rpx;
    margin-bottom: 8rpx;
  }

  .tag-name {
    font-size: 24rpx;
    font-weight: 600;
  }
}

/* ===== 时长 ===== */
.duration-section {
  width: 100%;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.duration-options {
  display: flex;
  gap: 16rpx;
}

.duration-item {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  background: #FFFFFF;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #7F8C8D;
  border: 2rpx solid #E8ECF1;
  transition: all 0.3s;

  &.active {
    border-color: #4CAF50;
    color: #4CAF50;
    font-weight: 600;
    background: #E8F5E9;
  }
}

/* ===== 按钮 ===== */
.control-section {
  width: 100%;
  padding: 0 60rpx;
  margin-top: 20rpx;
}

.btn-start {
  width: 100%;
  height: 100rpx;
  background: #FFFFFF;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2C3E50;
  border: 2rpx solid #E8ECF1;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

  &:active {
    background: #F5F7FA;
    transform: scale(0.96);
  }

  .btn-start-icon {
    font-size: 32rpx;
    margin-right: 12rpx;
  }

  .btn-start-text {
    font-size: 34rpx;
    font-weight: 700;
    letter-spacing: 4rpx;
  }
}

.btn-row {
  display: flex;
  gap: 24rpx;
}

.btn-secondary {
  flex: 1;
  height: 88rpx;
  background: #F5F7FA;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #7F8C8D;
  font-weight: 600;

  &:active {
    background: #E8ECF1;
  }
}

.btn-danger {
  flex: 1;
  height: 88rpx;
  background: #FFF5F5;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #F44336;
  font-weight: 600;

  &:active {
    background: #FFEBEE;
  }
}

/* ===== 完成 ===== */
.finished-section {
  display: flex;
  flex-direction: column;
  align-items: center;

  .celebration-icon {
    font-size: 64rpx;
    font-weight: 700;
    color: #4CAF50;
  }

  .celebration-text {
    font-size: 36rpx;
    font-weight: 700;
    color: #2C3E50;
    margin-top: 16rpx;
  }

  .celebration-detail {
    font-size: 26rpx;
    color: #7F8C8D;
    margin-top: 8rpx;
  }
}

/* ===== 今日小结 ===== */
.today-summary {
  width: calc(100% - 60rpx);
  margin-top: 30rpx;

  .summary-title {
    display: block;
    font-size: 24rpx;
    color: #7F8C8D;
    margin-bottom: 20rpx;
  }

  .summary-stats {
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-value {
      font-size: 48rpx;
      font-weight: 800;
      color: #4CAF50;
      line-height: 1;
    }

    .stat-unit {
      font-size: 22rpx;
      color: #95A5A6;
      margin-top: 4rpx;
    }
  }

  .stat-divider {
    width: 2rpx;
    height: 60rpx;
    background: #E8ECF1;
  }
}

/* ===== 放弃确认弹窗 ===== */
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40rpx;
}

.dialog-card {
  width: 100%;
  max-width: 560rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  text-align: center;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12rpx;
}

.dialog-desc {
  font-size: 24rpx;
  color: #95A5A6;
  display: block;
  margin-bottom: 30rpx;
}

.dialog-actions {
  display: flex;
  gap: 16rpx;

  button {
    flex: 1;
    height: 76rpx;
    line-height: 76rpx;
    border-radius: 12rpx;
    font-size: 26rpx;
    border: none;
    padding: 0;
  }

  .btn-cancel {
    background: #F5F7FA;
    color: #7F8C8D;
  }

  .btn-danger-dialog {
    background: #F44336;
    color: #FFFFFF;
  }
}
</style>
