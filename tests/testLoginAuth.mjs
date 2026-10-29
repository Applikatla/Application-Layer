/**
 * Standalone Automated Test for Login Authentication (Zero Database / In-Memory Mode)
 * Tests admin user authentication with password admin123 and RBAC permissions.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import jwt from 'jsonwebtoken';

// Register alias loader for Next.js '@/' imports
register(pathToFileURL(path.resolve('./tests/aliasLoader.mjs')).href, import.meta.url);

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Running In-Memory Login Auth Test Suite (Zero Database Mode)');
  console.log('   Testing: admin / admin123 Authentication & RBAC Enforcement');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, testName, details = '') => {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      throw new Error(`Test failed: ${testName}`);
    }
  };

  try {
    // Dynamically import routes and modules after loader registration
    const { isDbConnected } = await import('@/lib/config/db');
    const { JWT_SECRET } = await import('@/lib/middleware/securityPipeline');
    const { POST: loginHandler } = await import('@/app/api/auth/login/route.js');
    const { GET: profileHandler } = await import('@/app/api/auth/profile/route.js');
    const { GET: adminConfigHandler } = await import('@/app/api/admin/system-config/route.js');
    const memoryStore = (await import('@/lib/db/memoryStore')).default;
    const stateStore = (await import('@/lib/engines/stateStore')).default;

    // Helper to reset IP security states between independent test steps
    const resetSecurityStore = () => {
      stateStore.states.clear();
    };

    // -------------------------------------------------------------
    // Test 1: Zero-Database Verification
    // -------------------------------------------------------------
    console.log('--- Test 1: Confirming Zero-Database In-Memory Operation ---');
    const dbConnected = isDbConnected();
    assert(!dbConnected, 'System is operating in zero-database mode (isDbConnected is false)');
    const adminRecord = await memoryStore.findUserByUsername('admin');
    assert(adminRecord !== null, 'Admin user exists in in-memory state store');
    assert(adminRecord.role === 'admin', 'Admin user role is "admin"');
    console.log();

    // -------------------------------------------------------------
    // Test 2: Admin Login with 'admin' and 'admin123'
    // -------------------------------------------------------------
    console.log('--- Test 2: Admin Login Authentication (admin / admin123) ---');
    resetSecurityStore();
    const adminReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.1'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    const adminRes = await loginHandler(adminReq);
    assert(adminRes.status === 200, 'Admin login returns HTTP 200 OK');

    const adminData = await adminRes.json();
    assert(!!adminData.token, 'Response contains signed JWT token');
    assert(adminData.user.username === 'admin', 'Response user.username is "admin"');
    assert(adminData.user.role === 'admin', 'Response user.role is "admin"');
    assert(adminData.user.status === 'normal', 'Response user.status is "normal"');
    assert(adminData.user.accountNumber === '999', 'Response user.accountNumber is "999"');

    // Verify token validity with JWT_SECRET
    const decoded = jwt.verify(adminData.token, JWT_SECRET);
    assert(decoded.id === adminData.user.id, 'Decoded JWT payload matches admin user id');
    console.log('  -> Issued Admin JWT Token:', adminData.token.slice(0, 32) + '...');
    console.log();

    // -------------------------------------------------------------
    // Test 3: Admin Login with Wrong Password
    // -------------------------------------------------------------
    console.log('--- Test 3: Admin Login with Invalid Password ---');
    resetSecurityStore();
    const wrongPassReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.2'
      },
      body: JSON.stringify({ username: 'admin', password: 'incorrectPassword999' }),
    });

    const wrongPassRes = await loginHandler(wrongPassReq);
    assert(wrongPassRes.status === 401, 'Invalid password returns HTTP 401 Unauthorized');
    const wrongPassData = await wrongPassRes.json();
    assert(wrongPassData.error === 'INVALID_CREDENTIALS', 'Error code is INVALID_CREDENTIALS');
    console.log();

    // -------------------------------------------------------------
    // Test 4: Login with Non-Existent User
    // -------------------------------------------------------------
    console.log('--- Test 4: Login with Non-Existent User ---');
    resetSecurityStore();
    const noUserReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.3'
      },
      body: JSON.stringify({ username: 'nonexistent_user', password: 'password123' }),
    });

    const noUserRes = await loginHandler(noUserReq);
    assert(noUserRes.status === 401, 'Non-existent user returns HTTP 401 Unauthorized');
    console.log();

    // -------------------------------------------------------------
    // Test 5: Validation for Missing Fields
    // -------------------------------------------------------------
    console.log('--- Test 5: Validation on Missing Payload Fields ---');
    resetSecurityStore();
    const missingReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.4'
      },
      body: JSON.stringify({ username: 'admin' }),
    });

    const missingRes = await loginHandler(missingReq);
    assert(missingRes.status === 400, 'Missing password returns HTTP 400 Bad Request');
    console.log();

    // -------------------------------------------------------------
    // Test 6: Normal User (Alice) Authentication
    // -------------------------------------------------------------
    console.log('--- Test 6: Normal User Login (alice / password123) ---');
    resetSecurityStore();
    const aliceReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.5'
      },
      body: JSON.stringify({ username: 'alice', password: 'password123' }),
    });

    const aliceRes = await loginHandler(aliceReq);
    assert(aliceRes.status === 200, 'Alice login returns HTTP 200 OK');
    const aliceData = await aliceRes.json();
    assert(aliceData.user.username === 'alice', 'User is alice');
    assert(aliceData.user.role === 'customer', 'Alice role is customer');
    console.log();

    // -------------------------------------------------------------
    // Test 7: Profile Endpoint with Admin JWT
    // -------------------------------------------------------------
    console.log('--- Test 7: Profile Verification with Admin JWT ---');
    const profileReq = new Request('http://localhost:3000/api/auth/profile', {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${adminData.token}`,
        'x-forwarded-for': '10.0.0.1'
      },
    });

    const profileRes = await profileHandler(profileReq);
    assert(profileRes.status === 200, 'Admin can access profile endpoint (HTTP 200)');
    const profileData = await profileRes.json();
    assert(profileData.user.username === 'admin', 'Profile username is admin');
    assert(profileData.user.role === 'admin', 'Profile role is admin');
    console.log();

    // -------------------------------------------------------------
    // Test 8: Admin RBAC Privilege Enforcement
    // -------------------------------------------------------------
    console.log('--- Test 8: Admin RBAC Privilege Enforcement ---');
    // Admin accesses admin-only route
    const adminConfigReq = new Request('http://localhost:3000/api/admin/system-config', {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${adminData.token}`,
        'x-forwarded-for': '10.0.0.1'
      },
    });
    const adminConfigRes = await adminConfigHandler(adminConfigReq);
    assert(adminConfigRes.status === 200, 'Admin can access /api/admin/system-config (HTTP 200)');

    // Customer accesses admin-only route
    const aliceConfigReq = new Request('http://localhost:3000/api/admin/system-config', {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${aliceData.token}`,
        'x-forwarded-for': '10.0.0.5'
      },
    });
    const aliceConfigRes = await adminConfigHandler(aliceConfigReq);
    assert(aliceConfigRes.status === 403, 'Customer alice is denied access to /api/admin/system-config (HTTP 403 Forbidden)');
    console.log();

    console.log('================================================================');
    console.log(`🎉 ALL ${passed}/${total} AUTHENTICATION & SECURITY TESTS PASSED!`);
    console.log('   Zero-database admin authentication (admin / admin123) verified!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
