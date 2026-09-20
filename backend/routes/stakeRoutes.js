const express = require('express');
const router = express.Router();
const stakeController = require('../controllers/stakeController');

router.post('/', stakeController.createStake);
router.get('/:firebaseUid', stakeController.getStakes);
router.post('/evaluate', stakeController.evaluateStakes);

module.exports = router;
