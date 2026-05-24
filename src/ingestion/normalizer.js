/**
 * Review Normalizer for GrowwPulse
 * Standardizes reviews from App Store and Play Store to a unified schema.
 */

const crypto = require('crypto');
const LanguageDetect = require('languagedetect');
const { scrubText } = require('./piiScrubber');

const detector = new LanguageDetect();

/**
 * Helper to check if a text contains any emoji.
 * Uses Unicode property escape for Extended Pictographic characters and standard emoji character ranges.
 * @param {string} text Text to check
 * @returns {boolean} True if emoji found
 */
function hasEmoji(text) {
  if (!text) return false;
  const emojiRegex = /[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|\p{Extended_Pictographic}/u;
  return emojiRegex.test(text);
}

/**
 * Heuristic to detect gibberish strings (e.g. "kks x zlvn. bvlll n").
 * Checks vowel ratios, long non-vowel words, and character repetition.
 * @param {string} text Text to check
 * @returns {boolean} True if gibberish detected
 */
function isGibberish(text) {
  if (!text) return true;
  const clean = text.replace(/[^a-zA-Z]/g, '');
  if (clean.length === 0) return true;

  // 1. Vowel ratio check (English text has at least 15% vowels on average)
  const vowels = (clean.match(/[aeiouAEIOU]/g) || []).length;
  const vowelRatio = vowels / clean.length;
  if (vowelRatio < 0.12 && clean.length > 5) {
    return true;
  }
  if (vowelRatio > 0.70 && clean.length > 8) {
    return true;
  }

  // 2. Word check for non-vowel patterns
  const words = text.split(/\s+/);
  const commonAbbrs = new Set(['my', 'by', 'try', 'cry', 'dry', 'fly', 'sky', 'why', 'sl', 'kyc', 'upi', 'pan', 'otp', 'app', 'pdf', 'id', 'ux', 'tv', 'ok']);
  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length > 3 && !cleanWord.match(/[aeiouy]/) && !commonAbbrs.has(cleanWord)) {
      return true;
    }
    if (/(.)\1{3,}/.test(cleanWord)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects Hinglish (Hindi written in Latin script) via stopword analysis.
 * @param {string} text Text to check
 * @returns {boolean} True if Hinglish detected
 */
function isHinglish(text) {
  if (!text) return false;
  const cleanText = text.toLowerCase();
  
  // High confidence Hinglish indicators
  const highConfHinglish = /\b(badiya|badhiya|kharab|bakwas|farzi|faltu|chahiye|bilkul|nhi|nahi|mat|kuch|kuchh|aisa|waisa|vaisa|kaise|jaise|kya|kyu|kyun|bohot|bahut|hoga|hogi|hoge|rha|raha|rahi|rahe|chal|chalta|chalne)\b/;
  if (highConfHinglish.test(cleanText)) {
    return true;
  }

  // General Hinglish stopwords count
  const stopwords = /\b(hai|he|bhi|aur|mere|mera|apne|apna|apni|tumhara|aapk|aapka|aapki|sath|baat|se|ko|paise|paisa|rupay|rupaya)\b/g;
  const matches = cleanText.match(stopwords);
  if (matches && matches.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Checks if a review provides high-value helpful/actionable feedback.
 * @param {string} text Review text
 * @param {number} wordCount Word count
 * @returns {boolean} True if review is helpful
 */
function isHelpfulReview(text, wordCount) {
  if (!text) return false;
  const cleanText = text.trim().toLowerCase();

  // Filter out short generic phrases
  const genericPhrases = /^(very good|good app|nice app|worst app|bad app|best app|super app|excellent app|awesome app|i like it|love it|thank you|good|nice|worst|bad|best|super|excellent|awesome|smooth|useful|ok|great|fine|satisfactory|easy)$/;
  if (genericPhrases.test(cleanText)) {
    return false;
  }

  const wc = wordCount || cleanText.split(/\s+/).filter(Boolean).length;
  if (wc < 10) {
    return false;
  }

  // Helpfulness indicators (technical keywords)
  const technicalKeywords = /\b(chart|charts|execution|execute|lag|hang|crash|crashing|slow|verify|verification|onboarding|kyc|upi|payment|payments|withdraw|withdrawal|withdrawals|support|ticket|agent|agents|refund|refunds|limit|order|orders|charges|hidden|brokerage|interface|ux|ui|login|password|notification|update|updated)\b/;
  
  return wc >= 15 || (wc >= 10 && technicalKeywords.test(cleanText));
}

/**
 * Helper to check if text is English language only.
 * First filters out native Indian scripts (Devanagari, Tamil, Telugu, etc.).
 * Then verifies if the top detected language is english.
 * @param {string} text Text to check
 * @returns {boolean} True if text is English
 */
function isEnglish(text) {
  if (!text) return false;

  // Check for native Indian scripts (Devanagari, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Gurmukhi, Oriya)
  const nativeIndianScriptsRegex = /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0980-\u09FF\u0A80-\u0AFF\u0A00-\u0A7F\u0B00-\u0B7F]/u;
  if (nativeIndianScriptsRegex.test(text)) {
    return false;
  }

  const detections = detector.detect(text, 2);
  if (detections.length === 0) return false;
  
  return detections.some(d => d[0] === 'english');
}


/**
 * Generates a unique SHA-256 hash for deduplication.
 * @param {string} source Source of the review
 * @param {string} text Raw or scrubbed review text
 * @param {string} date Normalized date string (YYYY-MM-DD)
 * @returns {string} Unique hash ID
 */
function generateId(source, text, date) {
  const hash = crypto.createHash('sha256');
  hash.update(`${source}:${text}:${date}`);
  return hash.digest('hex');
}

/**
 * Normalizes an Apple App Store review item.
 * App Store RSS payload shape varies, typically under entry:
 * entry.title.label, entry['im:rating'].label, entry.content.label, entry.updated.label
 * @param {Object} entry Raw RSS review entry
 * @returns {Object} Normalized review object
 */
function normalizeAppStore(entry) {
  if (!entry) return null;

  const rawRating = entry['im:rating'] ? parseInt(entry['im:rating'].label || entry['im:rating'], 10) : 0;
  const rating = Math.max(1, Math.min(5, isNaN(rawRating) ? 0 : rawRating));
  
  const rawTitle = entry.title ? (entry.title.label || entry.title) : '';
  const title = scrubText(rawTitle).trim() || null;
  
  const rawText = entry.content ? (entry.content.label || entry.content) : '';
  const text = scrubText(rawText).trim();
  
  // Format date: RSS dates look like "2026-05-21T07:30:15-07:00" -> YYYY-MM-DD
  const rawDate = entry.updated ? (entry.updated.label || entry.updated) : new Date().toISOString();
  const date = rawDate.split('T')[0];

  // Apply filters:
  // 1. Emoji filter (no emojis in title or text)
  if (hasEmoji(title) || hasEmoji(text)) {
    return null;
  }

  // 2. Language filter (English only)
  const combinedText = title ? `${title} ${text}` : text;
  if (!isEnglish(combinedText)) {
    return null;
  }

  // 3. Hinglish filter
  if (isHinglish(combinedText)) {
    return null;
  }

  // 4. Gibberish filter
  if (isGibberish(text)) {
    return null;
  }

  // 5. Word count filter (strictly more than 6 words)
  const word_count = text ? text.split(/\s+/).filter(Boolean).length : 0;
  if (word_count <= 6) {
    return null;
  }

  // 6. Helpfulness filter
  if (!isHelpfulReview(text, word_count)) {
    return null;
  }

  const source = 'app_store';
  const id = generateId(source, rawText, date);
  const ingested_at = new Date().toISOString();

  return {
    id,
    rating,
    title,
    text,
    date,
    source,
    ingested_at,
    word_count,
    isHelpful: true
  };
}

/**
 * Normalizes a Google Play Store review item.
 * Play Store API (google-play-scraper) returns:
 * score, title, text, date, userName etc.
 * @param {Object} item Raw Play Store review item
 * @returns {Object} Normalized review object
 */
function normalizePlayStore(item) {
  if (!item) return null;

  const rawRating = item.score || item.rating || 0;
  const rating = Math.max(1, Math.min(5, isNaN(rawRating) ? 0 : rawRating));
  
  const rawTitle = item.title || '';
  const title = scrubText(rawTitle).trim() || null;
  
  const rawText = item.text || '';
  const text = scrubText(rawText).trim();
  
  // Play Store scraper provides Date object or string
  let dateStr = new Date().toISOString();
  if (item.date) {
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) {
      dateStr = d.toISOString();
    }
  }
  const date = dateStr.split('T')[0];

  // Apply filters:
  // 1. Emoji filter (no emojis in title or text)
  if (hasEmoji(title) || hasEmoji(text)) {
    return null;
  }

  // 2. Language filter (English only)
  const combinedText = title ? `${title} ${text}` : text;
  if (!isEnglish(combinedText)) {
    return null;
  }

  // 3. Hinglish filter
  if (isHinglish(combinedText)) {
    return null;
  }

  // 4. Gibberish filter
  if (isGibberish(text)) {
    return null;
  }

  // 5. Word count filter (strictly more than 6 words)
  const word_count = text ? text.split(/\s+/).filter(Boolean).length : 0;
  if (word_count <= 6) {
    return null;
  }

  // 6. Helpfulness filter
  if (!isHelpfulReview(text, word_count)) {
    return null;
  }

  const source = 'play_store';
  const id = generateId(source, rawText, date);
  const ingested_at = new Date().toISOString();

  return {
    id,
    rating,
    title,
    text,
    date,
    source,
    ingested_at,
    word_count,
    isHelpful: true
  };
}

module.exports = {
  normalizeAppStore,
  normalizePlayStore,
  generateId,
  hasEmoji,
  isGibberish,
  isHinglish,
  isHelpfulReview
};

