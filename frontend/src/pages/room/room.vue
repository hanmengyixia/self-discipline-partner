<template>
  <view class="page-room">
    <!-- ================================================================ -->
    <!--  状态 A: 未加入房间                                                -->
    <!-- ================================================================ -->
    <view v-if="!myRoom && !loading" class="no-room">
      <view class="hero-section">
        <text class="hero-icon">◎</text>
        <text class="hero-title">搭子自习室</text>
        <text class="hero-desc">和好友一起自律，互相监督</text>
      </view>

      <view class="action-cards">
        <!-- 创建房间 -->
        <view class="action-card" @click="showCreateDialog = true">
          <text class="action-icon">+</text>
          <text class="action-title">创建房间</text>
          <text class="action-desc">创建一个自习室，生成邀请码</text>
        </view>

        <!-- 加入房间 -->
        <view class="action-card" @click="showJoinDialog = true">
          <text class="action-icon">→</text>
          <text class="action-title">加入房间</text>
          <text class="action-desc">输入邀请码，加入好友自习室</text>
        </view>
      </view>

      <!-- 测试邀请码提示 -->
      <view class="test-hint card">
        <text class="hint-title">测试邀请码</text>
        <view class="hint-codes">
          <view class="hint-code" @click="quickJoin('A1B2')">
            <text class="code-text">A1B2</text>
            <text class="code-name">早起自律小队</text>
          </view>
          <view class="hint-code" @click="quickJoin('C3D4')">
            <text class="code-text">C3D4</text>
            <text class="code-name">考研冲刺营</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  状态 B: 已加入房间                                                -->
    <!-- ================================================================ -->
    <view v-if="myRoom" class="in-room">
      <!-- 房间头部 -->
      <view class="room-header">
        <view class="room-info">
          <text class="room-name">{{ myRoom.room_name }}</text>
          <text class="room-code">邀请码: {{ myRoom.code }}</text>
        </view>
        <view class="room-actions">
          <view class="btn-refresh" @click="fetchMembers">
            <text class="refresh-icon">↻</text>
          </view>
          <view class="btn-dissolve" @click="dissolveRoom">
            <text>解散</text>
          </view>
          <view class="btn-leave" @click="leaveRoom">
            <text>退出</text>
          </view>
        </view>
      </view>

      <!-- 在线人数 -->
      <view class="stats-row">
        <text class="stat-text">
          共 {{ members.length }} 人在线 ·
          <text class="stat-focus">{{ focusingCount }} 人专注中</text>
        </text>
      </view>

      <!-- ===== 成员卡片列表 ===== -->
      <view class="members-grid">
        <view
          v-for="member in members"
          :key="member.user_id"
          class="member-card"
          :class="{
            'card-focusing': member.current_status === 'focusing',
            'card-self': member.user_id === userStore.user?.id
          }"
        >
          <!-- 状态发光环 -->
          <view
            v-if="member.current_status === 'focusing'"
            class="glow-ring"
          ></view>

          <!-- 头像 -->
          <view class="member-avatar" :class="{ 'avatar-focusing': member.current_status === 'focusing' }">
            <image
              v-if="member.avatar_url"
              class="avatar-img"
              :src="member.avatar_url"
              mode="aspectFill"
            />
            <text v-else class="avatar-placeholder">{{ member.username.charAt(0) }}</text>
          </view>

          <!-- 昵称 -->
          <text class="member-name">
            {{ member.username }}
            <text v-if="member.user_id === userStore.user?.id" class="badge-self">我</text>
          </text>

          <!-- 状态 -->
          <view class="member-status">
            <view
              class="status-dot"
              :class="member.current_status === 'focusing' ? 'dot-focus' : 'dot-idle'"
            ></view>
            <text class="status-text" :class="{ 'text-focus': member.current_status === 'focusing' }">
              {{ member.current_status === 'focusing' ? member.current_task || '专注中' : '正在休息' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 空成员 -->
      <view v-if="members.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">—</text>
        <text class="empty-text">房间空空如也~</text>
      </view>

      <!-- ===== 我的状态卡片 ===== -->
      <view class="self-status-card">
        <text class="self-status-title">我的状态</text>

        <!-- 快速切换按钮 -->
        <view class="status-toggle">
          <view
            class="toggle-option"
            :class="{ active: myStatus === 'idle' }"
            @click="quickSetStatus('idle')"
          >
            <text class="toggle-icon">○</text>
            <text class="toggle-label">休息中</text>
          </view>
          <view
            class="toggle-option"
            :class="{ active: myStatus === 'focusing' }"
            @click="showStatusDialog = true"
          >
            <text class="toggle-icon">●</text>
            <text class="toggle-label">专注中</text>
          </view>
        </view>

        <!-- 专注任务编辑 -->
        <view v-if="myStatus === 'focusing'" class="task-row">
          <input
            class="task-input"
            v-model="myTask"
            placeholder="我正在做什么？(如: 背单词)"
            placeholder-style="color:#BDC3C7"
            @blur="updateMyStatus"
          />
        </view>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  弹窗: 创建房间                                                    -->
    <!-- ================================================================ -->
    <view v-if="showCreateDialog" class="dialog-mask" @click="showCreateDialog = false">
      <view class="dialog-card" @click.stop>
        <text class="dialog-title">创建自习室</text>
        <view class="input-group">
          <text class="input-label">房间名称</text>
          <input
            class="input-field"
            v-model="createRoomName"
            placeholder="例如: 早起自律小队"
            placeholder-style="color:#BDC3C7"
            maxlength="20"
          />
        </view>
        <view class="dialog-actions">
          <button class="btn-cancel" @click="showCreateDialog = false">取消</button>
          <button class="btn-confirm" @click="createRoom" :disabled="creating">
            {{ creating ? '创建中...' : '确认创建' }}
          </button>
        </view>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  弹窗: 加入房间                                                    -->
    <!-- ================================================================ -->
    <view v-if="showJoinDialog" class="dialog-mask" @click="showJoinDialog = false">
      <view class="dialog-card" @click.stop>
        <text class="dialog-title">加入自习室</text>
        <view class="input-group">
          <text class="input-label">邀请码</text>
          <input
            class="input-field code-input"
            v-model="joinCode"
            placeholder="输入4位邀请码"
            placeholder-style="color:#BDC3C7;text-align:center;letter-spacing:16rpx;"
            maxlength="4"
          />
        </view>
        <view class="dialog-actions">
          <button class="btn-cancel" @click="showJoinDialog = false">取消</button>
          <button class="btn-confirm" @click="joinRoom" :disabled="joining">
            {{ joining ? '加入中...' : '确认加入' }}
          </button>
        </view>
      </view>
    </view>

    <!-- ================================================================ -->
    <!--  弹窗: 设置专注任务                                                 -->
    <!-- ================================================================ -->
    <view v-if="showStatusDialog" class="dialog-mask" @click="showStatusDialog = false">
      <view class="dialog-card" @click.stop>
        <text class="dialog-title">设置专注任务</text>
        <view class="input-group">
          <text class="input-label">正在做什么？</text>
          <input
            class="input-field"
            v-model="myTask"
            placeholder="让搭子们看到你的目标"
            placeholder-style="color:#BDC3C7"
            maxlength="30"
          />
        </view>
        <view class="task-presets">
          <text class="preset-label">快速选择</text>
          <view class="preset-grid">
            <text
              v-for="preset in taskPresets"
              :key="preset"
              class="preset-tag"
              @click="myTask = preset"
            >{{ preset }}</text>
          </view>
        </view>
        <view class="dialog-actions">
          <button class="btn-cancel" @click="showStatusDialog = false; myStatus = 'idle'; updateMyStatus()">取消</button>
          <button class="btn-confirm" @click="confirmFocusing">开始专注</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { get, post } from '@/api/request'

const userStore = useUserStore()

// ==================== 数据状态 ====================
const loading = ref(false)
const myRoom = ref(null)           // { id, room_name, code }
const members = ref([])            // [{ user_id, username, avatar_url, current_status, current_task }]
const myStatus = ref('idle')       // 我的当前状态
const myTask = ref('')
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const showStatusDialog = ref(false)
const createRoomName = ref('')
const joinCode = ref('')
const creating = ref(false)
const joining = ref(false)
const lastUserId = ref(null)       // 追踪上次活跃用户，检测账号切换

// 预设任务标签
const taskPresets = ['背单词', '刷算法题', '看书', '写论文', '健身', '冥想', '学习新技能', '准备面试']

// ==================== 计算属性 ====================
const focusingCount = computed(() => members.value.filter(m => m.current_status === 'focusing').length)

// ==================== 账号切换检测 ====================
// uni-app H5 的 tab 页状态会在 reLaunch 后残留
// 当检测到登录用户变化时，必须清空房间状态
watch(() => userStore.user?.id, (newUserId) => {
  if (newUserId && lastUserId.value && lastUserId.value !== newUserId && myRoom.value) {
    console.log('🔄 检测到账号切换，重置房间状态')
    myRoom.value = null
    members.value = []
  }
  if (newUserId) {
    lastUserId.value = newUserId
  }
})

// ==================== API 请求 ====================
async function fetchMembers() {
  if (!myRoom.value || !myRoom.value.id) return
  loading.value = true
  try {
    const res = await get('/api/room/members', { room_id: myRoom.value.id }, { silent: true })
    members.value = res.data.members
    myRoom.value = res.data.room
    // 同步自己的状态
    const self = members.value.find(m => m.user_id === userStore.user?.id)
    if (self) {
      myStatus.value = self.current_status
      myTask.value = self.current_task
    }
  } catch (e) {
    // 403 = 不在房间中（可能已被解散），重置状态
    if (e.code === 403) {
      myRoom.value = null
      members.value = []
    }
    console.error('获取成员失败:', e)
  } finally {
    loading.value = false
  }
}

async function createRoom() {
  if (!createRoomName.value.trim()) {
    return uni.showToast({ title: '请输入房间名称', icon: 'none' })
  }
  creating.value = true
  try {
    const res = await post('/api/room/create', { room_name: createRoomName.value.trim() })
    uni.showToast({ title: '房间创建成功', icon: 'success' })
    showCreateDialog.value = false
    createRoomName.value = ''
    myRoom.value = res.data
    myStatus.value = 'idle'
    myTask.value = ''
    fetchMembers()
  } catch (e) {
    // auto toast
  } finally {
    creating.value = false
  }
}

async function joinRoom() {
  if (!joinCode.value.trim()) {
    return uni.showToast({ title: '请输入邀请码', icon: 'none' })
  }
  joining.value = true
  try {
    const res = await post('/api/room/join', { code: joinCode.value.trim() })
    uni.showToast({ title: '加入成功', icon: 'success' })
    showJoinDialog.value = false
    joinCode.value = ''
    myRoom.value = res.data
    myStatus.value = 'idle'
    myTask.value = ''
    fetchMembers()
  } catch (e) {
    // auto toast
  } finally {
    joining.value = false
  }
}

async function quickJoin(code) {
  joinCode.value = code
  await joinRoom()
}

async function updateMyStatus() {
  if (!myRoom.value || !myRoom.value.id) return
  try {
    await post('/api/room/status', {
      room_id: myRoom.value.id,
      current_status: myStatus.value,
      current_task: myTask.value
    }, { silent: true })
    fetchMembers()
  } catch (e) {
    console.error('状态更新失败:', e)
  }
}

async function quickSetStatus(status) {
  myStatus.value = status
  if (status === 'idle') {
    myTask.value = ''
  }
  await updateMyStatus()
}

async function confirmFocusing() {
  if (!myTask.value.trim()) {
    return uni.showToast({ title: '请输入你的专注任务', icon: 'none' })
  }
  myStatus.value = 'focusing'
  showStatusDialog.value = false
  await updateMyStatus()
}

async function leaveRoom() {
  if (!myRoom.value || !myRoom.value.id) return
  uni.showModal({
    title: '退出房间',
    content: '确定要退出当前自习室吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await post('/api/room/leave', { room_id: myRoom.value.id }, { silent: true })
          myRoom.value = null
          members.value = []
          uni.showToast({ title: '已退出房间', icon: 'success' })
        } catch (e) {
          console.error('退出房间失败:', e)
        }
      }
    }
  })
}

async function dissolveRoom() {
  if (!myRoom.value || !myRoom.value.id) return
  uni.showModal({
    title: '解散自习室',
    content: '解散后所有成员将被移出，此操作不可撤销。确定解散吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await post('/api/room/dissolve', { room_id: myRoom.value.id }, { silent: true })
          myRoom.value = null
          members.value = []
          uni.showToast({ title: '自习室已解散', icon: 'success' })
        } catch (e) {
          console.error('解散房间失败:', e)
        }
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
  // 如果有房间就刷新成员列表
  if (myRoom.value) {
    fetchMembers()
  }
})
</script>

<style lang="scss" scoped>
.page-room {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ================================================================ */
/*  未加入房间                                                       */
/* ================================================================ */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;

  .hero-icon {
    font-size: 100rpx;
    margin-bottom: 16rpx;
  }

  .hero-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #2C3E50;
    letter-spacing: 4rpx;
  }

  .hero-desc {
    font-size: 26rpx;
    color: #95A5A6;
    margin-top: 10rpx;
  }
}

.action-cards {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx;
}

.action-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 36rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
  transition: all 0.3s;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
  }

  .action-icon {
    font-size: 56rpx;
    margin-bottom: 14rpx;
  }

  .action-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #2C3E50;
    margin-bottom: 8rpx;
  }

  .action-desc {
    font-size: 22rpx;
    color: #95A5A6;
    text-align: center;
    line-height: 1.5;
  }
}

.test-hint {
  margin: 30rpx;
  text-align: center;

  .hint-title {
    display: block;
    font-size: 24rpx;
    color: #F57C00;
    margin-bottom: 16rpx;
  }

  .hint-codes {
    display: flex;
    gap: 16rpx;
    justify-content: center;
  }

  .hint-code {
    padding: 16rpx 28rpx;
    background: #FFF8E1;
    border-radius: 12rpx;
    border: 1rpx solid #FFE082;

    .code-text {
      display: block;
      font-size: 28rpx;
      font-weight: 700;
      color: #F57C00;
      font-family: monospace;
      letter-spacing: 4rpx;
    }

    .code-name {
      font-size: 20rpx;
      color: #999;
      margin-top: 2rpx;
    }
  }
}

/* ================================================================ */
/*  已加入房间                                                       */
/* ================================================================ */
.room-header {
  background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%);
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0 0 30rpx 30rpx;
}

.room-info {
  .room-name {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 2rpx;
  }

  .room-code {
    display: block;
    font-size: 22rpx;
    color: rgba(255,255,255,0.8);
    margin-top: 6rpx;
    font-family: monospace;
    letter-spacing: 2rpx;
  }
}

.room-actions {
  display: flex;
  gap: 16rpx;

  .btn-refresh {
    width: 64rpx;
    height: 64rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
      background: rgba(255,255,255,0.35);
      .refresh-icon {
        transform: rotate(180deg);
      }
    }

    .refresh-icon {
      font-size: 32rpx;
      transition: transform 0.5s ease;
    }
  }

  .btn-dissolve {
    padding: 12rpx 20rpx;
    background: rgba(255,77,79,0.5);
    border-radius: 20rpx;
    font-size: 22rpx;
    color: #FFFFFF;

    &:active {
      background: rgba(255,77,79,0.7);
    }
  }

  .btn-leave {
    padding: 12rpx 20rpx;
    background: rgba(255,255,255,0.2);
    border-radius: 20rpx;
    font-size: 22rpx;
    color: #FFFFFF;

    &:active {
      background: rgba(255,255,255,0.35);
    }
  }
}

.stats-row {
  padding: 20rpx 30rpx 0;

  .stat-text {
    font-size: 24rpx;
    color: #7F8C8D;
  }

  .stat-focus {
    color: #4ECDC4;
    font-weight: 600;
  }
}

/* ===== 成员卡片网格 ===== */
.members-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 20rpx;
  gap: 16rpx;
}

.member-card {
  width: calc(50% - 8rpx);
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 16rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  transition: all 0.4s ease;

  /* 专注中 - 卡片绿色光晕 */
  &.card-focusing {
    background: linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%);
    border: 2rpx solid rgba(76,175,80,0.3);
    box-shadow: 0 4rpx 20rpx rgba(76,175,80,0.15);

    /* 脉冲发光环 */
    .glow-ring {
      position: absolute;
      top: -20rpx;
      left: -20rpx;
      right: -20rpx;
      bottom: -20rpx;
      border-radius: 28rpx;
      border: 3rpx solid rgba(76,175,80,0.25);
      animation: glowPulse 2s ease-in-out infinite;
      pointer-events: none;
    }
  }

  &.card-self {
    background: #FAFFFE;
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.04);
  }
}

.member-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-bottom: 14rpx;
  position: relative;
  z-index: 1;

  &.avatar-focusing {
    box-shadow: 0 0 0 6rpx rgba(76,175,80,0.2);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #E8ECF1;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4ECDC4, #44B5AD);
    color: #FFFFFF;
    font-size: 42rpx;
    font-weight: 700;
  }
}

.member-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2C3E50;
  margin-bottom: 10rpx;
  position: relative;
  z-index: 1;

  .badge-self {
    font-size: 18rpx;
    background: #4ECDC4;
    color: #FFF;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    margin-left: 6rpx;
    vertical-align: middle;
  }
}

.member-status {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;

  .status-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    margin-right: 8rpx;

    &.dot-focus {
      background: #4CAF50;
      box-shadow: 0 0 8rpx rgba(76,175,80,0.5);
      animation: dotBlink 1.5s ease-in-out infinite;
    }

    &.dot-idle {
      background: #BDC3C7;
    }
  }

  @keyframes dotBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .status-text {
    font-size: 24rpx;
    color: #95A5A6;
    max-width: 180rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.text-focus {
      color: #4CAF50;
      font-weight: 600;
    }
  }
}

/* ===== 我的状态卡片 ===== */
.self-status-card {
  margin: 10rpx 20rpx 30rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.05);
}

.self-status-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #2C3E50;
  margin-bottom: 20rpx;
}

.status-toggle {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;

  .toggle-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 0;
    border-radius: 14rpx;
    background: #F5F7FA;
    border: 2rpx solid transparent;
    transition: all 0.3s;

    &.active {
      background: #E8F5E9;
      border-color: #4CAF50;
    }

    .toggle-icon {
      font-size: 36rpx;
      margin-bottom: 6rpx;
    }

    .toggle-label {
      font-size: 24rpx;
      color: #7F8C8D;
      font-weight: 500;
    }

    &.active .toggle-label {
      color: #4CAF50;
      font-weight: 600;
    }
  }
}

.task-row {
  .task-input {
    width: 100%;
    height: 72rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    padding: 0 20rpx;
    font-size: 26rpx;
    color: #2C3E50;
    box-sizing: border-box;
  }
}

/* ===== 弹窗通用 ===== */
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
    padding: 0 24rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }

  .code-input {
    text-align: center;
    font-size: 40rpx;
    font-weight: 700;
    font-family: monospace;
    letter-spacing: 16rpx;
  }
}

.task-presets {
  margin-bottom: 24rpx;

  .preset-label {
    display: block;
    font-size: 22rpx;
    color: #95A5A6;
    margin-bottom: 12rpx;
  }

  .preset-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  .preset-tag {
    padding: 10rpx 20rpx;
    background: #F5F7FA;
    border-radius: 20rpx;
    font-size: 24rpx;
    color: #555;
    border: 1rpx solid #E8ECF1;

    &:active {
      background: #E8F5E9;
      border-color: #4CAF50;
      color: #4CAF50;
    }
  }
}

.dialog-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;

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
    background: linear-gradient(135deg, #4ECDC4, #44B5AD);
    color: #FFFFFF;
    font-weight: 600;

    &[disabled] {
      opacity: 0.6;
    }
  }
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;

  .empty-icon {
    font-size: 60rpx;
  }

  .empty-text {
    font-size: 26rpx;
    color: #95A5A6;
    margin-top: 16rpx;
  }
}
</style>
