/**
 * Unit Tests for Pulse Note Generator Components (Phase 4)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Load components
const { interpolate } = require('../src/generator/template_engine');
const { generateAction, generateActionIdeas } = require('../src/generator/action_generator');
const { getWordCount, enforceWordCountLimit, cleanRenderedMarkdown } = require('../src/generator/word_counter');
const { renderHTML } = require('../src/generator/html_formatter');

test('📝 Template Engine Tests', async (t) => {
  await t.test('should interpolate placeholders correctly', () => {
    const template = 'Hello {{NAME}}, welcome to {{PLACE}}!';
    const result = interpolate(template, { NAME: 'Alice', PLACE: 'Wonderland' });
    assert.strictEqual(result, 'Hello Alice, welcome to Wonderland!');
  });

  await t.test('should handle missing keys gracefully by replacing with empty string', () => {
    const template = 'Hello {{NAME}}, welcome to {{PLACE}}!';
    const result = interpolate(template, { NAME: 'Alice' });
    assert.strictEqual(result, 'Hello Alice, welcome to !');
  });

  await t.test('should handle null/undefined values by replacing with empty string', () => {
    const template = 'Hello {{NAME}}!';
    const result = interpolate(template, { NAME: null });
    assert.strictEqual(result, 'Hello !');
  });
});

test('💡 Action Idea Generator Tests', async (t) => {
  await t.test('should generate action idea for App Stability & Performance theme', () => {
    const theme = { name: 'App Stability & Performance', mention_count: 50, avg_rating: 1.5 };
    const action = generateAction(theme);
    assert.ok(action.includes('load-testing'));
    assert.ok(action.includes('50 mentions'));
    assert.ok(action.includes('1.5★'));
  });

  await t.test('should generate action idea for UX / Interface theme', () => {
    const theme = { name: 'UX / Interface', mention_count: 200, avg_rating: 4.2 };
    const action = generateAction(theme);
    assert.ok(action.includes('navigation audit'));
    assert.ok(action.includes('200 mentions'));
  });

  await t.test('should use fallback template for custom/unknown themes', () => {
    const theme = { name: 'Billing Issues', mention_count: 10, avg_rating: 2.0 };
    const action = generateAction(theme);
    assert.ok(action.includes('Billing Issues'));
    assert.ok(action.includes('10 mentions'));
  });

  await t.test('should generate exactly 3 action ideas, padding if necessary', () => {
    const themes = [
      { name: 'App Stability & Performance', mention_count: 50, avg_rating: 1.5 },
      { name: 'UX / Interface', mention_count: 200, avg_rating: 4.2 }
    ];
    const actions = generateActionIdeas(themes, 3);
    assert.strictEqual(actions.length, 3);
    assert.ok(actions[0].includes('load-testing'));
    assert.ok(actions[1].includes('navigation audit'));
    assert.ok(actions[2].includes('Review recent low-rating customer reviews'));
  });
});

test('📊 Word Counter & Enforcer Tests', async (t) => {
  await t.test('should calculate word count correctly', () => {
    const text = '  Hello  world!   This has 5   words. ';
    assert.strictEqual(getWordCount(text), 6);
  });

  await t.test('should clean rendered markdown correctly', () => {
    const md = `
🔥 TOP THEMES THIS WEEK
1. App Stability & Performance — 47 mentions, avg 1.8★
2. Customer Support — 21 mentions, avg 2.2★
3.  —  mentions, avg ★

💬 USER VOICES (Anonymized)
• "Excellent." — ★5, App Store
• "" — ★, 
`;
    const cleaned = cleanRenderedMarkdown(md);
    assert.ok(cleaned.includes('App Stability'));
    assert.ok(!cleaned.includes('3.'));
    assert.ok(!cleaned.includes('• ""'));
  });

  await t.test('should trim action ideas first if word count exceeds 250', () => {
    // Large template to simulate high word count
    const template = '{{DATE_RANGE}}\n{{THEME_1_NAME}}\n{{QUOTE_1}}\n{{QUOTE_2}}\n{{QUOTE_3}}\n{{ACTION_1}}\n{{ACTION_2}}\n{{ACTION_3}}';
    
    const longText1 = Array(90).fill('word').join(' ');
    const longText2 = Array(90).fill('word').join(' ');
    const longText3 = Array(90).fill('word').join(' ');

    const reportData = {
      week: '2026-05-18 to 2026-05-24',
      reviews_analyzed_count: 100,
      themes: [{ name: 'App Stability & Performance', mention_count: 50, avg_rating: 2.0 }],
      selected_quotes: [
        { text: longText1, rating: 2, source: 'play_store' },
        { text: longText2, rating: 3, source: 'app_store' },
        { text: longText3, rating: 1, source: 'play_store' }
      ]
    };
    
    const actions = [
      'Prioritize load-testing order execution paths during market hours to reduce crash-related complaints (currently 50 mentions, avg 2.0★).',
      'Action idea 2 for testing word count enforcer (currently 10 mentions, avg 3.0★).',
      'Action idea 3 for testing word count enforcer (currently 5 mentions, avg 4.0★).'
    ];

    const values = enforceWordCountLimit(template, reportData, actions);
    
    // Validate that actions are shortened (metric parenthetical is removed)
    assert.strictEqual(values.ACTION_1, 'Prioritize load-testing order execution paths during market hours to reduce crash-related complaints.');
    assert.strictEqual(values.ACTION_2, 'Action idea 2 for testing word count enforcer.');
  });
});

test('🔌 HTML Formatter Tests', async (t) => {
  await t.test('should clean empty list items and quote table rows', () => {
    const template = `
      <ul>
        <li><strong>{{THEME_1_NAME}}</strong> &mdash; {{THEME_1_MENTIONS}} mentions, avg {{THEME_1_RATING}}★</li>
        <li><strong>{{THEME_2_NAME}}</strong> &mdash; {{THEME_2_MENTIONS}} mentions, avg {{THEME_2_RATING}}★</li>
      </ul>
      <table>
        <tr>
          <td>
            <span class="quote">"{{QUOTE_1}}"</span>
            <div>★{{QUOTE_1_RATING}} &bull; {{QUOTE_1_SOURCE}}</div>
          </td>
        </tr>
        <tr><td style="height: 12px;"></td></tr>
        <tr>
          <td>
            <span class="quote">"{{QUOTE_2}}"</span>
            <div>★{{QUOTE_2_RATING}} &bull; {{QUOTE_2_SOURCE}}</div>
          </td>
        </tr>
      </table>
    `;
    
    const values = {
      THEME_1_NAME: 'UX / Interface',
      THEME_1_MENTIONS: 50,
      THEME_1_RATING: 4.5,
      THEME_2_NAME: '',
      THEME_2_MENTIONS: '',
      THEME_2_RATING: '',
      QUOTE_1: 'Great app!',
      QUOTE_1_RATING: 5,
      QUOTE_1_SOURCE: 'App Store',
      QUOTE_2: '',
      QUOTE_2_RATING: '',
      QUOTE_2_SOURCE: ''
    };

    const rendered = renderHTML(template, values);
    
    // Theme 1 should remain, Theme 2 should be stripped
    assert.ok(rendered.includes('UX / Interface'));
    assert.ok(!rendered.includes('<strong></strong>'));
    
    // Quote 1 should remain, Quote 2 row and its spacer should be stripped
    assert.ok(rendered.includes('Great app!'));
    assert.ok(!rendered.includes('""'));
    assert.ok(!rendered.includes('12px'));
  });
});
