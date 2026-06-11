const User = require('../models/User');
const Broadcast = require('../models/Broadcast');
const pRetry = require('p-retry');
const logger = require('../utils/logger');

// Dynamically import p-queue since it's ESM
let PQueue;
(async () => {
  const mod = await import('p-queue');
  PQueue = mod.default;
})();

// Telegram allows 30 messages per second globally
// We'll initialize the queue inside runBroadcast to ensure PQueue is loaded
let broadcastQueue;

const sendMessageWithRetry = async (bot, user, messageText) => {
    return pRetry(async () => {
        try {
            await bot.telegram.sendMessage(user.telegramId, messageText, { parse_mode: 'Markdown' });
            return true;
        } catch (err) {
            // 403: Bot was blocked by the user
            if (err.response && err.response.error_code === 403) {
                logger.info(`User ${user.telegramId} has blocked the bot. Marking as inactive.`);
                await User.updateOne({ telegramId: user.telegramId }, { active: false });
                const error = new Error('User blocked bot');
                error.name = 'AbortError'; // custom way to signal abort to p-retry if needed, 
                                           // though p-retry uses AbortError class which we need to import
                throw new pRetry.AbortError('User blocked bot');
            }

            // 429: Too Many Requests (Rate limit)
            if (err.response && err.response.error_code === 429) {
                const retryAfter = (err.response.parameters && err.response.parameters.retry_after) || 1;
                logger.warn(`Rate limit hit for ${user.telegramId}. retrying after ${retryAfter}s`);
                throw err;
            }

            throw err;
        }
    }, {
        retries: 3,
        onFailedAttempt: error => {
            logger.error(`Broadcast attempt ${error.attemptNumber} failed for ${user.telegramId}. ${error.retriesLeft} retries left.`);
        }
    });
};

const runBroadcast = async (bot, adminId, messageText) => {
    if (!PQueue) {
        const mod = await import('p-queue');
        PQueue = mod.default;
    }
    if (!broadcastQueue) {
        broadcastQueue = new PQueue({ intervalCap: 25, interval: 1000 });
    }

    const users = await User.find({ active: true }, 'telegramId');
    const broadcastRecord = await Broadcast.create({
        message: messageText,
        totalUsers: users.length,
        adminId: adminId.toString()
    });

    logger.info(`Starting broadcast to ${users.length} active users...`);

    for (const user of users) {
        broadcastQueue.add(async () => {
            try {
                await sendMessageWithRetry(bot, user, messageText);
                await Broadcast.updateOne({ _id: broadcastRecord._id }, { $inc: { successCount: 1 } });
            } catch (err) {
                if (!(err instanceof pRetry.AbortError)) {
                    logger.error(`Broadcast failure for ${user.telegramId}: ${err.message}`);
                    await Broadcast.updateOne({ _id: broadcastRecord._id }, { 
                        $inc: { failureCount: 1 },
                        $push: { failureReasons: { userId: user.telegramId, reason: err.message } }
                    });
                }
            }
        });
    }
    
    return broadcastRecord;
};

module.exports = { runBroadcast };
