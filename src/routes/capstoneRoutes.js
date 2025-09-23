const express = require('express');
const router = express.Router();
const c = require('../controllers/capstoneController');

// capstone list dengan filter
router.get('/capstones', c.listCapstones);

// buat request kelanjutan
router.post('/requests', c.createRequest);

// list requests
router.get('/requests', c.listRequests);

// putuskan request
router.patch('/requests/:id/decide', c.decideRequest);

module.exports = router;
