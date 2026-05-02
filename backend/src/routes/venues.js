const express = require('express');
const router = express.Router();
const { client } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

// Fetch URL content with a browser-like UA to avoid bot blocks
async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Strip scripts/styles, keep visible text, limit size
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000);
  return text;
}

router.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Thiếu URL' });
  try {
    const pageText = await fetchPage(url);
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Extract venue information from this webpage content and return ONLY a JSON object with these fields (use null for unknown):
- name: full official name
- abbreviation: short name/acronym (e.g. ICML, NeurIPS, Nature)
- type: "conference" or "journal"
- ranking: CORE ranking (A*, A, B, C) for conferences OR SJR quartile (Q1, Q2, Q3, Q4) for journals, or null
- impact_factor: number for journals, null for conferences
- deadline: submission deadline in YYYY-MM-DD format, null if not found or past
- location: city and country for conferences (e.g. "Vienna, Austria"), null for journals

URL: ${url}

Page content:
${pageText}

Return ONLY the JSON object, no explanation.`
      }],
    });

    const raw = message.content[0].text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const r = await client.execute('SELECT * FROM venues ORDER BY type, name');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, abbreviation, type, url, impact_factor, ranking, deadline, location } = req.body;
    const r = await client.execute({ sql: 'INSERT INTO venues (name,abbreviation,type,url,impact_factor,ranking,deadline,location) VALUES (?,?,?,?,?,?,?,?)', args: [name, abbreviation||null, type||'conference', url||null, impact_factor||null, ranking||null, deadline||null, location||null] });
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, abbreviation, type, url, impact_factor, ranking, deadline, location } = req.body;
    const r = await client.execute({ sql: 'UPDATE venues SET name=?,abbreviation=?,type=?,url=?,impact_factor=?,ranking=?,deadline=?,location=? WHERE id=?', args: [name, abbreviation||null, type, url||null, impact_factor||null, ranking||null, deadline||null, location||null, req.params.id] });
    if (r.rowsAffected === 0) return res.status(404).json({ error: 'Không tìm thấy venue' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await client.execute({ sql: 'DELETE FROM venues WHERE id=?', args: [req.params.id] });
    if (r.rowsAffected === 0) return res.status(404).json({ error: 'Không tìm thấy venue' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
