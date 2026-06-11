const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    priceRange: { type: String },
    contact: { type: String },
    distance: { type: String },
    mapsLink: { type: String },
    photo: { type: String }, // User requested 'photo' field
    tier: { type: String, enum: ['free', 'basic', 'featured'], default: 'free' },
    tierRank: { type: Number, default: 1 }, // 1=free, 2=basic, 3=featured
    expiryDate: { type: Date, default: null },
    lat: { type: Number },
    lng: { type: Number },
    active: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

// Create index for geosptial queries if needed later
hotelSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
