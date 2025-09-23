const router = require('express').Router();
const c = require('../controllers/requestDecisionController');

// POST /api/requests
router.post('/requests', c.createRequest);

// GET /api/requests
router.get('/requests', c.listRequests);

// PATCH /api/requests/:id/decide
router.patch('/requests/:id/decide', c.decideRequest);

module.exports = router;
