import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let Account;
try {
  Account = require('@/lib/models/Account');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { fromAccount, toAccount, amount, description } = body;

  if (!fromAccount || !toAccount || !amount || Number(amount) <= 0) {
    return Response.json({ error: 'Invalid transfer details' }, { status: 400 });
  }

  const transferAmt = Number(amount);

  if (isDbConnected() && Account) {
    try {
      const source = await Account.findOne({ accountNumber: fromAccount });
      const dest = await Account.findOne({ accountNumber: toAccount });

      if (!source || !dest) {
        return Response.json({ error: 'Source or destination account not found' }, { status: 404 });
      }

      if (source.balance < transferAmt) {
        return Response.json({ error: 'Insufficient funds for transfer' }, { status: 400 });
      }

      source.balance -= transferAmt;
      source.recentTransactions.unshift({
        description: description || `Transfer to #${toAccount}`,
        amount: transferAmt,
        type: 'debit',
        date: new Date(),
      });
      await source.save();

      dest.balance += transferAmt;
      dest.recentTransactions.unshift({
        description: description || `Transfer from #${fromAccount}`,
        amount: transferAmt,
        type: 'credit',
        date: new Date(),
      });
      await dest.save();

      return Response.json({
        success: true,
        message: `Transferred $${transferAmt} from Account #${fromAccount} to Account #${toAccount}`,
        newBalance: source.balance,
      });
    } catch (e) {}
  }

  // Memory store fallback
  const source = await memoryStore.findAccountByNumber(fromAccount);
  const dest = await memoryStore.findAccountByNumber(toAccount);

  if (!source || !dest) {
    return Response.json({ error: 'Source or destination account not found' }, { status: 404 });
  }

  if (source.balance < transferAmt) {
    return Response.json({ error: 'Insufficient funds for transfer' }, { status: 400 });
  }

  source.balance -= transferAmt;
  source.recentTransactions.unshift({
    description: description || `Transfer to #${toAccount}`,
    amount: transferAmt,
    type: 'debit',
    date: new Date(),
  });

  dest.balance += transferAmt;
  dest.recentTransactions.unshift({
    description: description || `Transfer from #${fromAccount}`,
    amount: transferAmt,
    type: 'credit',
    date: new Date(),
  });

  return Response.json({
    success: true,
    message: `Transferred $${transferAmt} from Account #${fromAccount} to Account #${toAccount}`,
    newBalance: source.balance,
  });
});
