const http = require('http');
const fs = require('fs');
const path = require('path');

// Import GrowwPulse pipeline modules
const ingestion = require('./ingestion/runIngestion');
const classification = require('./classification/index');
const generator = require('./generator/index');
const delivery = require('./delivery/index');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Strip query parameters
  const parsedUrl = req.url.split('?')[0];

  // API Endpoint for generating pulse reports
  if (req.method === 'POST' && parsedUrl === '/api/generate-pulse') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        console.log('📡 [API] Triggering GrowwPulse pipeline...');
        let opts = {};
        try {
          if (body) opts = JSON.parse(body);
        } catch (e) {
          // ignore parsing error
        }

        // Set environment variable if mock mode requested (default to false if not specified)
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

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Weekly report generated and Gmail draft created successfully.',
          metadata: generatorResult.metadata,
          delivery: deliveryReport
        }));
      } catch (err) {
        console.error('❌ [API] Generation failed:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: false,
          error: err.message
        }));
      }
    });
    return;
  }

  let filePath = path.join(__dirname, '..', parsedUrl === '/' ? 'index.html' : parsedUrl);
  
  // Prevent directory traversal attacks
  const relative = path.relative(path.join(__dirname, '..'), filePath);
  if (relative.startsWith('..')) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        res.statusCode = 500;
        res.end(`Internal Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`📡 GrowwPulse Dashboard Server running at http://localhost:${PORT}`);
});
