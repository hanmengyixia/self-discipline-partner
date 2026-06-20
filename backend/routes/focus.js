const express = require('express');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/focus/upload
 * Body: { tag, duration }
 * 上传一条专注记录
 */
router.post('/upload', (req, res) => {
  const { tag, duration } = req.body;
  const userId = req.user.userId;

  if (!tag || !duration || duration <= 0) {
    return res.json({ code: 400, msg: 'tag 和 duration(>0) 为必填项', data: null });
  }

  const validTags = ['学习', '工作', '运动', '冥想'];
  if (!validTags.includes(tag)) {
    return res.json({ code: 400, msg: `tag 必须为: ${validTags.join(', ')}`, data: null });
  }

  const db = getDatabase();
  const startTime = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO FocusRecords (user_id, tag, duration, start_time) VALUES (?, ?, ?, ?)'
  ).run(userId, tag, duration, startTime);

  return res.json({
    code: 200,
    msg: '专注记录已保存',
    data: {
      id: result.lastInsertRowid,
      tag,
      duration,
      start_time: startTime
    }
  });
});

/**
 * GET /api/focus/summary
 * Query: ?week=2026-06-13 (某周的任意一天)
 * 按标签聚合统计本周专注时长
 */
router.get('/summary', (req, res) => {
  const userId = req.user.userId;
  const db = getDatabase();

  // 根据传入日期计算本周的起止时间 (周一到周日)
  const targetDate = req.query.week ? new Date(req.query.week) : new Date();
  const dayOfWeek = targetDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日 special case
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekStart = monday.toISOString();
  const weekEnd = sunday.toISOString();

  // 按标签聚合
  const tagSummary = db.prepare(`
    SELECT tag, SUM(duration) AS total_minutes
    FROM FocusRecords
    WHERE user_id = ? AND start_time >= ? AND start_time <= ?
    GROUP BY tag
    ORDER BY total_minutes DESC
  `).all(userId, weekStart, weekEnd);

  const totalMinutes = tagSummary.reduce((sum, r) => sum + r.total_minutes, 0);

  const details = tagSummary.map(r => ({
    tag: r.tag,
    minutes: r.total_minutes,
    percent: totalMinutes > 0 ? Math.round((r.total_minutes / totalMinutes) * 100) : 0
  }));

  // 查询最近 7 天的打卡情况 (用于 streak)
  const last7Days = db.prepare(`
    SELECT DISTINCT check_in_date
    FROM CheckInLogs c
    JOIN Habits h ON c.habit_id = h.id
    WHERE h.user_id = ?
    ORDER BY check_in_date DESC
    LIMIT 30
  `).all(userId);

  // 计算连续打卡天数 (streak)
  const checkedDates = new Set(last7Days.map(r => r.check_in_date));
  let streak = 0;
const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 30; i++) {
const d = new Date();
    d.setDate(d.getDate() - i);
const ds = d.toISOString().split('T')[0];
    if (checkedDates.has(ds)) {
      streak++;
    } else {
// 如果今天还没打卡，允许从昨天开始算
if (i === 0 && ds === todayStr) continue;
      break;
    }
  }

  return res.json({
    code: 200,
    msg: 'success',
    data: {
      week_range: {
        start: weekStart.split('T')[0],
        end: weekEnd.split('T')[0]
      },
      total_minutes: totalMinutes,
      tags: details,
      streak
    }
  });
});

module.exports = router;
