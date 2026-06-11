const mongoose = require('mongoose');

const tentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String }, // e.g., Base Camp, Near Temple
    priceRange: { type: String },
    contact: { type: String },
    capacity: { type: String }, // e.g., 2-person, 4-person
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tent', tentSchema);
