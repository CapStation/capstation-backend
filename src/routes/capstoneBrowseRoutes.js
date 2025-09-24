const router = require('express').Router();
const c = require('../controllers/capstoneBrowseController');

router.get('/capstones', c.listCapstones);
router.get('/capstones/:id', c.getCapstoneById);

// kategori
router.get('/categories', c.listCategories);
router.get('/categories/:category/capstones', c.listCapstonesByCategory);

module.exports = router;
