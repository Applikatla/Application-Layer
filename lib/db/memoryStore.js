/**
 * In-memory fallback database for serverless cold-start & zero-config Vercel deployments.
 * Automatically initialized with users (alice, bob, charlie, admin) and accounts (101-106).
 */
const bcrypt = require('bcryptjs');

let globalMemoryStore = global.__ALAD_MEMORY_STORE__;

if (!globalMemoryStore) {
  globalMemoryStore = global.__ALAD_MEMORY_STORE__ = {
    users: [],
    accounts: [],
    securityIncidents: [],
    securityLogs: [],
    tokenBlacklist: [],
    initialized: false,
  };
}

async function initDefaultData() {
  if (globalMemoryStore.initialized) return;

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  globalMemoryStore.users = [
    {
      _id: 'user_alice_01',
      username: 'alice',
      password: passwordHash,
      name: 'Alice Smith',
      role: 'customer',
      accountNumber: '101',
      riskScore: 0,
      status: 'normal',
      createdAt: new Date(),
    },
    {
      _id: 'user_bob_02',
      username: 'bob',
      password: passwordHash,
      name: 'Bob Johnson',
      role: 'customer',
      accountNumber: '102',
      riskScore: 0,
      status: 'normal',
      createdAt: new Date(),
    },
    {
      _id: 'user_charlie_03',
      username: 'charlie',
      password: passwordHash,
      name: 'Charlie Davis',
      role: 'customer',
      accountNumber: '103',
      riskScore: 0,
      status: 'normal',
      createdAt: new Date(),
    },
    {
      _id: 'user_admin_99',
      username: 'admin',
      password: adminHash,
      name: 'SOC Administrator',
      role: 'admin',
      accountNumber: '999',
      riskScore: 0,
      status: 'normal',
      createdAt: new Date(),
    },
  ];

  globalMemoryStore.accounts = [
    {
      _id: 'acc_101',
      accountNumber: '101',
      holderName: 'Alice Smith',
      accountType: 'Savings',
      balance: 12450.0,
      owner: 'user_alice_01',
      recentTransactions: [
        { description: 'Salary Deposit - TechCorp', amount: 4500, type: 'credit', date: new Date(Date.now() - 86400000) },
        { description: 'Mortgage Payment', amount: 1200, type: 'debit', date: new Date(Date.now() - 172800000) },
      ],
      createdAt: new Date(),
    },
    {
      _id: 'acc_102',
      accountNumber: '102',
      holderName: 'Bob Johnson',
      accountType: 'Checking',
      balance: 4820.5,
      owner: 'user_bob_02',
      recentTransactions: [
        { description: 'Grocery Store Payment', amount: 145.2, type: 'debit', date: new Date(Date.now() - 43200000) },
        { description: 'ATM Cash Withdrawal', amount: 200, type: 'debit', date: new Date(Date.now() - 129600000) },
      ],
      createdAt: new Date(),
    },
    {
      _id: 'acc_103',
      accountNumber: '103',
      holderName: 'Charlie Davis',
      accountType: 'Investment',
      balance: 85100.0,
      owner: 'user_charlie_03',
      recentTransactions: [
        { description: 'Dividend Payout - ETF Portfolio', amount: 620, type: 'credit', date: new Date(Date.now() - 259200000) },
      ],
      createdAt: new Date(),
    },
    {
      _id: 'acc_104',
      accountNumber: '104',
      holderName: 'Diana Prince',
      accountType: 'Premier Corporate',
      balance: 149200.0,
      owner: null,
      recentTransactions: [
        { description: 'Corporate Cloud Infrastructure', amount: 14200, type: 'debit', date: new Date(Date.now() - 604800000) },
      ],
      createdAt: new Date(),
    },
    {
      _id: 'acc_105',
      accountNumber: '105',
      holderName: 'Eve Miller',
      accountType: 'Savings',
      balance: 3100.0,
      owner: null,
      recentTransactions: [
        { description: 'Peer-to-Peer Payment', amount: 50, type: 'credit', date: new Date(Date.now() - 86400000) },
      ],
      createdAt: new Date(),
    },
    {
      _id: 'acc_106',
      accountNumber: '106',
      holderName: 'Frank Castle',
      accountType: 'Savings',
      balance: 42300.0,
      owner: null,
      recentTransactions: [
        { description: 'Security Hardware Purchase', amount: 890, type: 'debit', date: new Date(Date.now() - 43200000) },
      ],
      createdAt: new Date(),
    },
  ];

  globalMemoryStore.initialized = true;
}

// Auto initialize
initDefaultData();

const memoryStore = {
  getStore: () => globalMemoryStore,
  resetStore: async () => {
    globalMemoryStore.initialized = false;
    globalMemoryStore.securityIncidents = [];
    globalMemoryStore.securityLogs = [];
    globalMemoryStore.tokenBlacklist = [];
    await initDefaultData();
  },

  // User methods
  findUserByUsername: async (username) => {
    await initDefaultData();
    return globalMemoryStore.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  },
  findUserById: async (id) => {
    await initDefaultData();
    return globalMemoryStore.users.find((u) => String(u._id) === String(id)) || null;
  },
  createUser: async (userData) => {
    await initDefaultData();
    const hash = await bcrypt.hash(userData.password, 10);
    const newUser = {
      _id: `user_${Date.now()}`,
      username: userData.username.toLowerCase(),
      password: hash,
      name: userData.name || userData.username,
      role: userData.role || 'customer',
      accountNumber: userData.accountNumber || '101',
      riskScore: 0,
      status: 'normal',
      createdAt: new Date(),
    };
    globalMemoryStore.users.push(newUser);
    return newUser;
  },
  updateUserById: async (id, update) => {
    await initDefaultData();
    const user = globalMemoryStore.users.find((u) => String(u._id) === String(id));
    if (user) {
      Object.assign(user, update);
      return user;
    }
    return null;
  },
  getAllUsers: async () => {
    await initDefaultData();
    return globalMemoryStore.users.map(({ password, ...rest }) => rest);
  },

  // Account methods
  getAccounts: async (filter = {}) => {
    await initDefaultData();
    let accs = [...globalMemoryStore.accounts];
    if (filter.owner) {
      accs = accs.filter((a) => String(a.owner) === String(filter.owner));
    }
    if (filter.accountNumber) {
      accs = accs.filter((a) => a.accountNumber === filter.accountNumber);
    }
    return accs;
  },
  findAccountByNumber: async (accountNumber) => {
    await initDefaultData();
    return globalMemoryStore.accounts.find((a) => a.accountNumber === accountNumber) || null;
  },
  updateAccount: async (accountNumber, update) => {
    await initDefaultData();
    const acc = globalMemoryStore.accounts.find((a) => a.accountNumber === accountNumber);
    if (acc) {
      Object.assign(acc, update);
      return acc;
    }
    return null;
  },

  // Incident methods
  createIncident: async (incidentData) => {
    await initDefaultData();
    const incident = {
      _id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      status: 'active_blocked',
      ...incidentData,
    };
    globalMemoryStore.securityIncidents.unshift(incident);
    return incident;
  },
  getIncidents: async (filter = {}, limit = 50) => {
    await initDefaultData();
    let incs = [...globalMemoryStore.securityIncidents];
    if (filter.status) {
      incs = incs.filter((i) => i.status === filter.status);
    }
    return incs.slice(0, limit);
  },
  findIncidentById: async (incidentId) => {
    await initDefaultData();
    return globalMemoryStore.securityIncidents.find((i) => i.incidentId === incidentId) || null;
  },
  updateIncidents: async (filter, update) => {
    await initDefaultData();
    let count = 0;
    globalMemoryStore.securityIncidents.forEach((i) => {
      let match = true;
      if (filter.attackerIp && i.attackerIp !== filter.attackerIp) match = false;
      if (filter.incidentId && i.incidentId !== filter.incidentId) match = false;
      if (filter.status && i.status !== filter.status) match = false;
      if (match) {
        Object.assign(i, update);
        count++;
      }
    });
    return count;
  },
  countIncidents: async (filter = {}) => {
    await initDefaultData();
    if (!filter || Object.keys(filter).length === 0) return globalMemoryStore.securityIncidents.length;
    return globalMemoryStore.securityIncidents.filter((i) => {
      if (filter.status && i.status !== filter.status) return false;
      return true;
    }).length;
  },
  aggregateIncidentBreakdown: async () => {
    await initDefaultData();
    const map = {};
    globalMemoryStore.securityIncidents.forEach((i) => {
      map[i.attackType] = (map[i.attackType] || 0) + 1;
    });
    return Object.keys(map).map((k) => ({ _id: k, count: map[k] }));
  },

  // Log methods
  createLog: async (logData) => {
    await initDefaultData();
    const log = {
      _id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
      ...logData,
    };
    globalMemoryStore.securityLogs.unshift(log);
    if (globalMemoryStore.securityLogs.length > 200) {
      globalMemoryStore.securityLogs.pop();
    }
    return log;
  },
  getLogs: async (limit = 60) => {
    await initDefaultData();
    return globalMemoryStore.securityLogs.slice(0, limit);
  },
  countLogs: async () => {
    await initDefaultData();
    return globalMemoryStore.securityLogs.length;
  },

  // Token Blacklist methods
  blacklistToken: async (token, reason = 'Security block') => {
    await initDefaultData();
    globalMemoryStore.tokenBlacklist.push({
      token,
      reason,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
  },
  isTokenBlacklisted: async (token) => {
    await initDefaultData();
    return globalMemoryStore.tokenBlacklist.some((t) => t.token === token);
  },
  clearBlacklist: async () => {
    await initDefaultData();
    globalMemoryStore.tokenBlacklist = [];
  },
};

module.exports = memoryStore;
