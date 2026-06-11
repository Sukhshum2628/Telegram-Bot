const { Markup } = require('telegraf');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Hotel = require('../models/Hotel');
const Vendor = require('../models/Vendor');
const Taxi = require('../models/Taxi');
const Tent = require('../models/Tent');
const Parking = require('../models/Parking');
const { getReplyMenu } = require('../utils/keyboards');
const { t } = require('../utils/t');

module.exports = (bot) => {
    // Listen for shared contact card
    bot.on('contact', async (ctx) => {
        const contactInfo = ctx.message.contact;
        
        // Prevent spoofing by verifying the contact belongs to the user who sent it
        if (contactInfo.user_id !== ctx.from.id) {
            return ctx.reply("❌ Please share your own contact number using the button provided.");
        }

        const phoneNumber = contactInfo.phone_number;

        // Save phone number in User profile
        const user = await User.findOneAndUpdate(
            { telegramId: ctx.from.id },
            { phoneNumber: phoneNumber },
            { new: true }
        );

        if (!user) {
            return ctx.reply("User profile not found. Please type /start first.");
        }

        const welcomeText = await t(ctx.from.id, 'contact_saved_msg') || "✅ Contact number verified successfully!";
        
        // Restore standard reply menu
        const replyMenu = await getReplyMenu(ctx);
        await ctx.reply(welcomeText, replyMenu);

        // Check if there was a pending lead action
        if (user.pendingLeadAction && user.pendingLeadAction.vendorType && user.pendingLeadAction.vendorId) {
            const { vendorType, vendorId } = user.pendingLeadAction;
            
            // Clear pending action
            user.pendingLeadAction = null;
            await user.save();

            // Process the lead details for the user
            await processLeadAndShowContact(ctx, user, vendorType, vendorId);
        }
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

        const cleanContact = contact.replace(/\D/g, '');

        // 1. Send native contact card (fully clickable to call natively in Telegram)
        const formattedContact = cleanContact.startsWith('91') && cleanContact.length > 10 ? `+${cleanContact}` : `+91${cleanContact}`;
        await ctx.replyWithContact(formattedContact, vendorName);

        // 2. Send follow-up WhatsApp inline link
        if (cleanContact) {
            const cleanNumberOnly = cleanContact.length > 10 && cleanContact.startsWith('91') ? cleanContact.slice(2) : cleanContact;
            const waLink = `https://wa.me/91${cleanNumberOnly}`;
            const bookNowLabel = await t(ctx.from.id, 'book_now_btn') || 'Book Now';
            
            await ctx.reply(`💬 Tap below to chat with *${vendorName}* on WhatsApp:`, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url(`💬 ${bookNowLabel} on WhatsApp`, waLink)]
                ])
            });
        }
    }
};
