<!--
  习惯卡片组件
  Props:
    - habit: { id, title, icon, color, is_checked_today }
  Events:
    - @toggle: 点击打卡/取消
    - @delete: 删除习惯
-->
<template>
  <view
    class="habit-card"
    :class="{ checked: habit.is_checked_today, animating: isAnimating }"
    :style="{ borderLeftColor: habit.color }"
  >
    <!-- 左侧图标 + 打卡区 (点击打卡) -->
    <view class="habit-tap-area" @click="handleToggle">
      <view class="habit-icon" :style="{ background: habit.color + '18' }">
        <text class="icon-emoji">{{ habit.icon || '📌' }}</text>
      </view>

      <view class="habit-body">
        <text class="habit-title" :class="{ 'title-checked': habit.is_checked_today }">
          {{ habit.title }}
        </text>
        <text class="habit-status">
          {{ habit.is_checked_today ? '已完成' : '待完成' }}
        </text>
      </view>

      <view
        class="check-btn"
        :class="{ 'btn-checked': habit.is_checked_today }"
        :style="habit.is_checked_today ? { background: habit.color } : { borderColor: habit.color, color: habit.color }"
      >
        <text v-if="!habit.is_checked_today" class="btn-text">打卡</text>
        <text v-else class="btn-text-check">✓</text>
      </view>
    </view>

    <!-- 删除按钮 -->
    <view class="delete-btn" @click.stop="confirmDelete">
      <text class="delete-icon">×</text>
    </view>

    <!-- 打卡成功涟漪 -->
    <view v-if="showRipple" class="ripple" :style="{ borderColor: habit.color }"></view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { post } from '@/api/request'

const props = defineProps({
  habit: { type: Object, required: true }
})

const emit = defineEmits(['update', 'toggle', 'delete'])

const isAnimating = ref(false)
const showRipple = ref(false)

async function handleToggle() {
  if (isAnimating.value) return
  isAnimating.value = true

  try {
    const res = await post('/api/habit/checkin', { habit_id: props.habit.id })

    // 触发涟漪动画
    if (res.data.checked) {
      showRipple.value = true
      setTimeout(() => { showRipple.value = false }, 600)
    }

    emit('toggle', { habitId: props.habit.id, checked: res.data.checked })
    emit('update')
  } catch (e) {
    console.error('打卡失败:', e)
  } finally {
    isAnimating.value = false
  }
}

function confirmDelete() {
  uni.showModal({
    title: '删除习惯',
    content: `确定要删除「${props.habit.title}」吗？`,
    confirmText: '删除',
    confirmColor: '#F44336',
    success: (res) => {
      if (res.confirm) {
        doDelete()
      }
    }
  })
}

async function doDelete() {
  try {
    await post('/api/habit/delete', { habit_id: props.habit.id })
    uni.showToast({ title: '已删除', icon: 'none', duration: 1500 })
    emit('delete', props.habit.id)
    emit('update')
  } catch (e) {
    console.error('删除失败:', e)
  }
}
</script>

<style lang="scss" scoped>
.habit-card {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  border-left: 8rpx solid #4CAF50;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);
  transition: all 0.3s ease;
  overflow: hidden;

  &.animating {
    transform: scale(0.97);
  }

  &.checked {
    opacity: 0.85;
    border-left-color: #BDC3C7 !important;
    background: #FAFBFC;
  }
}

.habit-tap-area {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 24rpx 0 24rpx 28rpx;
  min-width: 0;

  &:active {
    transform: scale(0.97);
  }
}

.habit-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;

  .icon-emoji {
    font-size: 40rpx;
  }
}

.habit-body {
  flex: 1;
  min-width: 0;

  .habit-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #2C3E50;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.title-checked {
      text-decoration: line-through;
      color: #95A5A6;
    }
  }

  .habit-status {
    font-size: 22rpx;
    color: #95A5A6;
    margin-top: 4rpx;
  }
}

.check-btn {
  width: 100rpx;
  height: 60rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;

  &:not(.btn-checked) {
    border: 2rpx solid #4CAF50;
    background: transparent;

    .btn-text {
      font-size: 24rpx;
      font-weight: 600;
    }
  }

  &.btn-checked {
    border: none;
    .btn-text-check {
      font-size: 32rpx;
      color: #FFFFFF;
      font-weight: 700;
    }
  }
}

/* 涟漪动画 */
.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  border: 2rpx solid #4CAF50;
  transform: translate(-50%, -50%);
  animation: rippleOut 0.6s ease-out forwards;
  pointer-events: none;
}

@keyframes rippleOut {
  0% {
    width: 20rpx;
    height: 20rpx;
    opacity: 1;
  }
  100% {
    width: 600rpx;
    height: 600rpx;
    opacity: 0;
  }
}

/* 删除按钮 */
.delete-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  flex-shrink: 0;
  border-radius: 50%;

  &:active {
    background: #FFF5F5;
  }

  .delete-icon {
    font-size: 40rpx;
    color: #BDC3C7;
    font-weight: 300;
    line-height: 1;
  }

  &:active .delete-icon {
    color: #F44336;
  }
}
</style>
