const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// mock auth via header
app.use((req, res, next) => {
  req.user = {
    id: req.header('x-user-id') || 'u1',
    role: req.header('x-role') || 'mahasiswa',
    name: req.header('x-user-name') || 'Anon',
  };
  next();
});

// route kelompok 1. browsing capstone
const browseRoutes = require('./routes/capstoneBrowseRoutes');
app.use('/api/browse', browseRoutes);

// route kelompok 2. request dan keputusan
const requestRoutes = require('./routes/requestDecisionRoutes');
app.use('/api', requestRoutes);

// health
app.get('/api/health', (_, res) => res.json({ ok: true }));

module.exports = app;
