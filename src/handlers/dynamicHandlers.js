const { Markup } = require('telegraf');
const Hotel = require('../models/Hotel');
const Vendor = require('../models/Vendor');
const Taxi = require('../models/Taxi');
const Tent = require('../models/Tent');
const Parking = require('../models/Parking');
const Place = require('../models/Place');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { calculateDistance } = require('../utils/geoUtils');
const { t } = require('../utils/t');
const { smartReply } = require('../utils/ui');
const { getReplyMenu } = require('../utils/keyboards');
const cache = require('../utils/cache');

module.exports = (bot) => {
    // 🏨 Hotels Listing (Sorted by Tier)
    bot.action('hotels', async (ctx) => {
        // High-performance cache retrieval
        let hotels = cache.get('db_hotels');
        if (!hotels) {
            hotels = await Hotel.find({ active: true }).sort({ isSponsored: -1, tierRank: -1, name: 1 });
            cache.set('db_hotels', hotels, 300); // 5-minute cache
        }
        await ctx.answerCbQuery();

        if (hotels.length === 0) {
            return smartReply(ctx, await t(ctx.from.id, 'no_hotels'));
        }

        let text = `🏨 *${await t(ctx.from.id, 'menu_hotels')}*\n\n`;
        const verifiedLabel = await t(ctx.from.id, 'verified_label');
        const sponsoredLabel = await t(ctx.from.id, 'sponsored_label');
        
        const keyboardButtons = [];
        for (const h of hotels) {
            let badges = '';
            if (h.isSponsored) badges += `🌟 *${sponsoredLabel}* `;
            if (h.isVerified) badges += `✅ *${verifiedLabel}*`;
            if (badges) badges += '\n';

            text += `${badges}*${h.name}*\n💰 ${h.priceRange}\n📍 ${h.distance || 'Machail'}\n`;
            
            const mapsLink = h.mapsLink 
                ? h.mapsLink 
                : (h.lat && h.lng ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}` : `https://www.google.com/maps/search/?api=1&query=33.3541,76.2979`);
            
            text += `🔗 [Google Maps](${mapsLink})\n\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${h.name}`, `lead_click:hotel:${h._id}`)]);
        }

        keyboardButtons.push([Markup.button.callback(await t(ctx.from.id, 'find_nearby'), 'find_nearby')]);

        await smartReply(ctx, text, Markup.inlineKeyboard(keyboardButtons));
    });

    // 📍 Find Nearby Hotels (Request Location)
    bot.action('find_nearby', async (ctx) => {
        await ctx.answerCbQuery();
        const { getLocationKeyboard } = require('../utils/keyboards');
        const locationKeyboard = await getLocationKeyboard(ctx);
        await ctx.reply(await t(ctx.from.id, 'location_required_msg'), locationKeyboard);
    });

    // 📍 Handle Location Sharing
    bot.on('location', async (ctx) => {
        const { latitude, longitude } = ctx.message.location;
        let hotels = cache.get('db_hotels');
        if (!hotels) {
            hotels = await Hotel.find({ active: true });
            cache.set('db_hotels', hotels, 300);
        }

        // Calculate distances and sort
        const nearbyHotels = hotels.map(h => {
            let dist = Infinity;
            if (h.lat && h.lng) {
                dist = calculateDistance(latitude, longitude, h.lat, h.lng);
            }
            return { ...h._doc, dist };
        })
        .filter(h => h.dist !== Infinity)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);

        if (nearbyHotels.length === 0) {
            const replyMenu = await getReplyMenu(ctx);
            return ctx.reply(await t(ctx.from.id, 'no_hotels'), replyMenu);
        }

        let text = `📍 *${await t(ctx.from.id, 'nearby_results', nearbyHotels.length)}*\n\n`;
        
        const keyboardButtons = [];
        for (const h of nearbyHotels) {
            let badges = '';
            if (h.isSponsored) badges += `🌟 *${await t(ctx.from.id, 'sponsored_label')}* `;
            if (h.isVerified) badges += `✅ *${await t(ctx.from.id, 'verified_label')}*`;
            if (badges) badges += '\n';

            const mapsLink = h.mapsLink || `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`;
            text += `${badges}*${h.name}*\n📏 ${h.dist.toFixed(2)} km away\n💰 ${h.priceRange}\n🔗 [Google Maps](${mapsLink})\n\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${h.name}`, `lead_click:hotel:${h._id}`)]);
        }

        await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(keyboardButtons)
        });
    });

    // 🍛 Prasad Vendors Listing
    bot.action('vendors', async (ctx) => {
        let vendors = cache.get('db_vendors');
        if (!vendors) {
            vendors = await Vendor.find({ isActive: true }).sort({ isSponsored: -1, name: 1 });
            cache.set('db_vendors', vendors, 300);
        }
        await ctx.answerCbQuery();

        if (vendors.length === 0) {
            return smartReply(ctx, await t(ctx.from.id, 'no_vendors'));
        }

        let text = `🍛 *${await t(ctx.from.id, 'menu_vendors')}*\n\n`;
        const keyboardButtons = [];
        
        for (const v of vendors) {
            let badges = '';
            if (v.isSponsored) badges += `🌟 *${await t(ctx.from.id, 'sponsored_label')}* `;
            if (v.isVerified) badges += `✅ *${await t(ctx.from.id, 'verified_label')}*`;
            if (badges) badges += '\n';

            text += `${badges}*${v.name}*\n🎁 ${v.items}\n`;
            
            if (v.locationLink) text += `📍 [View Location](${v.locationLink})\n`;
            text += `\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${v.name}`, `lead_click:vendor:${v._id}`)]);
        }

        await smartReply(ctx, text, Markup.inlineKeyboard(keyboardButtons));
    });

    // 🚕 Taxi Drivers Listing
    bot.action('taxis', async (ctx) => {
        let taxis = cache.get('db_taxis');
        if (!taxis) {
            taxis = await Taxi.find({ isActive: true }).sort({ isSponsored: -1, driverName: 1 });
            cache.set('db_taxis', taxis, 300);
        }
        await ctx.answerCbQuery();

        if (taxis.length === 0) {
            return smartReply(ctx, "🚖 No taxi details available at the moment.");
        }

        let text = `🚕 *${await t(ctx.from.id, 'menu_taxis') || 'Taxi Services'}*\n\n`;
        const keyboardButtons = [];
        
        for (const taxi of taxis) {
            let badges = '';
            if (taxi.isSponsored) badges += `🌟 *${await t(ctx.from.id, 'sponsored_label')}* `;
            if (taxi.isVerified) badges += `✅ *${await t(ctx.from.id, 'verified_label')}*`;
            if (badges) badges += '\n';

            text += `${badges}👤 *${taxi.driverName}*\n🚗 ${taxi.vehicleType} (${taxi.vehicleNumber})\n🛣 ${taxi.route || 'All Routes'}\n💰 ${taxi.priceInfo || 'Contact for price'}\n`;
            text += `\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${taxi.driverName}`, `lead_click:taxi:${taxi._id}`)]);
        }

        await smartReply(ctx, text, Markup.inlineKeyboard(keyboardButtons));
    });

    // ⛺ Tents Listing
    bot.action('tents', async (ctx) => {
        let tents = cache.get('db_tents');
        if (!tents) {
            tents = await Tent.find({ isActive: true }).sort({ isSponsored: -1, name: 1 });
            cache.set('db_tents', tents, 300);
        }
        await ctx.answerCbQuery();

        if (tents.length === 0) {
            return smartReply(ctx, "⛺ No tent listings available at the moment.");
        }

        let text = `⛺ *${await t(ctx.from.id, 'menu_tents') || 'Tent Services'}*\n\n`;
        const keyboardButtons = [];

        for (const tent of tents) {
            let badges = '';
            if (tent.isSponsored) badges += `🌟 *${await t(ctx.from.id, 'sponsored_label')}* `;
            if (tent.isVerified) badges += `✅ *${await t(ctx.from.id, 'verified_label')}*`;
            if (badges) badges += '\n';

            text += `${badges}*${tent.name}*\n📍 ${tent.location || 'Machail'}\n👥 Capacity: ${tent.capacity || 'N/A'}\n💰 ${tent.priceRange || 'Contact for price'}\n`;
            text += `\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${tent.name}`, `lead_click:tent:${tent._id}`)]);
        }

        await smartReply(ctx, text, Markup.inlineKeyboard(keyboardButtons));
    });

    // 🚗 Private Parking Listing
    bot.action('parking', async (ctx) => {
        let listings = cache.get('db_parking');
        if (!listings) {
            listings = await Parking.find({ isActive: true }).sort({ isSponsored: -1, name: 1 });
            cache.set('db_parking', listings, 300);
        }
        await ctx.answerCbQuery();

        if (listings.length === 0) {
            return smartReply(ctx, "🅿️ No private parking details available at the moment.");
        }

        let text = `🅿️ *${await t(ctx.from.id, 'menu_parking') || 'Private Parking'}*\n\n`;
        const keyboardButtons = [];

        for (const p of listings) {
            let badges = '';
            if (p.isSponsored) badges += `🌟 *${await t(ctx.from.id, 'sponsored_label')}* `;
            if (p.isVerified) badges += `✅ *${await t(ctx.from.id, 'verified_label')}*`;
            if (badges) badges += '\n';

            text += `${badges}*${p.name}*\n📍 ${p.location || 'Machail/Paddar'}\n🚗 Capacity: ${p.capacity || 'N/A'}\n💰 ${p.priceInfo || 'Contact for price'}\n`;
            text += `\n`;
            keyboardButtons.push([Markup.button.callback(`📞 ${p.name}`, `lead_click:parking:${p._id}`)]);
        }

        await smartReply(ctx, text, Markup.inlineKeyboard(keyboardButtons));
    });

    // ⛳ Tourist Places in Paddar Listing
    bot.action('places', async (ctx) => {
        let places = cache.get('db_places');
        if (!places) {
            places = await Place.find({ isActive: true }).sort({ name: 1 });
            cache.set('db_places', places, 300);
        }
        await ctx.answerCbQuery();

        if (places.length === 0) {
            return smartReply(ctx, await t(ctx.from.id, 'no_places'));
        }

        let text = `⛳ *${await t(ctx.from.id, 'menu_places')}*\n\n`;

        for (const p of places) {
            text += `*${p.name}*\n📝 ${p.description || 'No description available'}\n`;
            
            const mapsLink = p.mapsLink || (p.lat && p.lng ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : '');
            if (mapsLink) {
                text += `📍 [View on Google Maps](${mapsLink})\n`;
            }
            text += `\n`;
        }

        await smartReply(ctx, text);
    });

    // 📞 Callback Query for Vendor Contact Clicks
    bot.action(/^lead_click:(\w+):([\w\d]+)$/, async (ctx) => {
        const vendorType = ctx.match[1];
        const vendorId = ctx.match[2];
        
        await ctx.answerCbQuery();
        
        const user = await User.findOne({ telegramId: ctx.from.id });
        if (!user) {
            return ctx.reply("User profile not found. Please type /start first.");
        }

        if (!user.phoneNumber) {
            user.pendingLeadAction = { vendorType, vendorId };
            await user.save();

            const contactBtnLabel = await t(ctx.from.id, 'share_contact_btn') || '📱 Share Contact Number';
            const promptMsg = await t(ctx.from.id, 'share_contact_prompt') || '🔒 *Verification Required*\nTo connect with verified vendors and support our Yatra guide, please share your contact number using the button below.';
            
            return ctx.reply(promptMsg, {
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                    [Markup.button.contactRequest(contactBtnLabel)]
                ]).resize().oneTime()
            });
        }

        await processLeadAndShowContact(ctx, user, vendorType, vendorId);
    });

    async function processLeadAndShowContact(ctx, user, vendorType, vendorId) {
        let vendor = null;
        let model = null;
        let vendorName = '';
        let contact = '';
        
        switch (vendorType) {
            case 'hotel':
                model = Hotel;
                break;
            case 'vendor':
                model = Vendor;
                break;
            case 'taxi':
                model = Taxi;
                break;
            case 'tent':
                model = Tent;
                break;
            case 'parking':
                model = Parking;
                break;
        }

        if (model) {
            try {
                vendor = await model.findById(vendorId);
            } catch (err) {
                // Ignore parsing errors
            }
        }

        if (!vendor) {
            return ctx.reply("❌ Vendor not found or no longer active.");
        }

        vendorName = vendor.name || vendor.driverName || "Unknown Vendor";
        contact = vendor.contact || "";

        if (!contact) {
            return ctx.reply("❌ Contact number not available for this vendor.");
        }

        // Save Lead to MongoDB
        await Lead.create({
            userId: user.telegramId,
            userName: user.username || `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'N/A',
            userPhone: user.phoneNumber,
            vendorId: vendor._id,
            vendorName: vendorName,
            vendorType: vendorType,
            vendorContact: contact
        });

        // Display contact details
        let text = `📞 *${vendorName}*\n\n`;
        text += `📱 *Contact Number:* \`${contact}\`\n`;
        text += `✨ *Tap number to copy, or use buttons below to connect directly!*`;

        const cleanContact = contact.replace(/\D/g, '');
        const inlineButtons = [
            [Markup.button.url('📞 Call Now', `tel:${cleanContact}`)]
        ];
        if (cleanContact) {
            const bookNowLabel = await t(ctx.from.id, 'book_now_btn') || 'Book Now';
            inlineButtons[0].push(Markup.button.url(`💬 WhatsApp`, `https://wa.me/91${cleanContact}`));
        }

        await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(inlineButtons)
        });
    }
};
