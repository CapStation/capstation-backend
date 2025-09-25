const router = require('express').Router();
const c = require('../controllers/requestDecisionController');

router.post('/requests', c.createRequest);
router.get('/requests', c.listRequests);
router.patch('/requests/:id/decide', c.decideRequest);
router.get('/requests/:id/history', c.getRequestHistory);

router.get('/me/decisions', c.listMyDecisions);
router.get('/me/decisions/history', c.listMyDecisionHistory);
router.get('/me/owner/requests', c.listOwnedRequests);

module.exports = router;
