const OfflineToken = require('../models/OfflineToken');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Secure secret key for token signing (in production, use process.env.TOKEN_SIGNATURE_SECRET)
const SIGNATURE_SECRET = process.env.TOKEN_SIGNATURE_SECRET || 'offline-wallet-dev-secret-key-123';

/**
 * Helper to sign a token using HMAC SHA-256
 */
const signToken = (tokenId, studentId, value) => {
  const hmac = crypto.createHmac('sha256', SIGNATURE_SECRET);
  hmac.update(`${tokenId}:${studentId}:${value}`);
  return hmac.digest('hex');
};

/**
 * Recharge wallet with new tokens
 * POST /api/wallet/recharge
 */
exports.rechargeWallet = async (req, res) => {
  try {
    const { amount, firebaseUid } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Find student by firebaseUid
    const student = await Student.findOne({ firebaseUid });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const tokensToGenerate = [];
    
    // Generate individual tokens (each representing 1 unit)
    for (let i = 0; i < amount; i++) {
      const tokenId = uuidv4();
      const signature = signToken(tokenId, student._id.toString(), 1);
      
      tokensToGenerate.push({
        tokenId,
        student: student._id,
        value: 1,
        signature,
        isUsed: false
      });
    }

    await OfflineToken.insertMany(tokensToGenerate);

    res.status(200).json({
      success: true,
      message: `Successfully recharged ${amount} tokens`,
      amount,
      tokens: tokensToGenerate.map(t => ({
        tokenId: t.tokenId,
        value: t.value,
        signature: t.signature,
        createdAt: new Date()
      }))
    });
  } catch (error) {
    console.error('Recharge wallet error:', error);
    res.status(500).json({ success: false, message: 'Server error recharging wallet' });
  }
};

/**
 * Get current balance of unused tokens
 * GET /api/wallet/balance/:firebaseUid
 */
exports.getBalance = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    const student = await Student.findOne({ firebaseUid });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const unusedTokensCount = await OfflineToken.countDocuments({
      student: student._id,
      isUsed: false
    });

    res.status(200).json({
      success: true,
      balance: unusedTokensCount
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, message: 'Server error getting balance' });
  }
};

/**
 * Sync offline transfer to server
 * POST /api/wallet/sync
 */
exports.syncOfflineTransfer = async (req, res) => {
  try {
    const { senderFirebaseUid, receiverFirebaseUid, amount, tokens } = req.body;

    if (!amount || amount <= 0 || !tokens || tokens.length !== amount) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // Find sender and receiver
    const sender = await Student.findOne({ firebaseUid: senderFirebaseUid });
    const receiver = await Student.findOne({ firebaseUid: receiverFirebaseUid });

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: 'Sender or receiver not found' });
    }

    // Verify all tokens
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const expectedSignature = signToken(t.tokenId, sender._id.toString(), 1);
      
      if (t.signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: `Invalid token signature for token ${t.tokenId}` });
      }

      // Check if already used
      const dbToken = await OfflineToken.findOne({ tokenId: t.tokenId });
      if (!dbToken || dbToken.isUsed) {
        return res.status(400).json({ success: false, message: `Token ${t.tokenId} is invalid or already used` });
      }
    }

    // 1. Log the Expense for Sender
    const senderTransaction = new Transaction({
      student: sender._id,
      receiver: receiver._id,
      type: 'expense',
      amount: amount,
      category: 'other_expense',
      description: 'Offline Bluetooth Transfer',
      paymentMethod: 'offline_token',
      merchant: receiver.name || 'Friend',
      tags: ['offline_sync', 'transfer']
    });
    await senderTransaction.save();

    // 2. Log the Income for Receiver
    const receiverTransaction = new Transaction({
      student: receiver._id,
      type: 'income',
      amount: amount,
      category: 'other_income',
      description: 'Offline Bluetooth Receive',
      paymentMethod: 'offline_token',
      merchant: sender.name || 'Friend',
      tags: ['offline_sync', 'receive']
    });
    await receiverTransaction.save();

    // 3. Mark tokens as used
    const tokenIds = tokens.map(t => t.tokenId);
    await OfflineToken.updateMany(
      { tokenId: { $in: tokenIds } },
      { 
        $set: { 
          isUsed: true, 
          usedAt: new Date(), 
          transactionRef: senderTransaction._id 
        } 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully synced offline transfer',
      amount,
      senderTransactionId: senderTransaction._id,
      receiverTransactionId: receiverTransaction._id
    });
  } catch (error) {
    console.error('Sync transfer error:', error);
    res.status(500).json({ success: false, message: 'Server error syncing transfer' });
  }
};
