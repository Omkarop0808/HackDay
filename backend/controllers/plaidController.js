const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const BankConnection = require('../models/BankConnection');
const Transaction = require('../models/Transaction');
const Student = require('../models/Student');

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Map Plaid categories to our FinSage categories
const mapPlaidCategory = (plaidCategories) => {
  if (!plaidCategories || plaidCategories.length === 0) return 'other_expense';
  
  const categoryStr = plaidCategories.join(',').toLowerCase();
  
  if (categoryStr.includes('food') || categoryStr.includes('dining') || categoryStr.includes('restaurant')) return 'dining_out';
  if (categoryStr.includes('grocery') || categoryStr.includes('supermarket')) return 'groceries';
  if (categoryStr.includes('travel') || categoryStr.includes('airlines')) return 'travel';
  if (categoryStr.includes('transportation') || categoryStr.includes('taxi')) return 'transportation';
  if (categoryStr.includes('entertainment') || categoryStr.includes('recreation')) return 'entertainment';
  if (categoryStr.includes('shopping') || categoryStr.includes('clothing')) return 'shopping';
  if (categoryStr.includes('health') || categoryStr.includes('medical')) return 'healthcare';
  if (categoryStr.includes('utilities') || categoryStr.includes('bill')) return 'utilities';
  if (categoryStr.includes('rent') || categoryStr.includes('mortgage')) return 'rent';
  if (categoryStr.includes('education')) return 'education';
  
  return 'other_expense';
};

// 1. Generate Link Token for frontend to open Plaid UI
exports.createLinkToken = async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: 'Missing firebaseUid' });
    
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const request = {
      user: {
        client_user_id: student._id.toString(),
      },
      client_name: 'FinSage',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Plaid create link token error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
};

// 2. Exchange public token for access token after successful Link
exports.exchangePublicToken = async (req, res) => {
  try {
    const { public_token, institution_name, firebaseUid } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: 'Missing firebaseUid' });

    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const studentId = student._id;

    const request = {
      public_token: public_token,
    };
    const response = await plaidClient.itemPublicTokenExchange(request);
    
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Save connection to DB
    const bankConnection = new BankConnection({
      student: studentId,
      plaidAccessToken: accessToken,
      plaidItemId: itemId,
      institutionName: institution_name || 'Connected Bank'
    });
    
    await bankConnection.save();

    res.json({ success: true, message: 'Bank connected successfully' });
  } catch (error) {
    console.error('Plaid exchange token error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
};

// 3. Sync transactions from Plaid
exports.syncTransactions = async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: 'Missing firebaseUid' });

    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const studentId = student._id;
    
    // Get active bank connections for this user
    const connections = await BankConnection.find({ student: studentId, status: 'active' });
    
    if (connections.length === 0) {
      return res.status(400).json({ error: 'Please connect a bank first before syncing.' });
    }

    // Set date range for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    let totalSynced = 0;

    // Loop through all connected banks
    for (const connection of connections) {
      try {
        const request = {
          access_token: connection.plaidAccessToken,
          start_date: startDate,
          end_date: endDate,
        };

        const response = await plaidClient.transactionsGet(request);
        const transactions = response.data.transactions;

        // Save new transactions to DB
        for (const pt of transactions) {
          // Check if it already exists
          const existing = await Transaction.findOne({ plaidTransactionId: pt.transaction_id });
          if (existing) continue; // Skip duplicates

          const isIncome = pt.amount < 0; // In Plaid, negative means money in (income)
          
          const newTx = new Transaction({
            student: studentId,
            type: isIncome ? 'income' : 'expense',
            amount: Math.abs(pt.amount),
            category: isIncome ? 'other_income' : mapPlaidCategory(pt.category),
            description: pt.name,
            merchant: pt.merchant_name || pt.name,
            date: new Date(pt.date),
            source: 'API',
            plaidTransactionId: pt.transaction_id
          });
          
          await newTx.save();
          totalSynced++;
        }
        
        // Update last sync time
        connection.lastSync = new Date();
        await connection.save();
        
      } catch (err) {
        console.error(`Error syncing connection ${connection.institutionName}:`, err.response ? err.response.data : err.message);
        // Continue to the next connection even if one fails
      }
    }

    res.json({ 
      success: true, 
      message: `Successfully synced ${totalSynced} new transactions from your banks.`,
      syncedCount: totalSynced
    });
    
  } catch (error) {
    console.error('Plaid sync error:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
};

// 4. Get connection status
exports.getConnectionStatus = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const connections = await BankConnection.find({ student: student._id, status: 'active' });
    res.json({ isConnected: connections.length > 0, connections });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// 5. Disconnect (Unsync) Bank
exports.disconnectBank = async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    await BankConnection.deleteMany({ student: student._id });
    await Transaction.deleteMany({ student: student._id, source: 'API' });
    
    res.json({ success: true, message: 'Bank disconnected and synced transactions removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
