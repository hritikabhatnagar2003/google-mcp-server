/**
 * Google Play Store Reviews Connector
 * Fetches public reviews for the Groww App (Package: com.nextbillion.groww) using google-play-scraper.
 */

const gplayImport = require('google-play-scraper');
const gplay = gplayImport.default || gplayImport;
const { normalizePlayStore } = require('./normalizer');

/**
 * Fetches reviews from the Google Play Store.
 * @param {number} maxReviews Maximum number of reviews to fetch (default: 500)
 * @returns {Promise<Array>} Normalized reviews
 */
async function fetchPlayStoreReviews(maxReviews = 2000, reviewWindowWeeks = 8) {
  const appId = 'com.nextbillion.groww';
  console.log(`🌐 Fetching Play Store reviews for app: ${appId} (up to ${maxReviews} reviews, window: ${reviewWindowWeeks} weeks)...`);

  const today = new Date();
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime = today.getTime() - (reviewWindowWeeks * msInWeek);
  const cutoffDate = new Date(cutoffTime);
  cutoffDate.setHours(0, 0, 0, 0);

  let allNormalizedReviews = [];
  let nextToken = null;
  let hasMore = true;
  let pageCount = 0;

  try {
    while (hasMore && allNormalizedReviews.length < maxReviews) {
      pageCount++;
      const options = {
        appId: appId,
        sort: gplay.sort.NEWEST,
        num: 150, // Max supported page size by Google Play API
        lang: 'en',
        country: 'in',
        paginate: true
      };

      if (nextToken) {
        options.nextPaginationToken = nextToken;
      }

      console.log(`🌐 Fetching page ${pageCount} of Play Store reviews...`);
      const result = await gplay.reviews(options);
      
      const rawReviews = Array.isArray(result) ? result : (result.data || []);
      nextToken = result.nextPaginationToken;

      if (rawReviews.length === 0) {
        console.log(`ℹ️ No reviews returned. Stopping Play Store pagination.`);
        break;
      }

      let reachedCutoff = false;
      const normalizedThisPage = [];

      for (const item of rawReviews) {
        if (!item) continue;
        
        const reviewDate = new Date(item.date);
        if (!isNaN(reviewDate.getTime()) && reviewDate < cutoffDate) {
          reachedCutoff = true;
          break; // Stop parsing this and future pages as they are sorted by NEWEST
        }

        const normalized = normalizePlayStore(item);
        if (normalized) {
          normalizedThisPage.push(normalized);
        }
      }

      allNormalizedReviews = allNormalizedReviews.concat(normalizedThisPage);
      console.log(`  - Page ${pageCount}: Got ${normalizedThisPage.length} reviews within the date window.`);

      if (reachedCutoff) {
        console.log(`ℹ️ Reached review date cutoff (${cutoffDate.toISOString().split('T')[0]}). Stopping pagination.`);
        break;
      }

      if (!nextToken) {
        console.log(`ℹ️ No next pagination token. Stopping pagination.`);
        break;
      }

      // Add a polite 200ms delay between pages to be respectful of rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Play Store Ingest: Ingested ${allNormalizedReviews.length} normalized reviews across ${pageCount} pages.`);
    return allNormalizedReviews;
  } catch (err) {
    console.error(`❌ Error fetching Play Store reviews: ${err.message}`);
    return allNormalizedReviews; // Return whatever was fetched before error
  }
}

module.exports = {
  fetchPlayStoreReviews
};
