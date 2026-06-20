<template>
  <view class="page-index">
    <!-- ========== 顶部日期 & 进度 ========== -->
    <view class="header-section">
      <view class="date-row">
        <view class="date-left">
          <text class="date-weekday">{{ weekday }}</text>
          <text class="date-full">{{ dateStr }}</text>
        </view>
        <view class="date-right">
          <text class="greeting">{{ greeting }}</text>
          <text class="username">{{ userStore.user?.username || '搭子' }}</text>
        </view>
      </view>

      <!-- 进度条卡片 -->
      <view class="progress-card">
        <view class="progress-header flex-between">
          <text class="progress-title">今日打卡进度</text>
          <text class="progress-percent">{{ progress.percent }}%</text>
        </view>
        <view class="progress-bar">
          <view
            class="progress-fill"
            :class="{ complete: progress.percent === 100 }"
            :style="{ width: progress.percent + '%' }"
          ></view>
        </view>
        <text class="progress-detail">
          已完成 {{ progress.checked }} / {{ progress.total }} 项习惯
        </text>
      </view>
    </view>

    <!-- ========== 习惯列表 ========== -->
    <view class="list-section">
      <view class="section-title flex-between">
        <text>今日习惯</text>
        <view class="add-btn" @click="showAddDialog = true">
          <text class="add-icon">+</text>
          <text class="add-label">添加</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="habits.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">—</text>
        <text class="empty-text">还没有习惯，点击上方"添加"创建吧~</text>
      </view>

      <!-- 习惯卡片列表 -->
      <HabitCard
        v-for="habit in habits"
        :key="habit.id"
        :habit="habit"
        @update="fetchHabits"
        @toggle="onToggle"
        @delete="onDelete"
      />

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>

    <!-- ========== 添加习惯弹窗 ========== -->
    <view v-if="showAddDialog" class="dialog-mask" @click="showAddDialog = false">
      <view class="dialog-card" @click.stop>
        <text class="dialog-title">新建习惯</text>

        <view class="input-group">
          <text class="input-label">习惯名称</text>
          <input
            class="input-field"
            v-model="newHabit.title"
            placeholder="例如: 早起晨跑"
            placeholder-style="color:#BDC3C7"
            maxlength="20"
          />
        </view>

        <view class="input-group">
          <text class="input-label">选择图标</text>
          <view class="icon-grid">
            <view
              v-for="icon in iconList"
              :key="icon"
              class="icon-item"
              :class="{ selected: newHabit.icon === icon }"
              @click="newHabit.icon = icon"
            >
              <text>{{ icon }}</text>
            </view>
          </view>
        </view>

        <view class="input-group">
          <text class="input-label">主题色</text>
          <view class="color-grid">
            <view
              v-for="c in colorList"
              :key="c"
              class="color-item"
              :class="{ selected: newHabit.color === c }"
              :style="{ background: c }"
              @click="newHabit.color = c"
            ></view>
          </view>
        </view>

        <view class="dialog-actions">
          <button class="btn-cancel" @click="showAddDialog = false">取消</button>
          <button class="btn-confirm" @click="createHabit":disabled="creating">
            {{ creating ? '创建中...' : '确认创建' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { get, post } from '@/api/request'
import HabitCard from '@/components/HabitCard.vue'

const userStore = useUserStore()
const habits = ref([])
const progress = reactive({ total: 0, checked: 0, percent: 0 })
const loading = ref(false)
const showAddDialog = ref(false)
const creating = ref(false)

// 新习惯表单
const newHabit = reactive({ title: '', icon: '📌', color: '#4CAF50' })

const iconList = ['🏃', '📖', '📝', '🧘', '💪', '✍️', '💧', '🥗', '🎯', '💻', '🎨', '🎵', '🌱', '☀️', '💤', '📚']
const colorList = ['#4CAF50', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF9800', '#9B59B6', '#3498DB', '#E91E63']

// 日期相关
const dateStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const weekday = computed(() => weekdays[new Date().getDay()])
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

onShow(() => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  fetchHabits()
})

async function fetchHabits() {
  loading.value = true
  try {
    const res = await get('/api/habit/list')
    habits.value = res.data.habits
    Object.assign(progress, res.data.progress)
  } catch (e) {
    console.error('加载习惯失败:', e)
  } finally {
    loading.value = false
  }
}

function onToggle({ habitId, checked }) {
  fetchHabits()
}

function onDelete(habitId) {
  // 从本地列表移除已删除的习惯
  habits.value = habits.value.filter(h => h.id !== habitId)
  // 重新计算进度
  fetchHabits()
}

async function createHabit() {
  if (!newHabit.title.trim()) {
    return uni.showToast({ title: '请输入习惯名称', icon: 'none' })
  }

  creating.value = true
  try {
    await post('/api/habit/create', {
      title: newHabit.title.trim(),
      icon: newHabit.icon,
      color: newHabit.color
    })
    uni.showToast({ title: '习惯已创建', icon: 'success' })
    showAddDialog.value = false
    newHabit.title = ''
    newHabit.icon = '📌'
    newHabit.color = '#4CAF50'
    fetchHabits()
  } catch (e) {
    // request.js 自动 toast
  } finally {
    creating.value = false
  }
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ===== 头部 ===== */
.header-section {
  background: linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%);
  padding: 40rpx 30rpx 50rpx;
  border-radius: 0 0 40rpx 40rpx;
}

.date-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30rpx;
}

.date-left {
  .date-weekday {
    display: block;
    font-size: 48rpx;
    font-weight: 700;
    color: #FFFFFF;
  }
  .date-full {
    display: block;
    font-size: 24rpx;
    color: rgba(255,255,255,0.8);
    margin-top: 4rpx;
  }
}

.date-right {
  text-align: right;
  .greeting {
    display: block;
    font-size: 26rpx;
    color: rgba(255,255,255,0.85);
  }
  .username {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #FFFFFF;
    margin-top: 4rpx;
  }
}

/* 进度卡片 */
.progress-card {
  background: rgba(255,255,255,0.95);
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
}

.progress-header {
  margin-bottom: 16rpx;
}

.progress-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C3E50;
}

.progress-percent {
  font-size: 40rpx;
  font-weight: 800;
  color: #4CAF50;
}

.progress-bar {
  height: 14rpx;
  background: #E8ECF1;
  border-radius: 7rpx;
  overflow: hidden;
  margin-bottom: 12rpx;

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #66BB6A, #4CAF50);
    border-radius: 7rpx;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);

    &.complete {
      background: linear-gradient(90deg, #FFD54F, #FF9800);
    }
  }
}

.progress-detail {
  font-size: 22rpx;
  color: #95A5A6;
}

/* ===== 列表 ===== */
.list-section {
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
  padding: 0 4rpx;
}

.add-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: #4CAF5018;
  border-radius: 20rpx;

  .add-icon {
    font-size: 28rpx;
    color: #4CAF50;
    font-weight: 700;
    margin-right: 4rpx;
  }
  .add-label {
    font-size: 24rpx;
    color: #4CAF50;
    font-weight: 500;
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;

  .empty-icon {
    font-size: 48rpx;
    color: #BDC3C7;
    margin-bottom: 20rpx;
  }
  .empty-text {
    font-size: 26rpx;
    color: #95A5A6;
  }
}

.loading-state {
  text-align: center;
  padding: 40rpx;
  color: #95A5A6;
}

/* ===== 弹窗 ===== */
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
  max-width: 600rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
}

.dialog-title {
  font-size: 34rpx;
  font-weight: 700;
  text-align: center;
  display: block;
  margin-bottom: 30rpx;
}

.input-group {
  margin-bottom: 24rpx;

  .input-label {
    display: block;
    font-size: 24rpx;
    color: #7F8C8D;
    margin-bottom: 12rpx;
  }

  .input-field {
    width: 100%;
    height: 80rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  .icon-item {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F5F7FA;
    border-radius: 14rpx;
    font-size: 34rpx;
    border: 2rpx solid transparent;

    &.selected {
      border-color: #4CAF50;
      background: #E8F5E9;
      transform: scale(1.1);
    }
  }
}

.color-grid {
  display: flex;
  gap: 14rpx;

  .color-item {
    width: 50rpx;
    height: 50rpx;
    border-radius: 50%;
    border: 3rpx solid transparent;

    &.selected {
      border-color: #2C3E50;
      transform: scale(1.2);
      box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2);
    }
  }
}

.dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;

  button {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
    border: none;
    padding: 0;
  }

  .btn-cancel {
    background: #F5F7FA;
    color: #7F8C8D;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    color: #FFFFFF;
    font-weight: 600;
  }
}
</style>
