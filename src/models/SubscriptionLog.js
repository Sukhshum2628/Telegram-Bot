const mongoose = require('mongoose');

const subscriptionLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    activatedBy: { type: String, required: true },
    activatedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    utrNumber: { type: String },
    amountPaid: { type: Number },
});

module.exports = mongoose.model('SubscriptionLog', subscriptionLogSchema);
