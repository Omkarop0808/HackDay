const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const Transaction = require('../models/Transaction');
const StudentProfile = require('../models/StudentProfile');
const Notification = require('../models/Notification');

const getModel = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    temperature: 0.2
  });
};

const microSacrificePrompt = PromptTemplate.fromTemplate(`
You are the Micro-Sacrifice Savings AI for FinSage.
Find tiny, painless ways to save money dynamically based on daily habits.
Look at the frequent small purchases in the provided transactions and compare them with the user's goals.
Example: "You usually spend ₹150 on Uber today. If you take the metro, you hit your ₹5,000 Emergency Fund goal by this weekend. Skip the Uber?"

Transactions (last 30 days): {transactions}
Goals: {goals}

Return ONLY valid JSON matching this exact structure:
{{
  "insights": [
    {{
      "title": "Skip the Uber today?",
      "message": "You usually spend ₹150 on Uber. Skip it and take the metro to hit your Emergency Fund goal faster!",
      "actionUrl": "/dashboard/goals"
    }}
  ]
}}
`);

exports.runMicroSacrifice = async (firebaseUid) => {
  console.log(`💡 Running Micro-Sacrifice AI for ${firebaseUid}`);
  
  const Student = require('../models/Student');
  const student = await Student.findOne({ firebaseUid });
  if (!student) return;

  const profile = await StudentProfile.findOne({ student: student._id });
  
  // Get recent expenses
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const transactions = await Transaction.find({ 
    student: student._id, 
    type: 'expense',
    date: { $gte: thirtyDaysAgo }
  });

  if (transactions.length === 0 || !profile) return;

  const txContext = JSON.stringify(transactions.map(t => ({
    merchant: t.merchant || t.description || t.category,
    amount: t.amount,
    date: t.date
  })));

  const goalsContext = JSON.stringify({
    savingsGoal: profile.savingsGoal,
    shortTermGoals: profile.shortTermGoals,
    longTermGoals: profile.longTermGoals
  });

  const llm = getModel();
  const parser = new StringOutputParser();
  const chain = microSacrificePrompt.pipe(llm).pipe(parser);

  try {
    const rawResult = await chain.invoke({ transactions: txContext, goals: goalsContext });
    const cleanJson = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.insights && parsed.insights.length > 0) {
      for (const insight of parsed.insights) {
        // Create Notification
        await Notification.create({
          student: student._id,
          type: 'MicroSacrifice',
          title: insight.title,
          message: insight.message,
          actionUrl: insight.actionUrl
        });
        console.log(`💡 Created Micro-Sacrifice Insight: ${insight.title}`);
      }
    }
    return parsed.insights;
  } catch (error) {
    console.error('Error in Micro-Sacrifice AI:', error);
  }
};
