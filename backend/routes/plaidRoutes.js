const express = require('express');
const router = express.Router();
const plaidController = require('../controllers/plaidController');

// 1. Create a link token for the frontend Plaid Link UI
router.post('/create-link-token', plaidController.createLinkToken);

// 2. Exchange the public token from the frontend for an access token
router.post('/exchange-public-token', plaidController.exchangePublicToken);

// 3. Trigger a sync of transactions from all connected banks
router.post('/sync', plaidController.syncTransactions);

// 4. Get connection status
router.get('/status/:firebaseUid', plaidController.getConnectionStatus);

// 5. Disconnect (Unsync) Bank
router.post('/disconnect', plaidController.disconnectBank);

module.exports = router;
