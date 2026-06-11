require('dotenv').config();
const mongoose = require('mongoose');
const Hotel = require('./src/models/Hotel');

async function checkHotels() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/machail-mata-bot');
    console.log('✅ Connected.');

    const hotels = await Hotel.find({});
    console.log(`\n🏨 Current Saved Hotels: ${hotels.length}`);
    
    hotels.forEach((h, index) => {
        console.log(`\n[${index + 1}] Name: ${h.name}`);
        console.log(`   Location/Distance: ${h.distance}`);
        console.log(`   Maps Link: ${h.mapsLink || 'None'}`);
        console.log(`   Coordinates: (${h.lat}, ${h.lng})`);
    });

    mongoose.disconnect();
}

checkHotels().catch(console.error);
