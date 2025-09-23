const express = require('express');
const app = express();

// parser body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// mock auth sederhana
app.use((req, res, next) => {
  req.user = {
    id: req.header('x-user-id') || 'u1',
    role: req.header('x-role') || 'mahasiswa',
    name: req.header('x-user-name') || 'Anon'
  };
  next();
});

// debug endpoint untuk cek body
app.post('/debug/echo', (req, res) => {
  res.json({ headers: req.headers, body: req.body });
});

const capstoneRoutes = require('./routes/capstoneRoutes');
app.use('/api', capstoneRoutes);

app.get('/', (_, res) => res.json({ ok: true }));

// handler 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// handler error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

module.exports = app;
