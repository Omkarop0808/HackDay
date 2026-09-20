const mongoose = require('mongoose');

const offlineTokenSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true,
    default: 1
  },
  signature: {
    type: String,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  // The transaction this token was used in (when synced)
  transactionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  }
}, {
  timestamps: true
});

const OfflineToken = mongoose.model('OfflineToken', offlineTokenSchema);
module.exports = OfflineToken;
