const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/user/register
 * Body: { username, password }
 * 注册新用户
 */
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  // 参数校验
  if (!username || !password) {
    return res.json({ code: 400, msg: '用户名和密码不能为空', data: null });
  }
  if (username.length < 2 || username.length > 20) {
    return res.json({ code: 400, msg: '用户名长度需在 2-20 位之间', data: null });
  }
  if (password.length < 6 || password.length > 30) {
    return res.json({ code: 400, msg: '密码长度需在 6-30 位之间', data: null });
  }

  const db = getDatabase();

  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM Users WHERE username = ?').get(username);
  if (existing) {
    return res.json({ code: 400, msg: '用户名已被注册', data: null });
  }

  // 创建用户
  const hashedPw = bcrypt.hashSync(password, 10);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
  const result = db.prepare('INSERT INTO Users (username, password, avatar_url) VALUES (?, ?, ?)').run(username, hashedPw, avatarUrl);

  // 生成 Token
  const token = generateToken(result.lastInsertRowid, username);

  return res.json({
    code: 200,
    msg: '注册成功',
    data: {
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        avatar_url: avatarUrl
      }
    }
  });
});

/**
 * POST /api/user/login
 * Body: { username, password }
 * 用户登录
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ code: 400, msg: '用户名和密码不能为空', data: null });
  }

  const db = getDatabase();
  const user = db.prepare('SELECT id, username, password, avatar_url FROM Users WHERE username = ?').get(username);

  if (!user) {
    return res.json({ code: 400, msg: '用户不存在', data: null });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.json({ code: 400, msg: '密码错误', data: null });
  }

  const token = generateToken(user.id, user.username);

  return res.json({
    code: 200,
    msg: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url
      }
    }
  });
});

/**
 * GET /api/user/profile
 * 获取当前用户信息
 */
router.get('/profile', authMiddleware, (req, res) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, avatar_url, created_at FROM Users WHERE id = ?').get(req.user.userId);

  if (!user) {
    return res.json({ code: 404, msg: '用户不存在', data: null });
  }

  return res.json({ code: 200, msg: 'success', data: user });
});

module.exports = router;
