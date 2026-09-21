/**
 * AnalysisEngine: Extracts behavioral and access features from internal state.
 * Translates raw request logs into quantifiable metrics for threat detection.
 */

const stateStore = require('./stateStore');

class AnalysisEngine {
  analyze(userId, ip, currentEvent = {}) {
    const recentRequests = stateStore.getActivityWindow(userId, ip, 60); // 60s sliding window
    const now = Date.now();

    // 1. Velocity Metrics
    const reqsInLast3Sec = recentRequests.filter((r) => now - r.timestamp <= 3000).length;
    const reqsInLast10Sec = recentRequests.filter((r) => now - r.timestamp <= 10000).length;

    let minInterArrivalMs = Infinity;
    for (let i = 1; i < recentRequests.length; i++) {
      const delta = recentRequests[i].timestamp - recentRequests[i - 1].timestamp;
      if (delta < minInterArrivalMs) minInterArrivalMs = delta;
    }

    // 2. Resource Access & IDOR / Enumeration Metrics
    const resourceRequests = recentRequests.filter((r) => r.resourceId);
    const accessedResourceIds = resourceRequests.map((r) => r.resourceId);
    const uniqueResourceIds = [...new Set(accessedResourceIds)];

    // Check if numbers form a sequential or near-sequential sweep (e.g. 101 -> 102 -> 103...)
    const numericIds = accessedResourceIds
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n));

    let sequentialSteps = 0;
    for (let i = 1; i < numericIds.length; i++) {
      const diff = Math.abs(numericIds[i] - numericIds[i - 1]);
      if (diff === 1 || diff === 2) {
        sequentialSteps++;
      }
    }

    // 3. Authentication & Error Metrics
    const failedAuthAttempts = recentRequests.filter(
      (r) => r.endpoint.includes('/auth/login') && (r.statusCode === 401 || currentEvent.isFailedAuth)
    ).length;

    const privilegeViolations = recentRequests.filter(
      (r) =>
        (r.endpoint.includes('/admin') || r.endpoint.includes('/privileged')) &&
        (r.statusCode === 403 || currentEvent.isPrivilegeViolation)
    ).length;

    const notFoundCounts = recentRequests.filter((r) => r.statusCode === 404).length;

    // 4. Client Fingerprint Variance
    const uniqueUserAgents = new Set(recentRequests.map((r) => r.userAgent)).size;

    return {
      totalRecentRequests: recentRequests.length,
      reqsInLast3Sec,
      reqsInLast10Sec,
      minInterArrivalMs: minInterArrivalMs === Infinity ? 1000 : minInterArrivalMs,
      uniqueResourceIds,
      uniqueResourceCount: uniqueResourceIds.length,
      accessedResourceSequence: accessedResourceIds,
      sequentialSteps,
      failedAuthAttempts,
      privilegeViolations,
      notFoundCounts,
      uniqueUserAgents,
    };
  }
}

const analysisEngine = new AnalysisEngine();
module.exports = analysisEngine;
