const User = require('../models/User');
const i18n = require('../utils/i18n');

module.exports = async (ctx, next) => {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });

    if (!user) {
        user = await User.create({
            telegramId,
            username: ctx.from.username,
            language: 'en',
        });
    } else {
        user.lastActive = new Date();
        user.interactions += 1;
        await user.save();
    }

    ctx.user = user;
    i18n.setLocale(user.language);
    ctx.i18n = i18n;

    return next();
};
