const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    items: { type: String },
    contact: { type: String },
    locationLink: { type: String },
    priceInfo: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0 },
});

module.exports = mongoose.model('Vendor', vendorSchema);
