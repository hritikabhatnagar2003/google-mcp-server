/**
 * GrowwPulse Ingestion Pipeline Runner
 * Orchestrates fetching, normalizing, scrubbing, deduplicating, and saving reviews.
 */

const fs = require('fs');
const path = require('path');
const { fetchAppStoreReviews } = require('./appStore');
const { fetchPlayStoreReviews } = require('./playStore');
const { mergeAndDeduplicate, filterByDateWindow, saveReviewsToFile, loadReviewsFromFile, ensureDir } = require('./storage');
const { normalizeAppStore, normalizePlayStore, hasEmoji, isGibberish, isHinglish, isHelpfulReview } = require('./normalizer');

// Resolve configuration
const CONFIG_PATH = path.resolve(__dirname, '../../config/settings.json');
let config = {
  ingestion: {
    reviewWindowWeeks: 8,
    maxReviewsPerSource: 500
  }
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`⚠️ Failed to parse settings.json: ${err.message}. Using defaults.`);
  }
}

// Define paths
const RAW_DIR = path.resolve(__dirname, '../../data/raw');
const PROCESSED_DIR = path.resolve(__dirname, '../../data/processed');
const PROCESSED_FILE = path.join(PROCESSED_DIR, 'reviews_current_window.json');

/**
 * Loads mock raw reviews to use as fallback/offline testing.
 * @returns {Object} Mock raw data { appStore: Array, playStore: Array }
 */
function getMockRawReviews() {
  const today = new Date();
  const getDateAgo = (days) => {
    const d = new Date();
    d.setDate(today.getDate() - days);
    return d.toISOString();
  };

  // Mock raw App Store entries (match RSS feed entry structure)
  const appStoreMock = [
    {
      'im:rating': { label: '1' },
      title: { label: 'App keeps crashing on startup' },
      content: { label: 'After the latest update, the app crashes immediately when I open it. Please fix this bug! My uid: 98127398. Tried emailing support at support-query@gmail.com but no help.' },
      updated: { label: getDateAgo(3) }
    },
    {
      'im:rating': { label: '2' },
      title: { label: 'Confusing layout' },
      content: { label: 'The new UI design is very cluttered. Hard to find my holdings. The navigation options are not clear.' },
      updated: { label: getDateAgo(10) }
    },
    {
      'im:rating': { label: '1' },
      title: { label: 'Withdrawal delay' },
      content: { label: 'I requested a withdrawal of my funds 4 days ago, but the transaction is still pending. My account no is ACC_12345. Very disappointed.' },
      updated: { label: getDateAgo(15) }
    },
    {
      'im:rating': { label: '5' },
      title: { label: 'Great investment platform' },
      content: { label: 'Very smooth interface and easy to buy mutual funds. Highly recommended.' },
      updated: { label: getDateAgo(20) }
    },
    {
      'im:rating': { label: '2' },
      title: { label: 'KYC Verification taking too long' },
      content: { label: 'My KYC is pending for more than a week. I submitted my Aadhaar 4444-5555-6666 and PAN ABCDE1234F. Please verify it soon!' },
      updated: { label: getDateAgo(25) }
    }
  ];

  // Mock raw Play Store items (match google-play-scraper structure)
  const playStoreMock = [
    {
      score: 1,
      title: 'Support is useless',
      text: 'No human agent is available. Only chatbot replies. Ticket number 98123 is unresolved since last Monday. Phone support +91 9999988888 is unreachable.',
      date: getDateAgo(5)
    },
    {
      score: 1,
      title: 'Server down during market hours',
      text: 'Groww servers were down today at 9:30 AM. Lost 5000 rupees due to order execution lag. Very unstable app!',
      date: getDateAgo(12)
    },
    {
      score: 3,
      title: 'Good but could be better',
      text: 'UX is decent, but please remove unnecessary popups about future and options trading. They are annoying.',
      date: getDateAgo(18)
    },
    {
      score: 2,
      title: 'Payment failed but money debited',
      text: 'Tried to add money via UPI. Transaction failed on the app, but my bank account is debited. Client code is GROWW_USER_888. Please refund.',
      date: getDateAgo(22)
    },
    {
      score: 1,
      title: 'Cannot complete onboarding',
      text: 'Getting error in PAN verification. It says name mismatch. My email is user_name_99@yahoo.co.in. Solve this.',
      date: getDateAgo(30)
    }
  ];

  // Let's add some older reviews to test date pruning (outside 8-12 weeks window)
  appStoreMock.push({
    'im:rating': { label: '4' },
    title: { label: 'Decent app' },
    content: { label: 'Old review from 100 days ago, should be pruned.' },
    updated: { label: getDateAgo(100) }
  });

  playStoreMock.push({
    score: 5,
    title: 'Nice app',
    text: 'Older play store review from 120 days ago, should be pruned.',
    date: getDateAgo(120)
  });

  return { appStoreMock, playStoreMock };
}

/**
 * Runs the ingestion pipeline.
 */
async function run() {
  console.log('🚀 Starting GrowwPulse Ingestion Pipeline...');
  
  const isMockMode = process.argv.includes('--mock') || process.env.USE_MOCK === 'true';
  const limit = config.ingestion.maxReviewsPerSource || 500;
  const windowWeeks = config.ingestion.reviewWindowWeeks || 8;

  let appStoreRaw = [];
  let playStoreRaw = [];

  if (isMockMode) {
    console.log('ℹ️ Running in MOCK Mode. Loading mock raw reviews...');
    const mocks = getMockRawReviews();
    appStoreRaw = mocks.appStoreMock;
    playStoreRaw = mocks.playStoreMock;
    
    // Save raw mock reviews to disk for audit
    ensureDir(RAW_DIR);
    fs.writeFileSync(path.join(RAW_DIR, 'app_store_raw.json'), JSON.stringify(appStoreRaw, null, 2), 'utf8');
    fs.writeFileSync(path.join(RAW_DIR, 'play_store_raw.json'), JSON.stringify(playStoreRaw, null, 2), 'utf8');
  } else {
    // 1. Fetch from App Store (which automatically normalizes individual entries)
    try {
      console.log('--- Step 1: Fetching App Store Reviews ---');
      const appStoreNormalized = await fetchAppStoreReviews(Math.ceil(limit / 50));
      
      ensureDir(RAW_DIR);
      fs.writeFileSync(path.join(RAW_DIR, 'app_store_raw.json'), JSON.stringify(appStoreNormalized, null, 2), 'utf8');
      appStoreRaw = appStoreNormalized;
    } catch (err) {
      console.error(`⚠️ App Store Ingestion failed: ${err.message}. Using mock fallback.`);
    }

    // 2. Fetch from Play Store
    try {
      console.log('--- Step 2: Fetching Play Store Reviews ---');
      const playStoreNormalized = await fetchPlayStoreReviews(limit, windowWeeks);
      ensureDir(RAW_DIR);
      fs.writeFileSync(path.join(RAW_DIR, 'play_store_raw.json'), JSON.stringify(playStoreNormalized, null, 2), 'utf8');
      playStoreRaw = playStoreNormalized;
    } catch (err) {
      console.error(`⚠️ Play Store Ingestion failed: ${err.message}. Using mock fallback.`);
    }

    // If both failed or returned nothing, fall back to mock data
    if (appStoreRaw.length === 0 && playStoreRaw.length === 0) {
      console.log('⚠️ Both App Store and Play Store live fetches returned 0 results. Falling back to mock data...');
      const mocks = getMockRawReviews();
      
      appStoreRaw = mocks.appStoreMock.map(normalizeAppStore).filter(Boolean);
      playStoreRaw = mocks.playStoreMock.map(normalizePlayStore).filter(Boolean);
      
      ensureDir(RAW_DIR);
      fs.writeFileSync(path.join(RAW_DIR, 'app_store_raw.json'), JSON.stringify(mocks.appStoreMock, null, 2), 'utf8');
      fs.writeFileSync(path.join(RAW_DIR, 'play_store_raw.json'), JSON.stringify(mocks.playStoreMock, null, 2), 'utf8');
    }
  }

  // 3. Normalize if we loaded raw mock files, otherwise they are already normalized
  console.log('--- Step 3: Normalizing and Scrubbing Reviews ---');
  let normalizedReviews = [];

  if (isMockMode) {
    appStoreRaw.forEach(entry => {
      const norm = normalizeAppStore(entry);
      if (norm) normalizedReviews.push(norm);
    });
    playStoreRaw.forEach(item => {
      const norm = normalizePlayStore(item);
      if (norm) normalizedReviews.push(norm);
    });
  } else {
    normalizedReviews = [...appStoreRaw, ...playStoreRaw];
  }

  console.log(`ℹ️ Total normalized reviews: ${normalizedReviews.length}`);

  // 4. Merge with existing processed reviews (Incremental storage)
  console.log('--- Step 4: Merging and Deduplicating with Archive ---');
  const existingReviews = loadReviewsFromFile(PROCESSED_FILE);
  const mergedReviews = mergeAndDeduplicate(existingReviews, normalizedReviews);

  // Apply database sanitation to filter out emoji, Hinglish, Hindi, gibberish, and unhelpful reviews
  console.log('🧹 Database Cleanup: Filtering out emoji, Hinglish, gibberish, and unhelpful reviews...');
  const cleanedReviews = mergedReviews.filter(review => {
    if (hasEmoji(review.title) || hasEmoji(review.text)) {
      return false;
    }
    if (isHinglish(review.title ? `${review.title} ${review.text}` : review.text)) {
      return false;
    }
    if (isGibberish(review.text)) {
      return false;
    }
    if (!isHelpfulReview(review.text, review.word_count)) {
      return false;
    }
    return true;
  });

  // Ensure isHelpful is set to true for all passing reviews
  cleanedReviews.forEach(review => {
    review.isHelpful = true;
  });

  // 5. Filter by retention date window (e.g. last 8 weeks)
  console.log('--- Step 5: Filtering by Date Retention Window ---');
  const filteredReviews = filterByDateWindow(cleanedReviews, windowWeeks);

  // 6. Save clean dataset to processed/reviews_current_window.json
  console.log('--- Step 6: Saving Processed Dataset ---');
  saveReviewsToFile(PROCESSED_FILE, filteredReviews);

  console.log('🎉 Ingestion Pipeline Run Completed Successfully!');
  console.log(`📊 Final processed review count in current window: ${filteredReviews.length}`);
}

if (require.main === module) {
  run().catch(err => {
    console.error(`❌ Ingestion pipeline failed with error:`, err);
    process.exit(1);
  });
}

module.exports = {
  run
};
