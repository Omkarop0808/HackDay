const mongoose = require('mongoose');
require('dotenv').config();

const { generateAgentData } = require('./controllers/agentController');
const { sendCopilotMessage } = require('./controllers/copilotController');
const { runMultiAgentCouncil } = require('./services/multiAgentOrchestrator');
const Student = require('./models/Student');

async function testAllFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const student = await Student.findOne();
    if (!student) {
      console.log('No student found in DB');
      process.exit(1);
    }
    const firebaseUid = student.firebaseUid;
    console.log(`\n=== Testing for Student: ${firebaseUid} ===\n`);

    // Helper to mock express req/res
    const mockRes = (name) => ({
      status: (code) => ({
        json: (data) => console.log(`[${name}] Status ${code} | Data keys:`, Object.keys(data))
      })
    });

    // 1. Test Budget Agent
    console.log('--- Testing Budget Agent ---');
    await generateAgentData(
      { body: { type: 'budget', firebaseUid } },
      mockRes('BudgetAgent')
    );

    // 2. Test Savings Agent
    console.log('\n--- Testing Savings Agent ---');
    await generateAgentData(
      { body: { type: 'savings', firebaseUid } },
      mockRes('SavingsAgent')
    );

    // 3. Test Copilot
    console.log('\n--- Testing Copilot ---');
    await sendCopilotMessage(
      { body: { firebaseUid, message: "How can I reduce my expenses?", mode: "budget" } },
      mockRes('Copilot')
    );

    // 4. Test Council Synthesis
    console.log('\n--- Testing Council Synthesis ---');
    const synthesisData = await runMultiAgentCouncil(firebaseUid, 'monthly');
    console.log('[CouncilSynthesis] Result keys:', Object.keys(synthesisData));

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    process.exit(0);
  }
}

testAllFeatures();
