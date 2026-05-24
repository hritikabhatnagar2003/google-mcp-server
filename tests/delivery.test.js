/**
 * Unit Tests for Delivery Module (Phase 5)
 */

const test = require('node:test');
const assert = require('node:assert');

// Mock global fetch
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
    json: async () => ({ status: 'ok', result: { id: 'mock-id' } }),
    text: async () => '{"status":"ok"}'
  };
};

// Import client after mocking fetch
const { createEmailDraft, appendToDoc, fetchWithRetry } = require('../src/delivery/apiClient');
const { deliverPulse } = require('../src/delivery/index');

test('🚀 GrowwPulse Phase 5 Delivery Tests', async (t) => {
  t.beforeEach(() => {
    fetchCalls = [];
    mockFetchHandler = null;
  });

  t.after(() => {
    // Restore original fetch after all tests in this suite
    globalThis.fetch = originalFetch;
  });

  await t.test('🔌 API Client: should send create email draft POST request successfully', async () => {
    const res = await createEmailDraft('recipient@test.com', 'Subject Prefix', 'Body text content');
    
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(fetchCalls.length, 1);
    
    const call = fetchCalls[0];
    assert.ok(call.url.includes('/create_email_draft'));
    assert.strictEqual(call.options.method, 'POST');
    
    const body = JSON.parse(call.options.body);
    assert.strictEqual(body.to, 'recipient@test.com');
    assert.strictEqual(body.subject, 'Subject Prefix');
    assert.strictEqual(body.body, 'Body text content');
  });

  await t.test('🔌 API Client: should send append to doc POST request successfully', async () => {
    const res = await appendToDoc('my-doc-123', 'Content to append');
    
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(fetchCalls.length, 1);
    
    const call = fetchCalls[0];
    assert.ok(call.url.includes('/append_to_doc'));
    assert.strictEqual(call.options.method, 'POST');
    
    const body = JSON.parse(call.options.body);
    assert.strictEqual(body.doc_id, 'my-doc-123');
    assert.strictEqual(body.content, 'Content to append');
  });

  await t.test('🔌 API Client: should retry on transient status code 429 and succeed on next attempt', async () => {
    let callCount = 0;
    mockFetchHandler = async (url, options) => {
      callCount++;
      if (callCount === 1) {
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

    // Pass a very small delay (1ms) to speed up unit tests
    const response = await fetchWithRetry('http://test.local', {}, 3, 1);
    const data = await response.json();
    
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(callCount, 2);
  });

  await t.test('🔌 API Client: should exhaust all retries and throw error on persistent 500 error', async () => {
    mockFetchHandler = async (url, options) => {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Database failure'
      };
    };

    await assert.rejects(
      async () => {
        await fetchWithRetry('http://test.local', {}, 2, 1);
      },
      /HTTP Error 500: Database failure/
    );
    
    // 1 initial attempt + 2 retries = 3 calls total
    assert.strictEqual(fetchCalls.length, 3);
  });

  await t.test('📬 Orchestrator: should call both Gmail and Docs channels when enabled', async () => {
    const meta = { week: '2026-05-18 to 2026-05-24', week_iso: '2026-W21' };
    const md = 'My pulse report';
    
    const report = await deliverPulse(meta, md, {
      gmail: true,
      googleDocs: true,
      googleDocId: 'my-mock-doc-id',
      serverUrl: 'http://mock-mcp.local'
    });

    assert.strictEqual(report.channels.gmail.status, 'SUCCESS');
    assert.strictEqual(report.channels.googleDocs.status, 'SUCCESS');
    assert.strictEqual(fetchCalls.length, 2);
  });

  await t.test('📬 Orchestrator: should skip Docs archiving if doc ID is missing', async () => {
    const meta = { week: '2026-05-18 to 2026-05-24', week_iso: '2026-W21' };
    const md = 'My pulse report';
    
    const report = await deliverPulse(meta, md, {
      gmail: true,
      googleDocs: true,
      googleDocId: '', // missing
      serverUrl: 'http://mock-mcp.local'
    });

    assert.strictEqual(report.channels.gmail.status, 'SUCCESS');
    assert.strictEqual(report.channels.googleDocs.status, 'SKIPPED');
    assert.strictEqual(fetchCalls.length, 1);
  });

  await t.test('📬 Orchestrator: should handle Gmail failure and record status in report', async () => {
    mockFetchHandler = async (url, options) => {
      if (url.includes('/create_email_draft')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: async () => 'Action not approved'
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' })
      };
    };

    const meta = { week: '2026-05-18 to 2026-05-24', week_iso: '2026-W21' };
    const md = 'My pulse report';
    
    const report = await deliverPulse(meta, md, {
      gmail: true,
      googleDocs: false,
      serverUrl: 'http://mock-mcp.local'
    });

    assert.strictEqual(report.channels.gmail.status, 'FAILED');
    assert.ok(report.channels.gmail.error.includes('HTTP Error 403'));
  });
});
