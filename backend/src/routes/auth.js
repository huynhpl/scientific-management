const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, author_id: user.author_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, author_id } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username và password là bắt buộc' });
    if (!['admin', 'lead', 'member'].includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' });
    if (username.length < 3) return res.status(400).json({ error: 'Username tối thiểu 3 ký tự' });
    if (password.length < 6) return res.status(400).json({ error: 'Password tối thiểu 6 ký tự' });

    const { rows: existing } = await client.execute({ sql: 'SELECT id FROM users WHERE username=?', args: [username] });
    if (existing.length) return res.status(409).json({ error: 'Username đã tồn tại' });

    const password_hash = await bcrypt.hash(password, 10);
    const r = await client.execute({
      sql: 'INSERT INTO users (username, password_hash, role, author_id) VALUES (?,?,?,?)',
      args: [username, password_hash, role || 'member', author_id || null],
    });
    const userId = Number(r.lastInsertRowid);
    const { rows } = await client.execute({ sql: 'SELECT id, username, role, author_id FROM users WHERE id=?', args: [userId] });
    const user = rows[0];
    res.status(201).json({ token: makeToken(user), user: { id: user.id, username: user.username, role: user.role, author_id: user.author_id } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username và password là bắt buộc' });

    const { rows } = await client.execute({ sql: 'SELECT * FROM users WHERE username=?', args: [username] });
    if (!rows.length) return res.status(401).json({ error: 'Username hoặc password không đúng' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Username hoặc password không đúng' });

    // Fetch author info if linked
    let authorInfo = null;
    if (user.author_id) {
      const { rows: aRows } = await client.execute({ sql: 'SELECT id, name, email, member_role, group_type FROM authors WHERE id=?', args: [user.author_id] });
      if (aRows.length) authorInfo = aRows[0];
    }

    res.json({
      token: makeToken(user),
      user: { id: user.id, username: user.username, role: user.role, author_id: user.author_id, author: authorInfo },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await client.execute({ sql: 'SELECT id, username, role, author_id FROM users WHERE id=?', args: [req.user.id] });
    if (!rows.length) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    const user = rows[0];

    let authorInfo = null;
    if (user.author_id) {
      const { rows: aRows } = await client.execute({ sql: 'SELECT id, name, email, member_role, group_type FROM authors WHERE id=?', args: [user.author_id] });
      if (aRows.length) authorInfo = aRows[0];
    }
    res.json({ id: user.id, username: user.username, role: user.role, author_id: user.author_id, author: authorInfo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/users  (admin only - list all users for management)
router.get('/users', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin mới có quyền' });
    const { rows } = await client.execute(
      `SELECT u.id, u.username, u.role, u.author_id, u.created_at, a.name as author_name
       FROM users u LEFT JOIN authors a ON u.author_id = a.id ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/members - public list of members for registration dropdown
router.get('/members', async (req, res) => {
  try {
    const { rows } = await client.execute(
      'SELECT id, name, member_role, group_type FROM authors WHERE is_member=1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
