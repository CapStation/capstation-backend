const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock auth via header
app.use((req, res, next) => {
  req.user = {
    id: req.header('x-user-id') || 'u1',
    role: req.header('x-role') || 'mahasiswa',
    name: req.header('x-user-name') || 'Anon'
  };
  next();
});

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Routes
const browseRoutes = require('./routes/capstoneBrowseRoutes');
app.use('/api/browse', browseRoutes);

const requestRoutes = require('./routes/requestDecisionRoutes');
app.use('/api', requestRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// 500
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

module.exports = app;
