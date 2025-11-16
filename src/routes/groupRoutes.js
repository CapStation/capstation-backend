const express = require('express');
const router = express.Router();
const { 
  getAllGroups, 
  getGroupDetail,
  getAvailableUsers,
  inviteMember
} = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, getAllGroups); // melihat semua grup
router.get('/:id', authMiddleware, getGroupDetail); // melihat detail salah satu grup
router.get('/:id/available-users', authMiddleware, getAvailableUsers); // dapatkan user yang tersedia untuk diundang
router.post('/:id/invite', authMiddleware, inviteMember); // mengundang member ke grup

module.exports = router;
