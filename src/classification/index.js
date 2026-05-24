/**
 * Theme Classification Orchestrator
 * Main entry point for Phase 3 Theme Classification Engine.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { classifyReviews } = require('./keywordClassifier');
const { classifyWithLLM } = require('./llmClassifier');
const { scoreThemes } = require('./scorer');
const { selectQuotes } = require('./quoteSelector');
const { ensureDir } = require('../ingestion/storage');

// Load environment variables
dotenv.config();

/**
 * Gets ISO week string (e.g., "2026-W21") from a date object.
 */
function getISOWeekString(dateObj) {
  const date = new Date(dateObj.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
  const pad = (val) => val < 10 ? `0${val}` : val;
  return `${date.getFullYear()}-W${pad(weekNum)}`;
}

/**
 * Gets the Mon-Sun date range string for a date.
 */
function getWeekRangeString(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay();
  // Adjust Monday start
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  return `${formatDate(monday)} to ${formatDate(sunday)}`;
}

/**
 * Runs the theme classification pipeline.
 * @param {Object} options Configuration overrides
 * @returns {Promise<Object>} Output report object
 */
async function runClassification(options = {}) {
  const settingsPath = options.settingsPath || path.join(__dirname, '../../config/settings.json');
  const reviewsPath = options.reviewsPath || path.join(__dirname, '../../data/processed/reviews_current_window.json');
  const outputsDir = options.outputsDir || path.join(__dirname, '../../data/outputs');

  console.log('🏁 Starting Theme Classification Engine...');

  // 1. Load Settings
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.warn(`⚠️ Warning: Failed to parse settings at ${settingsPath}. Using defaults.`);
    }
  }

  const classifierMode = options.classifierMode || settings.classification?.classifierMode || 'hybrid';
  const llmBatchSize = options.llmBatchSize || settings.classification?.llmBatchSize || 25;
  const themeSeeds = settings.classification?.themeSeeds || null;

  // 2. Load Processed Reviews
  if (!fs.existsSync(reviewsPath)) {
    throw new Error(`Reviews file not found at ${reviewsPath}. Run ingestion first.`);
  }
  const reviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
  console.log(`📊 Loaded ${reviews.length} processed reviews for classification.`);

  if (reviews.length === 0) {
    console.log('⚠️ No reviews to classify.');
    return null;
  }

  // Find latest review date to determine week
  let latestDate = new Date(0);
  reviews.forEach(r => {
    const d = new Date(r.date);
    if (d > latestDate) latestDate = d;
  });
  if (latestDate.getTime() === 0) {
    latestDate = new Date();
  }

  const weekString = getISOWeekString(latestDate);
  const weekRange = getWeekRangeString(latestDate);

  // 3. Step 1: Run Keyword Classification on all reviews
  console.log('🏷️ Step 1: Running Keyword-based matching...');
  const keywordClassified = classifyReviews(reviews, themeSeeds);

  // 4. Step 2: Identify reviews that need LLM classification (critical 1-3★ and "Unclassified")
  const hasLlmKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  const useLlm = classifierMode !== 'keyword' && hasLlmKey;

  const finalClassified = [];
  const llmCandidates = [];

  keywordClassified.forEach(review => {
    if (review.primaryTheme === "Unclassified") {
      // If review is critical (1-3★) and LLM is active, queue for LLM
      if (review.rating <= 3 && useLlm) {
        llmCandidates.push(review);
      } else {
        // Otherwise, use fallback assignment right away
        const fallbackTheme = review.rating >= 4 ? "UX / Interface" : "App Stability & Performance";
        finalClassified.push({
          ...review,
          primaryTheme: fallbackTheme,
          classificationMethod: "keyword_fallback"
        });
      }
    } else {
      // Success keyword classification
      finalClassified.push({
        ...review,
        classificationMethod: "keyword"
      });
    }
  });

  // Execute LLM classification for candidate reviews
  if (llmCandidates.length > 0) {
    console.log(`🏷️ Step 2: Running LLM-assisted classification on ${llmCandidates.length} critical reviews...`);
    try {
      const llmResultsMap = await classifyWithLLM(llmCandidates, llmBatchSize);
      
      llmCandidates.forEach(review => {
        const result = llmResultsMap.get(review.id);
        if (result && result.theme) {
          finalClassified.push({
            ...review,
            primaryTheme: result.theme,
            classificationReason: result.reason,
            classificationMethod: "llm"
          });
        } else {
          // LLM failed to return a result for this ID, use default fallback
          const fallbackTheme = review.rating >= 4 ? "UX / Interface" : "App Stability & Performance";
          finalClassified.push({
            ...review,
            primaryTheme: fallbackTheme,
            classificationMethod: "llm_fallback"
          });
        }
      });
    } catch (err) {
      console.error(`❌ LLM Classification failed, falling back to keyword defaults: ${err.message}`);
      // Fallback all candidates
      llmCandidates.forEach(review => {
        const fallbackTheme = review.rating >= 4 ? "UX / Interface" : "App Stability & Performance";
        finalClassified.push({
          ...review,
          primaryTheme: fallbackTheme,
          classificationMethod: "llm_error_fallback"
        });
      });
    }
  }

  // 5. Ensure 100% review coverage (safety check)
  finalClassified.forEach(r => {
    if (!r.primaryTheme || r.primaryTheme === "Unclassified") {
      r.primaryTheme = r.rating >= 4 ? "UX / Interface" : "App Stability & Performance";
      r.classificationMethod = r.classificationMethod || "safety_fallback";
    }
  });

  // 6. Step 3: Run Scorer
  console.log('📈 Step 3: Scoring and ranking themes...');
  const rankedThemes = scoreThemes(finalClassified, outputsDir);

  // 7. Step 4: Run Quote Selector
  console.log('💬 Step 4: Selecting representative quotes...');
  const selectedQuotes = selectQuotes(finalClassified, rankedThemes);

  // 8. Generate Output Report
  const report = {
    week: weekRange,
    week_iso: weekString,
    reviews_analyzed_count: finalClassified.length,
    generated_at: new Date().toISOString(),
    themes: rankedThemes,
    selected_quotes: selectedQuotes
  };

  // Ensure classification object matches frontend expected shape:
  finalClassified.forEach(r => {
    r.classification = {
      theme: r.primaryTheme
    };
  });

  // 9. Save to file
  ensureDir(outputsDir);
  const reportFileName = `theme_analysis_${weekString}.json`;
  const reportFilePath = path.join(outputsDir, reportFileName);
  const currentFilePath = path.join(outputsDir, 'theme_analysis_current.json');
  const classifiedFilePath = path.join(path.dirname(reviewsPath), 'reviews_classified.json');

  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Theme analysis report saved to ${path.relative(process.cwd(), reportFilePath)}`);
  
  fs.writeFileSync(currentFilePath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Symbolic current report saved to ${path.relative(process.cwd(), currentFilePath)}`);

  fs.writeFileSync(classifiedFilePath, JSON.stringify(finalClassified, null, 2), 'utf8');
  console.log(`💾 Classified reviews saved to ${path.relative(process.cwd(), classifiedFilePath)}`);


  // Log summary
  console.log('\n📊 --- Theme Analysis Summary ---');
  rankedThemes.forEach(t => {
    console.log(`${t.rank}. ${t.name}: ${t.mention_count} mentions, avg rating: ${t.avg_rating}★, composite: ${t.composite_score} (${t.trend})`);
  });
  console.log('---------------------------------\n');

  return report;
}

// Support executing script directly
if (require.main === module) {
  runClassification().catch(err => {
    console.error(`❌ Classification execution failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  runClassification
};
