const express = require('express');
const router = express.Router();

// Data dummy
const dummyProjects = [
  { title: 'Capstone A', category: 'kesehatan', status: 'Bisa dilanjutkan', members: ['Andi', 'Budi'] },
  { title: 'Capstone B', category: 'smart city', status: 'Ditutup', members: ['Cici', 'Dede'] },
  { title: 'Capstone C', category: 'kesehatan', status: 'Bisa dilanjutkan', members: ['Eka'] }
];

// Endpoint: GET /api/projects
router.get('/', (req, res) => {
  const { status, category } = req.query;
  let results = dummyProjects;

  if (status) {
    results = results.filter(p => p.status === status);
  }
  if (category) {
    results = results.filter(p => p.category === category);
  }

  res.json(results);
});

module.exports = router;
