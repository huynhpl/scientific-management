const express = require('express');
const router = express.Router();
const { client } = require('../database');

router.get('/', async (req, res) => {
  try {
    const r = await client.execute('SELECT * FROM authors ORDER BY is_member DESC, name ASC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await client.execute({ sql: 'SELECT * FROM authors WHERE id=?', args: [req.params.id] });
    if (!r.rows.length) return res.status(404).json({ error: 'Không tìm thấy tác giả' });
    const papers = await client.execute({
      sql: `SELECT p.id, p.title, p.status, p.type, pa.role, pa.order_index, v.name as venue_name, v.abbreviation as venue_abbreviation FROM papers p JOIN paper_authors pa ON p.id=pa.paper_id LEFT JOIN venues v ON p.venue_id=v.id WHERE pa.author_id=? ORDER BY p.updated_at DESC`,
      args: [req.params.id]
    });
    res.json({ ...r.rows[0], papers: papers.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, affiliation, is_member, group_type, member_role } = req.body;
    const r = await client.execute({ sql: 'INSERT INTO authors (name,email,affiliation,is_member,group_type,member_role) VALUES (?,?,?,?,?,?)', args: [name, email||null, affiliation||null, is_member ? 1 : 0, group_type||'Khác', member_role||'SV'] });
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, affiliation, is_member, group_type, member_role } = req.body;
    const r = await client.execute({ sql: 'UPDATE authors SET name=?,email=?,affiliation=?,is_member=?,group_type=?,member_role=? WHERE id=?', args: [name, email||null, affiliation||null, is_member ? 1 : 0, group_type||'Khác', member_role||'SV', req.params.id] });
    if (r.rowsAffected === 0) return res.status(404).json({ error: 'Không tìm thấy tác giả' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await client.execute({ sql: 'DELETE FROM authors WHERE id=?', args: [req.params.id] });
    if (r.rowsAffected === 0) return res.status(404).json({ error: 'Không tìm thấy tác giả' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
