const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
    title: { type: String, required: true }, // e.g., Police, Medical, Control Room
    number: { type: String, required: true },
    icon: { type: String, default: '📞' },
    order: { type: Number, default: 0 },
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
