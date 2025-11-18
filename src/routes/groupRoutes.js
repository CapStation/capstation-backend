const express = require('express');
const GroupController = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
const groupController = new GroupController();

// Public routes
router.get('/', groupController.getAllGroups.bind(groupController));

// Protected routes (require auth)
router.use(authMiddleware);

// Specific routes 
router.get('/my', groupController.getMyGroup.bind(groupController));
router.post('/', groupController.createGroup.bind(groupController));

// Dynamic routes
router.get('/:groupId', groupController.getGroupById.bind(groupController));
router.put('/:groupId', groupController.updateGroup.bind(groupController));
router.delete('/:groupId', groupController.deleteGroup.bind(groupController));
router.get('/:groupId/available-users', groupController.getAvailableUsers.bind(groupController));
router.post('/:groupId/invite', groupController.inviteMember.bind(groupController));
router.post('/:groupId/remove-member', groupController.removeMember.bind(groupController));
router.post('/:groupId/leave', groupController.leaveGroup.bind(groupController));

module.exports = router;