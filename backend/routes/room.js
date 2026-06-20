const express = require('express');
const { getDatabase } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * 生成 4 位随机邀请码 (大写字母+数字)
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的 0/O/1/I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * POST /api/room/create
 * Body: { room_name }
 * 创建自习室
 */
router.post('/create', (req, res) => {
  const { room_name } = req.body;
  const userId = req.user.userId;

  if (!room_name || room_name.trim().length === 0) {
    return res.json({ code: 400, msg: '房间名称不能为空', data: null });
  }

  const db = getDatabase();

  // 生成唯一邀请码
  let code;
  let attempts = 0;
  do {
    code = generateRoomCode();
    const exists = db.prepare('SELECT id FROM Rooms WHERE code = ?').get(code);
    if (!exists) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return res.json({ code: 500, msg: '邀请码生成失败，请重试', data: null });
  }

  // 创建房间 + 自动加入
  const insertRoom = db.prepare('INSERT INTO Rooms (room_name, code) VALUES (?, ?)');
  const roomResult = insertRoom.run(room_name.trim(), code);

  const insertRelation = db.prepare(
    'INSERT INTO UserRoomRelations (user_id, room_id, current_status, current_task) VALUES (?, ?, ?, ?)'
  );
  insertRelation.run(userId, roomResult.lastInsertRowid, 'idle', '');

  return res.json({
    code: 200,
    msg: '房间创建成功',
    data: {
      id: roomResult.lastInsertRowid,
      room_name: room_name.trim(),
      code
    }
  });
});

/**
 * POST /api/room/join
 * Body: { code }
 * 通过邀请码加入房间
 */
router.post('/join', (req, res) => {
  const { code } = req.body;
  const userId = req.user.userId;

  if (!code || code.trim().length === 0) {
    return res.json({ code: 400, msg: '邀请码不能为空', data: null });
  }

  const db = getDatabase();
  const room = db.prepare('SELECT id, room_name, code FROM Rooms WHERE code = ?').get(code.trim().toUpperCase());

  if (!room) {
    return res.json({ code: 404, msg: '房间不存在，请检查邀请码', data: null });
  }

  // 检查是否已在房间中
  const existing = db.prepare(
    'SELECT id FROM UserRoomRelations WHERE user_id = ? AND room_id = ?'
  ).get(userId, room.id);

  if (existing) {
    return res.json({ code: 200, msg: '你已在该房间中', data: { id: room.id, room_name: room.room_name, code: room.code } });
  }

  db.prepare(
    'INSERT INTO UserRoomRelations (user_id, room_id, current_status, current_task) VALUES (?, ?, ?, ?)'
  ).run(userId, room.id, 'idle', '');

  return res.json({
    code: 200,
    msg: '加入房间成功',
    data: { id: room.id, room_name: room.room_name, code: room.code }
  });
});

/**
 * POST /api/room/leave
 * Body: { room_id }
 * 退出自习室
 */
router.post('/leave', (req, res) => {
  const { room_id } = req.body;
  const userId = req.user.userId;

  if (!room_id) {
    return res.json({ code: 400, msg: 'room_id 为必填项', data: null });
  }

  const db = getDatabase();

  // 删除用户与房间的关系
  const result = db.prepare(
    'DELETE FROM UserRoomRelations WHERE user_id = ? AND room_id = ?'
  ).run(userId, room_id);

  if (result.changes === 0) {
    return res.json({ code: 404, msg: '你不在该房间中', data: null });
  }

  // 如果房间没人了，自动删除房间
  const remaining = db.prepare(
    'SELECT COUNT(*) AS count FROM UserRoomRelations WHERE room_id = ?'
  ).get(room_id);

  if (remaining.count === 0) {
    db.prepare('DELETE FROM Rooms WHERE id = ?').run(room_id);
    return res.json({ code: 200, msg: '已退出，房间已自动解散', data: null });
  }

  return res.json({ code: 200, msg: '已退出房间', data: null });
});

/**
 * POST /api/room/dissolve
 * Body: { room_id }
 * 解散自习室（任何成员均可解散，所有人被移除）
 */
router.post('/dissolve', (req, res) => {
  const { room_id } = req.body;
  const userId = req.user.userId;

  if (!room_id) {
    return res.json({ code: 400, msg: 'room_id 为必填项', data: null });
  }

  const db = getDatabase();

  // 验证用户是否在该房间中
  const selfRelation = db.prepare(
    'SELECT id FROM UserRoomRelations WHERE user_id = ? AND room_id = ?'
  ).get(userId, room_id);

  if (!selfRelation) {
    return res.json({ code: 403, msg: '你不在该房间中', data: null });
  }

  // 删除该房间的所有成员关系
  db.prepare('DELETE FROM UserRoomRelations WHERE room_id = ?').run(room_id);
  // 删除房间
  db.prepare('DELETE FROM Rooms WHERE id = ?').run(room_id);

  return res.json({ code: 200, msg: '自习室已解散', data: null });
});

/**
 * POST /api/room/status
 * Body: { room_id, current_status, current_task }
 * 更新个人当前状态
 */
router.post('/status', (req, res) => {
  const { room_id, current_status, current_task } = req.body;
  const userId = req.user.userId;

  if (!room_id || !current_status) {
    return res.json({ code: 400, msg: 'room_id 和 current_status 为必填项', data: null });
  }
  if (!['idle', 'focusing'].includes(current_status)) {
    return res.json({ code: 400, msg: 'current_status 必须为 idle 或 focusing', data: null });
  }

  const db = getDatabase();
  const result = db.prepare(
    'UPDATE UserRoomRelations SET current_status = ?, current_task = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND room_id = ?'
  ).run(current_status, current_task || '', userId, room_id);

  if (result.changes === 0) {
    return res.json({ code: 404, msg: '你不在该房间中', data: null });
  }

  return res.json({
    code: 200,
    msg: '状态更新成功',
    data: { current_status, current_task: current_task || '' }
  });
});

/**
 * GET /api/room/members?room_id=1
 * 获取房间内所有成员的实时状态
 */
router.get('/members', (req, res) => {
  const { room_id } = req.query;
  const userId = req.user.userId;

  if (!room_id) {
    return res.json({ code: 400, msg: 'room_id 为必填参数', data: null });
  }

  const db = getDatabase();

  // 验证用户是否在该房间内
  const selfRelation = db.prepare(
    'SELECT id FROM UserRoomRelations WHERE user_id = ? AND room_id = ?'
  ).get(userId, room_id);

  if (!selfRelation) {
    return res.json({ code: 403, msg: '你不在该房间中', data: null });
  }

  const room = db.prepare('SELECT id, room_name, code FROM Rooms WHERE id = ?').get(room_id);
  if (!room) {
    return res.json({ code: 404, msg: '房间不存在', data: null });
  }

  const members = db.prepare(`
    SELECT
      u.id AS user_id,
      u.username,
      u.avatar_url,
      urr.current_status,
      urr.current_task,
      urr.updated_at
    FROM UserRoomRelations urr
    JOIN Users u ON urr.user_id = u.id
    WHERE urr.room_id = ?
    ORDER BY urr.current_status DESC, u.username ASC
  `).all(room_id);

  return res.json({
    code: 200,
    msg: 'success',
    data: {
      room: { id: room.id, room_name: room.room_name, code: room.code },
      members
    }
  });
});

module.exports = router;
