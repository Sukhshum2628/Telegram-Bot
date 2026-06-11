const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('./src/models/Vendor');

async function checkVendors() {
    await mongoose.connect(process.env.MONGO_URI);
    const vendors = await Vendor.find({});
    console.log('All Vendors in DB:', vendors);
    const activeVendors = await Vendor.find({ isActive: true });
    console.log('Active Vendors in DB:', activeVendors);
    process.exit(0);
}
checkVendors();
