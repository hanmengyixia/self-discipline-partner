# 自律搭子 (Self-Discipline Partner)

> 时间管理与习惯打卡 App —— 自律给你自由

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术架构](#2-技术架构)
- [3. 项目结构](#3-项目结构)
- [4. 功能模块详解](#4-功能模块详解)
  - [4.1 用户认证](#41-用户认证)
  - [4.2 今日打卡](#42-今日打卡)
  - [4.3 自律钟（专注计时）](#43-自律钟专注计时)
  - [4.4 搭子自习室](#44-搭子自习室)
  - [4.5 个人中心（统计）](#45-个人中心统计)
- [5. 数据库设计](#5-数据库设计)
- [6. API 接口文档](#6-api-接口文档)
- [7. 启动与运行](#7-启动与运行)

---

## 1. 项目概述

**自律搭子**是一款面向移动端的自我管理应用，帮助用户培养良好习惯、记录专注时间，并通过"自习室"功能与好友互相监督、共同进步。

### 核心功能

| 模块 | 功能说明 |
|------|---------|
| **习惯打卡** | 创建个人习惯，每日打卡/取消打卡，查看当日完成进度 |
| **自律钟** | 番茄钟式专注计时器，支持 4 种专注类型和 4 档时长，自动记录专注数据 |
| **搭子自习室** | 创建/加入房间，实时查看成员专注状态，互相监督 |
| **数据统计** | 本周专注时长汇总、标签占比分析、连续打卡天数追踪、7 天打卡日历 |

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────┐
│                    前端 (Frontend)                │
│  uni-app (Vue 3) + Pinia + Vite                  │
│  支持编译为 H5 / 微信小程序 / Android / iOS        │
├─────────────────────────────────────────────────┤
│               HTTP REST API (JSON)                │
├─────────────────────────────────────────────────┤
│                   后端 (Backend)                  │
│  Express.js + better-sqlite3 + JWT                │
│  端口: 3000                                       │
└─────────────────────────────────────────────────┘
```

### 技术栈详情

**前端：**
- **框架：** [uni-app](https://uniapp.dcloud.net.cn/) 3.0（基于 Vue 3）
- **状态管理：** [Pinia](https://pinia.vuejs.org/) 2.x
- **构建工具：** [Vite](https://vitejs.dev/) 5.x
- **样式：** SCSS + CSS 自定义属性
- **跨平台：** 一套代码可编译为 H5、微信小程序、Android、iOS

**后端：**
- **运行时：** Node.js
- **Web 框架：** Express.js 4.x
- **数据库：** SQLite（通过 `better-sqlite3` 同步驱动）
- **认证：** JWT（`jsonwebtoken`）+ bcryptjs 密码哈希
- **跨域：** `cors` 中间件

---

## 3. 项目结构

```
self-discipline partner/
├── backend/                        # 后端服务
│   ├── server.js                   # 入口文件 — Express 启动 & 路由注册
│   ├── package.json                # 依赖清单 (express, better-sqlite3, bcryptjs, jsonwebtoken)
│   ├── config/
│   │   └── database.js             # SQLite 数据库连接单例
│   ├── database/
│   │   └── init.js                 # 数据库初始化脚本 (建表 + 测试数据)
│   ├── middleware/
│   │   └── auth.js                 # JWT 认证中间件 & Token 生成
│   ├── routes/
│   │   ├── user.js                 # 用户路由 (注册/登录/个人信息)
│   │   ├── habit.js                # 习惯路由 (CRUD + 打卡)
│   │   ├── focus.js                # 专注路由 (上传记录/周汇总)
│   │   └── room.js                 # 自习室路由 (创建/加入/退出/解散/状态)
│   └── data/
│       └── app.db                  # SQLite 数据库文件 (运行 init.js 后生成)
│
├── frontend/                       # 前端应用
│   ├── index.html                  # HTML 入口
│   ├── package.json                # 依赖清单 (vue, pinia, uni-app)
│   ├── vite.config.js              # Vite 配置 + API 代理
│   ├── src/
│   │   ├── main.js                 # 应用入口 — 创建 Vue SSR App + Pinia
│   │   ├── App.vue                 # 根组件 — 全局 CSS 变量 & 工具类
│   │   ├── pages.json              # uni-app 页面路由 & TabBar 配置
│   │   ├── manifest.json           # 跨平台配置 (H5/Android/iOS/小程序)
│   │   ├── api/
│   │   │   └── request.js          # 网络请求封装 (自动 Token、401 拦截)
│   │   ├── store/
│   │   │   └── user.js             # Pinia 用户状态管理 (登录/注册/登出)
│   │   ├── components/
│   │   │   ├── HabitCard.vue       # 习惯打卡卡片组件
│   │   │   └── CircularProgress.vue # SVG 环形进度条组件
│   │   ├── pages/
│   │   │   ├── login/login.vue     # 登录/注册页
│   │   │   ├── index/index.vue     # 今日打卡页 (首页 Tab)
│   │   │   ├── focus/focus.vue     # 自律钟页 (专注计时 Tab)
│   │   │   ├── room/room.vue       # 搭子自习室页 (Tab)
│   │   │   └── profile/profile.vue # 个人中心/统计页 (Tab)
│   │   └── static/                 # TabBar 图标 SVG
│   └── dist/                       # 构建产物
│
└── .claude/                        # Claude Code 配置
    └── settings.local.json          # 本地权限设置
```

---

## 4. 功能模块详解

### 4.1 用户认证

**文件：** [backend/routes/user.js](backend/routes/user.js) | [frontend/src/pages/login/login.vue](frontend/src/pages/login/login.vue)

用户通过用户名+密码进行注册和登录，后端使用 JWT 作为认证凭证。

**后端流程：**

```js
// backend/routes/user.js:13-55 — 注册流程
router.post('/register', (req, res) => {
  const { username, password } = req.body
  // 1. 参数校验（用户名 2-20 位，密码 6-30 位）
  // 2. 检查用户名是否已存在
  // 3. bcrypt 哈希密码（cost=10）
  // 4. 通过 DiceBear API 生成随机头像 URL
  // 5. 插入数据库 → 生成 JWT Token → 返回用户信息和 Token
})
```

```js
// backend/middleware/auth.js — JWT 认证中间件
function authMiddleware(req, res, next) {
  const token = authHeader.split(' ')[1]  // 从 "Bearer <token>" 中提取
  const decoded = jwt.verify(token, JWT_SECRET)
  req.user = decoded  // { userId, username }
  next()
}
```

**前端登录态管理：**

```js
// frontend/src/store/user.js — Pinia Store
export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(getToken())
  const isLogin = computed(() => !!token.value && !!user.value)

  // 初始化时自动从本地存储恢复登录态
  async function init() {
    const savedToken = getToken()
    if (savedToken) {
      token.value = savedToken
      await fetchProfile()  // 验证 Token 有效性
    }
  }
})
```

Token 存储策略：
- **H5 环境：** `sessionStorage`（标签页隔离）+ `localStorage`（新标签页恢复）
- **App/小程序：** `uni.setStorageSync`

**测试账号：** 项目内置了 `zhangsan`、`lisi`、`wangwu`、`zhaoliu` 四个测试用户，密码均为 `123456`。

---

### 4.2 今日打卡

**文件：** [backend/routes/habit.js](backend/routes/habit.js) | [frontend/src/pages/index/index.vue](frontend/src/pages/index/index.vue) | [frontend/src/components/HabitCard.vue](frontend/src/components/HabitCard.vue)

用户创建个人习惯，每日通过点击进行打卡（或取消打卡）。

**后端核心逻辑：**

```js
// backend/routes/habit.js:84-115 — Toggle 打卡机制
router.post('/checkin', (req, res) => {
  // 1. 验证 habit 属于当前用户
  // 2. 查询今日是否已打卡
  // 3. 如果已打卡 → DELETE 打卡记录（取消打卡）
  // 4. 如果未打卡 → INSERT 打卡记录（打卡）
  // 实现了 toggle 切换，同一接口兼任打卡与取消
})
```

习惯列表接口通过 LEFT JOIN 实时计算今日打卡状态：

```sql
-- backend/routes/habit.js:50-62
SELECT
  h.*,
  CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_checked_today
FROM Habits h
LEFT JOIN CheckInLogs c ON h.id = c.habit_id AND c.check_in_date = ?
WHERE h.user_id = ?
```

**前端交互：**
- 页面顶部展示日期、问候语和当日打卡进度条
- 每个习惯以卡片形式展示，左侧彩色边框指示主题色
- 点击"打卡"按钮触发 toggle，已打卡的习惯显示删除线和半透明效果
- 打卡成功时有涟漪动画效果（`rippleOut` CSS 动画）
- 支持创建习惯弹窗，可选择图标（16 种 emoji）和主题色（8 种颜色）
- 删除习惯需二次确认（`uni.showModal`）

---

### 4.3 自律钟（专注计时）

**文件：** [backend/routes/focus.js](backend/routes/focus.js) | [frontend/src/pages/focus/focus.vue](frontend/src/pages/focus/focus.vue) | [frontend/src/components/CircularProgress.vue](frontend/src/components/CircularProgress.vue)

一个番茄钟式的专注计时器，支持多种专注类型和时长选择。

**计时器状态机：**

```
idle → running → paused → running → finished
  ↑       ↓         ↓         ↓          ↓
  └───────┴─(放弃)──┴─(放弃)──┘      (再来一组 → idle)
```

**前端计时逻辑：**

```js
// frontend/src/pages/focus/focus.vue:193-238
function startCountdown() {
  timerInterval = setInterval(() => {
    if (remaining.value <= 0) {
      clearInterval(timerInterval)
      timerState.value = 'finished'
      uploadFocusRecord()  // 自动上传专注记录
      uni.vibrateLong()    // 震动反馈
      return
    }
    remaining.value--
  }, 1000)
}
```

**专注配置：**
| 类型 | 图标 | 颜色 |
|------|------|------|
| 学习 | § | #4CAF50 (绿) |
| 工作 | ☷ | #3498DB (蓝) |
| 运动 | △ | #FF6B6B (红) |
| 冥想 | ○ | #9B59B6 (紫) |

可选时长：15 分钟、25 分钟、35 分钟、45 分钟

**后端数据记录：**

```js
// backend/routes/focus.js:49-125 — 周汇总接口
router.get('/summary', (req, res) => {
  // 1. 根据传入日期计算本周一 ~ 周日范围
  // 2. 按 tag 聚合 SUM(duration) 得到各标签总时长
  // 3. 计算本周总时长 & 各标签占比百分比
  // 4. 从 CheckInLogs 计算连续打卡天数 (streak)
  //    从今天向前推算，遇到未打卡则中断
})
```

**视觉效果：**
- 使用 `CircularProgress` SVG 环形进度条组件，通过 `stroke-dashoffset` 动画展示倒计时
- 最后 60 秒时数字闪烁、圆环变红
- 完成时显示庆祝图标，可点击"再来一组"

---

### 4.4 搭子自习室

**文件：** [backend/routes/room.js](backend/routes/room.js) | [frontend/src/pages/room/room.vue](frontend/src/pages/room/room.vue)

多人实时状态共享的自习室功能，通过邀请码机制创建/加入房间。

**邀请码机制：**

```js
// backend/routes/room.js:11-18 — 生成 4 位邀请码
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  // 去掉了 0/O/1/I 等容易混淆的字符
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
```

**自习室生命周期：**

```
创建房间（自动加入）  →  邀请码分享  →  其他用户加入
         ↓
   成员更新状态 (idle / focusing + task)
         ↓
   退出房间  →  最后一人退出 → 房间自动解散
         ↓
   解散房间（任何成员均可操作）
```

**成员状态模型：**

每个成员在房间中有两种状态：
- `idle` — 休息中
- `focusing` — 专注中，附带 `current_task` 描述（如"背单词"、"刷算法题"）

```js
// backend/routes/room.js:183-208 — 更新个人状态
router.post('/status', (req, res) => {
  const { room_id, current_status, current_task } = req.body
  // 校验: current_status 只能是 'idle' 或 'focusing'
  // UPDATE UserRoomRelations SET ...
})
```

**前端状态管理：**
- 未加入房间时：显示创建/加入两个入口卡片，并提供测试邀请码快捷入口
- 已加入房间时：
  - 顶部显示房间名和邀请码
  - 成员以卡片网格展示（2 列），专注中的成员有绿色光晕脉冲动画
  - 自己的卡片标记"我"标签
  - 底部"我的状态"卡片可快速切换休息/专注，专注时需填写任务描述
- 支持退出和解散操作，均需二次确认
- **账号切换检测：** 通过 `watch` 监听 `userStore.user.id` 变化，检测到账号切换自动重置房间状态

---

### 4.5 个人中心（统计）

**文件：** [frontend/src/pages/profile/profile.vue](frontend/src/pages/profile/profile.vue)

综合展示用户的习惯与专注数据。

**页面区块：**

1. **个人信息头部：**
   - 渐变背景 + 装饰性半透明圆形
   - 用户头像（DiceBear 生成），带旋转虚线环动画
   - 连续打卡天数徽章（火焰图标 + 金色数字）

2. **本周专注统计：**
   - 大数字展示本周总专注分钟数
   - 按标签分类的柱状图（带百分比）
   - 空状态引导用户前往自律钟页面

3. **最近 7 天打卡日历：**
   - 横向 7 格日历视图
   - 已打卡日期显示绿色勾号圆点
   - 今日高亮背景
   - 根据连续打卡天数显示不同的鼓励文案

4. **习惯概览：**
   - 迷你卡片展示所有习惯及其今日打卡状态

5. **退出登录：** 红色按钮，需确认

**数据获取：**

```js
// frontend/src/pages/profile/profile.vue:183-219
async function fetchData() {
  // 并行请求周汇总 + 习惯列表
  const [summaryRes, habitRes] = await Promise.all([
    get('/api/focus/summary'),
    get('/api/habit/list')
  ])
  // 用 streak 构建 7 天日历的打卡状态
}
```

---

## 5. 数据库设计

数据库采用 SQLite，共 5 张业务表 + 关联关系。

### ER 图

```
Users (1) ─────< Habits (N) ─────< CheckInLogs (N)
  │
  ├───────────< FocusRecords (N)
  │
  └──< UserRoomRelations (N) >── Rooms (N)
```

### 表结构

**Users — 用户表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT NOT NULL UNIQUE | 用户名，2-20 位 |
| password | TEXT NOT NULL | bcrypt 哈希后的密码 |
| avatar_url | TEXT | DiceBear 生成的 SVG 头像 URL |
| created_at | DATETIME | 注册时间，默认当前时间 |

**Habits — 习惯表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK→Users | 所属用户 |
| title | TEXT NOT NULL | 习惯名称 |
| icon | TEXT | Emoji 图标，默认 📌 |
| color | TEXT | 主题色 HEX，默认 #4CAF50 |
| create_time | DATETIME | 创建时间 |

**CheckInLogs — 打卡记录表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| habit_id | INTEGER FK→Habits | 关联习惯 |
| check_in_date | TEXT NOT NULL | 打卡日期 (YYYY-MM-DD) |
| created_at | DATETIME | 打卡时间戳 |

> **约束：** `UNIQUE(habit_id, check_in_date)` — 同一习惯每天只能有一条打卡记录

**FocusRecords — 专注记录表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK→Users | 所属用户 |
| tag | TEXT | 专注类型：学习/工作/运动/冥想 |
| duration | INTEGER | 专注时长（分钟） |
| start_time | DATETIME | 开始时间 |

**Rooms — 自习室表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| room_name | TEXT NOT NULL | 房间名称 |
| code | TEXT NOT NULL UNIQUE | 4 位邀请码 |
| created_at | DATETIME | 创建时间 |

**UserRoomRelations — 用户-房间关联表**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK→Users | 用户 |
| room_id | INTEGER FK→Rooms | 房间 |
| current_status | TEXT | idle / focusing |
| current_task | TEXT | 专注任务描述 |
| updated_at | DATETIME | 状态更新时间 |

> **约束：** `UNIQUE(user_id, room_id)` — 一个用户在同一房间只有一条关联

### 关键约束

- 所有外键均设置 `ON DELETE CASCADE`，删除用户/习惯/房间时自动清理关联数据
- 数据库使用 WAL 模式（`PRAGMA journal_mode = WAL`）提升并发读写性能
- `foreign_keys = ON` 确保外键约束生效

---

## 6. API 接口文档

### 统一响应格式

所有接口返回 JSON，结构如下：

```json
{
  "code": 200,        // 200=成功, 400=参数错误, 401=未登录, 403=禁止, 404=不存在, 500=服务错误
  "msg": "success",   // 提示信息
  "data": {}          // 业务数据
}
```

### 认证方式

除注册和登录外，所有业务接口需要在请求头中携带 Token：

```
Authorization: Bearer <token>
```

### 接口列表

#### 用户模块 — `/api/user`

| 方法 | 路径 | 认证 | 说明 | 请求参数 | 返回 data |
|------|------|------|------|---------|-----------|
| POST | `/register` | ❌ | 注册 | `{ username, password }` | `{ token, user: { id, username, avatar_url } }` |
| POST | `/login` | ❌ | 登录 | `{ username, password }` | `{ token, user: { id, username, avatar_url } }` |
| GET | `/profile` | ✅ | 获取个人信息 | — | `{ id, username, avatar_url, created_at }` |

#### 习惯模块 — `/api/habit`

| 方法 | 路径 | 认证 | 说明 | 请求参数 | 返回 data |
|------|------|------|------|---------|-----------|
| POST | `/create` | ✅ | 创建习惯 | `{ title, icon?, color? }` | `{ id, user_id, title, icon, color }` |
| GET | `/list` | ✅ | 习惯列表+今日进度 | — | `{ habits[], progress: { total, checked, percent }, date }` |
| POST | `/checkin` | ✅ | 打卡/取消打卡(toggle) | `{ habit_id }` | `{ checked: bool }` |
| POST | `/delete` | ✅ | 删除习惯 | `{ habit_id }` | `{ id }` |

#### 专注模块 — `/api/focus`

| 方法 | 路径 | 认证 | 说明 | 请求参数 | 返回 data |
|------|------|------|------|---------|-----------|
| POST | `/upload` | ✅ | 上传专注记录 | `{ tag, duration }` | `{ id, tag, duration, start_time }` |
| GET | `/summary` | ✅ | 本周专注汇总 | `?week=YYYY-MM-DD` | `{ week_range, total_minutes, tags[], streak }` |

**tag 可选值：** `学习`、`工作`、`运动`、`冥想`
**duration 单位：** 分钟

#### 自习室模块 — `/api/room`

| 方法 | 路径 | 认证 | 说明 | 请求参数 | 返回 data |
|------|------|------|------|---------|-----------|
| POST | `/create` | ✅ | 创建自习室 | `{ room_name }` | `{ id, room_name, code }` |
| POST | `/join` | ✅ | 加入自习室 | `{ code }` | `{ id, room_name, code }` |
| POST | `/leave` | ✅ | 退出自习室 | `{ room_id }` | — |
| POST | `/dissolve` | ✅ | 解散自习室 | `{ room_id }` | — |
| POST | `/status` | ✅ | 更新个人状态 | `{ room_id, current_status, current_task? }` | `{ current_status, current_task }` |
| GET | `/members` | ✅ | 获取成员列表 | `?room_id=1` | `{ room: {...}, members[] }` |

**current_status 可选值：** `idle`、`focusing`

---

## 7. 启动与运行

### 环境要求

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 初始化数据库（建表 + 测试数据）
npm run init-db

# 4. 启动服务（默认端口 3000）
npm start
```

服务启动后输出：

```
═══════════════════════════════════════
  🎯 自律搭子 - 后端服务已启动
  📡 地址: http://localhost:3000
  💚 健康检查: http://localhost:3000/api/health
═══════════════════════════════════════
```

### 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动 H5 开发服务器（默认端口 8080）
npm run dev:h5
```

前端 Vite 开发服务器自动将 `/api` 请求代理到后端 `http://localhost:3000`。

### 启动 App 开发

```bash
# Android/iOS App 开发
npm run dev:app

# 微信小程序开发
npm run dev:mp-weixin
```

### 验证

- 打开浏览器访问 `http://localhost:8080`
- 使用测试账号登录：`zhangsan` / `123456`
- 健康检查：`http://localhost:3000/api/health`

---

### 开发备注

- 数据库文件位于 `backend/data/app.db`，如需重置数据，删除该文件后重新运行 `npm run init-db`
- 前端使用 uni-app 框架，可通过 `pages.json` 配置页面路由和 TabBar
- 测试数据中包含 4 个用户、6 条习惯、打卡记录、5 条专注记录、2 个自习室
