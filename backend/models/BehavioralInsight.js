const mongoose = require('mongoose');

const behavioralInsightSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  insightType: {
    type: String, // e.g., 'SpendingSpike', 'SavingOpportunity', 'DebtWarning', 'PositiveHabit'
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  impactScore: {
    type: Number, // 1-100 indicating severity or importance
    default: 50
  },
  isActionable: {
    type: Boolean,
    default: true
  },
  suggestedAction: {
    type: String,
    default: ''
  },
  relatedGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile.shortTermGoals', // Loosely coupled for UI highlighting
    default: null
  },
  dismissed: {
    type: Boolean,
    default: false
  },
  dataPointsAnalyzed: {
    type: Number, // How many weeks/transactions went into this insight
    default: 0
  }
}, {
  timestamps: true
});

const BehavioralInsight = mongoose.model('BehavioralInsight', behavioralInsightSchema);

module.exports = BehavioralInsight;
