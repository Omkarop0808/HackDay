const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

const Student = require('../models/Student');
const StudentProfile = require('../models/StudentProfile');
const Transaction = require('../models/Transaction');
const AgentData = require('../models/AgentData');
const BehavioralInsight = require('../models/BehavioralInsight');
const StockRecommendation = require('../models/StockRecommendation');

const getModel = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    temperature: 0.2
  });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Agent Prompt Templates
 */
const budgetAgentPrompt = PromptTemplate.fromTemplate(`
You are the Budget Agent for FinSage. Analyze the following user data for the {timeframeName} and provide strict JSON output.
Data: {context}

Return ONLY valid JSON matching this structure:
{{
  "summary": "Short summary",
  "budgetCategories": [ {{ "name": "Category", "spent": 100, "limit": 200, "percentUsed": 50 }} ],
  "budgetScore": 85,
  "topOptimization": "Actionable tip"
}}
`);

const savingsAgentPrompt = PromptTemplate.fromTemplate(`
You are the Savings Agent for FinSage. Analyze the following user data for the {timeframeName} and provide strict JSON output.
Data: {context}

Return ONLY valid JSON matching this structure:
{{
  "summary": "Short summary",
  "monthlySavings": 5000,
  "savingsGoal": 50000,
  "currentSavings": 10000,
  "savingsRate": 20,
  "topSavingsTip": "Actionable tip"
}}
`);

const debtAgentPrompt = PromptTemplate.fromTemplate(`
You are the Debt Agent for FinSage. Analyze the following user data for the {timeframeName} and provide strict JSON output.
Data: {context}

Return ONLY valid JSON matching this structure:
{{
  "summary": "Short summary",
  "totalDebt": 10000,
  "monthlyPayment": 1000,
  "debts": [ {{ "name": "Loan", "balance": 10000 }} ],
  "strategy": "Actionable debt payoff strategy"
}}
`);

const supervisorPrompt = PromptTemplate.fromTemplate(`
You are the Synthesis Engine (Supervisor) for FinSage.
You receive advice from the Budget, Savings, and Debt agents, along with the user's investment profile.
Your job is to resolve any conflicting advice (e.g., Debt vs Savings priority) and output a holistic, unified JSON payload for a video briefing analyzing the {timeframeName}, plus 1 behavioral insight based on the provided data.

Investment Context: {investmentContext}
Budget Agent Output: {budgetData}
Savings Agent Output: {savingsData}
Debt Agent Output: {debtData}

Return ONLY valid JSON matching this EXACT structure:
{{
  "videoBriefing": {{
    "intro": {{ "monthName": "Name of timeframe (e.g. This Week, This Cycle, This Month)", "totalIncome": 0, "totalExpenses": 0, "netSavings": 0, "headline": "Short headline" }},
    "budget": {{ "budgetCategories": [], "budgetScore": 0, "topOptimization": "" }},
    "savings": {{ "monthlySavings": 0, "savingsGoal": 0, "currentSavings": 0, "savingsRate": 0, "topSavingsTip": "" }},
    "debt": {{ "totalDebt": 0, "monthlyPayment": 0, "debts": [], "strategy": "" }},
    "investment": {{ "riskLevel": "Moderate", "allocations": [], "topPick": "Invest recommendation" }},
    "actionPlan": {{ "actions": ["Action 1", "Action 2", "Action 3", "Action 4"] }}
  }},
  "behavioralInsight": {{
    "insightType": "SpendingSpike",
    "title": "Short title",
    "description": "Insight based on multi-week habits vs financial health.",
    "impactScore": 75,
    "suggestedAction": "Action to take"
  }}
}}
`);

const roastSupervisorPrompt = PromptTemplate.fromTemplate(`
You are the Sensei (Roast Supervisor) for FinSage. You are aggressive, sarcastic, and demand accountability.
You receive advice from the Budget, Savings, and Debt agents, along with the user's investment profile.
Your job is to resolve any conflicting advice and output a holistic, unified JSON payload for a video briefing analyzing the {timeframeName}.
Instead of polite advice, you must actively ROAST the user for bad spending habits (like excessive dining out or shopping) and be brutally honest about their financial discipline. Don't be afraid to use strong language (but keep it PG-13) and shame them into saving money.

Investment Context: {investmentContext}
Budget Agent Output: {budgetData}
Savings Agent Output: {savingsData}
Debt Agent Output: {debtData}

Return ONLY valid JSON matching this EXACT structure:
{{
  "videoBriefing": {{
    "intro": {{ "monthName": "Name of timeframe", "totalIncome": 0, "totalExpenses": 0, "netSavings": 0, "headline": "A roasting headline" }},
    "budget": {{ "budgetCategories": [], "budgetScore": 0, "topOptimization": "Harsh optimization" }},
    "savings": {{ "monthlySavings": 0, "savingsGoal": 0, "currentSavings": 0, "savingsRate": 0, "topSavingsTip": "Aggressive savings tip" }},
    "debt": {{ "totalDebt": 0, "monthlyPayment": 0, "debts": [], "strategy": "Aggressive debt strategy" }},
    "investment": {{ "riskLevel": "Moderate", "allocations": [], "topPick": "Invest recommendation" }},
    "actionPlan": {{ "actions": ["Roast Action 1", "Roast Action 2", "Roast Action 3", "Roast Action 4"] }}
  }},
  "behavioralInsight": {{
    "insightType": "SpendingSpike",
    "title": "Short roast title",
    "description": "Brutal insight based on multi-week habits vs financial health.",
    "impactScore": 75,
    "suggestedAction": "Harsh action to take"
  }}
}}
`);


/**
 * Main Orchestration Function
 */
exports.runMultiAgentCouncil = async (firebaseUid, timeframe = 'monthly') => {
  console.log(`🧠 Starting Multi-Agent Orchestration for user: ${firebaseUid} | Timeframe: ${timeframe}`);
  
  const student = await Student.findOne({ firebaseUid });
  if (!student) throw new Error('Student not found');
  const studentId = student._id;
  const aiPersonality = student.aiPersonality || 'polite';

  const profile = await StudentProfile.findOne({ student: studentId });

  const stockRec = await StockRecommendation.findOne({ student: studentId }).sort({ lastUpdated: -1 });

  // Determine timeframe
  const startDate = new Date();
  if (timeframe === 'weekly') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeframe === 'cycle') {
    startDate.setDate(startDate.getDate() - 49);
  } else {
    // Default to monthly (30 days)
    startDate.setDate(startDate.getDate() - 30);
  }
  
  const recentTransactions = await Transaction.find({ 
    student: studentId,
    date: { $gte: startDate },
    excludeFromReports: { $ne: true }
  }).sort({ date: -1 }); // Sort descending so newest WhatsApp txns appear first!

  const multiplier = timeframe === 'weekly' ? 0.25 : timeframe === 'cycle' ? 1.75 : 1;
  const timeframeName = timeframe === 'weekly' ? 'Last 7 Days' : timeframe === 'cycle' ? 'Last 7-Week Cycle' : 'Last 30 Days';

  const budgetContext = JSON.stringify({
    income: (profile?.monthlyIncome || 0) * multiplier,
    budget: (profile?.monthlyBudget || 0) * multiplier,
    expensesFixed: ((profile?.rentExpense || 0) + (profile?.foodExpense || 0) + (profile?.transportationExpense || 0) + (profile?.utilitiesExpense || 0) + (profile?.otherExpenses || 0)) * multiplier,
    transactionsCount: recentTransactions.length,
    recentExpenses: recentTransactions.filter(t => t.type === 'expense').slice(0, 20).map(t => ({
      name: t.name, amount: t.amount, category: t.category, date: t.date
    }))
  });

  const savingsContext = JSON.stringify({
    income: (profile?.monthlyIncome || 0) * multiplier,
    savings: profile?.currentSavings || 0,
    savingsGoal: (profile?.savingsGoal || 0) * multiplier,
    shortTermGoals: profile?.shortTermGoals || [],
    longTermGoals: profile?.longTermGoals || []
  });

  const debtContext = JSON.stringify({
    income: (profile?.monthlyIncome || 0) * multiplier,
    totalDebt: profile?.totalDebt || 0,
    debts: profile?.debts || []
  });

  const investmentContext = JSON.stringify({
    riskTolerance: profile?.riskTolerance || 'Low',
    investmentType: profile?.investmentType || 'Not specified',
    stockRecommendations: stockRec ? {
        riskAppetite: stockRec.preferences?.riskAppetite,
        topStocks: stockRec.recommendations?.slice(0, 3).map(r => ({ name: r.name, action: r.recommendedAction, allocation: r.allocation }))
    } : null
  });

  const llm = getModel();
  const parser = new StringOutputParser();

  // Create Chains
  const budgetChain = budgetAgentPrompt.pipe(llm).pipe(parser);
  const savingsChain = savingsAgentPrompt.pipe(llm).pipe(parser);
  const debtChain = debtAgentPrompt.pipe(llm).pipe(parser);
  const selectedSupervisorPrompt = aiPersonality === 'roast' ? roastSupervisorPrompt : supervisorPrompt;
  const supervisorChain = selectedSupervisorPrompt.pipe(llm).pipe(parser);

  console.log('🤖 Running subordinate agents sequentially to avoid rate limits...');
  
  // Run Subordinate Agents Sequentially with Delays
  const budgetRaw = await budgetChain.invoke({ context: budgetContext, timeframeName });
  await delay(1000);
  
  const savingsRaw = await savingsChain.invoke({ context: savingsContext, timeframeName });
  await delay(1000);
  
  const debtRaw = await debtChain.invoke({ context: debtContext, timeframeName });
  await delay(1000);

  console.log('👑 Subordinate agents finished. Running Synthesis Supervisor...');

  // Run Supervisor
  const supervisorRaw = await supervisorChain.invoke({
    investmentContext: investmentContext,
    budgetData: budgetRaw,
    savingsData: savingsRaw,
    debtData: debtRaw,
    timeframeName
  });

  // Parse output robustly
  let finalOutput;
  try {
    const cleanOutput = supervisorRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
    finalOutput = JSON.parse(cleanOutput);
  } catch (err) {
    console.error('Failed to parse supervisor output:', supervisorRaw);
    throw new Error('LLM output parsing failed');
  }

  // Save Behavioral Insight to DB
  if (finalOutput.behavioralInsight) {
    await BehavioralInsight.create({
      student: studentId,
      insightType: finalOutput.behavioralInsight.insightType,
      title: finalOutput.behavioralInsight.title,
      description: finalOutput.behavioralInsight.description,
      impactScore: finalOutput.behavioralInsight.impactScore,
      suggestedAction: finalOutput.behavioralInsight.suggestedAction,
      dataPointsAnalyzed: recentTransactions.length
    });
  }

  // Save full orchestration history (keeps a record of video briefings)
  if (finalOutput.videoBriefing) {
    // OrchestrationHistory model not defined, skipping for now
    // await OrchestrationHistory.create({
    //   student: studentId,
    //   fullOutput: finalOutput
    // });
  }

  console.log('✅ Multi-Agent Orchestration Complete.');
  return finalOutput.videoBriefing;
};
