const router = require('express').Router();
const c = require('../controllers/requestDecisionController');

// existing
router.post('/requests', c.createRequest);
router.get('/requests', c.listRequests);
router.patch('/requests/:id/decide', c.decideRequest);
router.get('/requests/decided/me', c.listMyDecisions);  
router.get('/owner/requests', c.listOwnedRequests);     

router.get('/me/decisions', c.listMyDecisions);
router.get('/me/owner/requests', c.listOwnedRequests);

module.exports = router;
