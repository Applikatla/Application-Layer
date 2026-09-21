import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let Account;
try {
  Account = require('@/lib/models/Account');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (req, { params }) => {
  const { accountNumber } = params;

  let account = null;

  if (isDbConnected() && Account) {
    try {
      account = await Account.findOne({ accountNumber });
    } catch (e) {}
  }

  if (!account) {
    account = await memoryStore.findAccountByNumber(accountNumber);
  }

  if (!account) {
    return Response.json(
      {
        error: 'ACCOUNT_NOT_FOUND',
        message: `No active account with identifier ${accountNumber} was found.`,
      },
      { status: 404 }
    );
  }

  return Response.json(account);
});
