/**
 * Unit Tests for Ingestion Pipeline Components (Phase 2)
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Load components
const { scrubText } = require('../src/ingestion/piiScrubber');
const { normalizeAppStore, normalizePlayStore } = require('../src/ingestion/normalizer');
const { mergeAndDeduplicate, filterByDateWindow } = require('../src/ingestion/storage');

test('🔒 PII Scrubber Tests', async (t) => {
  await t.test('should redact email addresses', () => {
    const raw = 'Please contact me at test.user_name@groww.co.in for details.';
    const scrubbed = scrubText(raw);
    assert.strictEqual(scrubbed.includes('test.user_name@groww.co.in'), false);
    assert.strictEqual(scrubbed.includes('[EMAIL_REDACTED]'), true);
  });

  await t.test('should redact phone numbers', () => {
    const raw = 'My mobile number is +91-9876543210. Call me.';
    const scrubbed = scrubText(raw);
    assert.strictEqual(scrubbed.includes('9876543210'), false);
    assert.strictEqual(scrubbed.includes('[PHONE_REDACTED]'), true);
  });

  await t.test('should redact Indian Aadhaar numbers', () => {
    const raw = 'My Aadhaar is 1234 5678 9012. Please verify.';
    const scrubbed = scrubText(raw);
    assert.strictEqual(scrubbed.includes('1234 5678 9012'), false);
    assert.strictEqual(scrubbed.includes('[GOV_ID_REDACTED]'), true);
  });

  await t.test('should redact Indian PAN card numbers', () => {
    const raw = 'My PAN number is ABCDE1234F.';
    const scrubbed = scrubText(raw);
    assert.strictEqual(scrubbed.includes('ABCDE1234F'), false);
    assert.strictEqual(scrubbed.includes('[GOV_ID_REDACTED]'), true);
  });

  await t.test('should redact User IDs and Client Codes while keeping keywords', () => {
    const raw = 'Client code: GROWW1234, my user_id: abc_xyz99.';
    const scrubbed = scrubText(raw);
    assert.strictEqual(scrubbed.includes('GROWW1234'), false);
    assert.strictEqual(scrubbed.includes('abc_xyz99'), false);
    assert.strictEqual(scrubbed.toLowerCase().includes('client code: [id_redacted]'), true);
    assert.strictEqual(scrubbed.toLowerCase().includes('user_id: [id_redacted]'), true);
  });
});

test('📋 Normalizer Tests', async (t) => {
  await t.test('should normalize raw App Store RSS entries', () => {
    const mockEntry = {
      'im:rating': { label: '4' },
      title: { label: 'Decent app ' },
      content: { label: 'Needs better support. My email is support@groww.in.' },
      updated: { label: '2026-05-21T07:30:15-07:00' }
    };

    const normalized = normalizeAppStore(mockEntry);
    assert.ok(normalized);
    assert.strictEqual(normalized.rating, 4);
    assert.strictEqual(normalized.title, 'Decent app');
    assert.strictEqual(normalized.text.includes('support@groww.in'), false);
    assert.strictEqual(normalized.text.includes('[EMAIL_REDACTED]'), true);
    assert.strictEqual(normalized.date, '2026-05-21');
    assert.strictEqual(normalized.source, 'app_store');
    assert.ok(normalized.id);
  });

  await t.test('should normalize raw Play Store entries', () => {
    const mockItem = {
      score: 2,
      title: 'Failed payment',
      text: 'My phone is 9876543210 and the payment failed.',
      date: new Date('2026-05-20T10:00:00Z')
    };

    const normalized = normalizePlayStore(mockItem);
    assert.ok(normalized);
    assert.strictEqual(normalized.rating, 2);
    assert.strictEqual(normalized.title, 'Failed payment');
    assert.strictEqual(normalized.text.includes('9876543210'), false);
    assert.strictEqual(normalized.text.includes('[PHONE_REDACTED]'), true);
    assert.strictEqual(normalized.date, '2026-05-20');
    assert.strictEqual(normalized.source, 'play_store');
    assert.ok(normalized.id);
  });
});

test('💾 Storage and Merging Tests', async (t) => {
  await t.test('should merge and deduplicate reviews correctly', () => {
    const existing = [
      { id: '1', rating: 5, text: 'Clean review 1', date: '2026-05-01', source: 'app_store' },
      { id: '2', rating: 3, text: 'Clean review 2', date: '2026-05-02', source: 'play_store' }
    ];
    
    const incoming = [
      { id: '2', rating: 4, text: 'Clean review 2 updated', date: '2026-05-02', source: 'play_store' }, // Duplicate ID, should overwrite
      { id: '3', rating: 1, text: 'Clean review 3', date: '2026-05-03', source: 'app_store' }
    ];

    const merged = mergeAndDeduplicate(existing, incoming);
    assert.strictEqual(merged.length, 3);
    
    const review2 = merged.find(r => r.id === '2');
    assert.strictEqual(review2.rating, 4); // overwritten
    assert.strictEqual(review2.text, 'Clean review 2 updated');
  });

  await t.test('should filter reviews outside the date retention window', () => {
    const today = new Date();
    const getDateAgo = (days) => {
      const d = new Date();
      d.setDate(today.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const reviews = [
      { id: '1', date: getDateAgo(2), text: 'Recent review', source: 'app_store' },
      { id: '2', date: getDateAgo(30), text: 'Month old review', source: 'play_store' },
      { id: '3', date: getDateAgo(90), text: '90 days old review', source: 'app_store' } // default window is 8 weeks / 56 days, so this should be filtered
    ];

    // Filter using 8 weeks (56 days) window
    const filtered = filterByDateWindow(reviews, 8);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered.some(r => r.id === '3'), false);
  });
});
