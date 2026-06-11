const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    mapsLink: { type: String },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Place', placeSchema);
