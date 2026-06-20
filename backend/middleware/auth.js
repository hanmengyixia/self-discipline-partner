const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'self_discipline_partner_2026_secret_key';

// 生成 Token
function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

// 验证 Token 中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, msg: '未登录或 Token 已过期', data: null });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.json({ code: 401, msg: 'Token 无效或已过期', data: null });
  }
}

module.exports = { generateToken, authMiddleware, JWT_SECRET };
