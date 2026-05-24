/**
 * Phase 5 Verification Script
 * Validates Phase 5 Exit Criteria (P5-T01 through P5-T05).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock global fetch before importing our delivery modules
let fetchCalls = [];
let mockFetchHandler = null;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  if (mockFetchHandler) {
    return mockFetchHandler(url, options);
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ status: 'ok', result: { id: 'mock-id-123' } }),
    text: async () => '{"status":"ok"}'
  };
};

const apiClient = require('../src/delivery/apiClient');
const deliveryManager = require('../src/delivery/index');

async function verifyPhase5() {
  console.log('🧪 Starting Phase 5 (MCP Email & Docs Delivery) Exit Criteria Validation...');

  // P5-T01: Module Verification & Exports
  console.log('\n🔍 P5-T01: Checking module structure and exported methods...');
  assert.strictEqual(typeof apiClient.createEmailDraft, 'function', 'apiClient must export createEmailDraft');
  assert.strictEqual(typeof apiClient.appendToDoc, 'function', 'apiClient must export appendToDoc');
  assert.strictEqual(typeof apiClient.fetchWithRetry, 'function', 'apiClient must export fetchWithRetry');
  assert.strictEqual(typeof deliveryManager.deliverPulse, 'function', 'deliveryManager must export deliverPulse');
  console.log('✅ P5-T01 Passed: Delivery modules correctly export all required interfaces.');

  // P5-T02: Successful E2E Orchestrated Delivery
  console.log('\n🔍 P5-T02: Testing successful delivery orchestration across all channels...');
  fetchCalls = [];
  mockFetchHandler = null; // Default mock is success

  const pulseMeta = {
    week: 'May 18–24, 2026',
    week_iso: '2026-W21'
  };
  const markdownContent = '# GrowwPulse Pulse Note\nSome content...';

  const successReport = await deliveryManager.deliverPulse(pulseMeta, markdownContent, {
    gmail: true,
    googleDocs: true,
    googleDocId: 'my-verify-doc-id',
    serverUrl: 'http://verify-mcp.local'
  });

  assert.strictEqual(successReport.channels.gmail.status, 'SUCCESS', 'Gmail channel status should be SUCCESS');
  assert.strictEqual(successReport.channels.googleDocs.status, 'SUCCESS', 'Google Docs channel status should be SUCCESS');
  assert.strictEqual(fetchCalls.length, 2, 'Two HTTP requests should have been made');
  
  // Verify Gmail draft URL and payload
  const gmailCall = fetchCalls.find(c => c.url.includes('/create_email_draft'));
  assert.ok(gmailCall, 'Gmail endpoint should be called');
  const gmailBody = JSON.parse(gmailCall.options.body);
  assert.strictEqual(gmailBody.subject, '📊 GrowwPulse — Weekly Review Digest (Week of May 18–24, 2026)', 'Subject line should be formatted correctly');
  assert.strictEqual(gmailBody.body, markdownContent, 'Body content should match markdown content');

  // Verify Google Doc append URL and payload
  const docsCall = fetchCalls.find(c => c.url.includes('/append_to_doc'));
  assert.ok(docsCall, 'Google Docs endpoint should be called');
  const docsBody = JSON.parse(docsCall.options.body);
  assert.strictEqual(docsBody.doc_id, 'my-verify-doc-id', 'Doc ID should match input');
  assert.ok(docsBody.content.includes(markdownContent), 'Doc content should include markdown content');
  console.log('✅ P5-T02 Passed: Orchestrator successfully delivered to both channels with correctly formatted payloads.');

  // P5-T03: Error Handling & Retry Logic (429 Rate Limit)
  console.log('\n🔍 P5-T03: Testing error recovery and retry logic on transient errors (HTTP 429)...');
  fetchCalls = [];
  let calls = 0;
  mockFetchHandler = async (url, options) => {
    calls++;
    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    };
  };

  const response = await apiClient.fetchWithRetry('http://verify-mcp.local/test', {}, 3, 1);
  assert.strictEqual(response.status, 200, 'Request should ultimately succeed');
  assert.strictEqual(calls, 2, 'API client should retry once on 429');
  console.log('✅ P5-T03 Passed: Client automatically retried on rate limit error and successfully completed the request.');

  // P5-T04: Graceful Degradation
  console.log('\n🔍 P5-T04: Testing graceful degradation fallback on persistent connection failure...');
  fetchCalls = [];
  mockFetchHandler = async () => {
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Database crash'
    };
  };

  // We run deliverPulse, which should not crash but return FAILED statuses
  const failureReport = await deliveryManager.deliverPulse(pulseMeta, markdownContent, {
    gmail: true,
    googleDocs: false,
    serverUrl: 'http://verify-mcp.local',
    settingsPath: 'non_existent_file.json' // trigger default settings
  });

  assert.strictEqual(failureReport.channels.gmail.status, 'FAILED', 'Gmail channel status should be FAILED');
  assert.strictEqual(failureReport.channels.gmail.fallback_path, 'data/outputs/pulse_current.md', 'Fallback path should point to local file');
  console.log('✅ P5-T04 Passed: Orchestrator handled persistent failure gracefully without crashing and provided manual delivery pathways.');

  console.log('\n🎉 All Phase 5 Exit Criteria Validated successfully! 🟢');
}

// Restore original fetch on exit
verifyPhase5()
  .catch(err => {
    console.error(`\n❌ Validation Failed: ${err.message}`);
    process.exit(1);
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
  });
