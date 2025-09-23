const router = require('express').Router();
const c = require('../controllers/capstoneBrowseController');

router.get('/capstones', c.listCapstones);
router.get('/capstones/:id', c.getCapstoneById); // detail capstone

module.exports = router;
