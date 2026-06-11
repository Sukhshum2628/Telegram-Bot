const { getReplyMenu } = require('../utils/keyboards');
const User = require('../models/User');
const { t } = require('../utils/t');
const { smartReply } = require('../utils/ui');

module.exports = (bot) => {
    bot.start(async (ctx) => {
        // Save/Update user in DB
        await User.findOneAndUpdate(
            { telegramId: ctx.from.id },
            { 
                username: ctx.from.username,
                lastActive: new Date(),
                $inc: { interactions: 1 }
            },
            { upsert: true, returnDocument: 'after' }
        );

        const replyMenu = await getReplyMenu(ctx);
        await ctx.reply(ctx.i18n.__('welcome'), replyMenu);
    });

    bot.action('main_menu', async (ctx) => {
        await ctx.answerCbQuery();
        const replyMenu = await getReplyMenu(ctx);
        await ctx.reply(await t(ctx.from.id, 'welcome'), replyMenu);
    });
};
