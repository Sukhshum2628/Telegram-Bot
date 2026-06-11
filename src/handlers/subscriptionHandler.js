const { Markup } = require('telegraf');
const User = require('../models/User');
const SubscriptionLog = require('../models/SubscriptionLog');
const { getReplyMenu } = require('../utils/keyboards');
const { t } = require('../utils/t');
const { smartReply } = require('../utils/ui');

module.exports = (bot) => {
  // 💎 Premium Menu
  bot.action('premium_menu', async (ctx) => {
    await ctx.answerCbQuery();
    
    const premiumPrice = process.env.PREMIUM_PRICE || 99;
    const upiId = process.env.UPI_ID || 'yourupi@bank';
    
    const text = await t(ctx.from.id, 'premium_info', [premiumPrice]) + '\n\n' +
                 await t(ctx.from.id, 'upi_prompt', [upiId]);
    
    await smartReply(ctx, text);
  });

  // Handle UTR / Payment Receipts (Simple text matching for now)
  // In a real bot, we'd use a state machine/scene for this.
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    // Basic regex for UTR (usually 12 digits)
    if (/^\d{12}$/.test(text.trim())) {
      await ctx.reply(await t(ctx.from.id, 'utr_received'));
      // Notify Admin (optional but good)
      const adminIds = (process.env.ADMIN_USER_IDS || '').split(',');
      for (const adminId of adminIds) {
        if (adminId) {
          bot.telegram.sendMessage(adminId, 
            `💰 *New Payment Alert*\nUser: ${ctx.from.first_name} (@${ctx.from.username})\nID: \`${ctx.from.id}\`\nUTR: \`${text}\`\n\nRun /activatepremium ${ctx.from.id} to confirm.`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }
      }
      return;
    }
    return next();
  });

  // 🛠 Admin Command: Activate Premium
  bot.command('activatepremium', async (ctx) => {
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',');
    if (!adminIds.includes(ctx.from.id.toString())) return;

    const userId = ctx.message.text.split(' ')[1];
    if (!userId) return ctx.reply('Usage: /activatepremium <telegram_id>');

    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30); // 30 days

      const user = await User.findOneAndUpdate(
        { telegramId: userId },
        { 
          subscriptionStatus: 'premium',
          subscriptionExpiry: expiry,
          subscriptionActivatedBy: ctx.from.id.toString()
        },
        { returnDocument: 'after' }
      );

      if (!user) return ctx.reply('User not found.');

      // Log subscription
      await SubscriptionLog.create({
        userId: userId,
        activatedBy: ctx.from.id.toString(),
        expiryDate: expiry,
        amountPaid: process.env.PREMIUM_PRICE || 99
      });

      ctx.reply(`✅ Activated premium for ${user.username || userId} until ${expiry.toDateString()}`);
      
      // Notify the pilgrim
      bot.telegram.sendMessage(userId, 
        `💎 *Congratulations!*\n\nYour Premium Membership has been activated.\nExpiry: ${expiry.toDateString()}\n\nThank you for supporting Machail Mata Yatra!`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});

    } catch (error) {
      ctx.reply(`Error: ${error.message}`);
    }
  });

  // 🛠 Admin Command: Premium Broadcast
  bot.command('broadcastpremium', async (ctx) => {
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',');
    if (!adminIds.includes(ctx.from.id.toString())) return;

    const message = ctx.message.text.replace('/broadcastpremium', '').trim();
    if (!message) return ctx.reply('Usage: /broadcastpremium <message>');

    const premiumUsers = await User.find({ 
      subscriptionStatus: 'premium',
      subscriptionExpiry: { $gt: new Date() }
    });

    ctx.reply(`📢 Sending broadcast to ${premiumUsers.length} premium users...`);

    for (const u of premiumUsers) {
      bot.telegram.sendMessage(u.telegramId, `💎 *PREMIUM ALERT*\n\n${message}`, { parse_mode: 'Markdown' })
        .catch(() => {});
    }
  });
};
