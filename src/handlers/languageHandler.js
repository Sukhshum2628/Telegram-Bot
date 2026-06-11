const { Markup } = require('telegraf');
const User = require('../models/User');
const { getReplyMenu } = require('../utils/keyboards');
const { smartReply } = require('../utils/ui');

module.exports = (bot) => {
    bot.action('language', async (ctx) => {
        await ctx.answerCbQuery();
        await smartReply(ctx, ctx.i18n.__('select_language'), Markup.inlineKeyboard([
            [Markup.button.callback(ctx.i18n.__('lang_en'), 'lang_en'), Markup.button.callback(ctx.i18n.__('lang_hi'), 'lang_hi')]
        ]));
    });

    bot.action(['lang_en', 'lang_hi'], async (ctx) => {
        const lang = ctx.match[0] === 'lang_en' ? 'en' : 'hi';
        ctx.user.language = lang;
        await ctx.user.save();

        ctx.i18n.setLocale(lang);
        await ctx.answerCbQuery(`Language set to ${lang.toUpperCase()}`);
        
        // Force refresh the persistent menu by sending it with a confirmation message
        const { getReplyMenu } = require('../utils/keyboards');
        const replyMenu = await getReplyMenu(ctx);
        await ctx.reply(`✅ ${ctx.i18n.__('welcome')}`, replyMenu);
    });
};
