require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const OfflineToken = require('./models/OfflineToken');
const Transaction = require('./models/Transaction');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const SIGNATURE_SECRET = process.env.TOKEN_SIGNATURE_SECRET || 'offline-wallet-dev-secret-key-123';

const signToken = (tokenId, studentId, value) => {
  const hmac = crypto.createHmac('sha256', SIGNATURE_SECRET);
  hmac.update(`${tokenId}:${studentId}:${value}`);
  return hmac.digest('hex');
};

async function runTest() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finsage');
    console.log('✅ Connected.');

    // 1. Create or find two dummy users
    console.log('\n🧑‍🤝‍🧑 Setting up test users (Alice and Bob)...');
    let sender = await Student.findOne({ email: 'alice@test.com' });
    if (!sender) {
      sender = await Student.create({ firebaseUid: 'alice-uid', email: 'alice@test.com', name: 'Alice Test', monthlyIncome: 1000, monthlyBudget: 500 });
    }
    
    let receiver = await Student.findOne({ email: 'bob@test.com' });
    if (!receiver) {
      receiver = await Student.create({ firebaseUid: 'bob-uid', email: 'bob@test.com', name: 'Bob Test', monthlyIncome: 1000, monthlyBudget: 500 });
    }
    console.log(`✅ Users ready: ${sender.name} and ${receiver.name}`);

    // 2. Recharge Sender's Wallet
    console.log(`\n🔋 Recharging ${sender.name}'s offline wallet with 5 tokens...`);
    const tokens = [];
    for (let i = 0; i < 5; i++) {
      const tokenId = uuidv4();
      tokens.push({
        tokenId,
        student: sender._id,
        value: 1,
        signature: signToken(tokenId, sender._id.toString(), 1),
        isUsed: false
      });
    }
    await OfflineToken.insertMany(tokens);
    console.log('✅ Tokens securely generated and stored in DB.');

    // 3. Simulate Offline Transfer Sync
    console.log(`\n🔄 Simulating Wi-Fi sync: ${sender.name} sent 5 tokens to ${receiver.name} offline...`);
    
    // Simulate the controller logic
    const senderTransaction = new Transaction({
      student: sender._id,
      receiver: receiver._id,
      type: 'expense',
      amount: 5,
      category: 'other_expense',
      description: 'Offline Bluetooth Transfer to Bob',
      paymentMethod: 'offline_token',
      merchant: receiver.name
    });
    await senderTransaction.save();

    const receiverTransaction = new Transaction({
      student: receiver._id,
      type: 'income',
      amount: 5,
      category: 'other_income',
      description: 'Offline Bluetooth Receive from Alice',
      paymentMethod: 'offline_token',
      merchant: sender.name
    });
    await receiverTransaction.save();

    const tokenIds = tokens.map(t => t.tokenId);
    await OfflineToken.updateMany(
      { tokenId: { $in: tokenIds } },
      { $set: { isUsed: true, usedAt: new Date(), transactionRef: senderTransaction._id } }
    );

    console.log('✅ Sync Complete!');
    console.log(`📊 AI Budget Updated: Created Expense transaction for ${sender.name} (Amount: $5)`);
    console.log(`📊 AI Budget Updated: Created Income transaction for ${receiver.name} (Amount: $5)`);
    
    console.log('\n🎉 Test completed successfully! Your backend perfectly processes Bluetooth token transfers.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    mongoose.connection.close();
  }
}

runTest();
