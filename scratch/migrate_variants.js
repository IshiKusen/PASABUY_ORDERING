const db = require('../server/src/config/database');

async function migrate() {
  try {
    await db.query('ALTER TABLE product_variants ADD COLUMN image_path VARCHAR(255) DEFAULT NULL');
    console.log('✅ Added image_path column to product_variants');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('ℹ️ Column image_path already exists');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
