const express = require('express');
const router = express.Router();
const { client } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Score a paper based on venue ranking and paper type
function baseScore(paperType, venueType, ranking) {
  const r = (ranking || '').toUpperCase();

  if (paperType === 'journal') {
    if (r.includes('Q1')) return { score: 2.0, label: 'Q1' };
    if (r.includes('Q2')) return { score: 1.5, label: 'Q2' };
    if (r.includes('Q3')) return { score: 1.25, label: 'Q3' };
    if (r.includes('Q4')) return { score: 1.0, label: 'Q4' };
    return { score: 1.0, label: 'ISI/Quốc tế' };
  }

  if (paperType === 'conference' || paperType === 'workshop') {
    if (r.includes('A*') || r === 'A+') return { score: 1.0, label: 'A*' };
    if (r === 'A') return { score: 0.75, label: 'A' };
    if (r === 'B') return { score: 0.5, label: 'B' };
    return { score: 0.5, label: 'Hội nghị' };
  }

  return { score: 0, label: '—' };
}

// Compute author's personal score from base score
// Rule: first/corresponding gets 1/3 + equal share of 2/3; co-author gets equal share of 2/3
function authorScore(base, role, nAuthors) {
  const n = Math.max(1, nAuthors);
  if (role === 'first' || role === 'corresponding') {
    return Math.round((base / 3 + (base * 2) / 3 / n) * 1000) / 1000;
  }
  return Math.round(((base * 2) / 3 / n) * 1000) / 1000;
}

function isWithinYears(dateStr, years) {
  if (!dateStr) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return new Date(dateStr) >= cutoff;
}

function paperDate(paper) {
  return paper.decision_date || paper.publication_date || paper.submission_date || null;
}

// GET /api/profile — full profile for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    // Re-query DB so author_id is current even if JWT was issued before it was set
    const { rows: userRows } = await client.execute({
      sql: 'SELECT author_id FROM users WHERE id = ?',
      args: [req.user.id],
    });
    const authorId = userRows.length ? userRows[0].author_id : null;
    if (!authorId) {
      return res.json({ author: null, papers: [], totals: null });
    }

    // Get author info
    const { rows: authorRows } = await client.execute({
      sql: 'SELECT * FROM authors WHERE id = ?',
      args: [authorId],
    });
    if (!authorRows.length) return res.json({ author: null, papers: [], totals: null });
    const author = authorRows[0];

    // Get all papers for this author with venue info and author count
    const { rows: paperRows } = await client.execute({
      sql: `
        SELECT
          p.id, p.title, p.type, p.status,
          p.submission_date, p.decision_date, p.publication_date,
          p.doi, p.arxiv_url, p.paper_url,
          pa.role, pa.order_index,
          v.id as venue_id, v.name as venue_name, v.abbreviation as venue_abbr,
          v.type as venue_type, v.ranking as venue_ranking, v.impact_factor,
          (SELECT COUNT(*) FROM paper_authors pa2 WHERE pa2.paper_id = p.id) as author_count
        FROM papers p
        JOIN paper_authors pa ON pa.paper_id = p.id AND pa.author_id = ?
        LEFT JOIN venues v ON v.id = p.venue_id
        ORDER BY COALESCE(p.decision_date, p.publication_date, p.submission_date) DESC
      `,
      args: [authorId],
    });

    // Score each paper
    const papers = paperRows.map(p => {
      const countable = ['accepted', 'published'].includes(p.status) && p.type !== 'preprint';
      const { score: base, label: scoreLabel } = countable
        ? baseScore(p.type, p.venue_type, p.venue_ranking)
        : { score: 0, label: '—' };

      const userScore = countable ? authorScore(base, p.role, Number(p.author_count)) : 0;
      const date = paperDate(p);
      const recent3y = countable && isWithinYears(date, 3);

      const category = p.type === 'journal' ? 'bai_bao'
        : (p.type === 'conference' || p.type === 'workshop') ? 'hoi_nghi'
        : 'other';

      return {
        id: Number(p.id),
        title: p.title,
        type: p.type,
        status: p.status,
        role: p.role,
        author_count: Number(p.author_count),
        venue_name: p.venue_name,
        venue_abbr: p.venue_abbr,
        venue_type: p.venue_type,
        venue_ranking: p.venue_ranking,
        impact_factor: p.impact_factor,
        submission_date: p.submission_date,
        decision_date: p.decision_date,
        publication_date: p.publication_date,
        date,
        base_score: base,
        score_label: scoreLabel,
        user_score: userScore,
        countable,
        recent_3y: recent3y,
        category,
      };
    });

    // Aggregate totals
    const countable = papers.filter(p => p.countable);
    const total_score = Math.round(countable.reduce((s, p) => s + p.user_score, 0) * 1000) / 1000;
    const score_3y = Math.round(countable.filter(p => p.recent_3y).reduce((s, p) => s + p.user_score, 0) * 1000) / 1000;
    const paper_score = Math.round(countable.filter(p => p.category === 'bai_bao').reduce((s, p) => s + p.user_score, 0) * 1000) / 1000;
    const paper_score_3y = Math.round(countable.filter(p => p.category === 'bai_bao' && p.recent_3y).reduce((s, p) => s + p.user_score, 0) * 1000) / 1000;
    const conf_score = Math.round(countable.filter(p => p.category === 'hoi_nghi').reduce((s, p) => s + p.user_score, 0) * 1000) / 1000;

    const first_author_count = countable.filter(p => p.role === 'first' || p.role === 'corresponding').length;
    const total_accepted = countable.length;

    // By year breakdown
    const yearMap = {};
    countable.forEach(p => {
      const y = p.date ? new Date(p.date).getFullYear() : 'N/A';
      if (!yearMap[y]) yearMap[y] = { year: y, count: 0, score: 0 };
      yearMap[y].count++;
      yearMap[y].score = Math.round((yearMap[y].score + p.user_score) * 1000) / 1000;
    });
    const by_year = Object.values(yearMap).sort((a, b) => String(b.year).localeCompare(String(a.year)));

    res.json({
      author,
      papers,
      totals: {
        total_score,
        score_3y,
        paper_score,
        paper_score_3y,
        conf_score,
        first_author_count,
        total_accepted,
        total_papers: papers.length,
        by_year,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
