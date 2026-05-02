const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { requireAuth, getVisibleAuthorIds } = require('../middleware/auth');

router.get('/overview', requireAuth, async (req, res) => {
  try {
    const year = String(new Date().getFullYear());
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const visibleIds = await getVisibleAuthorIds(req.user);
    // visibleIds === null means admin (no filter)
    const hasFilter = visibleIds !== null;

    // Build a subquery to restrict to papers where at least one author is visible
    // Used in all paper-level queries when filter applies
    const paperSubquery = hasFilter && visibleIds.length > 0
      ? `EXISTS (SELECT 1 FROM paper_authors pa WHERE pa.paper_id = p.id AND pa.author_id IN (${visibleIds.join(',')}))`
      : hasFilter
        ? '0' // no visible authors => no papers
        : '1';

    const whereClause = `WHERE (${paperSubquery})`;
    const andClause = `AND (${paperSubquery})`;

    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
      client.execute(`SELECT COUNT(*) as c FROM papers p ${whereClause}`),
      client.execute(`SELECT COUNT(*) as c FROM papers p WHERE p.status IN ('submitted','under_review','major_revision','minor_revision') ${andClause}`),
      client.execute({ sql: `SELECT COUNT(*) as c FROM papers p WHERE p.status IN ('accepted','published') AND strftime('%Y',p.decision_date)=? ${andClause}`, args: [year] }),
      client.execute({ sql: `SELECT COUNT(*) as c FROM papers p WHERE p.status='published' AND strftime('%Y',p.publication_date)=? ${andClause}`, args: [year] }),
      client.execute(`SELECT COUNT(*) as c FROM papers p WHERE p.status='draft' ${andClause}`),
      client.execute(`SELECT p.status, COUNT(*) as count FROM papers p ${whereClause} GROUP BY p.status`),
      client.execute(`SELECT p.type, COUNT(*) as count FROM papers p ${whereClause} GROUP BY p.type`),
      // byAuthor: restrict to visible authors
      hasFilter && visibleIds.length > 0
        ? client.execute({
            sql: `SELECT a.name, a.id, COUNT(DISTINCT pa.paper_id) as total, SUM(CASE WHEN p.status IN ('accepted','published') THEN 1 ELSE 0 END) as accepted FROM authors a JOIN paper_authors pa ON a.id=pa.author_id JOIN papers p ON pa.paper_id=p.id WHERE a.is_member=1 AND a.id IN (${visibleIds.map(() => '?').join(',')}) GROUP BY a.id ORDER BY total DESC`,
            args: visibleIds,
          })
        : !hasFilter
          ? client.execute(`SELECT a.name, a.id, COUNT(DISTINCT pa.paper_id) as total, SUM(CASE WHEN p.status IN ('accepted','published') THEN 1 ELSE 0 END) as accepted FROM authors a JOIN paper_authors pa ON a.id=pa.author_id JOIN papers p ON pa.paper_id=p.id WHERE a.is_member=1 GROUP BY a.id ORDER BY total DESC`)
          : Promise.resolve({ rows: [] }),
      // deadlines
      client.execute({ sql: `SELECT p.id, p.title, p.status, p.submission_deadline, p.revision_deadline, v.abbreviation as venue_abbreviation FROM papers p LEFT JOIN venues v ON p.venue_id=v.id WHERE p.status NOT IN ('published','rejected','withdrawn') AND ((p.submission_deadline BETWEEN ? AND ?) OR (p.revision_deadline BETWEEN ? AND ?)) ${andClause} ORDER BY COALESCE(p.submission_deadline, p.revision_deadline) ASC`, args: [today, in30, today, in30] }),
      // byVenue
      client.execute(`SELECT v.name, v.abbreviation, v.type, COUNT(p.id) as count FROM venues v JOIN papers p ON v.id=p.venue_id ${whereClause.replace('p.id', 'p.id')} GROUP BY v.id ORDER BY count DESC LIMIT 10`),
      // byTeam: for admin/lead show team KPI; for member show only their teams
      hasFilter && visibleIds.length > 0
        ? client.execute({ sql: `SELECT t.id, t.name, t.kpi_papers_per_year as kpi, COUNT(DISTINCT p.id) as achieved FROM teams t LEFT JOIN team_members tm ON t.id=tm.team_id LEFT JOIN paper_authors pa ON tm.author_id=pa.author_id LEFT JOIN papers p ON pa.paper_id=p.id AND p.status IN ('accepted','published') AND strftime('%Y', COALESCE(p.decision_date, p.publication_date))=? WHERE tm.author_id IN (${visibleIds.map(() => '?').join(',')}) GROUP BY t.id ORDER BY t.name`, args: [year, ...visibleIds] })
        : !hasFilter
          ? client.execute({ sql: `SELECT t.id, t.name, t.kpi_papers_per_year as kpi, COUNT(DISTINCT p.id) as achieved FROM teams t LEFT JOIN team_members tm ON t.id=tm.team_id LEFT JOIN paper_authors pa ON tm.author_id=pa.author_id LEFT JOIN papers p ON pa.paper_id=p.id AND p.status IN ('accepted','published') AND strftime('%Y', COALESCE(p.decision_date, p.publication_date))=? GROUP BY t.id ORDER BY t.name`, args: [year] })
          : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      total: Number(r1.rows[0].c),
      underReview: Number(r2.rows[0].c),
      acceptedThisYear: Number(r3.rows[0].c),
      publishedThisYear: Number(r4.rows[0].c),
      draftCount: Number(r5.rows[0].c),
      byStatus: r6.rows.map(r => ({ status: r.status, count: Number(r.count) })),
      byType: r7.rows.map(r => ({ type: r.type, count: Number(r.count) })),
      byAuthor: r8.rows.map(r => ({ id: r.id, name: r.name, total: Number(r.total), accepted: Number(r.accepted) })),
      deadlines: r9.rows,
      byVenue: r10.rows.map(r => ({ ...r, count: Number(r.count) })),
      byTeam: r11.rows.map(r => ({ id: Number(r.id), name: r.name, kpi: Number(r.kpi), achieved: Number(r.achieved) })),
      // Pass scope info to frontend
      scope: req.user.role === 'admin' ? 'all' : req.user.role === 'lead' ? 'team' : 'personal',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
