const { appendToDoc } = require('../src/delivery/apiClient');
require('dotenv').config();

async function runLiveTest() {
  const docId = process.env.GOOGLE_DOC_ID || '1gGe28j6X5Vd-y7X1Fnz9GLgtyUdwmv-lFr7cYvsuLnQ';
  console.log(`Running live Google Docs append test...`);
  console.log(`Target Doc ID: ${docId}`);
  
  const content = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 GrowwPulse Live Integration Test\n📅 Executed at: ${new Date().toLocaleString()}\n🟢 Status: Appended via Railway MCP Server\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  try {
    const res = await appendToDoc(docId, content);
    console.log('✅ Success! Response from server:', res);
  } catch (err) {
    console.error('❌ Live test failed:', err.message);
  }
}

runLiveTest();
