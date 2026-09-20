const mongoose = require('mongoose');
require('dotenv').config();
const { sendCopilotMessage } = require('./controllers/copilotController');

async function testCopilot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Student = require('./models/Student');
    const student = await Student.findOne();
    
    console.log('Testing with student:', student.firebaseUid);
    
    const req = {
      body: {
        firebaseUid: student.firebaseUid,
        message: "hi",
        mode: "budget"
      }
    };
    
    const res = {
      status: (s) => {
        console.log('STATUS:', s);
        return { json: (j) => console.log('JSON:', JSON.stringify(j, null, 2)) };
      }
    };
    
    await sendCopilotMessage(req, res);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

testCopilot();
