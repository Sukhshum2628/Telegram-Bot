const { Markup } = require('telegraf');
const User = require('../models/User');

const getMainMenu = async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const isPremium = user && user.subscriptionStatus === 'premium';

    const buttons = [
        [Markup.button.callback(ctx.i18n.__('menu_hotels'), 'hotels'), Markup.button.callback(ctx.i18n.__('menu_vendors'), 'vendors')],
        [Markup.button.callback(ctx.i18n.__('menu_taxis') || '🚕 Taxis', 'taxis'), Markup.button.callback(ctx.i18n.__('menu_tents') || '⛺ Tents', 'tents')],
        [Markup.button.callback(ctx.i18n.__('menu_parking') || '🅿️ Parking', 'parking'), Markup.button.callback(ctx.i18n.__('menu_route'), 'route')],
        [Markup.button.callback(ctx.i18n.__('menu_weather'), 'weather'), Markup.button.callback(ctx.i18n.__('menu_location'), 'location')],
        [Markup.button.callback(ctx.i18n.__('menu_emergency'), 'emergency')],
    ];

    if (!isPremium) {
        buttons.push([Markup.button.callback(ctx.i18n.__('menu_premium'), 'premium_menu')]);
    }

    buttons.push([Markup.button.callback(ctx.i18n.__('menu_updates'), 'updates'), Markup.button.callback(ctx.i18n.__('menu_language'), 'language')]);

    return Markup.inlineKeyboard(buttons);
};

const getReplyMenu = async (ctx) => {
    const t = (key) => ctx.i18n.__(key);
    const user = await User.findOne({ telegramId: ctx.from.id });
    const isPremium = user && user.subscriptionStatus === 'premium';

    const buttons = [
        [t('menu_hotels'), t('menu_vendors')],
        [t('menu_taxis'), t('menu_tents')],
        [t('menu_parking'), t('menu_route')],
        [t('menu_weather'), t('menu_location')],
        [t('menu_emergency'), t('menu_updates')],
        [t('menu_helicopter'), t('menu_checklist')],
        [t('menu_faqs'), t('menu_places')],
        [t('menu_language')]
    ];

    if (!isPremium) {
        buttons.push([t('menu_premium')]);
    }

    return Markup.keyboard(buttons).resize().persistent();
};

const getLocationKeyboard = async (ctx) => {
    const t = (key) => ctx.i18n.__(key);
    const user = await User.findOne({ telegramId: ctx.from.id });
    const isPremium = user && user.subscriptionStatus === 'premium';

    const buttons = [
        [Markup.button.locationRequest(t('share_location_btn'))],
        [t('menu_hotels'), t('menu_vendors')],
        [t('menu_taxis'), t('menu_tents')],
        [t('menu_parking'), t('menu_route')],
        [t('menu_weather'), t('menu_location')],
        [t('menu_emergency'), t('menu_updates')],
        [t('menu_helicopter'), t('menu_checklist')],
        [t('menu_faqs'), t('menu_places')],
        [t('menu_language')]
    ];

    if (!isPremium) {
        buttons.push([t('menu_premium')]);
    }

    return Markup.keyboard(buttons).resize();
};

module.exports = { getMainMenu, getReplyMenu, getLocationKeyboard };
