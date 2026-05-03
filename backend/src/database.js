const { createClient } = require('@libsql/client');
const { join } = require('path');

// Production: use Turso via LIBSQL_URL env var
// Development: use local SQLite file
let client;
if (process.env.LIBSQL_URL) {
  client = createClient({
    url: process.env.LIBSQL_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });
} else {
  const { mkdirSync } = require('fs');
  const dataDir = join(__dirname, '../../data');
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'research.db').replace(/\\/g, '/');
  client = createClient({ url: `file:${dbPath}` });
}

async function init() {
  await client.batch([
    { sql: `CREATE TABLE IF NOT EXISTS venues (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, abbreviation TEXT, type TEXT NOT NULL DEFAULT 'conference', url TEXT, impact_factor REAL, ranking TEXT, deadline TEXT, location TEXT, created_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, affiliation TEXT, is_member INTEGER DEFAULT 1, group_type TEXT DEFAULT 'Khác', member_role TEXT DEFAULT 'SV', created_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS papers (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, abstract TEXT, type TEXT NOT NULL DEFAULT 'conference', venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'draft', submission_date TEXT, decision_date TEXT, publication_date TEXT, submission_deadline TEXT, revision_deadline TEXT, doi TEXT, arxiv_url TEXT, paper_url TEXT, openreview_url TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS paper_authors (paper_id INTEGER REFERENCES papers(id) ON DELETE CASCADE, author_id INTEGER REFERENCES authors(id) ON DELETE CASCADE, role TEXT DEFAULT 'co-author', order_index INTEGER DEFAULT 0, PRIMARY KEY (paper_id, author_id))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, paper_id INTEGER REFERENCES papers(id) ON DELETE CASCADE, filename TEXT NOT NULL, original_name TEXT NOT NULL, file_type TEXT DEFAULT 'manuscript', size INTEGER, uploaded_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, paper_id INTEGER REFERENCES papers(id) ON DELETE CASCADE, action TEXT NOT NULL, details TEXT, created_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, kpi_papers_per_year INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS team_members (team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE, author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE, kpi_papers INTEGER DEFAULT 0, PRIMARY KEY (team_id, author_id))`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS journal_catalog (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, issn TEXT, eissn TEXT, list_type TEXT NOT NULL DEFAULT 'quoc_te', type TEXT, organization TEXT, points TEXT, field TEXT, url TEXT, quartile TEXT, sjr_score TEXT, jcr_score TEXT, h_index INTEGER, notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`, args: [] },
  ], 'write');

  // Migrate existing DB: add columns if missing
  const { rows: venueCols } = await client.execute("PRAGMA table_info(venues)");
  const venueColNames = venueCols.map(c => c.name);
  if (!venueColNames.includes('deadline')) {
    await client.execute("ALTER TABLE venues ADD COLUMN deadline TEXT");
  }
  if (!venueColNames.includes('location')) {
    await client.execute("ALTER TABLE venues ADD COLUMN location TEXT");
  }
  if (!venueColNames.includes('sjr_score')) {
    await client.execute("ALTER TABLE venues ADD COLUMN sjr_score REAL");
  }

  // Migrate: create users table if it was added after initial DB creation
  await client.execute(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL, created_at TEXT DEFAULT (datetime('now')))`);

  const { rows: authorCols } = await client.execute("PRAGMA table_info(authors)");
  const colNames = authorCols.map(c => c.name);
  if (!colNames.includes('group_type')) {
    await client.execute("ALTER TABLE authors ADD COLUMN group_type TEXT DEFAULT 'Khác'");
  }
  if (!colNames.includes('member_role')) {
    await client.execute("ALTER TABLE authors ADD COLUMN member_role TEXT DEFAULT 'SV'");
  }

  const { rows } = await client.execute('SELECT COUNT(*) as c FROM venues');
  if (Number(rows[0].c) === 0) {
    await client.batch([
      { sql: `INSERT INTO venues (name, abbreviation, type, url, ranking) VALUES (?, ?, ?, ?, ?)`, args: ['International Conference on Machine Learning', 'ICML', 'conference', 'https://icml.cc', 'A*'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, ranking) VALUES (?, ?, ?, ?, ?)`, args: ['Conference on Neural Information Processing Systems', 'NeurIPS', 'conference', 'https://neurips.cc', 'A*'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, ranking) VALUES (?, ?, ?, ?, ?)`, args: ['International Conference on Learning Representations', 'ICLR', 'conference', 'https://iclr.cc', 'A*'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, ranking) VALUES (?, ?, ?, ?, ?)`, args: ['AAAI Conference on Artificial Intelligence', 'AAAI', 'conference', 'https://aaai.org', 'A'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, impact_factor, ranking) VALUES (?, ?, ?, ?, ?, ?)`, args: ['IEEE Transactions on Neural Networks and Learning Systems', 'TNNLS', 'journal', 'https://ieeexplore.ieee.org', 14.255, 'Q1'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, impact_factor, ranking) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Pattern Recognition', 'PR', 'journal', 'https://www.sciencedirect.com/journal/pattern-recognition', 8.518, 'Q1'] },
      { sql: `INSERT INTO venues (name, abbreviation, type, url, impact_factor, ranking) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Expert Systems with Applications', 'ESWA', 'journal', 'https://www.sciencedirect.com/journal/expert-systems-with-applications', 8.665, 'Q1'] },
      { sql: `INSERT INTO authors (name, email, affiliation, is_member, group_type, member_role) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Nguyễn Văn An', 'an.nguyen@university.edu', 'Đại học Bách Khoa', 1, 'AI', 'Lead'] },
      { sql: `INSERT INTO authors (name, email, affiliation, is_member, group_type, member_role) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Trần Thị Bình', 'binh.tran@university.edu', 'Đại học Bách Khoa', 1, 'Data', 'SubLead'] },
      { sql: `INSERT INTO authors (name, email, affiliation, is_member, group_type, member_role) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Lê Hoàng Cường', 'cuong.le@university.edu', 'Đại học Bách Khoa', 1, 'AI', 'SV'] },
      { sql: `INSERT INTO authors (name, email, affiliation, is_member, group_type, member_role) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Phạm Thị Dung', 'dung.pham@university.edu', 'Đại học Bách Khoa', 1, 'Data', 'SV'] },
      { sql: `INSERT INTO authors (name, email, affiliation, is_member, group_type, member_role) VALUES (?, ?, ?, ?, ?, ?)`, args: ['Võ Minh Đức', 'duc.vo@institute.edu', 'Viện Công nghệ', 0, 'Khác', 'SV'] },
    ], 'write');

    const r1 = await client.execute({ sql: `INSERT INTO papers (title, abstract, type, venue_id, status, submission_date, decision_date, submission_deadline, notes) VALUES (?, ?, ?, (SELECT id FROM venues WHERE abbreviation='NeurIPS'), ?, ?, ?, ?, ?)`, args: ['Deep Learning for Vietnamese Text Classification Using Transformer Architecture', 'Nghiên cứu ứng dụng kiến trúc Transformer để phân loại văn bản tiếng Việt...', 'conference', 'published', '2024-05-15', '2024-09-01', '2024-05-20', 'Bài báo được chấp nhận tại NeurIPS 2024'] });
    const r2 = await client.execute({ sql: `INSERT INTO papers (title, abstract, type, venue_id, status, submission_date, submission_deadline, notes) VALUES (?, ?, ?, (SELECT id FROM venues WHERE abbreviation='TNNLS'), ?, ?, ?, ?)`, args: ['Federated Learning with Differential Privacy for Medical Image Segmentation', 'Phương pháp học liên kết với bảo mật vi phân cho phân đoạn ảnh y tế...', 'journal', 'under_review', '2025-01-10', '2025-01-15', 'Đang chờ phản biện vòng 2'] });
    const r3 = await client.execute({ sql: `INSERT INTO papers (title, abstract, type, venue_id, status, submission_date, submission_deadline, notes) VALUES (?, ?, ?, (SELECT id FROM venues WHERE abbreviation='ICML'), ?, ?, ?, ?)`, args: ['Graph Neural Networks for Knowledge Graph Completion', 'Sử dụng mạng nơ-ron đồ thị để hoàn thiện đồ thị tri thức...', 'conference', 'submitted', '2025-02-28', '2025-03-01', 'Đã nộp, đang chờ kết quả'] });
    const r4 = await client.execute({ sql: `INSERT INTO papers (title, abstract, type, venue_id, status, submission_date, decision_date, revision_deadline, notes) VALUES (?, ?, ?, (SELECT id FROM venues WHERE abbreviation='AAAI'), ?, ?, ?, ?, ?)`, args: ['Multi-modal Sentiment Analysis with Contrastive Learning', 'Phân tích cảm xúc đa phương thức sử dụng học tương phản...', 'conference', 'major_revision', '2024-11-01', '2025-01-20', '2025-05-30', 'Cần bổ sung thực nghiệm theo yêu cầu reviewer'] });
    const r5 = await client.execute({ sql: `INSERT INTO papers (title, abstract, type, venue_id, status, submission_deadline, notes) VALUES (?, ?, ?, (SELECT id FROM venues WHERE abbreviation='PR'), ?, ?, ?)`, args: ['Efficient Object Detection in Edge Computing Environments', 'Phát hiện vật thể hiệu quả trong môi trường tính toán biên...', 'journal', 'draft', '2025-06-30', 'Đang hoàn thiện bản thảo'] });

    const p1 = Number(r1.lastInsertRowid), p2 = Number(r2.lastInsertRowid), p3 = Number(r3.lastInsertRowid), p4 = Number(r4.lastInsertRowid), p5 = Number(r5.lastInsertRowid);

    await client.batch([
      { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p1, 1, 'first', 0] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p1, 2, 'co-author', 1] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p1, 3, 'corresponding', 2] },
      { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p2, 2, 'first', 0] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p2, 4, 'co-author', 1] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p2, 5, 'co-author', 2] },
      { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p3, 3, 'first', 0] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p3, 1, 'co-author', 1] },
      { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p4, 4, 'first', 0] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p4, 2, 'co-author', 1] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p4, 3, 'co-author', 2] },
      { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p5, 1, 'first', 0] }, { sql: `INSERT INTO paper_authors VALUES (?,?,?,?)`, args: [p5, 5, 'co-author', 1] },
      { sql: `INSERT INTO activity_log (paper_id, action, details) VALUES (?,?,?)`, args: [p1, 'published', 'Bài báo được xuất bản tại NeurIPS 2024'] },
      { sql: `INSERT INTO activity_log (paper_id, action, details) VALUES (?,?,?)`, args: [p2, 'submitted', 'Nộp bài lên TNNLS'] },
      { sql: `INSERT INTO activity_log (paper_id, action, details) VALUES (?,?,?)`, args: [p3, 'submitted', 'Nộp bài lên ICML 2025'] },
      { sql: `INSERT INTO activity_log (paper_id, action, details) VALUES (?,?,?)`, args: [p4, 'revision_requested', 'Nhận yêu cầu chỉnh sửa lớn từ AAAI'] },
    ], 'write');

  }

  // Seed default admin user if not exists
  const { rows: adminCheck } = await client.execute(
    "SELECT id FROM users WHERE username='admin' LIMIT 1"
  );
  if (!adminCheck.length) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin', 10);
    await client.execute({
      sql: `INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')`,
      args: [hash],
    });
  }

  // Migrate: link admin user to author id=1 if not linked (for demo data)
  const { rows: adminRows } = await client.execute(
    "SELECT id, author_id FROM users WHERE username='admin' LIMIT 1"
  );
  if (adminRows.length && !adminRows[0].author_id) {
    const { rows: a1Rows } = await client.execute('SELECT id FROM authors ORDER BY id LIMIT 1');
    if (a1Rows.length) {
      await client.execute({
        sql: 'UPDATE users SET author_id=? WHERE username=?',
        args: [Number(a1Rows[0].id), 'admin'],
      });
    }
  }

  // Seed profile demo papers for author 1 (admin) if insufficient published data
  {
    const { rows: authRows } = await client.execute('SELECT id FROM authors ORDER BY id LIMIT 5');
    if (authRows.length >= 2) {
      const aids = authRows.map(r => Number(r.id));
      const [a1, a2, a3, a4, a5] = [...aids, ...Array(5).fill(aids[aids.length - 1])];

      const { rows: pubCheck } = await client.execute({
        sql: `SELECT COUNT(*) as c FROM paper_authors pa
              JOIN papers p ON pa.paper_id = p.id
              WHERE pa.author_id = ? AND p.status IN ('accepted','published')`,
        args: [a1],
      });

      if (Number(pubCheck[0].c) < 5) {
        // Ensure extra venues exist
        const extraVenues = [
          { abbr: 'TPAMI',   name: 'IEEE Transactions on Pattern Analysis and Machine Intelligence', type: 'journal',    ranking: 'Q1', if_: 23.6 },
          { abbr: 'TKDE',    name: 'IEEE Transactions on Knowledge and Data Engineering',           type: 'journal',    ranking: 'Q1', if_: 8.9  },
          { abbr: 'IEEEA',   name: 'IEEE Access',                                                  type: 'journal',    ranking: 'Q2', if_: 3.9  },
          { abbr: 'NEURO',   name: 'Neurocomputing',                                               type: 'journal',    ranking: 'Q2', if_: 5.5  },
          { abbr: 'ACMCSUR', name: 'ACM Computing Surveys',                                        type: 'journal',    ranking: 'Q1', if_: 14.3 },
          { abbr: 'CVPR',    name: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition', type: 'conference', ranking: 'A*', if_: null },
          { abbr: 'ACL',     name: 'Annual Meeting of the Association for Computational Linguistics', type: 'conference', ranking: 'A*', if_: null },
          { abbr: 'ICLR',    name: 'International Conference on Learning Representations',          type: 'conference', ranking: 'A*', if_: null },
        ];
        for (const v of extraVenues) {
          const { rows: ev } = await client.execute({ sql: 'SELECT id FROM venues WHERE abbreviation=?', args: [v.abbr] });
          if (!ev.length) {
            await client.execute({
              sql: `INSERT INTO venues (name, abbreviation, type, impact_factor, ranking) VALUES (?,?,?,?,?)`,
              args: [v.name, v.abbr, v.type, v.if_, v.ranking],
            });
          }
        }

        // Helper to resolve venue id by abbreviation
        const vId = async (abbr) => {
          const { rows } = await client.execute({ sql: 'SELECT id FROM venues WHERE abbreviation=?', args: [abbr] });
          return rows.length ? Number(rows[0].id) : null;
        };

        // Paper definitions: [title, type, venueAbbr, status, submission_date, decision_date, publication_date, notes]
        const paperDefs = [
          // --- recent (within 3 years from today 2026-05-01, i.e., decision_date >= 2023-05-01) ---
          ['Adaptive Attention Mechanisms for Cross-lingual Transfer Learning',         'journal',    'TPAMI',   'published', '2023-09-10', '2024-03-15', '2024-07-01', 'IEEE TPAMI 2024'],
          ['Lightweight Transformer for Edge NLP Applications',                         'journal',    'IEEEA',   'published', '2023-11-05', '2024-01-10', '2024-04-20', 'IEEE Access 2024'],
          ['Knowledge Graph Embedding with Semantic Role Constraints',                  'journal',    'TKDE',    'accepted',  '2024-07-01', '2024-11-20', null,          'IEEE TKDE, accepted 2024'],
          ['Few-Shot Object Detection via Meta-Learning and Feature Reuse',              'conference', 'CVPR',    'published', '2022-11-15', '2023-02-28', '2023-06-20', 'CVPR 2023'],
          ['Multilingual Sentiment Analysis via Contrastive Pretraining',               'conference', 'ACL',     'published', '2022-12-10', '2023-03-15', '2023-07-10', 'ACL 2023'],
          ['Self-supervised Representation Learning for Low-resource Medical NLP',      'journal',    'NEURO',   'accepted',  '2023-04-20', '2023-08-25', null,          'Neurocomputing 2023'],
          // --- older (outside 3 years) ---
          ['Robust Learning under Noisy Labels with Uncertainty-Aware Regularization',  'journal',    'TNNLS',   'published', '2021-12-01', '2022-08-20', '2022-11-10', 'IEEE TNNLS 2022'],
          ['Hierarchical Relational Graph Reasoning for Visual Question Answering',     'conference', 'AAAI',    'published', '2021-08-01', '2021-12-01', '2022-02-28', 'AAAI 2022'],
          ['Transfer Learning for Low-resource Vietnamese Named Entity Recognition',    'journal',    'IEEEA',   'accepted',  '2022-03-10', '2022-07-15', null,          'IEEE Access 2022'],
          ['A Survey on Pre-trained Language Models for NLP: Methods and Applications', 'journal',    'ACMCSUR', 'published', '2020-10-01', '2021-08-15', '2021-12-15', 'ACM Computing Surveys 2021'],
          ['Prompt-based Fine-tuning for Low-resource Cross-lingual Classification',    'conference', 'ICLR',    'published', '2020-10-01', '2021-01-20', '2021-05-10', 'ICLR 2021'],
        ];

        // author assignments: [role_for_a1, [otherAuthorId, role], ...]
        const paperAuthors = [
          // TPAMI: a1 first, a2 co
          [['first', a1, 0], ['co-author', a2, 1]],
          // IEEE Access 2024: a1 first, a3 co, a2 co
          [['first', a1, 0], ['co-author', a3, 1], ['co-author', a2, 2]],
          // TKDE: a1 first, a3 co
          [['first', a1, 0], ['co-author', a3, 1]],
          // CVPR: a3 first, a1 co
          [['first', a3, 0], ['co-author', a1, 1]],
          // ACL: a2 first, a1 corresponding, a3 co
          [['first', a2, 0], ['corresponding', a1, 1], ['co-author', a3, 2]],
          // Neurocomputing: a1 first, a4 co, a2 co
          [['first', a1, 0], ['co-author', a4, 1], ['co-author', a2, 2]],
          // TNNLS: a2 first, a1 co, a3 co
          [['first', a2, 0], ['co-author', a1, 1], ['co-author', a3, 2]],
          // AAAI: a1 first, a5 co, a3 co
          [['first', a1, 0], ['co-author', a5, 1], ['co-author', a3, 2]],
          // IEEE Access 2022: a1 first, a3 co
          [['first', a1, 0], ['co-author', a3, 1]],
          // ACM Survey: a1 first, a2 co
          [['first', a1, 0], ['co-author', a2, 1]],
          // ICLR: a3 first, a1 co, a4 co
          [['first', a3, 0], ['co-author', a1, 1], ['co-author', a4, 2]],
        ];

        for (let i = 0; i < paperDefs.length; i++) {
          const [title, type, venueAbbr, status, sub, dec, pub, notes] = paperDefs[i];
          const vid = await vId(venueAbbr);
          const pr = await client.execute({
            sql: `INSERT INTO papers (title, type, venue_id, status, submission_date, decision_date, publication_date, notes)
                  VALUES (?,?,?,?,?,?,?,?)`,
            args: [title, type, vid, status, sub, dec, pub, notes],
          });
          const pid = Number(pr.lastInsertRowid);
          for (const [role, authorId, order] of paperAuthors[i]) {
            await client.execute({
              sql: 'INSERT INTO paper_authors VALUES (?,?,?,?)',
              args: [pid, authorId, role, order],
            });
          }
        }
      }
    }
  }

  // Seed teams separately (independent of venues seed)
  const { rows: teamRows } = await client.execute('SELECT COUNT(*) as c FROM teams');
  if (Number(teamRows[0].c) === 0) {
    const { rows: authorRows } = await client.execute('SELECT COUNT(*) as c FROM authors');
    if (Number(authorRows[0].c) >= 4) {
      const t1 = await client.execute({ sql: `INSERT INTO teams (name, description, kpi_papers_per_year) VALUES (?,?,?)`, args: ['Nhóm Xử lý Ngôn ngữ Tự nhiên', 'Nghiên cứu NLP, phân tích cảm xúc, dịch máy', 5] });
      const t2 = await client.execute({ sql: `INSERT INTO teams (name, description, kpi_papers_per_year) VALUES (?,?,?)`, args: ['Nhóm Thị giác Máy tính', 'Nhận dạng ảnh, phát hiện vật thể, phân đoạn ảnh y tế', 4] });
      const tid1 = Number(t1.lastInsertRowid), tid2 = Number(t2.lastInsertRowid);
      const { rows: authors } = await client.execute('SELECT id FROM authors ORDER BY id LIMIT 4');
      const [a1, a2, a3, a4] = authors.map(a => Number(a.id));
      await client.batch([
        { sql: `INSERT INTO team_members VALUES (?,?,?)`, args: [tid1, a1, 2] },
        { sql: `INSERT INTO team_members VALUES (?,?,?)`, args: [tid1, a2, 2] },
        { sql: `INSERT INTO team_members VALUES (?,?,?)`, args: [tid1, a3, 1] },
        { sql: `INSERT INTO team_members VALUES (?,?,?)`, args: [tid2, a2, 2] },
        { sql: `INSERT INTO team_members VALUES (?,?,?)`, args: [tid2, a4, 2] },
      ], 'write');
    }
  }
}

module.exports = { client, init };
