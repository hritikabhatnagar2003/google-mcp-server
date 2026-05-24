/**
 * Theme Taxonomy for GrowwPulse
 * Defines default themes and their keyword seeds.
 */

const DEFAULT_THEME_SEEDS = {
  "App Stability & Performance": [
    "crash", "lag", "slow", "freeze", "server down", "hang", "bug", 
    "glitch", "error", "not loading", "blank screen", "stuck", "open", "chart"
  ],
  "Customer Support": [
    "support", "helpline", "no response", "complaint", "customer care", 
    "chatbot", "ticket", "response", "help", "care", "agent", "resolve"
  ],
  "UX / Interface": [
    "ui", "ux", "confusing", "cluttered", "navigation", "layout", 
    "design", "interface", "clutter", "popups", "annoying"
  ],
  "Transactions & Orders": [
    "order failed", "payment stuck", "withdrawal", "failed", "pending", 
    "delay", "transaction", "payment", "money", "debited", "refund", "deducted",
    "order", "buy", "sell", "execution"
  ],
  "Onboarding & KYC": [
    "kyc", "verification", "sign up", "aadhaar", "pan", "onboarding", 
    "verify", "register", "signup", "document", "upload", "rejected", "account open"
  ]
};

/**
 * Gets the keyword seeds for theme classification.
 * Merges settings config if provided.
 * @param {Object} [configSeeds] Override seeds from configuration
 * @returns {Object} Theme to keywords mapping
 */
function getThemeSeeds(configSeeds) {
  if (configSeeds && Object.keys(configSeeds).length > 0) {
    return { ...DEFAULT_THEME_SEEDS, ...configSeeds };
  }
  return DEFAULT_THEME_SEEDS;
}

module.exports = {
  DEFAULT_THEME_SEEDS,
  getThemeSeeds
};
