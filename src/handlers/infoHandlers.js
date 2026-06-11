const { Markup } = require('telegraf');
const { getReplyMenu } = require('../utils/keyboards');
const { getWeather } = require('../services/weatherService');
const EmergencyContact = require('../models/EmergencyContact');
const { t } = require('../utils/t');
const { smartReply } = require('../utils/ui');

module.exports = (bot) => {
    bot.action('route', async (ctx) => {
        await ctx.answerCbQuery();
        await smartReply(ctx, ctx.i18n.__('route_info'), Markup.inlineKeyboard([
            [Markup.button.url('🗺 View on Google Maps', 'https://www.google.com/maps/search/?api=1&query=33.3541,76.2979')]
        ]));
    });

    bot.action('location', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.replyWithLocation(33.3541, 76.2979); // Accurate Machail location
        await smartReply(ctx, ctx.i18n.__('temple_desc'), Markup.inlineKeyboard([
            [Markup.button.url('📍 Google Maps', 'https://www.google.com/maps/search/?api=1&query=Machail+Mata+Temple+Kishtwar@33.3541,76.2979')]
        ]));
    });

    bot.action('weather', async (ctx) => {
        await ctx.answerCbQuery(ctx.i18n.__('loading'));
        const weather = await getWeather(ctx);
        await smartReply(ctx, weather);
    });

    bot.action('emergency', async (ctx) => {
        await ctx.answerCbQuery();
        
        const contacts = await EmergencyContact.find({}).sort({ order: 1 });
        
        let text = `☎️ *${ctx.i18n.__('emergency_title')}*\n\n`;
        
        if (contacts.length === 0) {
            // Fallback
            text += `🚓 *Police*: \`100\`\n🚑 *Medical*: \`102\`, \`108\`\n🏠 *Control Room*: \`+911234567890\`\n`;
        } else {
            for (const contact of contacts) {
                text += `${contact.icon} *${contact.title}*: \`${contact.number}\`\n`;
            }
        }
        
        text += `\n💡 _Tap on any number above to dial directly from your phone._`;
        
        await smartReply(ctx, text);
    });

    // 🛸 Helicopter & Yatra Registration
    bot.action('guide_helicopter', async (ctx) => {
        await ctx.answerCbQuery();
        await smartReply(ctx, ctx.i18n.__('guide_helicopter_info'));
    });

    // 🎒 Packing Checklist
    bot.action('guide_packing', async (ctx) => {
        await ctx.answerCbQuery();
        await smartReply(ctx, ctx.i18n.__('guide_packing_info'));
    });

    // ❓ Yatra FAQs
    bot.action('guide_faqs', async (ctx) => {
        await ctx.answerCbQuery();
        await smartReply(ctx, ctx.i18n.__('guide_faqs_info'));
    });
};
