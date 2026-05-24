/**
 * Phase 4 Verification Script
 * Validates Phase 4 Exit Criteria (P4-T01 through P4-T08).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { runGenerator } = require('../src/generator/index');

async function verifyPhase4() {
  console.log('🧪 Starting Phase 4 Exit Criteria Validation...');

  const reportPath = path.join(__dirname, '../data/outputs/theme_analysis_current.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Error: Input theme analysis report not found. Run classification first.');
    process.exit(1);
  }

  // Run the generator pipeline
  console.log('\n--- Running Generator Pipeline ---');
  let result;
  try {
    result = await runGenerator({
      reportPath: reportPath
    });
  } catch (err) {
    console.error(`❌ Generator pipeline failed: ${err.message}`);
    process.exit(1);
  }

  assert.ok(result, 'Result object should be returned');
  assert.ok(result.files, 'Result should contain files mapping');

  const { markdown, html, metadata, currentMarkdown, currentHtml, currentMetadata } = result.files;

  // P4-T01: Output Files Exist
  console.log('🔍 P4-T01: Checking if output files exist...');
  assert.ok(fs.existsSync(markdown), 'Markdown pulse file must exist');
  assert.ok(fs.existsSync(html), 'HTML pulse file must exist');
  assert.ok(fs.existsSync(metadata), 'Metadata JSON file must exist');
  assert.ok(fs.existsSync(currentMarkdown), 'Current Markdown pulse file must exist');
  assert.ok(fs.existsSync(currentHtml), 'Current HTML pulse file must exist');
  assert.ok(fs.existsSync(currentMetadata), 'Current Metadata JSON file must exist');
  console.log('✅ P4-T01 Passed: All output files exist.');

  // P4-T02: Word Count Enforced
  console.log('🔍 P4-T02: Checking word count limits...');
  const meta = JSON.parse(fs.readFileSync(currentMetadata, 'utf8'));
  assert.ok(meta.word_count <= 250, `Word count in metadata should be <= 250 (is ${meta.word_count})`);
  
  const mdContent = fs.readFileSync(currentMarkdown, 'utf8');
  const actualWordCount = mdContent.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(actualWordCount <= 250, `Actual Markdown word count should be <= 250 (is ${actualWordCount})`);
  assert.strictEqual(meta.word_count, actualWordCount, 'Metadata word count should match actual file word count');
  console.log(`✅ P4-T02 Passed: Word count is ${actualWordCount} (<= 250).`);

  // P4-T03: Placeholder Replacement (Markdown)
  console.log('🔍 P4-T03: Checking for unresolved placeholders in Markdown...');
  const placeholderRegex = /{{\s*[a-zA-Z0-9_]+\s*}}/g;
  const unresolvedMd = mdContent.match(placeholderRegex);
  assert.strictEqual(unresolvedMd, null, `Markdown contains unresolved placeholders: ${unresolvedMd}`);
  console.log('✅ P4-T03 Passed: No unresolved placeholders in Markdown.');

  // P4-T04: Placeholder Replacement (HTML)
  console.log('🔍 P4-T04: Checking for unresolved placeholders in HTML...');
  const htmlContent = fs.readFileSync(currentHtml, 'utf8');
  const unresolvedHtml = htmlContent.match(placeholderRegex);
  assert.strictEqual(unresolvedHtml, null, `HTML contains unresolved placeholders: ${unresolvedHtml}`);
  console.log('✅ P4-T04 Passed: No unresolved placeholders in HTML.');

  // P4-T05: Metadata Integrity
  console.log('🔍 P4-T05: Checking metadata integrity...');
  assert.strictEqual(typeof meta.week, 'string', 'week must be a string');
  assert.strictEqual(typeof meta.week_iso, 'string', 'week_iso must be a string');
  assert.strictEqual(typeof meta.generated_at, 'string', 'generated_at must be a string');
  assert.strictEqual(typeof meta.reviews_analyzed_count, 'number', 'reviews_analyzed_count must be a number');
  assert.ok(meta.themes_included_count >= 1 && meta.themes_included_count <= 3, 'themes_included_count must be 1 to 3');
  assert.ok(meta.quotes_included_count >= 1 && meta.quotes_included_count <= 3, 'quotes_included_count must be 1 to 3');
  assert.ok(meta.action_ideas_included_count >= 1 && meta.action_ideas_included_count <= 3, 'action_ideas_included_count must be 1 to 3');
  console.log('✅ P4-T05 Passed: Metadata is complete and matches specifications.');

  // P4-T06: Layout and Content Cleanliness (No empty list items/quotes)
  console.log('🔍 P4-T06: Checking layout cleanliness in Markdown...');
  assert.ok(!mdContent.includes('3.  — '), 'Markdown should not contain empty theme items');
  assert.ok(!mdContent.includes('• ""'), 'Markdown should not contain empty quote items');
  console.log('✅ P4-T06 Passed: Markdown layout has no orphaned list items.');

  console.log('🔍 P4-T07: Checking layout cleanliness in HTML...');
  assert.ok(!htmlContent.includes('<strong></strong> &mdash;'), 'HTML should not contain empty theme list items');
  assert.ok(!htmlContent.includes('""'), 'HTML should not contain empty quotes');
  console.log('✅ P4-T07 Passed: HTML layout has no orphaned markup.');

  console.log('\n🎉 All Phase 4 Exit Criteria Validated successfully! 🟢');
}

verifyPhase4().catch(err => {
  console.error(`\n❌ Validation Failed: ${err.message}`);
  process.exit(1);
});
