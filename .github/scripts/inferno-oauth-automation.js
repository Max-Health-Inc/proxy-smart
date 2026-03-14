/**
 * Inferno SMART App Launch STU2.2 Compliance Test Runner
 * 
 * Runs the following test groups from the Inferno smart_stu2_2 suite:
 *   1. Standalone Launch — Discovery + OAuth + OpenID Connect + Token Refresh
 *   2. Token Introspection — Validates introspection of tokens from Standalone Launch
 *   
 * Not yet automated (require infrastructure changes):
 *   3. EHR Launch — Requires EHR launch context simulation (launch parameter)
 *   4. Backend Services — Requires confidential client with asymmetric JWT auth (JWK Set)
 * 
 * OAuth flow is handled via Playwright (headless Chromium) to automate Keycloak login.
 */

const { chromium } = require('playwright');

const INFERNO_URL = process.env.INFERNO_URL || 'http://localhost:4567';
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:8445/proxy-smart-backend/hapi-fhir-server/R4';
const TEST_SUITE = process.env.TEST_SUITE || 'smart_stu2_2';

// Test user credentials (for OAuth login page)
const KC_USERNAME = process.env.KC_USERNAME || 'testuser';
const KC_PASSWORD = process.env.KC_PASSWORD || 'testpass';

// Inferno client configuration
const CLIENT_ID = process.env.CLIENT_ID || 'inferno-test-client';

// Inferno test group IDs for SMART STU2.2 suite
const GROUP_IDS = {
  STANDALONE_LAUNCH: `${TEST_SUITE}-smart_full_standalone_launch`,
  EHR_LAUNCH: `${TEST_SUITE}-smart_full_ehr_launch`,
  BACKEND_SERVICES: `${TEST_SUITE}-smart_backend_services`,
  TOKEN_INTROSPECTION: `${TEST_SUITE}-smart_token_introspection_stu2_2`,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForInferno() {
  console.log('Checking Inferno availability...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${INFERNO_URL}/api/test_suites`);
      if (response.ok) {
        console.log('✓ Inferno is ready');
        return true;
      }
    } catch (e) {
      // Inferno not ready yet
    }
    await sleep(2000);
  }
  throw new Error('Inferno failed to start');
}

async function createTestSession() {
  console.log(`Creating test session for suite: ${TEST_SUITE}`);
  
  const response = await fetch(`${INFERNO_URL}/api/test_sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      test_suite_id: TEST_SUITE,
      suite_options: {}
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create test session: ${response.status} - ${text}`);
  }
  
  const session = await response.json();
  console.log(`✓ Created test session: ${session.id}`);
  return session;
}

async function getTestGroups(suiteId) {
  const response = await fetch(`${INFERNO_URL}/api/test_suites/${suiteId}`);
  if (!response.ok) {
    throw new Error(`Failed to get test suite: ${response.status}`);
  }
  const suite = await response.json();
  return suite.test_groups || [];
}

async function runTestGroup(sessionId, groupId, inputs) {
  console.log(`Starting test group: ${groupId}`);
  
  // Note: The Inferno API endpoint is /api/test_runs, not /api/test_sessions/{id}/test_runs
  const response = await fetch(`${INFERNO_URL}/api/test_runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      test_session_id: sessionId,
      test_group_id: groupId,
      inputs: inputs
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to start test run: ${response.status} - ${text}`);
  }
  
  const run = await response.json();
  console.log(`✓ Started test run: ${run.id}`);
  return run;
}

async function waitForTestResult(sessionId, runId, browser, page) {
  console.log(`Waiting for test run ${runId} to complete...`);
  
  const maxWait = 120000; // 2 minutes
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // The correct API endpoint is /api/test_runs/:id?include_results=true
    const response = await fetch(`${INFERNO_URL}/api/test_runs/${runId}?include_results=true`);
    if (!response.ok) {
      throw new Error(`Failed to get test run status: ${response.status}`);
    }
    
    const run = await response.json();
    
    // Check if test is waiting for user action (OAuth)
    if (run.status === 'waiting') {
      console.log('Test is waiting for OAuth - checking for redirect...');
      
      // Check if there's a wait result with a redirect URL
      const results = run.results || [];
      for (const result of results) {
        if (result.result === 'wait' && result.requests) {
          for (const req of result.requests) {
            if (req.direction === 'outgoing' && req.url && req.url.includes('authorize')) {
              console.log(`Found OAuth redirect: ${req.url}`);
              await handleOAuthFlow(page, req.url);
            }
          }
        }
      }
    }
    
    if (run.status === 'done' || run.status === 'error' || run.status === 'cancelled') {
      console.log(`Test run completed with status: ${run.status}`);
      return run;
    }
    
    await sleep(2000);
  }
  
  throw new Error('Test run timed out');
}

async function handleOAuthFlow(page, authorizeUrl) {
  console.log('Handling OAuth flow...');
  console.log(`  Navigating to: ${authorizeUrl}`);
  
  try {
    // Navigate to the authorize URL
    const response = await page.goto(authorizeUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const httpStatus = response?.status();
    console.log(`  Navigation response status: ${httpStatus}`);
    
    // Check for error responses (503 = service unavailable, 400 = bad request)
    if (httpStatus >= 400) {
      const pageContent = await page.content();
      const isKeycloakError = pageContent.includes('Invalid redirect_uri') || 
                               pageContent.includes('Client not found') ||
                               pageContent.includes('Invalid parameter');
      if (isKeycloakError) {
        console.error(`  Keycloak returned ${httpStatus} — likely invalid redirect_uri or missing client`);
        console.error(`  Page content (first 500 chars): ${pageContent.substring(0, 500)}`);
      } else {
        console.error(`  Server returned ${httpStatus} error`);
      }
      throw new Error(`OAuth endpoint returned HTTP ${httpStatus}`);
    }
    
    // Check if we're on Keycloak login page
    const currentUrl = page.url();
    console.log(`  Current URL after navigation: ${currentUrl}`);
    
    if (currentUrl.includes('keycloak') || currentUrl.includes('/auth/') || currentUrl.includes('/realms/')) {
      console.log('  On Keycloak login page, entering credentials...');
      
      // Wait for and fill username
      await page.waitForSelector('#username, input[name="username"]', { timeout: 10000 });
      await page.fill('#username, input[name="username"]', KC_USERNAME);
      console.log('  Filled username');
      
      // Fill password
      await page.fill('#password, input[name="password"]', KC_PASSWORD);
      console.log('  Filled password');
      
      // Click login button
      await page.click('#kc-login, button[type="submit"], input[type="submit"]');
      console.log('  Clicked login button');
      
      // Wait for redirect back to Inferno
      const infernoHost = new URL(INFERNO_URL).host;
      await page.waitForURL(url => url.toString().includes(infernoHost), { timeout: 30000 });
      console.log('  ✓ OAuth flow completed, redirected back to Inferno');
    } else {
      console.log(`  Not on Keycloak login page. Page title: ${await page.title()}`);
    }
  } catch (error) {
    console.error(`  OAuth flow error: ${error.message}`);
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: '/tmp/oauth-error.png' });
      console.log('  Screenshot saved to /tmp/oauth-error.png');
    } catch (screenshotError) {
      console.log('  Could not save screenshot');
    }
    throw error;
  }
}

/**
 * Build the standalone_smart_auth_info JSON input for Inferno.
 * This AuthInfo object tells Inferno how to perform the SMART Standalone Launch.
 */
function buildStandaloneSmartAuthInfo() {
  return JSON.stringify({
    auth_type: 'public',
    use_discovery: 'true',
    client_id: CLIENT_ID,
    requested_scopes: 'launch/patient openid fhirUser offline_access patient/*.read',
    pkce_support: 'enabled',
    pkce_code_challenge_method: 'S256',
    auth_request_method: 'GET'
  });
}

/**
 * Run the Standalone Launch test group.
 * This is the primary SMART compliance group covering:
 *   - SMART Discovery (.well-known/smart-configuration)
 *   - Standalone Launch (OAuth2 + PKCE)
 *   - OpenID Connect (id_token, fhirUser claim)
 *   - Token Refresh (with and without scopes)
 */
async function runStandaloneLaunchTests(sessionId, browser) {
  console.log('\n=== Running Standalone Launch Tests ===\n');
  
  const standaloneAuthInfo = buildStandaloneSmartAuthInfo();
  console.log('Auth info:', standaloneAuthInfo);
  
  const inputs = [
    { name: 'url', value: FHIR_SERVER_URL },
    { name: 'standalone_smart_auth_info', value: standaloneAuthInfo }
  ];
  
  try {
    const groups = await getTestGroups(TEST_SUITE);
    
    // List all available test groups
    console.log('Available test groups in suite:');
    groups.forEach(g => console.log(`  - ${g.id}: ${g.title || 'No title'}`));
    console.log('');
    
    // Find the Standalone Launch group by known ID
    const standaloneGroup = groups.find(g => g.id === GROUP_IDS.STANDALONE_LAUNCH);
    
    if (!standaloneGroup) {
      // Fallback: try to match by title or run the first group
      const fallbackGroup = groups.find(g => 
        (g.title || '').toLowerCase().includes('standalone')
      ) || groups[0];
      
      if (fallbackGroup) {
        console.log(`Standalone group not found by ID, using fallback: ${fallbackGroup.id}`);
        const run = await runTestGroup(sessionId, fallbackGroup.id, inputs);
        return await waitForSimpleTestCompletion(sessionId, run.id, browser);
      }
      console.log('ERROR: No test groups available');
      return null;
    }
    
    console.log(`Running test group: ${standaloneGroup.id} — ${standaloneGroup.title}`);
    
    const run = await runTestGroup(sessionId, standaloneGroup.id, inputs);
    return await waitForSimpleTestCompletion(sessionId, run.id, browser);
    
  } catch (error) {
    console.error('Standalone Launch tests error:', error.message);
    throw error;
  }
}

/**
 * Run the Token Introspection test group.
 * Uses tokens obtained during Standalone Launch (from the same session).
 * Requires introspection_endpoint in SMART configuration.
 */
async function runTokenIntrospectionTests(sessionId, browser) {
  console.log('\n=== Running Token Introspection Tests ===\n');
  
  try {
    const groups = await getTestGroups(TEST_SUITE);
    const introspectionGroup = groups.find(g => g.id === GROUP_IDS.TOKEN_INTROSPECTION);
    
    if (!introspectionGroup) {
      console.log('Token Introspection group not found, skipping...');
      return null;
    }
    
    console.log(`Running test group: ${introspectionGroup.id} — ${introspectionGroup.title}`);
    
    // Token Introspection requires standalone_smart_auth_info as input
    // (same as Standalone Launch — it uses it to configure the introspection client)
    const standaloneAuthInfo = buildStandaloneSmartAuthInfo();
    const inputs = [
      { name: 'url', value: FHIR_SERVER_URL },
      { name: 'standalone_smart_auth_info', value: standaloneAuthInfo }
    ];
    
    const run = await runTestGroup(sessionId, introspectionGroup.id, inputs);
    return await waitForSimpleTestCompletion(sessionId, run.id, browser);
    
  } catch (error) {
    console.error('Token Introspection tests error:', error.message);
    // Don't throw — Token Introspection failure shouldn't block the pipeline
    console.log('WARNING: Token Introspection tests failed but continuing...');
    return null;
  }
}

async function waitForSimpleTestCompletion(sessionId, runId, browser = null) {
  const maxWait = 180000; // 3 minutes
  const startTime = Date.now();
  let pollCount = 0;
  let page = null;
  let oauthAttempted = false;
  let oauthAttemptCount = 0;
  const MAX_OAUTH_ATTEMPTS = 3;
  
  console.log(`Waiting for test run ${runId} to complete (timeout: 3 minutes)...`);
  
  while (Date.now() - startTime < maxWait) {
    pollCount++;
    // The correct API endpoint is /api/test_runs/:id?include_results=true
    const response = await fetch(`${INFERNO_URL}/api/test_runs/${runId}?include_results=true`);
    if (!response.ok) {
      console.log(`  [Poll #${pollCount}] API error: ${response.status} - ${response.statusText}`);
      throw new Error(`Failed to get test run status: ${response.status} - ${response.statusText}`);
    }
    const runStatus = await response.json();
    
    console.log(`  [Poll #${pollCount}] Status: ${runStatus.status}`);
    
    if (runStatus.status === 'done' || runStatus.status === 'error' || runStatus.status === 'cancelled') {
      console.log(`Test completed with status: ${runStatus.status}`);
      if (page) await page.close();
      return runStatus;
    }
    
    // Handle waiting status (OAuth required)
    if (runStatus.status === 'waiting' && browser && !oauthAttempted && oauthAttemptCount < MAX_OAUTH_ATTEMPTS) {
      oauthAttemptCount++;
      
      // Exponential backoff between retry attempts (0s, 15s, 30s)
      if (oauthAttemptCount > 1) {
        const backoffMs = (oauthAttemptCount - 1) * 15000;
        console.log(`  Waiting ${backoffMs / 1000}s before OAuth retry (backoff)...`);
        await sleep(backoffMs);
      }
      
      console.log(`  Test is waiting for user action (OAuth flow, attempt ${oauthAttemptCount}/${MAX_OAUTH_ATTEMPTS})...`);
      
      // Look for OAuth redirect URL in the waiting results
      const results = runStatus.results || [];
      for (const result of results) {
        if (result.result === 'wait') {
          // Debug: log the wait result structure
          console.log(`  Wait result keys: ${Object.keys(result).join(', ')}`);
          
          // Check all possible message fields
          const messageFields = ['wait_message', 'result_message', 'messages'];
          for (const field of messageFields) {
            if (result[field]) {
              const content = typeof result[field] === 'string' 
                ? result[field] 
                : JSON.stringify(result[field]);
              console.log(`  ${field} (first 500 chars): ${content.substring(0, 500)}`);
            }
          }
          
          // Check for OAuth URL in requests
          if (result.requests && result.requests.length > 0) {
            console.log(`  Checking ${result.requests.length} requests for OAuth URL...`);
            for (const req of result.requests) {
              console.log(`    Request: ${req.direction || 'unknown'} ${req.verb || 'GET'} ${(req.url || '').substring(0, 100)}`);
              if (req.direction === 'outgoing' && req.url && req.url.includes('authorize')) {
                console.log(`  Found OAuth redirect URL in requests: ${req.url}`);
                try {
                  if (!page) page = await browser.newPage();
                  await handleOAuthFlow(page, req.url);
                  oauthAttempted = true;
                  console.log('  OAuth flow completed, continuing to poll...');
                } catch (oauthError) {
                  console.error(`  OAuth flow failed: ${oauthError.message}`);
                }
                break;
              }
            }
          }
          
          // Check all message fields for OAuth URL
          if (!oauthAttempted) {
            for (const field of messageFields) {
              if (result[field]) {
                const content = typeof result[field] === 'string' 
                  ? result[field] 
                  : JSON.stringify(result[field]);
                // Look for authorize URLs - handle markdown link format [text](url)
                // Match URL up to closing ) or whitespace/quotes
                const urlMatch = content.match(/https?:\/\/[^\s<>"']+?authorize[^\s<>"')]+/);
                if (urlMatch) {
                  // Clean up any trailing punctuation
                  let url = urlMatch[0].replace(/[.,;:!?]+$/, '');
                  console.log(`  Found OAuth URL in ${field}: ${url}`);
                  try {
                    if (!page) page = await browser.newPage();
                    await handleOAuthFlow(page, url);
                    oauthAttempted = true;
                    console.log('  OAuth flow completed, continuing to poll...');
                  } catch (oauthError) {
                    console.error(`  OAuth flow failed: ${oauthError.message}`);
                  }
                  break;
                }
              }
            }
          }
        }
        if (oauthAttempted) break;
      }
      
      if (!oauthAttempted) {
        const waitResults = results.filter(r => r.result === 'wait');
        console.log(`  Found ${waitResults.length} waiting result(s) but no OAuth URL found`);
      }
    } else if (runStatus.status === 'waiting') {
      if (oauthAttemptCount >= MAX_OAUTH_ATTEMPTS) {
        console.error(`  OAuth failed after ${MAX_OAUTH_ATTEMPTS} attempts — aborting wait`);
        if (page) await page.close();
        throw new Error(`OAuth automation failed after ${MAX_OAUTH_ATTEMPTS} attempts`);
      }
      console.log(`  Test is waiting (OAuth ${oauthAttempted ? 'already completed' : 'no browser available'})`);
    }
    
    // Log current progress
    if (runStatus.results && runStatus.results.length > 0) {
      const passed = runStatus.results.filter(r => r.result === 'pass').length;
      const failed = runStatus.results.filter(r => r.result === 'fail').length;
      const waiting = runStatus.results.filter(r => r.result === 'wait').length;
      console.log(`  Progress: ${passed} passed, ${failed} failed, ${waiting} waiting, ${runStatus.results.length} total`);
    }
    
    await sleep(3000); // Poll every 3 seconds
  }
  
  throw new Error('Test run timed out');
}

async function getSessionResults(sessionId) {
  const response = await fetch(`${INFERNO_URL}/api/test_sessions/${sessionId}/results`);
  if (!response.ok) {
    throw new Error(`Failed to get session results: ${response.status}`);
  }
  return response.json();
}

async function printResults(results) {
  console.log('\n========================================');
  console.log('          TEST RESULTS SUMMARY          ');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Collect detailed failure info for later
  const failedTests = [];
  
  for (const result of results) {
    const status = result.result || 'unknown';
    const title = result.test?.title || result.test_id || 'Unknown test';
    
    switch (status) {
      case 'pass':
        passed++;
        console.log(`✓ PASS: ${title}`);
        break;
      case 'fail':
        failed++;
        console.log(`✗ FAIL: ${title}`);
        // Capture detailed failure info
        failedTests.push({
          title,
          test_id: result.test_id,
          result_message: result.result_message,
          messages: result.messages,
          outputs: result.outputs,
          requests: result.requests
        });
        // Print immediate summary
        if (result.result_message) {
          console.log(`    Reason: ${result.result_message.substring(0, 200)}`);
        }
        break;
      case 'skip':
        skipped++;
        console.log(`○ SKIP: ${title}`);
        if (result.result_message) {
          console.log(`    Reason: ${result.result_message.substring(0, 100)}`);
        }
        break;
      case 'error':
        errors++;
        console.log(`⚠ ERROR: ${title}`);
        if (result.result_message) {
          console.log(`    Error: ${result.result_message}`);
        }
        break;
      default:
        console.log(`? ${status.toUpperCase()}: ${title}`);
    }
  }
  
  console.log('\n========================================');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log('========================================\n');
  
  // Print detailed failure analysis
  if (failedTests.length > 0) {
    console.log('\n========================================');
    console.log('       DETAILED FAILURE ANALYSIS        ');
    console.log('========================================\n');
    
    for (const failure of failedTests) {
      console.log(`\n--- ${failure.title} ---`);
      console.log(`Test ID: ${failure.test_id}`);
      
      if (failure.result_message) {
        console.log(`\nResult Message:\n${failure.result_message}`);
      }
      
      if (failure.messages && failure.messages.length > 0) {
        console.log(`\nMessages:`);
        failure.messages.forEach((m, i) => {
          console.log(`  [${i + 1}] ${m.type || 'info'}: ${m.message}`);
        });
      }
      
      if (failure.outputs && Object.keys(failure.outputs).length > 0) {
        console.log(`\nOutputs:`);
        for (const [key, value] of Object.entries(failure.outputs)) {
          const displayValue = typeof value === 'string' && value.length > 200 
            ? value.substring(0, 200) + '...' 
            : value;
          console.log(`  ${key}: ${displayValue}`);
        }
      }
      
      // Show relevant HTTP requests/responses for debugging
      if (failure.requests && failure.requests.length > 0) {
        const relevantRequests = failure.requests.slice(-3); // Last 3 requests
        console.log(`\nRecent HTTP Requests (last ${relevantRequests.length}):`);
        for (const req of relevantRequests) {
          console.log(`  ${req.verb || req.method || 'GET'} ${req.url}`);
          if (req.status) {
            console.log(`    Response Status: ${req.status}`);
          }
          if (req.response_body) {
            const bodyPreview = typeof req.response_body === 'string' 
              ? req.response_body.substring(0, 300) 
              : JSON.stringify(req.response_body).substring(0, 300);
            console.log(`    Response Body: ${bodyPreview}...`);
          }
        }
      }
      
      console.log('\n' + '-'.repeat(50));
    }
  }
  
  return { passed, failed, skipped, errors, total: results.length };
}

async function main() {
  console.log('========================================');
  console.log('  Inferno SMART STU2.2 Compliance Tests ');
  console.log('========================================\n');
  
  console.log('Configuration:');
  console.log(`  Inferno URL: ${INFERNO_URL}`);
  console.log(`  FHIR Server: ${FHIR_SERVER_URL}`);
  console.log(`  Test Suite: ${TEST_SUITE}`);
  console.log(`  Client ID: ${CLIENT_ID}`);
  console.log(`  TLS: ${FHIR_SERVER_URL.startsWith('https') ? 'YES' : 'NO (local mode)'}`);
  console.log('');
  console.log('Groups to run:');
  console.log('  1. Standalone Launch (OAuth + OIDC + Token Refresh)');
  console.log('  2. Token Introspection');
  console.log('  --- SKIPPED ---');
  console.log('  3. EHR Launch (requires launch context API)');
  console.log('  4. Backend Services (requires confidential client + JWK Set)');
  console.log('');
  
  let browser;
  
  try {
    // Wait for Inferno to be ready
    await waitForInferno();
    
    // Pre-flight warm-up: ensure FHIR server and auth endpoints are responsive
    // (Northflank services may have gone cold during CI tool setup)
    if (FHIR_SERVER_URL.startsWith('https')) {
      console.log('Pre-flight warm-up (deployed mode)...');
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const fhirResp = await fetch(`${FHIR_SERVER_URL}/metadata`);
          console.log(`  FHIR /metadata: ${fhirResp.status} (attempt ${attempt})`);
          if (fhirResp.ok) break;
        } catch (e) {
          console.log(`  FHIR /metadata: ${e.message} (attempt ${attempt})`);
        }
        if (attempt < 3) await sleep(5000);
      }
      console.log('');
    }
    
    // Launch browser for OAuth automation
    console.log('Launching headless Chromium for OAuth automation...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create test session
    const session = await createTestSession();
    
    // Group 1: Standalone Launch (includes Discovery, OAuth, OIDC, Token Refresh)
    const standaloneResult = await runStandaloneLaunchTests(session.id, browser);
    
    // Group 2: Token Introspection (uses tokens from Standalone Launch)
    const introspectionResult = await runTokenIntrospectionTests(session.id, browser);
    
    // Get all results across all groups
    const results = await getSessionResults(session.id);
    const summary = await printResults(results);
    
    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `passed=${summary.passed}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `failed=${summary.failed}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `total=${summary.total}\n`);
    }
    
    // Exit with error if any tests failed OR no tests ran
    if (summary.failed > 0 || summary.errors > 0 || summary.total === 0) {
      console.error(`\n❌ Tests failed: ${summary.total === 0 ? 'No tests completed' : `${summary.failed} failed, ${summary.errors} errors out of ${summary.total}`}`);
      process.exit(1);
    }
    
    console.log(`\n✅ All ${summary.passed} tests passed!`);
    
  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
