const fs = require('fs');
const ingestion = require('../src/ingestion/runIngestion');
const classification = require('../src/classification/index');
const generator = require('../src/generator/index');
const delivery = require('../src/delivery/index');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('📡 [API] Triggering GrowwPulse pipeline...');
    let opts = req.body || {};

    if (opts.mockData) {
      process.env.USE_MOCK = 'true';
    } else {
      process.env.USE_MOCK = 'false';
    }

    // Step 1: Run Ingestion
    console.log('🔄 [API] Running Ingestion...');
    await ingestion.run();

    // Step 2: Run Classification
    console.log('🏷️ [API] Running Classification...');
    const classificationReport = await classification.runClassification();

    if (!classificationReport || classificationReport.reviews_analyzed_count === 0) {
      throw new Error('No reviews found to process.');
    }

    // Step 3: Run Generator
    console.log('✍️ [API] Generating Pulse Note...');
    const generatorResult = await generator.runGenerator();

    // Step 4: Run Delivery
    console.log('📬 [API] Delivering Pulse Note...');
    const mdContent = fs.readFileSync(generatorResult.files.currentMarkdown, 'utf8');
    const deliveryReport = await delivery.deliverPulse(generatorResult.metadata, mdContent);

    const htmlContent = fs.readFileSync(generatorResult.files.currentHtml, 'utf8');

    // Read the newly classified reviews to send back to the frontend
    const basePath = process.env.VERCEL ? '/tmp/data' : require('path').join(__dirname, '../data');
    const reviewsPath = require('path').join(basePath, 'processed/reviews_classified.json');
    let reviewsData = [];
    if (fs.existsSync(reviewsPath)) {
      reviewsData = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
    }

    return res.status(200).json({
      success: true,
      message: 'Weekly report generated successfully.',
      metadata: generatorResult.metadata,
      delivery: deliveryReport,
      classificationReport: classificationReport,
      pulseHtml: htmlContent,
      reviewsData: reviewsData
    });
  } catch (err) {
    console.error('❌ [API] Generation failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
