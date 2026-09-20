const mongoose = require('mongoose');

const bankConnectionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  plaidAccessToken: {
    type: String,
    required: true
  },
  plaidItemId: {
    type: String,
    required: true,
    unique: true
  },
  institutionName: {
    type: String,
    default: 'Connected Bank'
  },
  lastSync: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'error'],
    default: 'active'
  }
}, {
  timestamps: true
});

const BankConnection = mongoose.model('BankConnection', bankConnectionSchema);

module.exports = BankConnection;
