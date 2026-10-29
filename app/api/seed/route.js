import { connectDB, isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let User, Account, SecurityIncident, SecurityLog, TokenBlacklist;
try {
  User = require('@/lib/models/User');
  Account = require('@/lib/models/Account');
  SecurityIncident = require('@/lib/models/SecurityIncident');
  SecurityLog = require('@/lib/models/SecurityLog');
  TokenBlacklist = require('@/lib/models/TokenBlacklist');
} catch (e) {}

export const dynamic = 'force-dynamic';

export async function POST() {
  await connectDB();

  if (isDbConnected() && User && Account) {
    try {
      await User.deleteMany({});
      await Account.deleteMany({});
      await SecurityIncident.deleteMany({});
      await SecurityLog.deleteMany({});
      await TokenBlacklist.deleteMany({});

      const alice = await User.create({
        username: 'alice',
        password: 'password123',
        name: 'Alice Smith',
        role: 'customer',
        accountNumber: '101',
      });

      const bob = await User.create({
        username: 'bob',
        password: 'password123',
        name: 'Bob Johnson',
        role: 'customer',
        accountNumber: '102',
      });

      const charlie = await User.create({
        username: 'charlie',
        password: 'password123',
        name: 'Charlie Davis',
        role: 'customer',
        accountNumber: '103',
      });

      await User.create({
        username: 'admin',
        password: 'admin123',
        name: 'SOC Administrator',
        role: 'admin',
        accountNumber: '999',
      });

      await Account.create([
        {
          accountNumber: '101',
          holderName: 'Alice Smith',
          accountType: 'Savings',
          balance: 12450.0,
          owner: alice._id,
          recentTransactions: [
            { description: 'Salary Deposit - TechCorp', amount: 4500, type: 'credit', date: new Date(Date.now() - 86400000) },
            { description: 'Mortgage Payment', amount: 1200, type: 'debit', date: new Date(Date.now() - 172800000) },
          ],
        },
        {
          accountNumber: '102',
          holderName: 'Bob Johnson',
          accountType: 'Checking',
          balance: 4820.5,
          owner: bob._id,
          recentTransactions: [
            { description: 'Grocery Store Payment', amount: 145.2, type: 'debit', date: new Date(Date.now() - 43200000) },
            { description: 'ATM Cash Withdrawal', amount: 200, type: 'debit', date: new Date(Date.now() - 129600000) },
          ],
        },
        {
          accountNumber: '103',
          holderName: 'Charlie Davis',
          accountType: 'Investment',
          balance: 85100.0,
          owner: charlie._id,
          recentTransactions: [
            { description: 'Dividend Payout - ETF Portfolio', amount: 620, type: 'credit', date: new Date(Date.now() - 259200000) },
          ],
        },
        {
          accountNumber: '104',
          holderName: 'Diana Prince',
          accountType: 'Premier Corporate',
          balance: 149200.0,
          recentTransactions: [
            { description: 'Corporate Cloud Infrastructure', amount: 14200, type: 'debit', date: new Date(Date.now() - 604800000) },
          ],
        },
        {
          accountNumber: '105',
          holderName: 'Eve Miller',
          accountType: 'Savings',
          balance: 3100.0,
          recentTransactions: [
            { description: 'Peer-to-Peer Payment', amount: 50, type: 'credit', date: new Date(Date.now() - 86400000) },
          ],
        },
        {
          accountNumber: '106',
          holderName: 'Frank Castle',
          accountType: 'Savings',
          balance: 42300.0,
          recentTransactions: [
            { description: 'Security Hardware Purchase', amount: 890, type: 'debit', date: new Date(Date.now() - 43200000) },
          ],
        },
      ]);

      return Response.json({ success: true, target: 'mongodb', message: 'MongoDB seeded successfully!' });
    } catch (err) {
      console.error('Mongo seed error, falling back to memory store:', err);
    }
  }

  await memoryStore.resetStore();
  return Response.json({ success: true, target: 'memory_store', message: 'In-memory database seeded successfully!' });
}

export async function GET() {
  return POST();
}
