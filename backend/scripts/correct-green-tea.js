// Run against the intended database after reviewing the target environment.
const mongoose = require('mongoose');
const { loadEnv } = require('../src/config/env');
const connectDB = require('../src/config/db');
const Inventory = require('../src/domains/inventory/inventory.model');

async function correctCategory() {
  loadEnv();
  await connectDB();
  const result = await Inventory.updateMany(
    { name: 'Green Tea', category: 'Coffee', isActive: true },
    { $set: { category: 'Tea' } }
  );
  console.log('Green Tea records corrected:', result.modifiedCount);
}

correctCategory().catch(() => {
  console.error('Category correction failed. Check the target database connection.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
