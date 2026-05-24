/**
 * Review Storage Module for GrowwPulse
 * Handles file-based reading, writing, deduplication, and date filtering of reviews.
 */

const fs = require('fs');
const path = require('path');

/**
 * Ensures that a directory exists, creating it recursively if not.
 * @param {string} dirPath Directory path
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Loads reviews from a specified JSON file path. Returns empty array if file does not exist.
 * @param {string} filePath Path to the JSON file
 * @returns {Array} Array of review objects
 */
function loadReviewsFromFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`⚠️ Warning: Failed to load reviews from ${filePath}: ${err.message}`);
  }
  return [];
}

/**
 * Saves reviews array to a JSON file.
 * @param {string} filePath Path to write the JSON file
 * @param {Array} reviews Array of review objects
 */
function saveReviewsToFile(filePath, reviews) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(reviews, null, 2), 'utf8');
    console.log(`💾 Saved ${reviews.length} reviews to ${path.relative(process.cwd(), filePath)}`);
  } catch (err) {
    console.error(`❌ Error saving reviews to ${filePath}: ${err.message}`);
  }
}

/**
 * Merges new reviews with existing ones, deduplicating by ID.
 * @param {Array} existingReviews Existing reviews array
 * @param {Array} newReviews Newly fetched reviews array
 * @returns {Array} Merged, deduplicated array
 */
function mergeAndDeduplicate(existingReviews, newReviews) {
  const map = new Map();
  
  // Load existing reviews first
  existingReviews.forEach(r => {
    if (r && r.id) map.set(r.id, r);
  });

  // Overwrite or add new reviews
  let dupCount = 0;
  newReviews.forEach(r => {
    if (r && r.id) {
      if (map.has(r.id)) {
        dupCount++;
      }
      map.set(r.id, r);
    }
  });

  if (dupCount > 0) {
    console.log(`🧹 Deduplicator: Filtered out ${dupCount} duplicates.`);
  }

  return Array.from(map.values());
}

/**
 * Filters reviews to a rolling window (defaults to 12 weeks / 84 days).
 * Filter looks back from the latest review date (or today).
 * @param {Array} reviews Reviews array
 * @param {number} windowWeeks Number of weeks in the window
 * @returns {Array} Filtered reviews array
 */
function filterByDateWindow(reviews, windowWeeks = 12) {
  if (reviews.length === 0) return [];

  // Find the latest review date to anchor the window, or default to today if latest is in the future
  const today = new Date();
  let latestDate = new Date(0);
  
  reviews.forEach(r => {
    const rDate = new Date(r.date);
    if (!isNaN(rDate.getTime()) && rDate > latestDate && rDate <= today) {
      latestDate = rDate;
    }
  });

  // If no valid date found, use today
  if (latestDate.getTime() === 0) {
    latestDate = today;
  }

  // Calculate boundary
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime = latestDate.getTime() - (windowWeeks * msInWeek);
  const cutoffDate = new Date(cutoffTime);
  cutoffDate.setHours(0, 0, 0, 0); // start of cutoff day

  console.log(`📅 Date Filter: Retention window starts from ${cutoffDate.toISOString().split('T')[0]} (looking back ${windowWeeks} weeks from ${latestDate.toISOString().split('T')[0]}).`);

  const filtered = reviews.filter(r => {
    const rDate = new Date(r.date);
    return !isNaN(rDate.getTime()) && rDate >= cutoffDate && rDate <= today;
  });

  const prunedCount = reviews.length - filtered.length;
  if (prunedCount > 0) {
    console.log(`🗑️ Date Filter: Pruned ${prunedCount} reviews falling outside the rolling ${windowWeeks}-week window.`);
  }

  return filtered;
}

module.exports = {
  loadReviewsFromFile,
  saveReviewsToFile,
  mergeAndDeduplicate,
  filterByDateWindow,
  ensureDir
};
