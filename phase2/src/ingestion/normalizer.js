/**
 * Review Normalizer for GrowwPulse
 * Standardizes reviews from App Store and Play Store to a unified schema.
 */

const crypto = require('crypto');
const { scrubText } = require('./piiScrubber');

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

  const source = 'app_store';
  const id = generateId(source, rawText, date);
  const ingested_at = new Date().toISOString();
  const word_count = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return {
    id,
    rating,
    title,
    text,
    date,
    source,
    ingested_at,
    word_count
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

  const source = 'play_store';
  const id = generateId(source, rawText, date);
  const ingested_at = new Date().toISOString();
  const word_count = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return {
    id,
    rating,
    title,
    text,
    date,
    source,
    ingested_at,
    word_count
  };
}

module.exports = {
  normalizeAppStore,
  normalizePlayStore,
  generateId
};
