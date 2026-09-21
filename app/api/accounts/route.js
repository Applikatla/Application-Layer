import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let Account;
try {
  Account = require('@/lib/models/Account');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (req) => {
  let accounts = [];

  if (isDbConnected() && Account) {
    try {
      if (req.user && req.user.role === 'admin') {
        accounts = await Account.find().sort({ accountNumber: 1 });
      } else if (req.user) {
        accounts = await Account.find({
          $or: [{ owner: req.user._id }, { accountNumber: req.user.accountNumber }],
        });
        if (accounts.length === 0) {
          accounts = await Account.find().limit(3);
        }
      } else {
        accounts = await Account.find().limit(2);
      }
      return Response.json(accounts);
    } catch (e) {}
  }

  // Memory store fallback
  if (req.user && req.user.role === 'admin') {
    accounts = await memoryStore.getAccounts();
  } else if (req.user) {
    accounts = await memoryStore.getAccounts({ owner: req.user._id || req.user.id });
    if (accounts.length === 0) {
      accounts = await memoryStore.getAccounts({ accountNumber: req.user.accountNumber });
    }
    if (accounts.length === 0) {
      accounts = (await memoryStore.getAccounts()).slice(0, 3);
    }
  } else {
    accounts = (await memoryStore.getAccounts()).slice(0, 2);
  }

  return Response.json(accounts);
});
