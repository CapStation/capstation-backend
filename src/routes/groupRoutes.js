const express = require('express');
const router = express.Router();
const { getAllGroups, getGroupDetail } = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, getAllGroups); // melihat semua grup
router.get('/:id', authMiddleware, getGroupDetail); // melihat detail salah satu grup

module.exports = router;
