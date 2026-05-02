const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { requireAuth, requireRole } = require('../middleware/auth');

const SORT_COLS = {
  name:      'name',
  quartile:  `CASE quartile WHEN 'Q1' THEN 1 WHEN 'Q2' THEN 2 WHEN 'Q3' THEN 3 WHEN 'Q4' THEN 4 ELSE 5 END`,
  jcr_score: 'CAST(jcr_score AS REAL)',
  h_index:   'h_index',
  points:    'points',
};

// GET /api/journals - list with search, filter, pagination, sort
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      search = '', list_type = '', field = '', quartile = '',
      page = '1', limit = '50',
      sort_by = 'name', sort_dir = 'asc',
    } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(200, Math.max(10, parseInt(limit)));
    const offset = (pageNum - 1) * pageSize;

    const conditions = [];
    const args = [];

    if (search) {
      conditions.push(`(name LIKE ? OR issn LIKE ? OR eissn LIKE ?)`);
      const q = `%${search}%`;
      args.push(q, q, q);
    }
    if (list_type) {
      conditions.push(`list_type = ?`);
      args.push(list_type);
    }
    if (field) {
      conditions.push(`field = ?`);
      args.push(field);
    }
    if (quartile) {
      conditions.push(`quartile = ?`);
      args.push(quartile);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderCol = SORT_COLS[sort_by] || 'name';
    const orderDir = sort_dir === 'desc' ? 'DESC' : 'ASC';
    const nullsLast = orderDir === 'DESC' ? '' : '';

    const countResult = await client.execute({ sql: `SELECT COUNT(*) as total FROM journal_catalog ${where}`, args });
    const total = Number(countResult.rows[0].total);

    const { rows } = await client.execute({
      sql: `SELECT * FROM journal_catalog ${where} ORDER BY ${orderCol} ${orderDir}, name ASC LIMIT ? OFFSET ?`,
      args: [...args, pageSize, offset],
    });

    res.json({ data: rows, total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/fields - distinct field values
router.get('/fields', requireAuth, async (req, res) => {
  try {
    const { list_type = '' } = req.query;
    const where = list_type ? `WHERE list_type = ? AND field IS NOT NULL AND field != ''` : `WHERE field IS NOT NULL AND field != ''`;
    const args = list_type ? [list_type] : [];
    const { rows } = await client.execute({ sql: `SELECT DISTINCT field FROM journal_catalog ${where} ORDER BY field`, args });
    res.json(rows.map(r => r.field));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await client.execute({ sql: `SELECT * FROM journal_catalog WHERE id = ?`, args: [req.params.id] });
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journals - create (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, issn, eissn, list_type = 'quoc_te', type, organization, points, field, url, quartile, sjr_score, jcr_score, h_index, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên tạp chí là bắt buộc' });
    const r = await client.execute({
      sql: `INSERT INTO journal_catalog (name, issn, eissn, list_type, type, organization, points, field, url, quartile, sjr_score, jcr_score, h_index, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [name, issn || null, eissn || null, list_type, type || null, organization || null, points || null, field || null, url || null, quartile || null, sjr_score || null, jcr_score || null, h_index || null, notes || null],
    });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journals/:id - update (admin only)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, issn, eissn, list_type, type, organization, points, field, url, quartile, sjr_score, jcr_score, h_index, notes } = req.body;
    await client.execute({
      sql: `UPDATE journal_catalog SET name=?, issn=?, eissn=?, list_type=?, type=?, organization=?, points=?, field=?, url=?, quartile=?, sjr_score=?, jcr_score=?, h_index=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      args: [name, issn || null, eissn || null, list_type, type || null, organization || null, points || null, field || null, url || null, quartile || null, sjr_score || null, jcr_score || null, h_index || null, notes || null, req.params.id],
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/journals/:id - delete (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await client.execute({ sql: `DELETE FROM journal_catalog WHERE id = ?`, args: [req.params.id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journals/dedup - re-run deduplication (admin only)
router.post('/dedup', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    function normIssn(s) {
      if (!s) return null;
      const n = s.replace(/[-‐‑–—\s]/g, '').trim().toUpperCase();
      return n.length >= 7 ? n : null;
    }
    function bestStr(...vals) {
      return vals.find(v => v && String(v).trim()) || null;
    }
    const TYPE_PRIORITY = { isi: 0, quoc_te: 1, draft_quoc_te: 2 };

    const { rows: all } = await client.execute('SELECT * FROM journal_catalog');
    const intl = all.filter(r => r.list_type !== 'quoc_gia');
    const qg   = all.filter(r => r.list_type === 'quoc_gia');

    const issnMap = new Map();
    const noIssn  = [];
    for (const r of intl) {
      const ni = normIssn(r.issn) || normIssn(r.eissn);
      if (!ni) { noIssn.push(r); continue; }
      if (!issnMap.has(ni)) issnMap.set(ni, []);
      issnMap.get(ni).push(r);
    }

    const toUpdate = [];
    const toDelete = new Set();

    for (const [, group] of issnMap) {
      if (group.length === 1) { toUpdate.push({ id: group[0].id, data: { ...group[0], sources: group[0].list_type } }); continue; }
      group.sort((a, b) => (TYPE_PRIORITY[a.list_type] ?? 9) - (TYPE_PRIORITY[b.list_type] ?? 9));
      const srcTypes = [...new Set(group.map(r => r.list_type))];
      const nameCandidate = group.find(r => r.list_type === 'isi')?.name
        || group.reduce((a, b) => (b.name?.length > a.name?.length ? b : a), group[0]).name;
      const merged = {
        name: nameCandidate, issn: bestStr(...group.map(r => r.issn)), eissn: bestStr(...group.map(r => r.eissn)),
        list_type: group[0].list_type, type: bestStr(...group.map(r => r.type)),
        organization: bestStr(...group.map(r => r.organization)), points: bestStr(...group.map(r => r.points)),
        field: bestStr(...group.filter(r => r.list_type !== 'draft_quoc_te').map(r => r.field)),
        url: bestStr(...group.map(r => r.url)), quartile: bestStr(...group.map(r => r.quartile)),
        sjr_score: bestStr(...group.map(r => r.sjr_score)), jcr_score: bestStr(...group.map(r => r.jcr_score)),
        h_index: group.map(r => r.h_index).find(v => v != null) ?? null,
        notes: bestStr(...group.map(r => r.notes)), sources: srcTypes.join(','),
      };
      toUpdate.push({ id: group[0].id, data: merged });
      for (let i = 1; i < group.length; i++) toDelete.add(group[i].id);
    }
    for (const r of noIssn) toUpdate.push({ id: r.id, data: { ...r, sources: r.list_type } });

    const qgMap = new Map();
    for (const r of qg) {
      const ni  = normIssn(r.issn) || r.name?.trim().toLowerCase().slice(0, 40) || String(r.id);
      const key = ni + '|' + (r.field?.trim() || '');
      if (!qgMap.has(key)) qgMap.set(key, []);
      qgMap.get(key).push(r);
    }
    for (const [, group] of qgMap) {
      if (group.length === 1) { toUpdate.push({ id: group[0].id, data: { ...group[0], sources: 'quoc_gia' } }); continue; }
      const merged = { ...group[0], name: bestStr(...group.map(r => r.name)), organization: bestStr(...group.map(r => r.organization)), url: bestStr(...group.map(r => r.url)), notes: bestStr(...group.map(r => r.notes)), sources: 'quoc_gia' };
      toUpdate.push({ id: group[0].id, data: merged });
      for (let i = 1; i < group.length; i++) toDelete.add(group[i].id);
    }

    const BATCH = 200;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH).map(({ id, data: d }) => ({
        sql: `UPDATE journal_catalog SET name=?,issn=?,eissn=?,list_type=?,type=?,organization=?,points=?,field=?,url=?,quartile=?,sjr_score=?,jcr_score=?,h_index=?,notes=?,sources=?,updated_at=datetime('now') WHERE id=?`,
        args: [d.name, d.issn, d.eissn, d.list_type, d.type, d.organization, d.points, d.field, d.url, d.quartile, d.sjr_score, d.jcr_score, d.h_index, d.notes, d.sources, id]
      }));
      await client.batch(batch, 'write');
    }
    const delArr = [...toDelete];
    for (let i = 0; i < delArr.length; i += 500) {
      const chunk = delArr.slice(i, i + 500);
      await client.execute({ sql: `DELETE FROM journal_catalog WHERE id IN (${chunk.map(() => '?').join(',')})`, args: chunk });
    }
    // Apply scoring: compute points for international journals based on quartile
    await client.execute(`
      UPDATE journal_catalog
      SET points = CASE quartile
        WHEN 'Q1' THEN '2.0'
        WHEN 'Q2' THEN '1.5'
        WHEN 'Q3' THEN '1.25'
        WHEN 'Q4' THEN '1.0'
        ELSE '1.0'
      END,
      updated_at = datetime('now')
      WHERE list_type IN ('isi', 'quoc_te', 'draft_quoc_te')
    `);

    const { rows: [{ c }] } = await client.execute('SELECT COUNT(*) as c FROM journal_catalog');
    res.json({ success: true, remaining: Number(c), deleted: toDelete.size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journals/import - import from Publications.xlsx (admin only)
router.post('/import', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const path = require('path');
    const xlsxPath = path.join(__dirname, '../../../Publications.xlsx');
    const wb = XLSX.readFile(xlsxPath);

    let inserted = 0;
    const errors = [];

    // Clear existing data first
    await client.execute({ sql: `DELETE FROM journal_catalog`, args: [] });

    const BATCH_SIZE = 200;

    const batchInsert = async (rows) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map(r => ({
          sql: `INSERT INTO journal_catalog (name, issn, eissn, list_type, type, organization, points, field, url, quartile, sjr_score, jcr_score, h_index, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: r,
        }));
        await client.batch(batch, 'write');
        inserted += batch.length;
      }
    };

    // 1. DS tạp chí quốc gia
    const sheetQG = wb.Sheets['DS tạp chí quốc gia'];
    if (sheetQG) {
      const data = XLSX.utils.sheet_to_json(sheetQG, { header: 1, defval: '' });
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = String(row[1] || '').trim();
        if (!name) continue;
        const issn = String(row[2] || '').trim() || null;
        const type = String(row[3] || '').trim() || null;
        const org = String(row[4] || '').trim() || null;
        const points = String(row[5] || '').trim() || null;
        const field = String(row[6] || '').trim() || null;
        const url = String(row[7] || '').trim() || null;
        const notes = String(row[9] || '').trim() || null;
        rows.push([name, issn, null, 'quoc_gia', type, org, points, field, url, null, null, null, null, notes]);
      }
      await batchInsert(rows);
    }

    // 2. DS tạp chí ISI
    const sheetISI = wb.Sheets['DS tạp chí ISI'];
    if (sheetISI) {
      const data = XLSX.utils.sheet_to_json(sheetISI, { header: 1, defval: '' });
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = String(row[1] || '').trim();
        if (!name) continue;
        const issn = String(row[2] || '').trim() || null;
        const eissn = String(row[3] || '').trim() || null;
        const field = String(row[4] || '').trim() || null;
        const url = String(row[5] || '').trim() || null;
        const notes = String(row[6] || '').trim() || null;
        rows.push([name, issn, eissn, 'isi', 'Tạp chí', null, null, field, url, null, null, null, null, notes]);
      }
      await batchInsert(rows);
    }

    // 3. DS tạp chí quốc tế
    const sheetQT = wb.Sheets['DS tạp chí quốc tế'];
    if (sheetQT) {
      const data = XLSX.utils.sheet_to_json(sheetQT, { header: 1, defval: '' });
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = String(row[1] || '').trim();
        if (!name) continue;
        const issn = String(row[2] || '').trim() || null;
        const eissn = String(row[3] || '').trim() || null;
        const field = String(row[4] || '').trim() || null;
        const url = String(row[5] || '').trim() || null;
        const notes = String(row[6] || '').trim() || null;
        rows.push([name, issn, eissn, 'quoc_te', 'Tạp chí', null, null, field, url, null, null, null, null, notes]);
      }
      await batchInsert(rows);
    }

    // 4. Draft Tạp chí Quốc tế (has SJR, JCR, H-index, quartile)
    const sheetDraft = wb.Sheets['Draft Tạp chí Quốc tế'];
    if (sheetDraft) {
      const data = XLSX.utils.sheet_to_json(sheetDraft, { header: 1, defval: '' });
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = String(row[1] || '').trim();
        if (!name) continue;
        const issn = String(row[2] || '').trim().replace(/[‑]/g, '-') || null;
        const eissn = String(row[3] || '').trim().replace(/[‑]/g, '-') || null;
        const quartile = String(row[4] || '').trim() || null;
        const jcr = String(row[5] || '').trim() || null;
        const hIdx = parseInt(row[6]) || null;
        const url = String(row[7] || '').trim() || null;
        rows.push([name, issn, eissn, 'draft_quoc_te', 'Tạp chí', null, null, null, url, quartile, null, jcr, hIdx, null]);
      }
      await batchInsert(rows);
    }

    // Auto-dedup after import via internal call
    const dedupRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/journals/dedup`, {
      method: 'POST',
      headers: { Authorization: req.headers.authorization, 'Content-Type': 'application/json' },
    });
    const dedupData = await dedupRes.json().catch(() => ({}));

    res.json({ success: true, inserted, after_dedup: dedupData.remaining, deleted_duplicates: dedupData.deleted, errors });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
