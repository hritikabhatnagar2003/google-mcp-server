/**
 * Action Idea Generator for GrowwPulse
 * Generates actionable recommendations based on ranked themes and their metrics.
 */

// Mapping of standard themes to dynamic recommendation templates
const ACTION_TEMPLATES = {
  "App Stability & Performance": "Prioritize load-testing order execution paths during market hours to reduce crash-related complaints (currently {{mention_count}} mentions, avg {{avg_rating}}★).",
  "Customer Support": "Streamline support tickets and ticket-status notifications to reduce 'no response' complaints (currently {{mention_count}} mentions, avg {{avg_rating}}★).",
  "UX / Interface": "Conduct a navigation audit on the portfolio dashboard to address UI confusion (currently {{mention_count}} mentions, avg {{avg_rating}}★).",
  "Transactions & Orders": "Audit payment gateway integrations and withdrawal pipelines to reduce transaction failures (currently {{mention_count}} mentions, avg {{avg_rating}}★).",
  "Onboarding & KYC": "Optimize the KYC verification and document upload flow to reduce registration drop-offs (currently {{mention_count}} mentions, avg {{avg_rating}}★)."
};

const FALLBACK_TEMPLATE = "Address user pain points in {{theme_name}} to improve sentiment and retention (currently {{mention_count}} mentions, avg {{avg_rating}}★).";

/**
 * Generates recommendation text for a given theme and its stats.
 * @param {Object} theme Scored theme object
 * @returns {string} Actionable recommendation string
 */
function generateAction(theme) {
  if (!theme || !theme.name) return '';
  
  const template = ACTION_TEMPLATES[theme.name] || FALLBACK_TEMPLATE;
  
  return template
    .replace('{{theme_name}}', theme.name)
    .replace('{{mention_count}}', theme.mention_count || 0)
    .replace('{{avg_rating}}', theme.avg_rating !== undefined ? theme.avg_rating : '0.0');
}

/**
 * Generates list of recommendations for a list of ranked themes.
 * @param {Array} rankedThemes Scored and ranked themes list
 * @param {number} count Number of recommendations to generate (default 3)
 * @returns {Array<string>} Array of generated action ideas
 */
function generateActionIdeas(rankedThemes = [], count = 3) {
  const actions = [];
  const limit = Math.min(rankedThemes.length, count);
  
  for (let i = 0; i < limit; i++) {
    actions.push(generateAction(rankedThemes[i]));
  }
  
  // Pad if we have fewer themes than count
  while (actions.length < count) {
    actions.push("Review recent low-rating customer reviews to identify emerging user complaints and improve app metrics.");
  }
  
  return actions;
}

module.exports = {
  generateAction,
  generateActionIdeas
};
