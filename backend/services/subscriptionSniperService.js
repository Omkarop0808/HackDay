const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const Transaction = require('../models/Transaction');

const getModel = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    temperature: 0.1
  });
};

const sniperPrompt = PromptTemplate.fromTemplate(`
You are the Subscription Sniper AI for FinSage.
Your goal is to analyze a list of transactions for a single user and identify hidden or obvious recurring charges (subscriptions, bills).
Analyze the transaction history to identify the cadence. If you see an Amazon Prime charge of ₹1499, identify it as "Yearly". If you see Netflix ₹499 multiple times, identify it as "Monthly".

Transactions: {transactions}

Return ONLY valid JSON matching this exact structure:
{{
  "subscriptions": [
    {{
      "transactionName": "Amazon Prime",
      "recurring": true,
      "frequency": "yearly",
      "daysUntilNext": 365
    }}
  ]
}}
`);

exports.runSubscriptionSniper = async (firebaseUid) => {
  console.log(`🎯 Running Subscription Sniper for ${firebaseUid}`);
  
  // To get student ID, we'd normally pass it or look it up, assuming we have Student model
  const Student = require('../models/Student');
  const student = await Student.findOne({ firebaseUid });
  if (!student) return;

  const transactions = await Transaction.find({ student: student._id, type: 'expense' }).sort({ date: -1 }).limit(100);
  if (transactions.length === 0) return;

  // We group them by merchant/name for the AI context
  const txListContext = JSON.stringify(transactions.map(t => ({
    id: t._id,
    merchant: t.merchant || t.description || t.category,
    amount: t.amount,
    date: t.date
  })));

  const llm = getModel();
  const parser = new StringOutputParser();
  const chain = sniperPrompt.pipe(llm).pipe(parser);

  try {
    const rawResult = await chain.invoke({ transactions: txListContext });
    const cleanJson = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.subscriptions && parsed.subscriptions.length > 0) {
      for (const sub of parsed.subscriptions) {
        // Find matching transactions to update them
        const matchingTxns = transactions.filter(t => 
          (t.merchant || t.description || t.category).toLowerCase().includes(sub.transactionName.toLowerCase())
        );
        
        if (matchingTxns.length > 0) {
          // Use the most recent transaction to set next billing date
          const latestTxn = matchingTxns[0];
          const nextDate = new Date(latestTxn.date);
          nextDate.setDate(nextDate.getDate() + (sub.daysUntilNext || 30));
          
          await Transaction.updateMany(
            { _id: { $in: matchingTxns.map(t => t._id) } },
            { 
              $set: { 
                recurring: true, 
                isRecurring: true,
                recurringFrequency: sub.frequency,
                next_billing_date: nextDate
              }
            }
          );
          console.log(`🎯 Flagged ${sub.transactionName} as a ${sub.frequency} subscription.`);
        }
      }
    }
    return parsed.subscriptions;
  } catch (error) {
    console.error('Error in Subscription Sniper:', error);
  }
};
