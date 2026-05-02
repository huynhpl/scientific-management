require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Static file serving — skipped in serverless (no persistent filesystem)
if (!process.env.NETLIFY) {
  const path = require('path');
  const { mkdirSync } = require('fs');
  const uploadsDir = path.join(__dirname, '../../uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
}

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/papers',  require('./routes/papers'));
app.use('/api/authors', requireAuth, require('./routes/authors'));
app.use('/api/venues',  requireAuth, require('./routes/venues'));
app.use('/api/stats',   require('./routes/stats'));
app.use('/api/teams',   requireAuth, require('./routes/teams'));
app.use('/api/journals', require('./routes/journals'));
app.use('/api/profile', require('./routes/profile'));

// File upload — skipped in serverless
if (!process.env.NETLIFY) {
  app.use('/api/files', requireAuth, require('./routes/files'));
}

module.exports = app;
