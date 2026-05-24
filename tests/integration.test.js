/**
 * Integration & CLI Tests for GrowwPulse Orchestrator
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Mock module exports before requiring src/index.js
const ingestionModule = require('../src/ingestion/runIngestion');
const classificationModule = require('../src/classification/index');
const generatorModule = require('../src/generator/index');
const deliveryModule = require('../src/delivery/index');

// Keep original implementations
const originalRun = ingestionModule.run;
const originalClassify = classificationModule.runClassification;
const originalGenerate = generatorModule.runGenerator;
const originalDeliver = deliveryModule.deliverPulse;

test('🚀 GrowwPulse Pipeline Orchestrator Integration Tests', async (t) => {
  
  t.afterEach(() => {
    // Reset process argv and env
    process.argv = ['node', 'src/index.js'];
    delete process.env.USE_MOCK;
    
    // Restore original implementations
    ingestionModule.run = originalRun;
    classificationModule.runClassification = originalClassify;
    generatorModule.runGenerator = originalGenerate;
    deliveryModule.deliverPulse = originalDeliver;
  });

  await t.test('CLI Args: should parse boolean flags correctly', () => {
    // Import helper
    const { parseArgs } = require('../src/index');
    
    process.argv = ['node', 'src/index.js', '--dry-run', '--mock-data', '--verbose'];
    const opts = parseArgs();
    
    assert.strictEqual(opts.dryRun, true);
    assert.strictEqual(opts.mockData, true);
    assert.strictEqual(opts.verbose, true);
    assert.strictEqual(opts.weeks, null);
  });

  await t.test('CLI Args: should parse weeks override correctly', () => {
    const { parseArgs } = require('../src/index');
    
    process.argv = ['node', 'src/index.js', '--weeks', '12'];
    const opts = parseArgs();
    
    assert.strictEqual(opts.weeks, 12);
  });

  await t.test('CLI Args: should throw error on missing weeks value', () => {
    const { parseArgs } = require('../src/index');
    
    process.argv = ['node', 'src/index.js', '--weeks'];
    assert.throws(() => parseArgs(), /--weeks requires a valid number/);
  });

  await t.test('CLI Args: should throw error on invalid weeks format', () => {
    const { parseArgs } = require('../src/index');
    
    process.argv = ['node', 'src/index.js', '--weeks', 'abc'];
    assert.throws(() => parseArgs(), /--weeks requires a valid number/);
  });

  await t.test('CLI Args: should throw error on non-positive weeks value', () => {
    const { parseArgs } = require('../src/index');
    
    process.argv = ['node', 'src/index.js', '--weeks', '-5'];
    assert.throws(() => parseArgs(), /--weeks must be a positive number/);
  });

  await t.test('Pipeline Orchestration: should run all stages in sequence and call delivery', async () => {
    let steps = [];
    
    ingestionModule.run = async () => {
      steps.push('ingestion');
    };
    classificationModule.runClassification = async () => {
      steps.push('classification');
      return { reviews_analyzed_count: 5 };
    };
    generatorModule.runGenerator = async () => {
      steps.push('generator');
      return {
        metadata: { week: 'May 18-24, 2026', week_iso: '2026-W21' },
        files: {
          currentMarkdown: path.join(__dirname, 'mock_current.md'),
          currentHtml: path.join(__dirname, 'mock_current.html')
        }
      };
    };
    deliveryModule.deliverPulse = async (meta, md) => {
      steps.push('delivery');
      assert.strictEqual(meta.week_iso, '2026-W21');
      assert.strictEqual(md, 'mock markdown content');
      return { status: 'SUCCESS' };
    };

    // Create a temporary mock markdown file to be read
    const mockFileDir = __dirname;
    const mockFilePath = path.join(mockFileDir, 'mock_current.md');
    fs.writeFileSync(mockFilePath, 'mock markdown content', 'utf8');

    process.argv = ['node', 'src/index.js'];
    
    const { main } = require('../src/index');
    await main();

    // Verify correct execution sequence
    assert.deepStrictEqual(steps, ['ingestion', 'classification', 'generator', 'delivery']);

    // Clean up mock file
    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
    }
  });

  await t.test('Pipeline Orchestration: should run in mock-data mode', async () => {
    let mockModeEnabled = false;
    ingestionModule.run = async () => {
      if (process.env.USE_MOCK === 'true') {
        mockModeEnabled = true;
      }
    };
    classificationModule.runClassification = async () => ({ reviews_analyzed_count: 10 });
    generatorModule.runGenerator = async () => ({
      metadata: { week: 'May 18-24, 2026', week_iso: '2026-W21' },
      files: {
        currentMarkdown: path.join(__dirname, 'mock_current.md'),
        currentHtml: path.join(__dirname, 'mock_current.html')
      }
    });
    deliveryModule.deliverPulse = async () => ({});

    const mockFilePath = path.join(__dirname, 'mock_current.md');
    fs.writeFileSync(mockFilePath, 'mock markdown content', 'utf8');

    process.argv = ['node', 'src/index.js', '--mock-data'];
    
    const { main } = require('../src/index');
    await main();

    assert.strictEqual(mockModeEnabled, true, 'Ingestion should run in mock mode when flag is set');
    assert.strictEqual(process.env.USE_MOCK, 'true');

    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
    }
  });

  await t.test('Pipeline Orchestration: should skip delivery in dry-run mode', async () => {
    let steps = [];
    ingestionModule.run = async () => {
      steps.push('ingestion');
    };
    classificationModule.runClassification = async () => {
      steps.push('classification');
      return { reviews_analyzed_count: 5 };
    };
    generatorModule.runGenerator = async () => {
      steps.push('generator');
      return {
        metadata: { week: 'May 18-24, 2026', week_iso: '2026-W21' },
        files: {
          currentMarkdown: path.join(__dirname, 'mock_current.md'),
          currentHtml: path.join(__dirname, 'mock_current.html')
        }
      };
    };
    deliveryModule.deliverPulse = async () => {
      steps.push('delivery');
    };

    process.argv = ['node', 'src/index.js', '--dry-run'];
    
    const { main } = require('../src/index');
    await main();

    // Verify delivery is NOT called in dry-run mode
    assert.deepStrictEqual(steps, ['ingestion', 'classification', 'generator']);
  });
});
