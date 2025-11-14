const express = require('express');
const GroupController = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
const groupController = new GroupController();

// Public routes
router.get('/', groupController.getAllGroups.bind(groupController));

// Protected routes (require auth)
router.use(authMiddleware);

router.post('/', groupController.createGroup.bind(groupController));
router.get('/my', groupController.getMyGroup.bind(groupController));
router.get('/:groupId', groupController.getGroupById.bind(groupController));
router.put('/:groupId', groupController.updateGroup.bind(groupController));

module.exports = router;
