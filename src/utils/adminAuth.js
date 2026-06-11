const logger = require('./logger');

/**
 * Middleware to check if the user is an authorized admin.
 * Uses ADMIN_USER_IDS from .env.
 */
module.exports = async (ctx, next) => {
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim());
    const userId = ctx.from.id.toString();

    if (!adminIds.includes(userId)) {
        logger.warn(`Unauthorized admin access attempt by ${userId} (@${ctx.from.username})`);
        return ctx.reply("❌ Unauthorized. This command is restricted to admins only.");
    }

    return next();
};
