const cron = require('node-cron');
const twilio = require('twilio');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');
const { WhatsAppLink } = require('../models/WhatsAppLink');

// Runs every day at 10:00 AM
exports.initCronJobs = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ Running Daily Cron Jobs...');
    await checkZombieSubscriptions();
  });
  console.log('✅ Cron Jobs Initialized');
};

const checkZombieSubscriptions = async () => {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Find all recurring transactions with billing dates in the next 3 days
    const upcomingTxns = await Transaction.find({
      recurring: true,
      next_billing_date: { $gte: today, $lte: threeDaysFromNow }
    }).populate('student');

    for (const txn of upcomingTxns) {
      // Find WhatsApp Link
      const waLink = await WhatsAppLink.findOne({ firebaseUid: txn.student.firebaseUid, isActive: true });
      
      if (waLink) {
        // Send WhatsApp warning
        const msg = `🚨 *Zombie Subscription Alert* 🚨\nHi! You have an upcoming charge for *${txn.merchant || txn.category}* of ₹${txn.amount} on ${txn.next_billing_date.toDateString()}.\n\nIf you don't use this anymore, consider cancelling it!`;
        
        console.log(`Sending WhatsApp to ${waLink.phoneNumber}: ${msg}`);
        
        // Actually send if TWILIO is configured
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: msg,
            from: 'whatsapp:+14155238886', // Twilio Sandbox Number or real one
            to: `whatsapp:${waLink.phoneNumber}`
          }).catch(err => console.error('Twilio Error:', err));
        }
      }
    }
  } catch (err) {
    console.error('Error checking zombie subscriptions:', err);
  }
};
