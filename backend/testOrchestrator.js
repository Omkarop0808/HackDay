require('dotenv').config();
const mongoose = require('mongoose');
const { runMultiAgentCouncil } = require('./services/multiAgentOrchestrator');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    
    console.log('Testing with UID:', 'HF4ZTBwj90dSMlk8fihnJopIOlF3');
    const result = await runMultiAgentCouncil('HF4ZTBwj90dSMlk8fihnJopIOlF3', 'monthly');
    console.log('SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

test();
