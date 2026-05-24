/**
 * Theme Scorer for GrowwPulse
 * Aggregates reviews by theme, calculates average ratings, composite scores, and ranks themes.
 */

const fs = require('fs');
const path = require('path');

/**
 * Calculates theme statistics from classified reviews.
 * @param {Array} classifiedReviews Reviews with assigned primaryTheme
 * @param {string} [outputsDir] Optional outputs directory to search for previous runs
 * @returns {Array} List of scored themes ranked by composite score
 */
function scoreThemes(classifiedReviews, outputsDir = 'data/outputs') {
  const themeMap = {};

  // Initialize all 5 allowed themes to ensure zero-count themes are present if needed,
  // but let's only return themes that actually occurred unless required.
  // Actually, let's group reviews into themes.
  classifiedReviews.forEach(review => {
    const theme = review.primaryTheme || "UX / Interface";
    if (!themeMap[theme]) {
      themeMap[theme] = {
        name: theme,
        ratings: [],
        mention_count: 0
      };
    }
    themeMap[theme].ratings.push(review.rating);
    themeMap[theme].mention_count++;
  });

  // Calculate avg_rating and composite_score
  const themes = Object.values(themeMap).map(t => {
    const sum = t.ratings.reduce((a, b) => a + b, 0);
    const avgRating = t.ratings.length > 0 ? parseFloat((sum / t.ratings.length).toFixed(2)) : 0;
    
    // Composite Score = mention_count * (6 - avg_rating)
    const compositeScore = parseFloat((t.mention_count * (6 - avgRating)).toFixed(2));
    
    return {
      name: t.name,
      mention_count: t.mention_count,
      avg_rating: avgRating,
      composite_score: compositeScore,
      trend: "—" // default if no previous run is found
    };
  });

  // Sort by composite_score (descending). If tie, by mention_count (descending)
  themes.sort((a, b) => {
    if (b.composite_score !== a.composite_score) {
      return b.composite_score - a.composite_score;
    }
    return b.mention_count - a.mention_count;
  });

  // Assign rank (1-based)
  themes.forEach((t, i) => {
    t.rank = i + 1;
  });

  // Attempt to load previous run to calculate trends
  try {
    const previousRun = getPreviousRunReport(outputsDir);
    if (previousRun && Array.isArray(previousRun.themes)) {
      themes.forEach(theme => {
        const prevTheme = previousRun.themes.find(pt => pt.name === theme.name);
        if (prevTheme) {
          const diff = theme.mention_count - prevTheme.mention_count;
          if (diff > 0) {
            theme.trend = `↑ +${diff} vs last week`;
          } else if (diff < 0) {
            theme.trend = `↓ ${diff} vs last week`;
          } else {
            theme.trend = `→ flat vs last week`;
          }
        } else {
          theme.trend = `↑ +${theme.mention_count} (new theme)`;
        }
      });
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Could not compute theme trends: ${err.message}`);
  }

  return themes;
}

/**
 * Finds and loads the most recent theme_analysis JSON file from outputs directory.
 */
function getPreviousRunReport(outputsDir) {
  if (!fs.existsSync(outputsDir)) {
    return null;
  }

  const files = fs.readdirSync(outputsDir)
    .filter(f => f.startsWith('theme_analysis_') && f.endsWith('.json'))
    .sort(); // Sorting by name works if name is chronological (e.g. theme_analysis_YYYY-WW.json)

  if (files.length === 0) {
    return null;
  }

  const latestFile = files[files.length - 1];
  try {
    const data = fs.readFileSync(path.join(outputsDir, latestFile), 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

module.exports = {
  scoreThemes
};
