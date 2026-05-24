/**
 * PII Scrubber Utility for GrowwPulse
 * Detects and redacts sensitive information from review text.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches standard phone number formats including +91, spaces, hyphens, and parenthesis
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// Aadhaar: 12 digits, optional spaces/hyphens
const AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

// PAN: 5 letters, 4 digits, 1 letter
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/gi;

// User/Account ID patterns (e.g. user_id: 12345, uid: abc_99, account: 98127398)
const ID_PATTERNS = /\b(user[\s_-]?id|uid|account|acc[\s_-]?no|customer[\s_-]?id|folio|client[\s_-]?code)[:\s]*[a-zA-Z0-9_-]+/gi;

/**
 * Scrubs all PII from the input text.
 * @param {string} text Raw review text
 * @returns {string} Scrubbed text
 */
function scrubText(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let scrubbed = text;

  // 1. Scrub emails
  scrubbed = scrubbed.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');

  // 2. Scrub phone numbers
  scrubbed = scrubbed.replace(PHONE_REGEX, '[PHONE_REDACTED]');

  // 3. Scrub Aadhaar
  scrubbed = scrubbed.replace(AADHAAR_REGEX, '[GOV_ID_REDACTED]');

  // 4. Scrub PAN
  scrubbed = scrubbed.replace(PAN_REGEX, '[GOV_ID_REDACTED]');

  // 5. Scrub User ID pattern matches
  scrubbed = scrubbed.replace(ID_PATTERNS, (match, p1) => {
    // Keep the keyword label (e.g. "user_id:") but redact the actual ID value
    const afterP1 = match.slice(p1.length);
    const separatorMatch = afterP1.match(/^[:\s]+/);
    const separator = separatorMatch ? separatorMatch[0] : ' ';
    return `${p1}${separator}[ID_REDACTED]`;
  });

  return scrubbed;
}

module.exports = {
  scrubText
};
