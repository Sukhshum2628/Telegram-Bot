const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String },
    contact: { type: String },
    capacity: { type: String },
    priceInfo: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Parking', parkingSchema);
