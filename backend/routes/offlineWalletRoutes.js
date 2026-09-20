const express = require('express');
const router = express.Router();
const offlineWalletController = require('../controllers/offlineWalletController');

// Recharge wallet (mock test endpoint to generate tokens)
router.post('/recharge', offlineWalletController.rechargeWallet);

// Get current token balance
router.get('/balance/:firebaseUid', offlineWalletController.getBalance);

// Sync an offline transfer back to the server
router.post('/sync', offlineWalletController.syncOfflineTransfer);

module.exports = router;
