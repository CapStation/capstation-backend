const express = require('express');
const router = express.Router();
const { createGroup, getAllGroups, getGroupDetail } = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, createGroup);   //dummy test for create group
router.get('/', authMiddleware, getAllGroups); // melihat semua grup
router.get('/:id', authMiddleware, getGroupDetail); // melihat detail salah satu grup

module.exports = router;
