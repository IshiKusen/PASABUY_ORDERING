require('dotenv').config();
const { identifyProductFromBarcode } = require('../src/services/gemini');

const barcodes = [
  "4902777012345",
  "4902777023453"
];

async function testGemini() {
  for (const barcode of barcodes) {
    console.log(`\n🤖 AI Looking up: ${barcode}...`);
    try {
      const data = await identifyProductFromBarcode(barcode);
      console.log(`✅ Gemini Result:`, data);
    } catch (err) {
      console.error(`💥 AI Error:`, err.message);
    }
  }
}

testGemini();
