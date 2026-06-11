const { getReplyMenu } = require('./keyboards');

/**
 * Sends or edits a message depending on the context type.
 * Useful for reusing logic between callbacks and text messages.
 */
const smartReply = async (ctx, text, extra = {}) => {
    // If extra is a Markup instance, extract its reply_markup
    const options = extra && extra.reply_markup ? { ...extra } : { reply_markup: extra };
    
    try {
        if (ctx.callbackQuery && ctx.callbackQuery.id !== 'fake') {
            // It's a real callback query, try to edit the message
            // Note: editMessageText ONLY supports inline keyboards
            return await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...options
            });
        } else {
            // It's a new message
            const replyMenu = await getReplyMenu(ctx);
            
            // CRITICAL: A message can only have ONE type of reply_markup.
            // If an inline keyboard is provided in options, we use it.
            // If NO inline keyboard is provided, we attach the persistent reply menu.
            const finalOptions = {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...options
            };

            if (!finalOptions.reply_markup || (!finalOptions.reply_markup.inline_keyboard && !finalOptions.reply_markup.keyboard)) {
                finalOptions.reply_markup = replyMenu.reply_markup;
            } else if (finalOptions.reply_markup.inline_keyboard && !finalOptions.reply_markup.keyboard) {
                // If it has inline but no reply, we don't attach the reply menu because they conflict.
                // Telegram will keep the PREVIOUS reply menu visible anyway.
            }

            return await ctx.reply(text, finalOptions);
        }
    } catch (error) {
        if (error.message.includes('message is not modified')) return;
        
        const replyMenu = await getReplyMenu(ctx);
        const finalOptions = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...options
        };
        
        if (!finalOptions.reply_markup) {
            finalOptions.reply_markup = replyMenu.reply_markup;
        }

        return await ctx.reply(text, finalOptions);
    }
};

module.exports = { smartReply };
