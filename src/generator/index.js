/**
 * Pulse Note Generator Orchestrator
 * Main entry point for Phase 4 Weekly Pulse Note Generator.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const { interpolate } = require('./template_engine');
const { generateActionIdeas } = require('./action_generator');
const { enforceWordCountLimit, getWordCount, cleanRenderedMarkdown } = require('./word_counter');
const { renderHTML } = require('./html_formatter');

// Load environment variables
dotenv.config();

/**
 * Ensures a directory exists.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Runs the pulse note generation pipeline.
 * @param {Object} options Configuration overrides
 * @returns {Promise<Object>} Output report metadata and file paths
 */
async function runGenerator(options = {}) {
  const settingsPath = options.settingsPath || path.join(__dirname, '../../config/settings.json');
  const reportPath = options.reportPath || path.join(__dirname, '../../data/outputs/theme_analysis_current.json');
  const templatesDir = options.templatesDir || path.join(__dirname, '../../templates');
  const outputsDir = options.outputsDir || path.join(__dirname, '../../data/outputs');

  console.log('🏁 Starting Weekly Pulse Note Generator...');

  // 1. Load Settings
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.warn(`⚠️ Warning: Failed to parse settings at ${settingsPath}. Using defaults.`);
    }
  }

  const maxWords = options.maxWords || settings.generator?.maxWords || 250;
  const actionIdeasCount = settings.generator?.actionIdeasCount || 3;

  // 2. Load Theme Analysis Report
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Theme analysis report not found at ${reportPath}. Run classification first.`);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log(`📊 Loaded theme analysis for week ${report.week} (${report.week_iso}).`);

  // 3. Load Templates
  const mdTemplatePath = path.join(templatesDir, 'pulse_template.md');
  const htmlTemplatePath = path.join(templatesDir, 'pulse_template.html');

  if (!fs.existsSync(mdTemplatePath)) {
    throw new Error(`Markdown template not found at ${mdTemplatePath}`);
  }
  if (!fs.existsSync(htmlTemplatePath)) {
    throw new Error(`HTML template not found at ${htmlTemplatePath}`);
  }

  const mdTemplate = fs.readFileSync(mdTemplatePath, 'utf8');
  const htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');

  // 4. Step 1: Generate Action Ideas
  console.log('💡 Generating actionable recommendations...');
  const actionIdeas = generateActionIdeas(report.themes, actionIdeasCount);

  // 5. Step 2: Enforce Word Count constraint dynamically
  console.log('🛡️ Running word count enforcer...');
  const values = enforceWordCountLimit(mdTemplate, report, actionIdeas);

  // 6. Step 3: Interpolate Markdown & HTML templates
  console.log('📝 Rendering pulse notes...');
  const rawMd = interpolate(mdTemplate, values);
  const finalMd = cleanRenderedMarkdown(rawMd);
  const finalHtml = renderHTML(htmlTemplate, values);

  const wordCount = getWordCount(finalMd);
  console.log(`📊 Final pulse note word count: ${wordCount} words (Limit: ${maxWords}).`);

  if (wordCount > maxWords) {
    console.warn(`⚠️ Warning: Generated pulse note word count (${wordCount}) exceeds the configured limit of ${maxWords}.`);
  }

  // Count active/included elements
  let activeThemes = 0;
  let activeQuotes = 0;
  let activeActions = 0;

  for (let i = 1; i <= 3; i++) {
    if (values[`THEME_${i}_NAME`]) activeThemes++;
    if (values[`QUOTE_${i}`]) activeQuotes++;
    if (values[`ACTION_${i}`]) activeActions++;
  }

  // 7. Save outputs
  ensureDir(outputsDir);
  const weekIso = report.week_iso || 'unknown-week';
  
  const mdPath = path.join(outputsDir, `pulse_${weekIso}.md`);
  const htmlPath = path.join(outputsDir, `pulse_${weekIso}.html`);
  const metaPath = path.join(outputsDir, `pulse_meta_${weekIso}.json`);

  const currentMdPath = path.join(outputsDir, 'pulse_current.md');
  const currentHtmlPath = path.join(outputsDir, 'pulse_current.html');
  const currentMetaPath = path.join(outputsDir, 'pulse_meta_current.json');

  const metadata = {
    week: report.week,
    week_iso: weekIso,
    generated_at: new Date().toISOString(),
    word_count: wordCount,
    reviews_analyzed_count: report.reviews_analyzed_count,
    themes_included_count: activeThemes,
    quotes_included_count: activeQuotes,
    action_ideas_included_count: activeActions
  };

  fs.writeFileSync(mdPath, finalMd, 'utf8');
  fs.writeFileSync(htmlPath, finalHtml, 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

  // Also write the "current" files
  fs.writeFileSync(currentMdPath, finalMd, 'utf8');
  fs.writeFileSync(currentHtmlPath, finalHtml, 'utf8');
  fs.writeFileSync(currentMetaPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`💾 Saved Markdown pulse: ${path.relative(process.cwd(), mdPath)}`);
  console.log(`💾 Saved HTML pulse: ${path.relative(process.cwd(), htmlPath)}`);
  console.log(`💾 Saved metadata JSON: ${path.relative(process.cwd(), metaPath)}`);

  return {
    metadata,
    files: {
      markdown: mdPath,
      html: htmlPath,
      metadata: metaPath,
      currentMarkdown: currentMdPath,
      currentHtml: currentHtmlPath,
      currentMetadata: currentMetaPath
    }
  };
}

// Execute directly if run via node
if (require.main === module) {
  runGenerator().catch(err => {
    console.error(`❌ Generator execution failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  runGenerator
};
