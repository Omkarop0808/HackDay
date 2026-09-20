const Stake = require('../models/Stake');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

exports.createStake = async (req, res) => {
  try {
    const { firebaseUid, amount, goalType, category, targetValue, deadline } = req.body;
    
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const newStake = new Stake({
      student: student._id,
      amount,
      goalType,
      category,
      targetValue,
      deadline
    });

    await newStake.save();
    res.status(201).json({ success: true, stake: newStake });
  } catch (error) {
    console.error('Error creating stake:', error);
    res.status(500).json({ error: 'Failed to create stake' });
  }
};

exports.getStakes = async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const stakes = await Stake.find({ student: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, stakes });
  } catch (error) {
    console.error('Error getting stakes:', error);
    res.status(500).json({ error: 'Failed to fetch stakes' });
  }
};

exports.evaluateStakes = async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    const student = await Student.findOne({ firebaseUid });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const activeStakes = await Stake.find({ student: student._id, status: 'active' });
    
    const now = new Date();
    let updatedCount = 0;

    for (let stake of activeStakes) {
      if (new Date(stake.deadline) < now) {
        // Deadline passed, evaluate
        
        // Find transactions for this category since stake was created
        let filter = {
          student: student._id,
          date: { $gte: stake.createdAt, $lte: stake.deadline }
        };
        
        if (stake.category !== 'total') {
          filter.category = stake.category;
        }
        
        const transactions = await Transaction.find(filter);
        
        // Calculate total amount
        const totalAmount = transactions.reduce((sum, tx) => sum + (tx.type === 'expense' ? tx.amount : 0), 0);
        
        if (stake.goalType === 'spend_under') {
          if (totalAmount <= stake.targetValue) {
            stake.status = 'won';
          } else {
            stake.status = 'lost';
          }
        } else if (stake.goalType === 'save_over') { // for save_over, we use income/savings
           const saved = transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : 0), 0);
           if (saved >= stake.targetValue) {
             stake.status = 'won';
           } else {
             stake.status = 'lost';
           }
        }
        
        await stake.save();
        updatedCount++;
      }
    }

    res.json({ success: true, message: `Evaluated ${updatedCount} stakes.` });
  } catch (error) {
    console.error('Error evaluating stakes:', error);
    res.status(500).json({ error: 'Failed to evaluate stakes' });
  }
};
