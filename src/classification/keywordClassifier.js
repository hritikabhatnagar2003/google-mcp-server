/**
 * Keyword Classifier for GrowwPulse
 * Assigns reviews to themes based on seed keyword dictionaries.
 */

const { getThemeSeeds } = require('./taxonomy');

/**
 * Escapes regex special characters.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Classifies a single review text into a theme.
 * @param {string} text Review content
 * @param {Object} [seeds] Optional custom theme seeds
 * @returns {string} Assigned theme name, or "Unclassified"
 */
function classifyTextByKeywords(text, seeds) {
  if (!text || typeof text !== 'string') {
    return "Unclassified";
  }

  const cleanText = text.toLowerCase();
  const themeSeeds = getThemeSeeds(seeds);
  
  let bestTheme = "Unclassified";
  let maxScore = 0;

  for (const [theme, keywords] of Object.entries(themeSeeds)) {
    let score = 0;
    
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      // Use regex with word boundaries to match exact words or phrases
      // Support space-separated words (e.g. "server down")
      let regex;
      if (/\s/.test(kw)) {
        regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'g');
      } else {
        regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'g');
      }
      
      const matches = cleanText.match(regex);
      if (matches) {
        // Increment score by number of occurrences of the keyword
        score += matches.length;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestTheme = theme;
    }
  }

  return bestTheme;
}

/**
 * Classifies an array of reviews.
 * @param {Array} reviews Array of normalized review objects
 * @param {Object} [seeds] Optional custom seeds
 * @returns {Array} Array of classified reviews
 */
function classifyReviews(reviews, seeds) {
  return reviews.map(r => ({
    ...r,
    primaryTheme: classifyTextByKeywords(r.text, seeds)
  }));
}

module.exports = {
  classifyTextByKeywords,
  classifyReviews
};
