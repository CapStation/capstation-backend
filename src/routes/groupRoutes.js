const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  getAllGroups, 
  getGroupDetail,
  createGroup,
  updateGroup,
  deleteGroup,
  inviteMember,
  respondInvitation,
  requestJoin,
  respondJoinRequest,
  removeMember,
  leaveGroup,
  getUserGroups
} = require('../controllers/groupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Public routes - IMPORTANT: specific routes MUST be before /:id to avoid route conflict
router.get('/', authMiddleware, getAllGroups);

// My groups route - must be before /:id
router.get('/my', authMiddleware, getUserGroups);

// Create group - POST /groups
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Nama grup harus 3-100 karakter'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter'),
    body('maxMembers').optional().isInt({ min: 2, max: 5 }).withMessage('Max members harus 2-5')
  ],
  createGroup
);

// DETAIL route - must be after all other specific routes
router.get('/:id', authMiddleware, getGroupDetail);

// Protected routes - Update
router.put(
  '/:id',
  authMiddleware,
  [
    body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Nama grup harus 3-100 karakter'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Status tidak valid'),
    body('maxMembers').optional().isInt({ min: 2, max: 5 }).withMessage('Max members harus 2-5')
  ],
  updateGroup
);

// Protected routes - Delete
router.delete('/:id', authMiddleware, deleteGroup);

// Member management
router.post(
  '/:id/invite',
  authMiddleware,
  [
    body('userId').isMongoId().withMessage('ID user tidak valid')
  ],
  inviteMember
);

router.post(
  '/:id/respond-invitation',
  authMiddleware,
  [
    body('response').isIn(['accepted', 'rejected']).withMessage('Response harus accepted atau rejected')
  ],
  respondInvitation
);

router.post(
  '/:id/request-join',
  authMiddleware,
  requestJoin
);

router.post(
  '/:id/respond-join-request',
  authMiddleware,
  [
    body('userId').isMongoId().withMessage('ID user tidak valid'),
    body('response').isIn(['accepted', 'rejected']).withMessage('Response harus accepted atau rejected')
  ],
  respondJoinRequest
);

router.post(
  '/:id/remove-member',
  authMiddleware,
  [
    body('userId').isMongoId().withMessage('ID user tidak valid')
  ],
  removeMember
);

router.post('/:id/leave', authMiddleware, leaveGroup);

module.exports = router;
