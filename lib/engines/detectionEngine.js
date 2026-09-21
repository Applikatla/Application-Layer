/**
 * DetectionEngine: Implements rule-based and behavioral heuristic detectors.
 * Evaluates behavioral metrics against security thresholds.
 */

class DetectionEngine {
  evaluateThreats(metrics, currentEvent = {}) {
    const detectedThreats = [];

    // 1. Account Enumeration / IDOR Detection
    // Scenario: User accesses Account 101 -> 102 -> 103 -> 104 -> 105...
    if (metrics.sequentialSteps >= 2 || metrics.uniqueResourceCount >= 3) {
      const severity = metrics.uniqueResourceCount >= 4 || metrics.sequentialSteps >= 3 ? 'CRITICAL' : 'WARNING';
      detectedThreats.push({
        type: 'Account Enumeration (IDOR)',
        flag: 'ACCOUNT_ENUMERATION',
        severity,
        riskPoints: severity === 'CRITICAL' ? 55 : 30,
        description: `Sequential account access pattern detected (${metrics.accessedResourceSequence.join(' -> ')}). Potential IDOR / account harvesting.`,
        evidence: {
          sequence: metrics.accessedResourceSequence,
          uniqueCount: metrics.uniqueResourceCount,
          sequentialSteps: metrics.sequentialSteps,
        },
      });
    }

    // 2. Credential Stuffing / Brute Force Detection
    if (metrics.failedAuthAttempts >= 2) {
      const severity = metrics.failedAuthAttempts >= 4 ? 'CRITICAL' : 'WARNING';
      detectedThreats.push({
        type: 'Credential Stuffing / Brute Force',
        flag: 'CREDENTIAL_STUFFING',
        severity,
        riskPoints: severity === 'CRITICAL' ? 50 : 25,
        description: `Rapid failed authentication attempts (${metrics.failedAuthAttempts} failures within sliding window).`,
        evidence: {
          failedAttempts: metrics.failedAuthAttempts,
        },
      });
    }

    // 3. Privilege Escalation / Admin Route Probing
    if (metrics.privilegeViolations >= 1) {
      const severity = metrics.privilegeViolations >= 2 ? 'CRITICAL' : 'WARNING';
      detectedThreats.push({
        type: 'Privilege Escalation Probing',
        flag: 'PRIVILEGE_ESCALATION',
        severity,
        riskPoints: severity === 'CRITICAL' ? 45 : 30,
        description: `Unauthorized access attempts to privileged routes (${metrics.privilegeViolations} violations).`,
        evidence: {
          violationCount: metrics.privilegeViolations,
        },
      });
    }

    // 4. Hyper-Velocity Scraping / Bot Activity
    if (metrics.reqsInLast3Sec >= 12 || metrics.minInterArrivalMs < 90) {
      const severity = metrics.reqsInLast3Sec >= 20 ? 'CRITICAL' : 'WARNING';
      detectedThreats.push({
        type: 'Hyper-Velocity Scraping',
        flag: 'VELOCITY_ANOMALY',
        severity,
        riskPoints: severity === 'CRITICAL' ? 40 : 25,
        description: `Unnatural navigation velocity (${metrics.reqsInLast3Sec} requests/3s, min delay ${metrics.minInterArrivalMs}ms).`,
        evidence: {
          reqsInLast3Sec: metrics.reqsInLast3Sec,
          minInterArrivalMs: metrics.minInterArrivalMs,
        },
      });
    }

    // 5. Session Fingerprint Anomaly
    if (metrics.uniqueUserAgents > 2) {
      detectedThreats.push({
        type: 'Session Anomaly',
        flag: 'SESSION_ANOMALY',
        severity: 'WARNING',
        riskPoints: 30,
        description: `Multiple distinct User-Agents detected for single session context.`,
        evidence: {
          distinctAgents: metrics.uniqueUserAgents,
        },
      });
    }

    return detectedThreats;
  }
}

const detectionEngine = new DetectionEngine();
module.exports = detectionEngine;
