/**
 * Word Counter and Enforcer for GrowwPulse
 * Counts words and enforces the ≤250 words limit using progressive trimming.
 */

const { interpolate } = require('./template_engine');

/**
 * Counts words in a string.
 * Emojis and numbers count as 1 word each.
 * Splits on any whitespace.
 * @param {string} text Input text
 * @returns {number} Word count
 */
function getWordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Helper to check the word count of the rendered markdown.
 */
function checkMarkdownWordCount(template, values) {
  const rendered = interpolate(template, values);
  // Clean up any empty list items before counting
  const cleaned = cleanRenderedMarkdown(rendered);
  return getWordCount(cleaned);
}

/**
 * Removes empty list items or empty lines from the rendered markdown.
 */
function cleanRenderedMarkdown(md) {
  return md
    // Remove empty 3rd theme line: "3.  —  mentions, avg ★" or "3.  —  mentions, avg  "
    .replace(/^\s*\d+\.\s*—\s*mentions.*$/gm, '')
    .replace(/^\s*\d+\s*\.\s*—.*$/gm, '')
    // Remove empty 3rd quote line: '• "" — ★, ' or similar
    .replace(/^\s*•\s*""\s*—\s*★.*$/gm, '')
    // Remove empty 3rd action idea: "3. " or "3.  "
    .replace(/^\s*\d+\.\s*$/gm, '')
    // Collapse multiple empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Progressively trims themes, quotes, and action ideas to fit under 250 words.
 * @param {string} template Markdown template string
 * @param {Object} reportData Data from the theme analysis report
 * @param {Array<string>} actionIdeas Generated action ideas (3 items)
 * @returns {Object} Values ready for placeholder replacement, guaranteed to render under 250 words
 */
function enforceWordCountLimit(template, reportData, actionIdeas) {
  const dateRange = reportData.week || '';
  const totalReviews = reportData.reviews_analyzed_count || 0;
  const themes = reportData.themes || [];
  const quotes = reportData.selected_quotes || [];
  
  // Clone themes, quotes, and actions to avoid mutating original data
  let trimmedThemes = themes.map(t => ({ ...t }));
  let trimmedQuotes = quotes.map(q => ({ ...q }));
  let trimmedActions = [...actionIdeas];

  // Helper to map current variables to template values
  function buildValues() {
    const vals = {
      DATE_RANGE: dateRange,
      TOTAL_REVIEWS: totalReviews
    };

    // Populate themes (up to 3)
    for (let i = 1; i <= 3; i++) {
      const theme = trimmedThemes[i - 1];
      vals[`THEME_${i}_NAME`] = theme ? theme.name : '';
      vals[`THEME_${i}_MENTIONS`] = theme ? theme.mention_count : '';
      vals[`THEME_${i}_RATING`] = theme ? theme.avg_rating : '';
    }

    // Populate quotes (up to 3)
    for (let i = 1; i <= 3; i++) {
      const quote = trimmedQuotes[i - 1];
      vals[`QUOTE_${i}`] = quote ? quote.text : '';
      vals[`QUOTE_${i}_RATING`] = quote ? quote.rating : '';
      vals[`QUOTE_${i}_SOURCE`] = quote ? (quote.source === 'app_store' ? 'App Store' : 'Play Store') : '';
    }

    // Populate actions (up to 3)
    for (let i = 1; i <= 3; i++) {
      vals[`ACTION_${i}`] = trimmedActions[i - 1] || '';
    }

    return vals;
  }

  let values = buildValues();
  let count = checkMarkdownWordCount(template, values);

  if (count <= 250) {
    return values;
  }

  console.log(`⚠️ Initial word count is ${count}, which exceeds 250 limit. Applying Step 1: Trimming action ideas...`);

  // Step 1: Shorten Action Ideas (Remove the trailing metric parenthetical)
  // E.g. "Prioritize load-testing... (currently 1264 mentions, avg 1.58★)." -> "Prioritize load-testing..."
  trimmedActions = trimmedActions.map(action => {
    if (action.includes(' (currently ')) {
      return action.split(' (currently ')[0] + '.';
    }
    return action;
  });

  values = buildValues();
  count = checkMarkdownWordCount(template, values);

  if (count <= 250) {
    return values;
  }

  console.log(`⚠️ Word count is ${count}. Applying Step 2: Truncating quotes...`);

  // Step 2: Truncate quotes. Find the longest quote and truncate it down to 25 words.
  // Repeat this for all quotes until word count is under 250 or all quotes are truncated.
  for (let round = 0; round < 3; round++) {
    // Find the longest quote that is still longer than 25 words
    let longestQuoteIndex = -1;
    let maxWords = 25;

    trimmedQuotes.forEach((q, idx) => {
      const wCount = getWordCount(q.text);
      if (wCount > maxWords) {
        maxWords = wCount;
        longestQuoteIndex = idx;
      }
    });

    if (longestQuoteIndex === -1) {
      break; // No quote is longer than 25 words
    }

    // Truncate the longest quote
    const words = trimmedQuotes[longestQuoteIndex].text.split(/\s+/);
    trimmedQuotes[longestQuoteIndex].text = words.slice(0, 25).join(' ') + '...';

    values = buildValues();
    count = checkMarkdownWordCount(template, values);

    if (count <= 250) {
      return values;
    }
  }

  // If still > 250, try truncating quotes further to 15 words
  for (let round = 0; round < 3; round++) {
    let longestQuoteIndex = -1;
    let maxWords = 15;

    trimmedQuotes.forEach((q, idx) => {
      const wCount = getWordCount(q.text);
      if (wCount > maxWords) {
        maxWords = wCount;
        longestQuoteIndex = idx;
      }
    });

    if (longestQuoteIndex === -1) {
      break;
    }

    const words = trimmedQuotes[longestQuoteIndex].text.split(/\s+/);
    trimmedQuotes[longestQuoteIndex].text = words.slice(0, 15).join(' ') + '...';

    values = buildValues();
    count = checkMarkdownWordCount(template, values);

    if (count <= 250) {
      return values;
    }
  }

  console.log(`⚠️ Word count is ${count}. Applying Step 3: Dropping 3rd theme, quote, and action idea...`);

  // Step 3: Drop the 3rd theme, quote, and action idea
  if (trimmedThemes.length >= 3) trimmedThemes.splice(2, 1);
  if (trimmedQuotes.length >= 3) trimmedQuotes.splice(2, 1);
  if (trimmedActions.length >= 3) trimmedActions.splice(2, 1);

  values = buildValues();
  count = checkMarkdownWordCount(template, values);

  if (count <= 250) {
    return values;
  }

  // Extreme fallback: truncate quotes even further
  trimmedQuotes = trimmedQuotes.map(q => {
    const words = q.text.split(/\s+/);
    return {
      ...q,
      text: words.slice(0, 10).join(' ') + '...'
    };
  });

  values = buildValues();
  count = checkMarkdownWordCount(template, values);

  return values;
}

module.exports = {
  getWordCount,
  enforceWordCountLimit,
  cleanRenderedMarkdown
};
