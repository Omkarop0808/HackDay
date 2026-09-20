require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const StudentProfile = require('./models/StudentProfile');
const Transaction = require('./models/Transaction');
const { WhatsAppLink } = require('./models/WhatsAppLink');
const Notification = require('./models/Notification');
const { runSubscriptionSniper } = require('./services/subscriptionSniperService');
const { runMicroSacrifice } = require('./services/microSacrificeService');

async function test() {
  try {
    // 1. Connect to DB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finsage-test');
    console.log('✅ Connected to MongoDB');

    // 2. Create Dummy User
    const firebaseUid = 'test-uid-' + Date.now();
    const testEmail = 'test' + Date.now() + '@example.com';
    const student = await Student.create({
      firebaseUid,
      email: testEmail,
      name: 'Test User'
    });

    await StudentProfile.create({
      student: student._id,
      monthlyIncome: 50000,
      savingsGoal: 100000,
      shortTermGoals: [{ id: 'goal-1', title: 'Emergency Fund', targetAmount: 50000, currentAmount: 10000 }]
    });

    await WhatsAppLink.create({
      firebaseUid,
      whatsappChatId: '123456789' + Date.now(),
      phoneNumber: '+1234567890',
      email: testEmail
    });
    
    console.log('✅ Dummy user created');

    // 3. Create Dummy Transactions
    const today = new Date();
    const oneMonthAgo = new Date(); oneMonthAgo.setMonth(today.getMonth() - 1);
    const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(today.getMonth() - 2);
    
    const transactions = [
      // Subscription behavior
      { student: student._id, type: 'expense', amount: 499, category: 'subscriptions', merchant: 'Netflix', date: twoMonthsAgo },
      { student: student._id, type: 'expense', amount: 499, category: 'subscriptions', merchant: 'Netflix', date: oneMonthAgo },
      { student: student._id, type: 'expense', amount: 499, category: 'subscriptions', merchant: 'Netflix', date: today },
      
      // Micro-sacrifice behavior
      { student: student._id, type: 'expense', amount: 150, category: 'transportation', merchant: 'Uber', date: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 1) },
      { student: student._id, type: 'expense', amount: 150, category: 'transportation', merchant: 'Uber', date: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 2) },
      { student: student._id, type: 'expense', amount: 150, category: 'transportation', merchant: 'Uber', date: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 3) }
    ];

    await Transaction.insertMany(transactions);
    console.log('✅ Dummy transactions created');

    // 4. Run Services
    console.log('\n--- Running Subscription Sniper ---');
    await runSubscriptionSniper(firebaseUid);

    console.log('\n--- Running Micro-Sacrifice ---');
    await runMicroSacrifice(firebaseUid);

    // 5. Verify Results
    console.log('\n--- Verification ---');
    
    const updatedTxns = await Transaction.find({ student: student._id, recurring: true });
    console.log('Recurring Transactions found:', updatedTxns.length);
    updatedTxns.forEach(t => console.log(` - ${t.merchant}: next billing -> ${t.next_billing_date}`));

    const notifications = await Notification.find({ student: student._id });
    console.log('\nNotifications created:', notifications.length);
    notifications.forEach(n => console.log(` - [${n.type}] ${n.title}: ${n.message}`));

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

test();
