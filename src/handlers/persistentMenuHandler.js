const { getReplyMenu } = require('../utils/keyboards');
const { t } = require('../utils/t');

module.exports = (bot) => {
    bot.on('text', async (ctx, next) => {
        // Avoid infinite loop if handleUpdate is called
        if (ctx.state.isSimulated) return next();

        const text = ctx.message.text;
        const userId = ctx.from.id;
        
        // Map button text to actions
        const mapping = {
            [await t(userId, 'menu_hotels')]: 'hotels',
            [await t(userId, 'menu_vendors')]: 'vendors',
            [await t(userId, 'menu_taxis')]: 'taxis',
            [await t(userId, 'menu_tents')]: 'tents',
            [await t(userId, 'menu_weather')]: 'weather',
            [await t(userId, 'menu_parking')]: 'parking',
            [await t(userId, 'menu_emergency')]: 'emergency',
            [await t(userId, 'menu_updates')]: 'updates',
            [await t(userId, 'menu_language')]: 'language',
            [await t(userId, 'menu_route')]: 'route',
            [await t(userId, 'menu_location')]: 'location',
            [await t(userId, 'menu_premium')]: 'premium_menu',
            [await t(userId, 'menu_helicopter')]: 'guide_helicopter',
            [await t(userId, 'menu_checklist')]: 'guide_packing',
            [await t(userId, 'menu_faqs')]: 'guide_faqs',
            [await t(userId, 'menu_places')]: 'places',
            [await t(userId, 'back_to_menu')]: 'main_menu'
        };

        const action = mapping[text];
        if (action) {
            // Modify the raw update object so the next context sees it as a callback query
            ctx.update.callback_query = {
                id: 'fake',
                from: ctx.from,
                message: ctx.message,
                data: action
            };
            // Delete the text message so it doesn't trigger the same handler again
            delete ctx.update.message;
            
            return bot.handleUpdate(ctx.update);
        }

        return next();
    });
};
