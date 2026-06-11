const adminAuth = require('../utils/adminAuth');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Vendor = require('../models/Vendor');
const { runBroadcast } = require('../services/broadcastService');
const { syncFromSheets } = require('../services/sheetsService');

module.exports = (bot) => {
    // 📊 Detailed Bot Stats
    bot.command('stats', adminAuth, async (ctx) => {
        const totalUsers = await User.countDocuments();
        const premiumUsers = await User.countDocuments({ subscriptionStatus: 'premium' });
        const activeLast7Days = await User.countDocuments({
            lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        const totalHotels = await Hotel.countDocuments();
        const activeHotels = await Hotel.countDocuments({ active: true });

        const text = `📊 *Admin Statistics*\n\n` +
                     `👥 Total Users: ${totalUsers}\n` +
                     `💎 Premium Users: ${premiumUsers}\n` +
                     `📈 Active (7d): ${activeLast7Days}\n\n` +
                     `🏨 Total Hotels: ${totalHotels}\n` +
                     `✅ Active Listings: ${activeHotels}\n\n` +
                     `💻 *Tip*: Use the Admin Web Panel for bulk management.`;

        ctx.reply(text, { parse_mode: 'Markdown' });
    });

    // 📢 Global Broadcast to all Active users
    bot.command('broadcast', adminAuth, async (ctx) => {
        const message = ctx.message.text.split(' ').slice(1).join(' ');
        if (!message) return ctx.reply("Usage: /broadcast <message>");

        ctx.reply("🚀 Broadcast started to all active users...");
        runBroadcast(bot, ctx.from.id, message);
    });

    // CRUD Helper - Point to Admin Panel
    bot.command('addhotel', adminAuth, async (ctx) => {
        ctx.reply(`🏨 *Hotel Management*\n\nPlease use the Admin Web Panel for adding or editing hotels with pricing, tiers, and coordinates.\n\n🔗 ${process.env.WEBHOOK_URL || 'http://localhost:3000'}/admin/hotels`, { parse_mode: 'Markdown' });
    });

    bot.command('savehotel', adminAuth, async (ctx) => {
        const parts = ctx.message.text.split(' ').slice(1).join(' ').split('|').map(s => s.trim());
        if (parts.length < 4) return ctx.reply("❌ Invalid format. Use: Name | Price | Contact | Distance");

        await Hotel.create({
            name: parts[0],
            priceRange: parts[1],
            contact: parts[2],
            distance: parts[3],
            tier: 'free',
            tierRank: 1
        });
        ctx.reply("✅ Basic Hotel added! Use Admin Panel to upgrade tier/add coordinates.");
    });

    bot.command('addvendor', adminAuth, async (ctx) => {
        ctx.reply(`🍛 *Vendor Management*\n\nPlease use the Admin Web Panel for adding vendors.\n\n🔗 ${process.env.WEBHOOK_URL || 'http://localhost:3000'}/admin/vendors`, { parse_mode: 'Markdown' });
    });

    // 🔄 Sync from Google Sheets
    bot.command('sync', adminAuth, async (ctx) => {
        ctx.reply("🔄 Starting synchronization from Google Sheets...");
        const result = await syncFromSheets();
        if (result.success) {
            ctx.reply(`✅ Sync Completed: ${result.message}`);
        } else {
            ctx.reply(`❌ Sync Failed: ${result.message}\n\nCheck if your Sheet URLs are correct and "Published to Web" as CSV.`);
        }
    });
};
