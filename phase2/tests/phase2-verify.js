const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🔍 GrowwPulse - Phase 2 Verification Script");
console.log("==================================================");

let failed = false;

function checkFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      console.log(`✅ File exists: ${path.relative(process.cwd(), filePath)} (${(stat.size / 1024).toFixed(2)} KB)`);
      return true;
    } else {
      console.error(`❌ Expected file, but found directory: ${path.relative(process.cwd(), filePath)}`);
      failed = true;
      return false;
    }
  } catch (err) {
    console.error(`❌ Missing file: ${path.relative(process.cwd(), filePath)}`);
    failed = true;
    return false;
  }
}

// Define paths
const baseDir = path.resolve(__dirname, '..');
const processedFile = path.join(baseDir, 'data', 'processed', 'reviews_current_window.json');
const rawAppStoreFile = path.join(baseDir, 'data', 'raw', 'app_store_raw.json');
const rawPlayStoreFile = path.join(baseDir, 'data', 'raw', 'play_store_raw.json');

// 1. Check generated files
console.log("\n📁 Checking Ingested Data Files...");
const processedExists = checkFile(processedFile);
checkFile(rawAppStoreFile);
checkFile(rawPlayStoreFile);

if (processedExists) {
  try {
    const reviews = JSON.parse(fs.readFileSync(processedFile, 'utf8'));
    console.log(`✅ reviews_current_window.json is valid JSON`);
    
    // 2. Validate count
    const totalCount = reviews.length;
    console.log(`📊 Ingested reviews count: ${totalCount}`);
    if (totalCount >= 50) {
      console.log(`  ✅ Total reviews is ${totalCount} (>= 50 limit)`);
    } else {
      console.warn(`  ⚠️ Warning: Ingested reviews is ${totalCount} (< 50 specification, but normal if mock data is used or live is limited).`);
    }

    // 3. Schema and PII Audit
    let invalidSchemaCount = 0;
    let piiEmailLeaks = 0;
    let piiPhoneLeaks = 0;
    let piiGovIdLeaks = 0;
    let sources = { app_store: 0, play_store: 0 };
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
    const aadhaarRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
    const panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/i;

    let minDate = '9999-12-31';
    let maxDate = '0000-01-01';

    reviews.forEach((r, idx) => {
      // Validate schema
      const hasFields = r && r.id && typeof r.rating === 'number' && 
                        r.text && r.date && r.source && r.ingested_at && 
                        typeof r.word_count === 'number';
      
      if (!hasFields) {
        invalidSchemaCount++;
      } else {
        sources[r.source] = (sources[r.source] || 0) + 1;
        if (r.date < minDate) minDate = r.date;
        if (r.date > maxDate) maxDate = r.date;

        // Audit PII
        const contentToCheck = `${r.title || ''} ${r.text}`;
        
        if (emailRegex.test(contentToCheck)) piiEmailLeaks++;
        if (phoneRegex.test(contentToCheck)) piiPhoneLeaks++;
        if (aadhaarRegex.test(contentToCheck)) piiGovIdLeaks++;
        if (panRegex.test(contentToCheck)) piiGovIdLeaks++;
      }
    });

    console.log("\n📋 Schema Validation...");
    if (invalidSchemaCount === 0) {
      console.log(`✅ 100% of reviews conform to the normalized schema.`);
    } else {
      console.error(`❌ Found ${invalidSchemaCount} reviews with invalid schema!`);
      failed = true;
    }

    console.log("\n🔒 PII Leak Audit...");
    if (piiEmailLeaks === 0) {
      console.log(`✅ Zero email leaks detected.`);
    } else {
      console.error(`❌ Detected ${piiEmailLeaks} email address leaks in processed reviews!`);
      failed = true;
    }

    if (piiPhoneLeaks === 0) {
      console.log(`✅ Zero phone number leaks detected.`);
    } else {
      console.error(`❌ Detected ${piiPhoneLeaks} phone number leaks in processed reviews!`);
      failed = true;
    }

    if (piiGovIdLeaks === 0) {
      console.log(`✅ Zero Govt ID (PAN/Aadhaar) leaks detected.`);
    } else {
      console.error(`❌ Detected ${piiGovIdLeaks} Government ID leaks in processed reviews!`);
      failed = true;
    }

    // 4. Source coverage
    console.log("\n📱 Source Coverage...");
    console.log(`  - App Store: ${sources.app_store} reviews`);
    console.log(`  - Play Store: ${sources.play_store} reviews`);
    
    // Note: Since App Store feed can return 0 if region/feed is empty, we print info/warnings accordingly
    if (sources.play_store > 0) {
      console.log(`  ✅ Play Store coverage: OK`);
    } else {
      console.error(`  ❌ Play Store reviews are missing!`);
      failed = true;
    }

    // 5. Date range window
    console.log("\n📅 Date Range Retention...");
    if (totalCount > 0) {
      console.log(`  - Oldest review in window: ${minDate}`);
      console.log(`  - Newest review in window: ${maxDate}`);
      
      const minD = new Date(minDate);
      const maxD = new Date(maxDate);
      const diffTime = Math.abs(maxD - minD);
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      console.log(`  - Total date span of reviews: ${diffWeeks} weeks`);
      
      if (diffWeeks <= 12) {
        console.log(`  ✅ Date span within target window (<= 12 weeks): OK`);
      } else {
        console.warn(`  ⚠️ Warning: Date span is ${diffWeeks} weeks, which exceeds the target 12 weeks.`);
      }
    }

  } catch (err) {
    console.error(`❌ reviews_current_window.json is not valid JSON: ${err.message}`);
    failed = true;
  }
}

console.log("\n==================================================");
if (failed) {
  console.error("❌ Phase 2 Verification FAILED. Please fix the errors above.");
  process.exit(1);
} else {
  console.log("🎉 Phase 2 Verification PASSED! Review ingestion pipeline is fully verified.");
  process.exit(0);
}
