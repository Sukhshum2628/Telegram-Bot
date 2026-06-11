const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String },
    language: { type: String, default: 'en', enum: ['en', 'hi'] },
    subscriptionStatus: { type: String, enum: ['free', 'premium'], default: 'free' },
    subscriptionExpiry: { type: Date, default: null },
    subscriptionActivatedBy: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    pendingLeadAction: { type: Object, default: null },
    active: { type: Boolean, default: true },
    firstSeen: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    interactions: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
