const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    userName: { type: String },
    userPhone: { type: String, required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vendorName: { type: String, required: true },
    vendorType: { type: String, enum: ['hotel', 'vendor', 'taxi', 'tent', 'parking'], required: true },
    vendorContact: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
