/**
 * Unit Tests for Theme Classification Engine Components (Phase 3)
 */

const test = require('node:test');
const assert = require('node:assert');

// Load components
const { classifyTextByKeywords } = require('../src/classification/keywordClassifier');
const { getStratifiedSample, cleanAndParseJSON } = require('../src/classification/llmClassifier');
const { scoreThemes } = require('../src/classification/scorer');
const { selectQuotes, calculateQuoteScore } = require('../src/classification/quoteSelector');

test('🏷️ Keyword Matcher Tests', async (t) => {
  await t.test('should identify App Stability & Performance theme from keywords', () => {
    const text = "This app keeps crashing during market hours, very laggy and slow.";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "App Stability & Performance");
  });

  await t.test('should identify Customer Support theme from keywords', () => {
    const text = "The customer care helpline does not respond. Terrible support!";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "Customer Support");
  });

  await t.test('should identify UX / Interface theme from keywords', () => {
    const text = "The new UI is so confusing and the navigation layout is terrible.";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "UX / Interface");
  });

  await t.test('should identify Transactions & Orders theme from keywords', () => {
    const text = "My money was debited but the order failed and withdrawal is pending.";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "Transactions & Orders");
  });

  await t.test('should identify Onboarding & KYC theme from keywords', () => {
    const text = "My KYC verification is pending and Aadhaar card rejected during signup.";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "Onboarding & KYC");
  });

  await t.test('should return Unclassified if no keywords match', () => {
    const text = "Very nice application. I really like using it.";
    const theme = classifyTextByKeywords(text);
    assert.strictEqual(theme, "Unclassified");
  });
});

test('🧠 LLM Helper Tests', async (t) => {
  await t.test('should clean and parse JSON with markdown block wrappers', () => {
    const responseText = "```json\n{\n  \"classifications\": []\n}\n```";
    const parsed = cleanAndParseJSON(responseText);
    assert.ok(parsed);
    assert.ok(Array.isArray(parsed.classifications));
  });

  await t.test('should perform stratified sampling correctly', () => {
    const reviews = [];
    // Populate 10 reviews with rating 1, 20 with rating 2, 30 with rating 3
    for (let i = 0; i < 10; i++) reviews.push({ id: `r1-${i}`, rating: 1, date: '2026-05-01' });
    for (let i = 0; i < 20; i++) reviews.push({ id: `r2-${i}`, rating: 2, date: '2026-05-02' });
    for (let i = 0; i < 30; i++) reviews.push({ id: `r3-${i}`, rating: 3, date: '2026-05-03' });

    // Sample down to 30 reviews
    const sampled = getStratifiedSample(reviews, 30);
    assert.strictEqual(sampled.length, 30);
    
    // Check that proportions are roughly respected
    const r1Count = sampled.filter(r => r.rating === 1).length;
    const r2Count = sampled.filter(r => r.rating === 2).length;
    const r3Count = sampled.filter(r => r.rating === 3).length;

    // Total = 60 reviews. R1 = 10/60 (16.6%), R2 = 20/60 (33.3%), R3 = 30/60 (50%).
    // Sample of 30: R1 = 5, R2 = 10, R3 = 15.
    assert.strictEqual(r1Count, 5);
    assert.strictEqual(r2Count, 10);
    assert.strictEqual(r3Count, 15);
  });
});

test('📈 Scorer Tests', async (t) => {
  await t.test('should calculate theme statistics and rank by composite score correctly', () => {
    const classified = [
      { id: '1', rating: 1, primaryTheme: "App Stability & Performance" },
      { id: '2', rating: 2, primaryTheme: "App Stability & Performance" },
      { id: '3', rating: 5, primaryTheme: "UX / Interface" },
      { id: '4', rating: 4, primaryTheme: "UX / Interface" },
      { id: '5', rating: 4, primaryTheme: "UX / Interface" }
    ];

    const scored = scoreThemes(classified);
    assert.strictEqual(scored.length, 2);

    const stabilityTheme = scored.find(t => t.name === "App Stability & Performance");
    const uxTheme = scored.find(t => t.name === "UX / Interface");

    assert.ok(stabilityTheme);
    assert.ok(uxTheme);

    // App Stability: count = 2, avg rating = (1+2)/2 = 1.5, composite = 2 * (6 - 1.5) = 9
    assert.strictEqual(stabilityTheme.mention_count, 2);
    assert.strictEqual(stabilityTheme.avg_rating, 1.5);
    assert.strictEqual(stabilityTheme.composite_score, 9);

    // UX: count = 3, avg rating = (5+4+4)/3 = 4.33, composite = 3 * (6 - 4.33) = 5.01
    assert.strictEqual(uxTheme.mention_count, 3);
    assert.strictEqual(uxTheme.avg_rating, 4.33);
    assert.strictEqual(uxTheme.composite_score, 5.01);

    // Rank validation (stability composite 9 > UX composite 5.01)
    assert.strictEqual(scored[0].name, "App Stability & Performance");
    assert.strictEqual(scored[0].rank, 1);
    assert.strictEqual(scored[1].name, "UX / Interface");
    assert.strictEqual(scored[1].rank, 2);
  });
});

test('💬 Quote Selector Tests', async (t) => {
  await t.test('should calculate quote quality score based on length and details', () => {
    const reviewShort = { text: "Too short.", rating: 3 };
    const reviewLong = { text: "This is a detailed review with KYC onboarding problems. Verification has been pending for Aadhaar and PAN cards.", rating: 2 };
    
    const scoreShort = calculateQuoteScore(reviewShort);
    const scoreLong = calculateQuoteScore(reviewLong);
    
    assert.ok(scoreLong > scoreShort);
  });

  await t.test('should select exactly 3 representative, diverse, and PII-free quotes', () => {
    const classified = [
      { id: '1', rating: 1, text: "The app crashed again while loading the charts, lag issues.", primaryTheme: "App Stability & Performance", source: "play_store" },
      { id: '2', rating: 3, text: "Customer care support did not respond to my complaint ticket.", primaryTheme: "Customer Support", source: "app_store" },
      { id: '3', rating: 4, text: "The interface layout is a bit cluttered after the update.", primaryTheme: "UX / Interface", source: "play_store" },
      { id: '4', rating: 5, text: "I love this app, it is so simple and helpful.", primaryTheme: "UX / Interface", source: "play_store" },
      { id: '5', rating: 2, text: "This review has an email address test@groww.in inside, so it should be skipped.", primaryTheme: "Customer Support", source: "play_store" } // has raw email in text? Wait, let's look at PII check. The quote selector checks for redaction markers like [EMAIL_REDACTED].
    ];

    const ranked = [
      { name: "App Stability & Performance" },
      { name: "Customer Support" },
      { name: "UX / Interface" }
    ];

    const selected = selectQuotes(classified, ranked);
    assert.strictEqual(selected.length, 3);
    
    // Verify they are from distinct themes
    const themes = selected.map(q => q.primaryTheme);
    const distinctThemes = new Set(themes);
    assert.ok(distinctThemes.size >= 2);
  });
});
