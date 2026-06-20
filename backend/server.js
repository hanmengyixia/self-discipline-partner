const express = require('express');
const cors = require('cors');

// 路由
const userRoutes = require('./routes/user');
const habitRoutes = require('./routes/habit');
const focusRoutes = require('./routes/focus');
const roomRoutes = require('./routes/room');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== 中间件 =====================
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ===================== 路由注册 =====================
app.use('/api/user', userRoutes);
app.use('/api/habit', habitRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/room', roomRoutes);

// ===================== 健康检查 =====================
app.get('/api/health', (req, res) => {
  res.json({ code: 200, msg: '自律搭子服务运行中 🚀', data: { uptime: process.uptime() } });
});

// ===================== 404 =====================
app.use((req, res) => {
  res.json({ code: 404, msg: `接口不存在: ${req.method} ${req.url}`, data: null });
});

// ===================== 启动服务 =====================
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('  🎯 自律搭子 - 后端服务已启动');
  console.log(`  📡 地址: http://localhost:${PORT}`);
  console.log(`  💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════');
});
