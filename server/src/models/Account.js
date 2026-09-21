const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  date: { type: Date, default: Date.now },
});

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  holderName: {
    type: String,
    required: true,
  },
  accountType: {
    type: String,
    enum: ['Savings', 'Checking', 'Premier Corporate', 'Investment'],
    default: 'Savings',
  },
  balance: {
    type: Number,
    required: true,
    default: 1000.0,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recentTransactions: [transactionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Account', accountSchema);
