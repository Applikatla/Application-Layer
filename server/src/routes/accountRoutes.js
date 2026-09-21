const express = require('express');
const Account = require('../models/Account');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/accounts
router.get('/', protect, async (req, res) => {
  try {
    let accounts;
    if (req.user && req.user.role === 'admin') {
      accounts = await Account.find().sort({ accountNumber: 1 });
    } else if (req.user) {
      // Find accounts belonging to the user or default primary
      accounts = await Account.find({
        $or: [{ owner: req.user._id }, { accountNumber: req.user.accountNumber }],
      });
      if (accounts.length === 0) {
        accounts = await Account.find().limit(3);
      }
    } else {
      accounts = await Account.find().limit(2);
    }
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/accounts/:accountNumber
// Prime target for Account Enumeration (IDOR) attacks: 101 -> 102 -> 103 -> 104 -> 105
router.get('/:accountNumber', protect, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const account = await Account.findOne({ accountNumber });

    if (!account) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: `No active account with identifier ${accountNumber} was found.`,
      });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts/transfer
router.post('/transfer', protect, async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description } = req.body;

    if (!fromAccount || !toAccount || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer details' });
    }

    const source = await Account.findOne({ accountNumber: fromAccount });
    const dest = await Account.findOne({ accountNumber: toAccount });

    if (!source || !dest) {
      return res.status(404).json({ error: 'Source or destination account not found' });
    }

    if (source.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds for transfer' });
    }

    source.balance -= Number(amount);
    source.recentTransactions.unshift({
      description: description || `Transfer to #${toAccount}`,
      amount: Number(amount),
      type: 'debit',
      date: new Date(),
    });
    await source.save();

    dest.balance += Number(amount);
    dest.recentTransactions.unshift({
      description: description || `Transfer from #${fromAccount}`,
      amount: Number(amount),
      type: 'credit',
      date: new Date(),
    });
    await dest.save();

    res.json({
      success: true,
      message: `Transferred $${amount} from Account #${fromAccount} to Account #${toAccount}`,
      newBalance: source.balance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
