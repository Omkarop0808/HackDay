require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const { WhatsAppLink } = require('./models/WhatsAppLink');
const Student = require('./models/Student');

async function simulate() {
  console.log('🔄 Connecting to MongoDB to set up a test user...');
  await mongoose.connect(process.env.MONGODB_URI);
  
  // 1. Find any student to link
  const student = await Student.findOne({});
  if (!student) {
    console.log('❌ No students found in database. Cannot simulate.');
    process.exit(1);
  }
  
  const testPhone = 'whatsapp:+1234567890';
  
  // 2. Force link a test WhatsApp number to this student
  await WhatsAppLink.findOneAndUpdate(
    { whatsappChatId: testPhone },
    {
      firebaseUid: student.firebaseUid,
      whatsappChatId: testPhone,
      phoneNumber: '+1234567890',
      email: student.email,
      isActive: true,
      linkedAt: new Date()
    },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Linked test WhatsApp (${testPhone}) to student: ${student.email}`);
  console.log('\n🚀 Simulating incoming Twilio WhatsApp message...\n');

  // 3. Simulate Twilio sending a POST request to our webhook
  const testMessage = "I just grabbed a quick coffee for ₹250 on my way to work.";
  console.log(`💬 Simulating User Texting: "${testMessage}"`);

  try {
    const response = await axios.post('http://localhost:8000/api/whatsapp/webhook', 
      new URLSearchParams({
        From: testPhone,
        Body: testMessage
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('\n✅ Webhook returned 200 OK (Check the Server Console above for the AI parsing logs!)');
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  process.exit(0);
}

simulate();
