const mongoose = require('mongoose');

const taxiSchema = new mongoose.Schema({
    driverName: { type: String, required: true },
    vehicleNumber: { type: String },
    vehicleType: { type: String }, // e.g., Innova, Swift, Tempo Traveller
    contact: { type: String },
    route: { type: String }, // e.g., Jammu to Gulabgarh
    priceInfo: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Taxi', taxiSchema);
