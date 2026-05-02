const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { client } = require('../database');

const uploadsDir = path.join(__dirname, '../../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['.pdf','.docx','.doc','.tex','.zip','.png','.jpg','.jpeg'].includes(path.extname(file.originalname).toLowerCase()))
});

router.post('/upload/:paperId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file hợp lệ' });
    const r = await client.execute({ sql: 'INSERT INTO files (paper_id,filename,original_name,file_type,size) VALUES (?,?,?,?,?)', args: [req.params.paperId, req.file.filename, req.file.originalname, req.body.file_type||'manuscript', req.file.size] });
    res.status(201).json({ id: Number(r.lastInsertRowid), filename: req.file.filename, original_name: req.file.originalname, size: req.file.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await client.execute({ sql: 'SELECT * FROM files WHERE id=?', args: [req.params.id] });
    if (!r.rows.length) return res.status(404).json({ error: 'Không tìm thấy file' });
    const filePath = path.join(uploadsDir, r.rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await client.execute({ sql: 'DELETE FROM files WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
