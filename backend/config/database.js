const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    // 开启 WAL 模式提升并发性能
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

module.exports = { getDatabase, DB_PATH };
