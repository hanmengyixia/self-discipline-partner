<!--
  环形进度条 / 倒计时组件
  Props:
    - progress: 0-100 百分比
    - size: 圆环直径 (rpx)
    - strokeWidth: 线条宽度
    - color: 主色
    - bgColor: 背景环色
  Slot: 中心内容
-->
<template>
  <view class="circular-progress" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <svg :width="size" :height="size" viewBox="0 0 200 200" class="svg-ring">
      <!-- 背景圆环 -->
      <circle
        cx="100" cy="100" :r="radius"
        fill="none"
        :stroke="bgColor"
        :stroke-width="strokeWidth"
      />
      <!-- 进度圆环 -->
      <circle
        cx="100" cy="100" :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        class="progress-ring"
        :style="{ transition: animated ? 'stroke-dashoffset 1s ease' : 'none' }"
      />
    </svg>
    <!-- 中心插槽 -->
    <view class="center-content" :style="{ width: size + 'rpx', height: size + 'rpx' }">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 0 },    // 0-100
  size: { type: Number, default: 300 },
  strokeWidth: { type: Number, default: 8 },
  color: { type: String, default: '#4CAF50' },
  bgColor: { type: String, default: '#E8ECF1' },
  animated: { type: Boolean, default: true }
})

const radius = computed(() => 100 - props.strokeWidth)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  return circumference.value * (1 - props.progress / 100)
})
</script>

<style lang="scss" scoped>
.circular-progress {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-ring {
  transform: rotate(-90deg);  /* 从顶部开始 */
}

.progress-ring {
  filter: drop-shadow(0 0 6px rgba(76, 175, 80, 0.3));
}

.center-content {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
