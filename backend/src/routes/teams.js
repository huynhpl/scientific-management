const express = require('express');
const router = express.Router();
const { client } = require('../database');

function currentYear() { return String(new Date().getFullYear()); }

// List all teams with member count + KPI progress
router.get('/', async (req, res) => {
  try {
    const yr = currentYear();
    const teamsResult = await client.execute('SELECT * FROM teams ORDER BY name');

    const teams = await Promise.all(teamsResult.rows.map(async (team) => {
      const [memberCount, achieved, inProgress] = await Promise.all([
        client.execute({ sql: 'SELECT COUNT(*) as c FROM team_members WHERE team_id=?', args: [team.id] }),
        client.execute({
          sql: `SELECT COUNT(DISTINCT p.id) as c FROM papers p
                JOIN paper_authors pa ON p.id=pa.paper_id
                JOIN team_members tm ON pa.author_id=tm.author_id
                WHERE tm.team_id=? AND p.status IN ('accepted','published')
                AND strftime('%Y', COALESCE(p.decision_date, p.publication_date))=?`,
          args: [team.id, yr],
        }),
        client.execute({
          sql: `SELECT COUNT(DISTINCT p.id) as c FROM papers p
                JOIN paper_authors pa ON p.id=pa.paper_id
                JOIN team_members tm ON pa.author_id=tm.author_id
                WHERE tm.team_id=? AND p.status IN ('submitted','under_review','major_revision','minor_revision')`,
          args: [team.id],
        }),
      ]);
      return {
        ...team,
        member_count: Number(memberCount.rows[0].c),
        achieved: Number(achieved.rows[0].c),
        in_progress: Number(inProgress.rows[0].c),
      };
    }));

    res.json(teams);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single team with members and individual KPI progress
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const yr = currentYear();

    const teamResult = await client.execute({ sql: 'SELECT * FROM teams WHERE id=?', args: [id] });
    if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy nhóm' });

    const membersResult = await client.execute({
      sql: `SELECT a.id, a.name, a.email, a.affiliation, tm.kpi_papers
            FROM team_members tm JOIN authors a ON tm.author_id=a.id
            WHERE tm.team_id=? ORDER BY a.name`,
      args: [id],
    });

    const members = await Promise.all(membersResult.rows.map(async (m) => {
      const [achieved, inProgress] = await Promise.all([
        client.execute({
          sql: `SELECT COUNT(DISTINCT p.id) as c FROM papers p
                JOIN paper_authors pa ON p.id=pa.paper_id
                WHERE pa.author_id=? AND p.status IN ('accepted','published')
                AND strftime('%Y', COALESCE(p.decision_date, p.publication_date))=?`,
          args: [m.id, yr],
        }),
        client.execute({
          sql: `SELECT COUNT(DISTINCT p.id) as c FROM papers p
                JOIN paper_authors pa ON p.id=pa.paper_id
                WHERE pa.author_id=? AND p.status IN ('submitted','under_review','major_revision','minor_revision')`,
          args: [m.id],
        }),
      ]);
      return { ...m, achieved: Number(achieved.rows[0].c), in_progress: Number(inProgress.rows[0].c) };
    }));

    const teamAchievedResult = await client.execute({
      sql: `SELECT COUNT(DISTINCT p.id) as c FROM papers p
            JOIN paper_authors pa ON p.id=pa.paper_id
            JOIN team_members tm ON pa.author_id=tm.author_id
            WHERE tm.team_id=? AND p.status IN ('accepted','published')
            AND strftime('%Y', COALESCE(p.decision_date, p.publication_date))=?`,
      args: [id, yr],
    });

    res.json({ ...teamResult.rows[0], members, achieved: Number(teamAchievedResult.rows[0].c) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { name, description, kpi_papers_per_year } = req.body;
    const r = await client.execute({
      sql: 'INSERT INTO teams (name, description, kpi_papers_per_year) VALUES (?,?,?)',
      args: [name, description || null, Number(kpi_papers_per_year) || 0],
    });
    res.json({ id: Number(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { name, description, kpi_papers_per_year } = req.body;
    await client.execute({
      sql: 'UPDATE teams SET name=?, description=?, kpi_papers_per_year=? WHERE id=?',
      args: [name, description || null, Number(kpi_papers_per_year) || 0, req.params.id],
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    await client.execute({ sql: 'DELETE FROM teams WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add/update member in team
router.post('/:id/members', async (req, res) => {
  try {
    const { author_id, kpi_papers } = req.body;
    await client.execute({
      sql: 'INSERT OR REPLACE INTO team_members (team_id, author_id, kpi_papers) VALUES (?,?,?)',
      args: [req.params.id, author_id, Number(kpi_papers) || 0],
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update member KPI
router.put('/:id/members/:authorId', async (req, res) => {
  try {
    await client.execute({
      sql: 'UPDATE team_members SET kpi_papers=? WHERE team_id=? AND author_id=?',
      args: [Number(req.body.kpi_papers) || 0, req.params.id, req.params.authorId],
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove member from team
router.delete('/:id/members/:authorId', async (req, res) => {
  try {
    await client.execute({
      sql: 'DELETE FROM team_members WHERE team_id=? AND author_id=?',
      args: [req.params.id, req.params.authorId],
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
