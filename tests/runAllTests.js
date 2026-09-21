/**
 * Automated Verification Suite for Application-Layer Attack Detection (Next.js)
 */

const http = require('http');
const path = require('path');
const next = require('next');

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverInstance;
let nextApp;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Security Detection Automated Test Suite');
  console.log('    (Unified Next.js App Router Architecture)');
  console.log('====================================================\n');

  console.log('[Test Suite] Initializing Next.js application server...');
  nextApp = next({
    dev: false,
    dir: path.resolve(__dirname, '..'),
    customServer: true,
  });

  try {
    await nextApp.prepare();
  } catch (err) {
    console.warn('[Test Suite] nextApp.prepare dev fallback...');
    nextApp = next({
      dev: true,
      dir: path.resolve(__dirname, '..'),
      customServer: true,
    });
    await nextApp.prepare();
  }

  const handle = nextApp.getRequestHandler();

  await new Promise((resolve) => {
    serverInstance = http.createServer((req, res) => {
      handle(req, res);
    });
    serverInstance.listen(TEST_PORT, () => {
      console.log(`[Test Server] Listening on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  let totalPassed = 0;
  let totalTests = 0;

  const assert = (condition, message) => {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      totalPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('\n--- Test 1: System Health Endpoint ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthData.status === 'online', 'System status is online');

    // ----------------------------------------------------
    // TEST 2: Normal User Behavior (Alice - 🟢 Allow)
    // ----------------------------------------------------
    console.log('\n--- Test 2: Normal User Behavior (Alice - 🟢 Allow) ---');
    // Login as Alice
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Alice logs in successfully');
    const aliceToken = loginData.token;

    // Normal access: Alice looks at her own account #101
    const accRes1 = await fetch(`${BASE_URL}/api/accounts/101`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert(accRes1.status === 200, 'Alice accesses her own account 101');

    await delay(100);
    const profileRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const profileData = await profileRes.json();
    assert(profileData.user.riskScore < 40, `Alice risk score is low (${profileData.user.riskScore} < 40)`);
    assert(profileData.user.status === 'normal', 'Alice status remains Normal 🟢');

    // ----------------------------------------------------
    // TEST 3: Account Enumeration Attack (101 -> 102 -> 103 -> 104 -> 105)
    // ----------------------------------------------------
    console.log('\n--- Test 3: Account Enumeration Attack (IDOR Sweep: 101 -> 105) ---');
    // Reset IP risk state first
    await fetch(`${BASE_URL}/api/simulation/reset`, { method: 'POST' });

    const accountsToProbe = ['101', '102', '103', '104', '105'];
    const responses = [];

    for (const accNum of accountsToProbe) {
      const res = await fetch(`${BASE_URL}/api/accounts/${accNum}`, {
        headers: {
          Authorization: `Bearer ${aliceToken}`,
          'User-Agent': 'AttackerProbe/1.0',
        },
      });
      const data = await res.json();
      responses.push({ status: res.status, accNum, data });
      console.log(`  -> Probed Account #${accNum}: Status=${res.status}, Risk=${data.riskScore || 'N/A'}`);
      await delay(80);
    }

    // First and second probes allowed
    assert(responses[0].status === 200, 'First probe to 101 allowed (200)');
    assert(responses[1].status === 200, 'Second probe to 102 allowed (200)');

    // By probe 4 or 5, the account enumeration rule triggers and blocks
    const finalProbe = responses[responses.length - 1];
    assert(finalProbe.status === 403, 'Fifth sequential probe to 105 blocked with HTTP 403 Forbidden 🔴');
    assert(finalProbe.data.error === 'SECURITY_BLOCK', 'Returned error is SECURITY_BLOCK');
    assert(finalProbe.data.classification === 'blocked', 'User classified as Blocked Attacker 🔴');

    // Subsequent request is blocked by enforcer
    const blockedCheck = await fetch(`${BASE_URL}/api/accounts/101`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert(blockedCheck.status === 403, 'Subsequent request blocked by enforcer middleware');

    // ----------------------------------------------------
    // TEST 4: SOC Incident Verification & Unblock
    // ----------------------------------------------------
    console.log('\n--- Test 4: SOC Incident Generation & Admin Unblock ---');
    const incidentsRes = await fetch(`${BASE_URL}/api/security/incidents`);
    const incidents = await incidentsRes.json();
    assert(incidents.length > 0, 'Security incident recorded in database');
    const latestIncident = incidents[0];
    assert(
      latestIncident.attackType.includes('Account Enumeration'),
      `Incident recorded as "${latestIncident.attackType}"`
    );

    // Admin unblocks
    const unblockRes = await fetch(`${BASE_URL}/api/security/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: latestIncident.incidentId,
        ip: latestIncident.attackerIp,
      }),
    });
    const unblockData = await unblockRes.json();
    assert(unblockRes.status === 200, 'Admin unblocks target');
    assert(unblockData.success === true, 'Unblock confirmed successful');

    // After unblock, normal access works again
    const postUnblockRes = await fetch(`${BASE_URL}/api/accounts/101`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert(postUnblockRes.status === 200, 'Access restored to HTTP 200 after unblock 🟢');

    // ----------------------------------------------------
    // TEST 5: Credential Stuffing / Brute Force Detection
    // ----------------------------------------------------
    console.log('\n--- Test 5: Credential Stuffing Attack ---');
    await fetch(`${BASE_URL}/api/simulation/reset`, { method: 'POST' });

    let bruteBlocked = false;
    for (let i = 1; i <= 5; i++) {
      const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: `user_${i}`, password: 'wrongpassword' }),
      });
      const failData = await failRes.json();
      console.log(`  -> Failed Login #${i}: Status=${failRes.status}, Error=${failData.error}`);
      if (failRes.status === 403 && failData.error === 'SECURITY_BLOCK') {
        bruteBlocked = true;
        break;
      }
      await delay(50);
    }
    assert(bruteBlocked, 'Credential stuffing burst flagged and blocked with HTTP 403 🔴');

    // ----------------------------------------------------
    // TEST 6: Privilege Escalation Probing
    // ----------------------------------------------------
    console.log('\n--- Test 6: Privilege Escalation Probing ---');
    await fetch(`${BASE_URL}/api/simulation/reset`, { method: 'POST' });

    for (let i = 1; i <= 3; i++) {
      const privRes = await fetch(`${BASE_URL}/api/admin/system-config`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
      });
      const privData = await privRes.json();
      console.log(`  -> Admin Probe #${i}: Status=${privRes.status}, Error=${privData.error}`);
      await delay(50);
    }

    const privBlockedCheck = await fetch(`${BASE_URL}/api/accounts/101`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert(privBlockedCheck.status === 403, 'User blocked after probing privileged admin endpoints 🔴');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${totalPassed}/${totalTests} SECURITY TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Test Suite Failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    process.exit(process.exitCode || 0);
  }
}

runTests();
