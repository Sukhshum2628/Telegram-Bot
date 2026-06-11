require('dotenv').config();
const mongoose = require('mongoose');
const Hotel = require('./src/models/Hotel');
const Vendor = require('./src/models/Vendor');
const logger = require('./src/utils/logger');

// Realistic coordinates for Machail and nearby base camps (Gulabgarh)
const sampleHotels = [
  {
    name: "Hotel Padder Heights (⭐ Featured)",
    priceRange: "₹2000 - ₹5000",
    contact: "+91-9876543210",
    distance: "500m from Temple",
    mapsLink: "https://www.google.com/maps/search/?api=1&query=33.3551,76.2989",
    photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    tier: "featured",
    tierRank: 3,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    lat: 33.3551,
    lng: 76.2989,
    active: true
  },
  {
    name: "Mata Rani Niwas (Basic)",
    priceRange: "₹500 - ₹1500",
    contact: "+91-9988776655",
    distance: "200m from Base Camp",
    mapsLink: "https://www.google.com/maps/search/?api=1&query=33.3530,76.2965",
    photo: "https://images.unsplash.com/photo-1517840901100-8179e982ad93",
    tier: "basic",
    tierRank: 2,
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    lat: 33.3530,
    lng: 76.2965,
    active: true
  },
  {
    name: "Kishtwar Residency (Economy)",
    priceRange: "₹800 - ₹1200",
    contact: "+91-9123456789",
    distance: "1km from Helipad",
    mapsLink: "https://www.google.com/maps/search/?api=1&query=33.3570,76.3010",
    tier: "free",
    tierRank: 1,
    expiryDate: null,
    lat: 33.3570,
    lng: 76.3010,
    active: true
  }
];

const sampleVendors = [
  {
    name: "Vaishno Prasad Bhandar",
    items: "Standard Prasad Thali, Dry Fruits",
    contact: "+91-9000111222",
    locationLink: "https://www.google.com/maps/search/?api=1&query=Vaishno+Prasad+Bhandar@33.354128,76.297893"
  },
  {
    name: "Gulabgarh Sweets",
    items: "Ladoo, Halwa, Special Padder Tea",
    contact: "+91-9333444555",
    locationLink: "https://www.google.com/maps/search/?api=1&query=Gulabgarh+Sweets@33.266205,76.315904"
  }
];

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/machail-mata-bot');
    logger.info('Connected to MongoDB for seeding...');

    // Clear existing data
    await Hotel.deleteMany({});
    await Vendor.deleteMany({});
    logger.info('Cleared existing Hotel and Vendor data.');

    // Insert new data
    await Hotel.insertMany(sampleHotels);
    await Vendor.insertMany(sampleVendors);
    
    logger.info(`Successfully seeded ${sampleHotels.length} hotels and ${sampleVendors.length} vendors with Marketplace tiers.`);
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedData();
