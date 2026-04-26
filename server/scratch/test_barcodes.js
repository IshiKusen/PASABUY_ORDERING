const barcodes = [
  "4902777012345",
  "4902777012352",
  "4902777012369",
  "4902777023453",
  "4902777023460"
];

async function testLookup() {
  for (const barcode of barcodes) {
    console.log(`\n🔍 Looking up: ${barcode}...`);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      if (data.status === 1) {
        console.log(`✅ Found: ${data.product.product_name} (${data.product.brands})`);
      } else {
        console.log(`❌ Not found in OpenFoodFacts.`);
      }
    } catch (err) {
      console.error(`💥 Error:`, err.message);
    }
  }
}

testLookup();
