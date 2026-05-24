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
      content: { label: 'Needs better support. My email is support@groww.in. Let us try to reach the customer support agent to resolve this pending ticket.' },
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
      text: 'My phone is 9876543210 and the payment failed. The upi transaction is stuck and pending for 4 days.',
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

  await t.test('should filter out reviews with 6 or fewer words', () => {
    const shortItem = {
      score: 5,
      title: 'Great app',
      text: 'This app is very good.', // 5 words
      date: new Date('2026-05-20')
    };
    const normalized = normalizePlayStore(shortItem);
    assert.strictEqual(normalized, null);
  });

  await t.test('should filter out reviews containing emojis', () => {
    const emojiItem1 = {
      score: 5,
      title: 'Nice app 😊', // emoji in title
      text: 'The interface is very easy to use and very fast.',
      date: new Date('2026-05-20')
    };
    const emojiItem2 = {
      score: 4,
      title: 'Decent',
      text: 'Works fine but sometimes crashes 🚀 when loading charts.', // emoji in text
      date: new Date('2026-05-20')
    };
    assert.strictEqual(normalizePlayStore(emojiItem1), null);
    assert.strictEqual(normalizePlayStore(emojiItem2), null);
  });

  await t.test('should filter out non-English reviews (native scripts and Hinglish)', () => {
    const hindiScriptItem = {
      score: 5,
      title: 'अच्छा ऐप',
      text: 'यह बहुत ही सुंदर और अच्छा ऐप है निवेश करने के लिए।',
      date: new Date('2026-05-20')
    };
    const hinglishItem = {
      score: 1,
      title: 'Bakwas app',
      text: 'bahut bakwas app hai update ke baad open nahi ho raha hai login issue hai',
      date: new Date('2026-05-20')
    };
    assert.strictEqual(normalizePlayStore(hindiScriptItem), null);
    assert.strictEqual(normalizePlayStore(hinglishItem), null);
  });

  await t.test('should validate gibberish, Hinglish, and helpfulness filters directly', () => {
    const { isGibberish, isHinglish, isHelpfulReview } = require('../src/ingestion/normalizer');

    // 1. Gibberish assertions
    assert.strictEqual(isGibberish('kks x zlvn. bvlll n km cc k kkkkffcc'), true);
    assert.strictEqual(isGibberish('This is a completely normal English sentence.'), false);

    // 2. Hinglish assertions
    assert.strictEqual(isHinglish('bohot hi badiya app he'), true);
    assert.strictEqual(isHinglish('ye grow bilkul Farzi app hai'), true);
    assert.strictEqual(isHinglish('Great customer support and easy UI.'), false);

    // 3. Helpfulness assertions
    assert.strictEqual(isHelpfulReview('very good', 2), false); // generic short
    assert.strictEqual(isHelpfulReview('This app is nice and works well for me.', 9), false); // short normal
    assert.strictEqual(isHelpfulReview('I requested a withdrawal of my funds 4 days ago, but the transaction is still pending.', 17), true); // helpful
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
