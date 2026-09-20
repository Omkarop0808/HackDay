require('dotenv').config();
const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const VALID_CATEGORIES = [
  'salary', 'allowance', 'freelance', 'scholarship', 'gift', 'refund', 'investment_return', 'other_income',
  'food', 'transportation', 'entertainment', 'shopping', 'utilities', 'rent', 'education',
  'healthcare', 'subscriptions', 'groceries', 'dining_out', 'clothing', 'electronics',
  'travel', 'fitness', 'personal_care', 'gifts_donations', 'insurance', 'other_expense',
  'stocks', 'mutual_funds', 'crypto', 'fixed_deposit', 'gold', 'other_investment',
  'savings_transfer', 'account_transfer', 'other_transfer'
];

async function testParser() {
  const testMessages = [
    "I just grabbed a quick coffee for ₹250 on my way to work.",
    "Paid my monthly electricity bill of 1200",
    "Received my salary of 50000 rupees today!",
    "Bought 2 movie tickets for 800"
  ];

  console.log('🤖 Starting AI Parsing Tests...\n');

  for (const message of testMessages) {
    console.log(`💬 User sent: "${message}"`);
    console.log(`⏳ Parsing with Groq LLM...`);
    
    try {
      const prompt = `
You are a highly accurate financial transaction parser. 
Extract the transaction details from the following user message and return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json.
If the message is not related to a financial transaction (like "hello" or "how are you"), return a JSON object with an "error" field explaining that you need transaction details.

Valid 'type' values: "income", "expense", "transfer", "investment". (Default to "expense" if unsure).
Valid 'category' values MUST be one of:
${VALID_CATEGORIES.join(', ')}.
If it doesn't fit exactly, pick the closest match, default to "other_expense" or "other_income".
'amount' must be a positive number.
'description' is a short summary.

User Message: "${message}"
`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-20b',
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(chatCompletion.choices[0].message.content);
      console.log(`✅ AI Parsed Result:`);
      console.log(JSON.stringify(parsed, null, 2));
      console.log('-----------------------------------\n');
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testParser();
