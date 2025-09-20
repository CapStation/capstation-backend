const express = require('express');
const router = express.Router();
const oauthCtrl = require('../controllers/oauthController');

router.post('/complete', oauthCtrl.completeOauthProfile);

module.exports = router;
