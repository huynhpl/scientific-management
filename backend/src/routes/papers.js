const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { requireAuth, getVisibleAuthorIds } = require('../middleware/auth');

async function getPapersWithAuthors(whereClause = '', args = []) {
  const papersResult = await client.execute({
    sql: `SELECT p.*, v.name as venue_name, v.abbreviation as venue_abbreviation,
      v.type as venue_type, v.ranking as venue_ranking, v.impact_factor as venue_impact_factor
      FROM papers p LEFT JOIN venues v ON p.venue_id = v.id
      ${whereClause} ORDER BY p.updated_at DESC`,
    args
  });

  if (!papersResult.rows.length) return [];

  const authorsResult = await client.execute(
    `SELECT pa.paper_id, pa.role, pa.order_index, a.id, a.name, a.email, a.affiliation
     FROM paper_authors pa JOIN authors a ON pa.author_id = a.id`
  );

  const byPaper = {};
  for (const a of authorsResult.rows) {
    if (!byPaper[a.paper_id]) byPaper[a.paper_id] = [];
    byPaper[a.paper_id].push(a);
  }

  return papersResult.rows.map(p => ({
    ...p,
    venue: p.venue_id ? { id: p.venue_id, name: p.venue_name, abbreviation: p.venue_abbreviation, type: p.venue_type, ranking: p.venue_ranking, impact_factor: p.venue_impact_factor } : null,
    authors: (byPaper[p.id] || []).sort((a, b) => a.order_index - b.order_index)
  }));
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const visibleIds = await getVisibleAuthorIds(req.user);

    let papers;
    if (visibleIds === null) {
      papers = await getPapersWithAuthors();
    } else if (visibleIds.length === 0) {
      papers = [];
    } else {
      const placeholders = visibleIds.map(() => '?').join(',');
      papers = await getPapersWithAuthors(
        `WHERE EXISTS (SELECT 1 FROM paper_authors pa WHERE pa.paper_id = p.id AND pa.author_id IN (${placeholders}))`,
        visibleIds
      );
    }

    const { status, type, venue_id, author_id, search } = req.query;
    if (status) papers = papers.filter(p => p.status === status);
    if (type) papers = papers.filter(p => p.type === type);
    if (venue_id) papers = papers.filter(p => String(p.venue_id) === venue_id);
    if (author_id) papers = papers.filter(p => p.authors.some(a => String(a.id) === author_id));
    if (search) {
      const q = search.toLowerCase();
      papers = papers.filter(p => p.title.toLowerCase().includes(q) || (p.abstract && p.abstract.toLowerCase().includes(q)));
    }
    res.json(papers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const papers = await getPapersWithAuthors('WHERE p.id = ?', [req.params.id]);
    if (!papers.length) return res.status(404).json({ error: 'Không tìm thấy bài báo' });
    const paper = papers[0];

    // Check access
    const visibleIds = await getVisibleAuthorIds(req.user);
    if (visibleIds !== null && visibleIds.length > 0) {
      const hasAccess = paper.authors.some(a => visibleIds.includes(Number(a.id)));
      if (!hasAccess) return res.status(403).json({ error: 'Không có quyền xem bài báo này' });
    } else if (visibleIds !== null && visibleIds.length === 0) {
      return res.status(403).json({ error: 'Không có quyền xem bài báo này' });
    }

    const [filesR, actR] = await Promise.all([
      client.execute({ sql: 'SELECT * FROM files WHERE paper_id = ? ORDER BY uploaded_at DESC', args: [req.params.id] }),
      client.execute({ sql: 'SELECT * FROM activity_log WHERE paper_id = ? ORDER BY created_at DESC', args: [req.params.id] })
    ]);
    paper.files = filesR.rows;
    paper.activity = actR.rows;
    res.json(paper);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, abstract, type, venue_id, status, submission_date, decision_date,
      publication_date, submission_deadline, revision_deadline, doi, arxiv_url,
      paper_url, openreview_url, notes, authors } = req.body;

    const r = await client.execute({
      sql: `INSERT INTO papers (title,abstract,type,venue_id,status,submission_date,decision_date,publication_date,submission_deadline,revision_deadline,doi,arxiv_url,paper_url,openreview_url,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [title, abstract||null, type||'conference', venue_id||null, status||'draft',
        submission_date||null, decision_date||null, publication_date||null,
        submission_deadline||null, revision_deadline||null,
        doi||null, arxiv_url||null, paper_url||null, openreview_url||null, notes||null]
    });
    const paperId = Number(r.lastInsertRowid);

    if (authors && authors.length > 0) {
      await client.batch(authors.map((a, i) => ({
        sql: 'INSERT INTO paper_authors (paper_id,author_id,role,order_index) VALUES (?,?,?,?)',
        args: [paperId, a.id, a.role||'co-author', a.order_index??i]
      })), 'write');
    }

    await client.execute({ sql: 'INSERT INTO activity_log (paper_id,action,details) VALUES (?,?,?)', args: [paperId, 'created', `Tạo bài báo với trạng thái: ${status||'draft'}`] });
    res.status(201).json({ id: paperId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const oldR = await client.execute({ sql: 'SELECT status FROM papers WHERE id=?', args: [req.params.id] });
    if (!oldR.rows.length) return res.status(404).json({ error: 'Không tìm thấy bài báo' });
    const oldStatus = oldR.rows[0].status;

    const { title, abstract, type, venue_id, status, submission_date, decision_date,
      publication_date, submission_deadline, revision_deadline, doi, arxiv_url,
      paper_url, openreview_url, notes, authors } = req.body;

    await client.execute({
      sql: `UPDATE papers SET title=?,abstract=?,type=?,venue_id=?,status=?,submission_date=?,decision_date=?,publication_date=?,submission_deadline=?,revision_deadline=?,doi=?,arxiv_url=?,paper_url=?,openreview_url=?,notes=?,updated_at=datetime('now') WHERE id=?`,
      args: [title, abstract||null, type, venue_id||null, status,
        submission_date||null, decision_date||null, publication_date||null,
        submission_deadline||null, revision_deadline||null,
        doi||null, arxiv_url||null, paper_url||null, openreview_url||null, notes||null,
        req.params.id]
    });

    if (authors !== undefined) {
      await client.execute({ sql: 'DELETE FROM paper_authors WHERE paper_id=?', args: [req.params.id] });
      if (authors.length > 0) {
        await client.batch(authors.map((a, i) => ({
          sql: 'INSERT INTO paper_authors (paper_id,author_id,role,order_index) VALUES (?,?,?,?)',
          args: [req.params.id, a.id, a.role||'co-author', a.order_index??i]
        })), 'write');
      }
    }

    if (oldStatus !== status) {
      await client.execute({ sql: 'INSERT INTO activity_log (paper_id,action,details) VALUES (?,?,?)', args: [req.params.id, 'status_changed', `Trạng thái: ${oldStatus} → ${status}`] });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const r = await client.execute({ sql: 'DELETE FROM papers WHERE id=?', args: [req.params.id] });
    if (r.rowsAffected === 0) return res.status(404).json({ error: 'Không tìm thấy bài báo' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/activity', requireAuth, async (req, res) => {
  try {
    await client.execute({ sql: 'INSERT INTO activity_log (paper_id,action,details) VALUES (?,?,?)', args: [req.params.id, 'note', req.body.details] });
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
