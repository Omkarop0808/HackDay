const mongoose = require('mongoose');

const stakeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  goalType: {
    type: String,
    required: true,
    enum: ['spend_under', 'save_over']
  },
  category: {
    type: String,
    default: 'total'
  },
  targetValue: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'won', 'lost'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Stake = mongoose.model('Stake', stakeSchema);

module.exports = Stake;
