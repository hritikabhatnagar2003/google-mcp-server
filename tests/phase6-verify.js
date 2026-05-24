/**
 * Phase 6 Verification Script
 * Validates Phase 6 E2E Integration and CLI operations.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function verifyPhase6() {
  console.log('🧪 Starting Phase 6 (End-to-End Integration) Exit Criteria Validation...');

  const cmd = 'node src/index.js --mock-data --dry-run --verbose';
  console.log(`\n🏃 Running Command: ${cmd}`);
  
  let output;
  try {
    output = execSync(cmd, { encoding: 'utf8', env: { ...process.env, USE_MOCK: 'true' } });
    console.log('--- Command Output ---');
    console.log(output);
    console.log('----------------------');
  } catch (err) {
    console.error(`❌ Command execution failed: ${err.message}`);
    process.exit(1);
  }

  // P6-T01: CLI Output and Execution Logs
  console.log('\n🔍 P6-T01: Checking logs and process confirmation...');
  assert.ok(output.includes('🚀 Initializing GrowwPulse Pipeline...'), 'Logs should show initialization');
  assert.ok(output.includes('🔄 Step 1/4: Running Ingestion Pipeline'), 'Logs should show Ingestion Step');
  assert.ok(output.includes('🏷️ Step 2/4: Running Classification Engine'), 'Logs should show Classification Step');
  assert.ok(output.includes('✍️ Step 3/4: Generating Pulse Note'), 'Logs should show Generation Step');
  assert.ok(output.includes('📬 Step 4/4: Delivering Pulse Note'), 'Logs should show Delivery Step');
  assert.ok(output.includes('🚫 Dry-run mode enabled. Skipping live delivery channels.'), 'Logs should show dry-run notice');
  assert.ok(output.includes('✅ Pipeline Execution Finished in'), 'Logs should show completion time');
  console.log('✅ P6-T01 Passed: CLI output shows full sequential step tracing and execution duration.');

  // P6-T02: Verify Output files exist and are not empty
  console.log('\n🔍 P6-T02: Validating physical output files from mock integration run...');
  const outDir = path.join(__dirname, '../data/outputs');
  
  const currentMd = path.join(outDir, 'pulse_current.md');
  const currentHtml = path.join(outDir, 'pulse_current.html');
  const currentMeta = path.join(outDir, 'pulse_meta_current.json');
  
  assert.ok(fs.existsSync(currentMd), 'pulse_current.md must exist');
  assert.ok(fs.existsSync(currentHtml), 'pulse_current.html must exist');
  assert.ok(fs.existsSync(currentMeta), 'pulse_meta_current.json must exist');
  
  const mdContent = fs.readFileSync(currentMd, 'utf8');
  const htmlContent = fs.readFileSync(currentHtml, 'utf8');
  const metaObj = JSON.parse(fs.readFileSync(currentMeta, 'utf8'));

  assert.ok(mdContent.length > 50, 'Markdown file should not be empty');
  assert.ok(htmlContent.includes('<!DOCTYPE html>'), 'HTML file should contain standard HTML boilerplate');
  assert.strictEqual(typeof metaObj.word_count, 'number', 'Metadata should record word count');
  assert.ok(metaObj.word_count <= 250, 'Word count must be <= 250');
  
  console.log(`✅ P6-T02 Passed: Generated pulse note contains ${metaObj.word_count} words.`);

  console.log('\n🎉 All Phase 6 E2E Integration Exit Criteria Validated successfully! 🟢');
}

verifyPhase6().catch(err => {
  console.error(`\n❌ Validation Failed: ${err.message}`);
  process.exit(1);
});
