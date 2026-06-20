const express = require('express');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有习惯接口需要登录
router.use(authMiddleware);

/**
 * POST /api/habit/create
 * Body: { title, icon, color }
 * 创建新习惯
 */
router.post('/create', (req, res) => {
  const { title, icon, color } = req.body;
  const userId = req.user.userId;

  if (!title || title.trim().length === 0) {
    return res.json({ code: 400, msg: '习惯名称不能为空', data: null });
  }

  const db = getDatabase();
  const result = db.prepare(
    'INSERT INTO Habits (user_id, title, icon, color) VALUES (?, ?, ?, ?)'
  ).run(userId, title.trim(), icon || '📌', color || '#4CAF50');

  return res.json({
    code: 200,
    msg: '习惯创建成功',
    data: {
      id: result.lastInsertRowid,
      user_id: userId,
      title: title.trim(),
      icon: icon || '📌',
      color: color || '#4CAF50'
    }
  });
});

/**
 * GET /api/habit/list
 * 获取当前用户所有习惯 + 今日打卡状态
 */
router.get('/list', (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];
  const db = getDatabase();

  const habits = db.prepare(`
    SELECT
      h.id,
      h.title,
      h.icon,
      h.color,
      h.create_time,
      CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_checked_today
    FROM Habits h
    LEFT JOIN CheckInLogs c ON h.id = c.habit_id AND c.check_in_date = ?
    WHERE h.user_id = ?
    ORDER BY h.create_time DESC
  `).all(today, userId);

  const total = habits.length;
  const checked = habits.filter(h => h.is_checked_today === 1).length;
  const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

  return res.json({
    code: 200,
    msg: 'success',
    data: {
      habits,
      progress: { total, checked, percent: progress },
      date: today
    }
  });
});

/**
 * POST /api/habit/checkin
 * Body: { habit_id }
 * 打卡 / 取消打卡 (toggle)
 */
router.post('/checkin', (req, res) => {
  const { habit_id } = req.body;
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];

  if (!habit_id) {
    return res.json({ code: 400, msg: 'habit_id 不能为空', data: null });
  }

  const db = getDatabase();

  // 验证该习惯属于当前用户
  const habit = db.prepare('SELECT id FROM Habits WHERE id = ? AND user_id = ?').get(habit_id, userId);
  if (!habit) {
    return res.json({ code: 404, msg: '习惯不存在', data: null });
  }

  // 查询今日是否已打卡
  const existing = db.prepare(
    'SELECT id FROM CheckInLogs WHERE habit_id = ? AND check_in_date = ?'
  ).get(habit_id, today);

  if (existing) {
    // 取消打卡
    db.prepare('DELETE FROM CheckInLogs WHERE id = ?').run(existing.id);
    return res.json({ code: 200, msg: '已取消打卡', data: { checked: false } });
  } else {
    // 打卡
    db.prepare('INSERT INTO CheckInLogs (habit_id, check_in_date) VALUES (?, ?)').run(habit_id, today);
    return res.json({ code: 200, msg: '打卡成功 🎉', data: { checked: true } });
  }
});

/**
 * POST /api/habit/delete
 * Body: { habit_id }
 * 删除习惯（同时级联删除关联的打卡记录）
 */
router.post('/delete', (req, res) => {
  const { habit_id } = req.body;
  const userId = req.user.userId;

  if (!habit_id) {
    return res.json({ code: 400, msg: 'habit_id 不能为空', data: null });
  }

  const db = getDatabase();

  // 验证该习惯属于当前用户
  const habit = db.prepare('SELECT id, title FROM Habits WHERE id = ? AND user_id = ?').get(habit_id, userId);
  if (!habit) {
    return res.json({ code: 404, msg: '习惯不存在', data: null });
  }

  // 删除习惯（CheckInLogs 有 ON DELETE CASCADE，自动清理打卡记录）
  db.prepare('DELETE FROM Habits WHERE id = ? AND user_id = ?').run(habit_id, userId);

  return res.json({ code: 200, msg: '习惯已删除', data: { id: habit_id } });
});

module.exports = router;
