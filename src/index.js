/**
 * GrowwPulse End-to-End Orchestrator
 * Main entry point for running the entire review pipeline.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Imports from other pipeline modules
const ingestion = require('./ingestion/runIngestion');
const classification = require('./classification/index');
const generator = require('./generator/index');
const delivery = require('./delivery/index');

/**
 * Parses command-line arguments.
 * Supports:
 *   --dry-run           Skip delivery steps
 *   --mock-data         Use mock reviews instead of scraping App/Play Store
 *   --weeks <number>    Override review window (number of weeks)
 *   --verbose           Show detailed logging
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    mockData: false,
    weeks: null,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--mock-data') {
      options.mockData = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--weeks') {
      const val = args[i + 1];
      if (!val || isNaN(val)) {
        throw new Error('Error: --weeks requires a valid number argument.');
      }
      options.weeks = parseInt(val, 10);
      if (options.weeks <= 0) {
        throw new Error('Error: --weeks must be a positive number.');
      }
      i++;
    } else {
      console.warn(`⚠️ Warning: Unknown command line option: ${arg}`);
    }
  }
  return options;
}

/**
 * Main execution flow
 */
async function main() {
  const startTime = Date.now();
  console.log('🚀 Initializing GrowwPulse Pipeline...');

  let options;
  try {
    options = parseArgs();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (options.verbose) {
    console.log('🔧 Active configuration options:', options);
  }

  // Set environment variable if mock-data is selected
  if (options.mockData) {
    process.env.USE_MOCK = 'true';
  }

  const CONFIG_PATH = path.resolve(__dirname, '../config/settings.json');
  let originalSettingsContent = null;
  let settingsOverridden = false;

  // Read and back up config settings.json
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      originalSettingsContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    } catch (err) {
      console.warn(`⚠️ Warning: Failed to backup config/settings.json: ${err.message}`);
    }
  }

  try {
    // Dynamic override for review window weeks in settings.json
    if (options.weeks) {
      let settingsObj = {};
      if (originalSettingsContent) {
        try {
          settingsObj = JSON.parse(originalSettingsContent);
        } catch (e) {
          console.warn(`⚠️ Warning: Failed to parse original settings.json. Using empty object base.`);
        }
      }
      
      settingsObj.ingestion = settingsObj.ingestion || {};
      settingsObj.ingestion.reviewWindowWeeks = options.weeks;

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(settingsObj, null, 2), 'utf8');
      settingsOverridden = true;
      if (options.verbose) {
        console.log(`🔧 Settings.json modified with review window override: ${options.weeks} weeks.`);
      }
    }

    // Step 1: Ingestion Pipeline
    console.log('\n=========================================');
    console.log('🔄 Step 1/4: Running Ingestion Pipeline');
    console.log('=========================================');
    await ingestion.run();

    // Step 2: Classification Engine
    console.log('\n=========================================');
    console.log('🏷️ Step 2/4: Running Classification Engine');
    console.log('=========================================');
    const classificationReport = await classification.runClassification();

    if (!classificationReport || classificationReport.reviews_analyzed_count === 0) {
      console.warn('⚠️ No reviews found to process. Exiting pipeline.');
      return;
    }

    // Step 3: Pulse Generator
    console.log('\n=========================================');
    console.log('✍️ Step 3/4: Generating Pulse Note');
    console.log('=========================================');
    const generatorResult = await generator.runGenerator();

    // Step 4: Delivery
    console.log('\n=========================================');
    console.log('📬 Step 4/4: Delivering Pulse Note');
    console.log('=========================================');
    
    if (options.dryRun) {
      console.log('🚫 Dry-run mode enabled. Skipping live delivery channels.');
      console.log('Generated outputs are available locally in data/outputs/:');
      console.log(`  - Markdown: ${path.relative(process.cwd(), generatorResult.files.currentMarkdown)}`);
      console.log(`  - HTML: ${path.relative(process.cwd(), generatorResult.files.currentHtml)}`);
    } else {
      const mdContent = fs.readFileSync(generatorResult.files.currentMarkdown, 'utf8');
      
      // Execute live delivery
      await delivery.deliverPulse(generatorResult.metadata, mdContent);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=========================================');
    console.log(`✅ Pipeline Execution Finished in ${duration}s.`);
    console.log('=========================================\n');

  } catch (error) {
    console.error(`\n❌ Pipeline execution encountered a fatal error: ${error.message}`);
    process.exit(1);
  } finally {
    // Restore config settings backup
    if (settingsOverridden && originalSettingsContent !== null) {
      try {
        fs.writeFileSync(CONFIG_PATH, originalSettingsContent, 'utf8');
        if (options.verbose) {
          console.log('🔧 Settings.json has been restored to its original state.');
        }
      } catch (err) {
        console.error(`❌ Failed to restore config/settings.json: ${err.message}`);
      }
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  parseArgs
};
