<template>
  <view class="page-profile">
    <!-- ================================================================ -->
    <!--  个人信息头部                                                      -->
    <!-- ================================================================ -->
    <view class="profile-header">
      <view class="avatar-section">
        <image
          v-if="userStore.user?.avatar_url"
          class="avatar-img"
          :src="userStore.user?.avatar_url"
          mode="aspectFill"
        />
        <view v-else class="avatar-placeholder">
          <text>{{ (userStore.user?.username || '?').charAt(0) }}</text>
        </view>
        <view class="avatar-ring"></view>
      </view>
      <text class="profile-name">{{ userStore.user?.username || '未登录' }}</text>
      <text class="profile-id">ID: {{ userStore.user?.id || '--' }}</text>

      <!-- 连续打卡徽章 -->
      <view class="streak-badge" v-if="summary.streak > 0">
        <text class="streak-flame">◆</text>
        <text class="streak-num">{{ summary.streak }}</text>
        <text class="streak-label">天连续打卡</text>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  本周专注统计卡片                                                  -->
    <!-- ================================================================ -->
    <view class="section-card">
      <view class="section-header flex-between">
        <text class="section-title">本周专注</text>
        <text class="section-date">{{ summary.week_start }} ~ {{ summary.week_end }}</text>
      </view>

      <!-- 总时长大数字 -->
      <view class="total-focus">
        <text class="total-num">{{ summary.total_minutes }}</text>
        <text class="total-unit">分钟</text>
        <text class="total-hours">≈ {{ formatHours(summary.total_minutes) }}</text>
      </view>

      <!-- 标签占比柱状图 -->
      <view class="tag-bars" v-if="summary.tags.length > 0">
        <view v-for="tag in summary.tags" :key="tag.tag" class="tag-bar-row">
          <view class="tag-bar-header flex-between">
            <view class="tag-bar-label">
              <text class="tag-dot" :style="{ background: getTagColor(tag.tag) }"></text>
              <text class="tag-name">{{ tag.tag }}</text>
            </view>
            <text class="tag-bar-value">{{ tag.minutes }}min ({{ tag.percent }}%)</text>
          </view>
          <view class="bar-track">
            <view
              class="bar-fill"
              :style="{
                width: tag.percent + '%',
                background: getTagColor(tag.tag)
              }"
            ></view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="summary.tags.length === 0" class="empty-focus">
        <text class="empty-icon">—</text>
        <text class="empty-text">本周还没有专注记录</text>
        <text class="empty-hint">去自律钟页面开始专注吧</text>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  最近7天打卡日历                                                  -->
    <!-- ================================================================ -->
    <view class="section-card">
      <text class="section-title mb-20">最近7天打卡</text>

      <view class="week-grid">
        <view
          v-for="day in weekDays"
          :key="day.date"
          class="day-cell"
          :class="{
            'day-checked': day.checked,
            'day-today': day.isToday
          }"
        >
          <text class="day-name">{{ day.label }}</text>
          <view class="day-dot" :class="{ 'dot-active': day.checked }">
            <text v-if="day.checked" class="dot-icon">✓</text>
          </view>
          <text class="day-date">{{ day.dayNum }}</text>
        </view>
      </view>

      <!-- 打卡连击总结 -->
      <view class="streak-summary">
        <text class="streak-msg">
          <text v-if="summary.streak >= 7">本周全勤，太厉害了</text>
          <text v-else-if="summary.streak >= 3">连续 {{ summary.streak }} 天打卡，继续保持</text>
          <text v-else-if="summary.streak >= 1">刚刚开始，加油</text>
          <text v-else>今天开始打卡吧</text>
        </text>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  习惯概览                                                        -->
    <!-- ================================================================ -->
    <view class="section-card" v-if="habits.length > 0">
      <text class="section-title mb-20">习惯概览</text>

      <view class="habit-summary-grid">
        <view v-for="habit in habits" :key="habit.id" class="habit-mini-card">
          <view class="mini-icon" :style="{ background: habit.color + '18' }">
            <text>{{ habit.icon }}</text>
          </view>
          <text class="mini-title">{{ habit.title }}</text>
          <text class="mini-status" :style="{ color: habit.is_checked_today ? '#4CAF50' : '#95A5A6' }">
            {{ habit.is_checked_today ? '✓' : '○' }}
          </text>
        </view>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  退出登录                                                        -->
    <!-- ================================================================ -->
    <view class="logout-section">
      <view class="btn-logout" @click="handleLogout">
        <text>退出登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { get } from '@/api/request'

const userStore = useUserStore()

// ==================== 数据 ====================
const summary = reactive({
  total_minutes: 0,
  tags: [],
  streak: 0,
  week_start: '',
  week_end: ''
})

const habits = ref([])
const weekDays = ref([])

// ==================== 7天日历数据 ====================
function buildWeekDays() {
  const days = []
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = i === 0
    days.push({
      date: dateStr,
      label: weekLabels[d.getDay()],
      dayNum: d.getDate(),
      isToday,
      checked: false  // 将在 fetchData 中更新
    })
  }
  return days
}

// ==================== 数据获取 ====================
async function fetchData() {
  try {
    // 并行获取 周汇总 + 习惯列表
    const [summaryRes, habitRes] = await Promise.all([
      get('/api/focus/summary'),
      get('/api/habit/list')
    ])

    // 填充汇总数据
    summary.total_minutes = summaryRes.data.total_minutes
    summary.tags = summaryRes.data.tags
    summary.streak = summaryRes.data.streak
    summary.week_start = summaryRes.data.week_range.start
    summary.week_end = summaryRes.data.week_range.end

    // 填充习惯
    habits.value = habitRes.data.habits

    // 构建7天打卡状态
    const days = buildWeekDays()
    const checkedDates = new Set(
      habitRes.data.habits
        .filter(h => h.is_checked_today)
        // 对于历史日期，用 focus summary 的 streak 反推
    )

    // 通过后端获取最近打卡日期列表
    // 简化: 用 streak 计算连续的几天
    for (let i = 0; i < summary.streak; i++) {
      const idx = 6 - i
      if (idx >= 0) days[idx].checked = true
    }

    weekDays.value = days
  } catch (e) {
    console.error('获取统计数据失败:', e)
  }
}

// ==================== 工具方法 ====================
function getTagColor(tag) {
  const map = {
    '学习': '#4CAF50',
    '工作': '#3498DB',
    '运动': '#FF6B6B',
    '冥想': '#9B59B6'
  }
  return map[tag] || '#4CAF50'
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return h + '小时' + (m > 0 ? m + '分' : '')
  return m + '分钟'
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    }
  })
}

// ==================== 生命周期 ====================
onShow(() => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  fetchData()
})
</script>

<style lang="scss" scoped>
.page-profile {
  min-height: 100vh;
  padding-bottom: 60rpx;
}

/* ================================================================ */
/*  个人信息头部                                                      */
/* ================================================================ */
.profile-header {
  background: linear-gradient(135deg, #2C3E50 0%, #34495E 40%, #2C3E50 100%);
  padding: 60rpx 30rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 0 0 40rpx 40rpx;
  position: relative;
  overflow: hidden;

  /* 背景装饰圆 */
  &::before {
    content: '';
    position: absolute;
    top: -100rpx;
    right: -60rpx;
    width: 280rpx;
    height: 280rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.03);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: -40rpx;
    left: -40rpx;
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.03);
  }
}

.avatar-section {
  position: relative;
  margin-bottom: 20rpx;
  z-index: 1;

  .avatar-img, .avatar-placeholder {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255,255,255,0.4);
  }

  .avatar-img {
    background: #34495E;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    font-size: 60rpx;
    color: #FFFFFF;
    font-weight: 700;
  }

  .avatar-ring {
    position: absolute;
    top: -8rpx;
    left: -8rpx;
    right: -8rpx;
    bottom: -8rpx;
    border-radius: 50%;
    border: 3rpx dashed rgba(255,255,255,0.2);
    animation: spin 20s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.profile-name {
  font-size: 38rpx;
  font-weight: 700;
  color: #FFFFFF;
  z-index: 1;
  letter-spacing: 2rpx;
}

.profile-id {
  font-size: 22rpx;
  color: rgba(255,255,255,0.5);
  margin-top: 4rpx;
  z-index: 1;
}

.streak-badge {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 12rpx 28rpx;
  background: rgba(255,255,255,0.12);
  border-radius: 30rpx;
  z-index: 1;
  backdrop-filter: blur(10rpx);

  .streak-flame {
    font-size: 28rpx;
    color: #FFD54F;
  }

  .streak-num {
    font-size: 40rpx;
    font-weight: 800;
    color: #FFD54F;
    margin: 0 6rpx 0 8rpx;
    line-height: 1;
  }

  .streak-label {
    font-size: 22rpx;
    color: rgba(255,255,255,0.8);
  }
}

/* ================================================================ */
/*  通用卡片                                                         */
/* ================================================================ */
.section-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  margin: 24rpx 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2C3E50;
  display: block;
}

.section-date {
  font-size: 22rpx;
  color: #95A5A6;
}

/* ================================================================ */
/*  总时长                                                           */
/* ================================================================ */
.total-focus {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding: 20rpx 0 30rpx;
  gap: 8rpx;

  .total-num {
    font-size: 80rpx;
    font-weight: 800;
    color: #4CAF50;
    line-height: 1;
    font-family: 'SF Mono', 'Menlo', monospace;
  }

  .total-unit {
    font-size: 30rpx;
    color: #7F8C8D;
    font-weight: 500;
  }

  .total-hours {
    font-size: 22rpx;
    color: #BDC3C7;
    margin-left: 12rpx;
  }
}

/* ================================================================ */
/*  标签柱状图                                                       */
/* ================================================================ */
.tag-bars {
  .tag-bar-row {
    margin-bottom: 22rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.tag-bar-header {
  margin-bottom: 10rpx;
}

.tag-bar-label {
  display: flex;
  align-items: center;

  .tag-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 4rpx;
    margin-right: 10rpx;
  }

  .tag-name {
    font-size: 26rpx;
    font-weight: 500;
    color: #2C3E50;
  }
}

.tag-bar-value {
  font-size: 24rpx;
  color: #7F8C8D;
}

.bar-track {
  height: 14rpx;
  background: #F0F2F5;
  border-radius: 7rpx;
  overflow: hidden;

  .bar-fill {
    height: 100%;
    border-radius: 7rpx;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 14rpx;
  }
}

/* ================================================================ */
/*  7天打卡日历                                                      */
/* ================================================================ */
.week-grid {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
}

.day-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 4rpx;
  border-radius: 14rpx;
  transition: all 0.3s;

  &.day-today {
    background: #F0F9F0;
  }

  &.day-checked {
    background: #E8F5E9;
  }

  .day-name {
    font-size: 20rpx;
    color: #95A5A6;
    margin-bottom: 10rpx;
  }

  .day-dot {
    width: 52rpx;
    height: 52rpx;
    border-radius: 50%;
    background: #F0F2F5;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8rpx;
    transition: all 0.3s;

    &.dot-active {
      background: linear-gradient(135deg, #66BB6A, #4CAF50);
      box-shadow: 0 4rpx 12rpx rgba(76,175,80,0.3);

      .dot-icon {
        font-size: 26rpx;
        color: #FFFFFF;
        font-weight: 700;
      }
    }
  }

  .day-date {
    font-size: 22rpx;
    color: #7F8C8D;
    font-weight: 500;

    .day-today & {
      color: #4CAF50;
      font-weight: 700;
    }
  }
}

.streak-summary {
  text-align: center;
  margin-top: 24rpx;
  padding: 20rpx;
  background: linear-gradient(135deg, #FFF8E1, #FFFDE7);
  border-radius: 14rpx;

  .streak-msg {
    font-size: 28rpx;
    font-weight: 600;
    color: #F57C00;
  }
}

/* ================================================================ */
/*  习惯概览                                                         */
/* ================================================================ */
.habit-summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.habit-mini-card {
  display: flex;
  align-items: center;
  padding: 14rpx 20rpx;
  background: #F8FAFB;
  border-radius: 12rpx;
  border: 1rpx solid #EEF0F2;
  gap: 10rpx;

  .mini-icon {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
  }

  .mini-title {
    font-size: 24rpx;
    color: #2C3E50;
    font-weight: 500;
    max-width: 160rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mini-status {
    font-size: 28rpx;
  }
}

/* ================================================================ */
/*  空状态                                                           */
/* ================================================================ */
.empty-focus {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 20rpx;

  .empty-icon {
    font-size: 60rpx;
    margin-bottom: 12rpx;
  }

  .empty-text {
    font-size: 26rpx;
    color: #95A5A6;
    margin-bottom: 6rpx;
  }

  .empty-hint {
    font-size: 22rpx;
    color: #BDC3C7;
  }
}

/* ================================================================ */
/*  退出登录                                                         */
/* ================================================================ */
.logout-section {
  padding: 40rpx 60rpx 20rpx;
}

.btn-logout {
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF5F5;
  border: 1rpx solid #FFCDD2;
  font-size: 30rpx;
  color: #F44336;
  font-weight: 500;

  &:active {
    background: #FFEBEE;
  }
}
</style>
