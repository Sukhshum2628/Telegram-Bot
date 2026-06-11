require('dotenv').config();
const mongoose = require('mongoose');
const { syncFromSheets } = require('./src/services/sheetsService');

async function testSync() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        console.log('Starting Sync...');
        const result = await syncFromSheets();
        console.log('Result:', result);

        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

testSync();
