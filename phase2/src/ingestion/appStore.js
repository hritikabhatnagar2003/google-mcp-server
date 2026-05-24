/**
 * Apple App Store Customer Reviews Connector
 * Fetches public reviews for the Groww App (ID: 1404871703) from iTunes RSS feed.
 */

const { normalizeAppStore } = require('./normalizer');

const APP_STORE_ID = '1404871703'; // Groww iOS App ID
const BASE_URL = 'https://itunes.apple.com/rss/customerreviews';

/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches a single page of reviews from App Store RSS.
 * @param {number} page Page number (1-10)
 * @returns {Promise<Array>} Normalized reviews from this page
 */
async function fetchPage(page) {
  const url = `${BASE_URL}/page=${page}/id=${APP_STORE_ID}/sortby=mostrecent/json`;
  
  console.log(`🌐 Fetching App Store reviews from: Page ${page}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        console.warn(`⚠️ Warning: Received status ${response.status} from App Store RSS (End of feed or blocked).`);
        return [];
      }
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.feed || !data.feed.entry) {
      return [];
    }

    let entries = data.feed.entry;
    // If only one entry, it might be parsed as an object instead of an array
    if (!Array.isArray(entries)) {
      entries = [entries];
    }

    const normalizedReviews = [];
    
    entries.forEach(entry => {
      // The first entry is sometimes metadata about the app itself and does not have im:rating
      if (entry && entry['im:rating']) {
        const normalized = normalizeAppStore(entry);
        if (normalized) {
          normalizedReviews.push(normalized);
        }
      }
    });

    return normalizedReviews;
  } catch (err) {
    console.error(`❌ Error fetching App Store Page ${page}: ${err.message}`);
    throw err;
  }
}

/**
 * Fetches all reviews up to page limit.
 * @param {number} maxPages Maximum number of pages to fetch (max 10)
 * @returns {Promise<Array>} Combined normalized reviews
 */
async function fetchAppStoreReviews(maxPages = 10) {
  const pages = Math.min(10, Math.max(1, maxPages));
  let allReviews = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const pageReviews = await fetchPage(page);
      if (pageReviews.length === 0) {
        console.log(`ℹ️ No more reviews found on Page ${page}. Stopping pagination.`);
        break;
      }
      allReviews = allReviews.concat(pageReviews);
      
      // Polite 1-second delay between requests to avoid rate limits
      if (page < pages) {
        await sleep(1000);
      }
    } catch (err) {
      console.error(`⚠️ Skipping remaining pages due to error on Page ${page}.`);
      break;
    }
  }

  console.log(`✅ App Store Ingest: Ingested ${allReviews.length} total reviews.`);
  return allReviews;
}

module.exports = {
  fetchAppStoreReviews
};
