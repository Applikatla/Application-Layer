/**
 * StateStore: High-performance in-memory sliding-window state tracker.
 * Tracks user navigation paths, accessed resource IDs, request velocities,
 * and error occurrences within time window Δt.
 */

class StateStore {
  constructor() {
    // Map of key -> UserSessionState
    // Key is either `user:<userId>` or `ip:<clientIp>`
    this.states = new Map();
    this.windowMs = 60 * 1000; // 60-second sliding window

    // Periodically clean up stale requests (every 30 seconds)
    setInterval(() => this.pruneStaleRecords(), 30000);
  }

  getKey(userId, ip) {
    if (userId) return `user:${userId}`;
    return `ip:${ip}`;
  }

  getOrCreate(key, ip = '', username = '') {
    if (!this.states.has(key)) {
      this.states.set(key, {
        key,
        ip,
        username: username || 'anonymous',
        requests: [],
        currentRiskScore: 0,
        classification: 'normal', // 'normal' | 'suspicious' | 'blocked'
        violationFlags: [],
        lastViolationTime: null,
        blockedAt: null,
        createdAt: Date.now(),
      });
    }
    const state = this.states.get(key);
    if (ip && !state.ip) state.ip = ip;
    if (username && state.username === 'anonymous') state.username = username;
    return state;
  }

  recordActivity(userId, ip, event) {
    const key = this.getKey(userId, ip);
    const state = this.getOrCreate(key, ip, event.username);

    state.requests.push({
      timestamp: Date.now(),
      endpoint: event.endpoint,
      method: event.method,
      statusCode: event.statusCode || 200,
      resourceId: event.resourceId || null,
      userAgent: event.userAgent || '',
      ip: ip,
    });

    return state;
  }

  getActivityWindow(userId, ip, windowSeconds = 60) {
    const key = this.getKey(userId, ip);
    const state = this.getOrCreate(key, ip);
    const cutoff = Date.now() - (windowSeconds * 1000);
    return state.requests.filter(req => req.timestamp >= cutoff);
  }

  getRiskState(userId, ip) {
    const key = this.getKey(userId, ip);
    return this.getOrCreate(key, ip);
  }

  updateRiskState(userId, ip, score, classification, flags = []) {
    const key = this.getKey(userId, ip);
    const state = this.getOrCreate(key, ip);
    
    state.currentRiskScore = Math.min(100, Math.max(0, Math.round(score)));
    state.classification = classification;

    if (flags.length > 0) {
      state.lastViolationTime = Date.now();
      flags.forEach(f => {
        if (!state.violationFlags.includes(f)) {
          state.violationFlags.push(f);
        }
      });
    }

    if (classification === 'blocked' && !state.blockedAt) {
      state.blockedAt = Date.now();
    }

    return state;
  }

  unblock(userId, ip) {
    const key = this.getKey(userId, ip);
    if (this.states.has(key)) {
      const state = this.states.get(key);
      state.currentRiskScore = 0;
      state.classification = 'normal';
      state.blockedAt = null;
      state.violationFlags = [];
      state.requests = [];
      return true;
    }
    return false;
  }

  getAllActiveStates() {
    const now = Date.now();
    const result = [];
    for (const [key, state] of this.states.entries()) {
      // Recent activity within last 5 minutes or currently blocked
      const recentReqCount = state.requests.filter(r => now - r.timestamp < 300000).length;
      if (recentReqCount > 0 || state.classification === 'blocked' || state.currentRiskScore > 0) {
        result.push({
          key,
          ip: state.ip,
          username: state.username,
          currentRiskScore: state.currentRiskScore,
          classification: state.classification,
          totalRecentRequests: recentReqCount,
          lastViolationTime: state.lastViolationTime,
          violationFlags: state.violationFlags,
          blockedAt: state.blockedAt,
        });
      }
    }
    return result;
  }

  pruneStaleRecords() {
    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes retention for sliding window
    for (const [key, state] of this.states.entries()) {
      state.requests = state.requests.filter(req => req.timestamp >= cutoff);
      if (state.requests.length === 0 && state.classification === 'normal' && state.currentRiskScore === 0) {
        this.states.delete(key);
      }
    }
  }
}

const stateStore = new StateStore();
module.exports = stateStore;
