const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    totalUsers: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    failureReasons: [{
        userId: String,
        reason: String
    }],
    adminId: { type: String, required: true },
});

module.exports = mongoose.model('Broadcast', broadcastSchema);
