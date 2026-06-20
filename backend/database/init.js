/**
 * 数据库初始化脚本 — 建表 + 插入测试数据
 * 运行: node database/init.js
 */
const { getDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');

const db = getDatabase();

// ===================== 建表 =====================
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '📌',
    color TEXT DEFAULT '#4CAF50',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CheckInLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    check_in_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES Habits(id) ON DELETE CASCADE,
    UNIQUE(habit_id, check_in_date)
  );

  CREATE TABLE IF NOT EXISTS FocusRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tag TEXT NOT NULL DEFAULT '学习',
    duration INTEGER NOT NULL DEFAULT 0,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS UserRoomRelations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    current_status TEXT DEFAULT 'idle',
    current_task TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE,
    UNIQUE(user_id, room_id)
  );
`);

// ===================== 测试数据 =====================
console.log('✅ 数据表创建完成，开始插入测试数据...');

// 测试用户 (密码均为 "123456")
const hashedPw = bcrypt.hashSync('123456', 10);

const insertUser = db.prepare('INSERT OR IGNORE INTO Users (username, password, avatar_url) VALUES (?, ?, ?)');
insertUser.run('zhangsan', hashedPw, 'https://api.dicebear.com/7.x/bottts/svg?seed=zhangsan');
insertUser.run('lisi', hashedPw, 'https://api.dicebear.com/7.x/bottts/svg?seed=lisi');
insertUser.run('wangwu', hashedPw, 'https://api.dicebear.com/7.x/bottts/svg?seed=wangwu');
insertUser.run('zhaoliu', hashedPw, 'https://api.dicebear.com/7.x/bottts/svg?seed=zhaoliu');
console.log('👤 已插入 4 个测试用户 (密码: 123456)');

// 测试习惯 (zhangsan, user_id=1)
const insertHabit = db.prepare('INSERT OR IGNORE INTO Habits (id, user_id, title, icon, color) VALUES (?, ?, ?, ?, ?)');
insertHabit.run(1, 1, '早起晨跑', '🏃', '#FF6B6B');
insertHabit.run(2, 1, '阅读30分钟', '📖', '#4ECDC4');
insertHabit.run(3, 1, '背50个单词', '📝', '#45B7D1');
insertHabit.run(4, 1, '冥想10分钟', '🧘', '#96CEB4');
insertHabit.run(5, 2, '每天健身', '💪', '#FF6B6B');
insertHabit.run(6, 2, '写日记', '✍️', '#FFEAA7');
console.log('📋 已插入 6 条习惯记录');

// 测试打卡 (今天部分打卡)
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

const insertCheckIn = db.prepare('INSERT OR IGNORE INTO CheckInLogs (habit_id, check_in_date) VALUES (?, ?)');
// zhangsan 今天已完成习惯1和习惯2
insertCheckIn.run(1, today);
insertCheckIn.run(2, today);
// 昨天也打卡了习惯1
insertCheckIn.run(1, yesterday);
insertCheckIn.run(1, twoDaysAgo);
insertCheckIn.run(2, yesterday);
console.log('✅ 已插入打卡记录');

// 测试专注记录
const insertFocus = db.prepare('INSERT INTO FocusRecords (user_id, tag, duration, start_time) VALUES (?, ?, ?, ?)');
insertFocus.run(1, '学习', 50, new Date(Date.now() - 3600000).toISOString());
insertFocus.run(1, '运动', 30, new Date(Date.now() - 7200000).toISOString());
insertFocus.run(1, '学习', 25, new Date(Date.now() - 86400000).toISOString());
insertFocus.run(2, '工作', 45, new Date(Date.now() - 3600000).toISOString());
insertFocus.run(2, '冥想', 15, new Date(Date.now() - 7200000).toISOString());
console.log('⏱️  已插入 5 条专注记录');

// 测试自习室
const insertRoom = db.prepare('INSERT OR IGNORE INTO Rooms (id, room_name, code) VALUES (?, ?, ?)');
insertRoom.run(1, '早起自律小队', 'A1B2');
insertRoom.run(2, '考研冲刺营', 'C3D4');
console.log('🏠 已插入 2 个自习室');

const insertRelation = db.prepare('INSERT OR IGNORE INTO UserRoomRelations (user_id, room_id, current_status, current_task) VALUES (?, ?, ?, ?)');
insertRelation.run(1, 1, 'focusing', '背单词');
insertRelation.run(2, 1, 'idle', '');
insertRelation.run(3, 1, 'focusing', '刷算法题');
insertRelation.run(4, 2, 'idle', '');
console.log('🔗 已插入 4 条房间关联');

console.log('\n🎉 数据库初始化完成! 测试数据已就绪。');
console.log('📌 测试账号: zhangsan / lisi / wangwu / zhaoliu  密码: 123456');
