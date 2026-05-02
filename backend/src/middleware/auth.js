const jwt = require('jsonwebtoken');
const { client } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'research_paper_manager_jwt_secret_2025';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    next();
  };
}

// Returns author_ids that the current user is allowed to see.
// admin: null (no filter), lead: own + team members, member: own only
async function getVisibleAuthorIds(user) {
  if (user.role === 'admin') return null;

  const ownAuthorId = user.author_id;
  if (!ownAuthorId) return [];

  if (user.role === 'member') return [ownAuthorId];

  // lead: own + all members across their teams
  const { rows } = await client.execute({
    sql: `SELECT DISTINCT tm2.author_id
          FROM team_members tm1
          JOIN team_members tm2 ON tm1.team_id = tm2.team_id
          WHERE tm1.author_id = ?`,
    args: [ownAuthorId],
  });
  const ids = rows.map(r => Number(r.author_id));
  if (!ids.includes(ownAuthorId)) ids.push(ownAuthorId);
  return ids;
}

module.exports = { requireAuth, requireRole, getVisibleAuthorIds, JWT_SECRET };
