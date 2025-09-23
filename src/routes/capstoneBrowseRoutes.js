const router = require('express').Router();
const c = require('../controllers/capstoneBrowseController');

// GET /api/browse/capstones?status=...&kategori=...
router.get('/capstones', c.listCapstones);

module.exports = router;
