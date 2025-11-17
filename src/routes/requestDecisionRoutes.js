const router = require('express').Router();
const c = require('../controllers/requestDecisionController');
const { authMiddleware } = require('../middlewares/authMiddleware');
router.use(authMiddleware);

// submit request
router.post('/requests', c.createRequest);

// list umum (opsional)
router.get('/requests', c.listRequests);

// my request (untuk tab My Request)
router.get('/requests/my', c.listMyRequests);

// pemilik memutuskan
router.patch('/requests/:id/decide', c.decideRequest);

// history satu request
router.get('/requests/:id/history', c.getRequestHistory);

// riwayat keputusan user (opsional)
router.get('/me/decisions', c.listMyDecisions);
router.get('/me/decisions/history', c.listMyDecisionHistory);

// inbox pemilik project
router.get('/me/owner/requests', c.listOwnedRequests);

// cancel request (hanya pemohon, status pending)
router.delete('/requests/:id/cancel', c.cancelRequest);

module.exports = router;
