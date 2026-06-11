require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Telegraf } = require('telegraf');
const rateLimit = require('telegraf-ratelimit');
const connectDB = require('./db');
const botSession = require('./utils/session');
const logger = require('./utils/logger');
const { setupCronJobs } = require('./utils/cronJobs');

// Connect Database
connectDB();

// Initialize Cron Jobs
setupCronJobs();

// --- Express App Setup (Admin Panel) ---
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'machail-mata-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Admin Routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// Root redirect
app.get('/', (req, res) => res.redirect('/admin/login'));

// --- Telegraf Bot Setup ---
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Anti-Spam
const limitMiddleware = rateLimit({
    window: 2000,
    limit: 4, // 2 requests per second average
    onLimitExceeded: (ctx) => {
        if (ctx.callbackQuery) {
            // Ignore for simulated queries to avoid loops
            if (ctx.callbackQuery.id === 'fake') return;
            return ctx.answerCbQuery('⚠️ Please slow down!', { show_alert: true });
        }
        return ctx.reply('⚠️ Please slow down! Do not spam.');
    }
});

bot.use((ctx, next) => {
    // Skip rate limiting for simulated updates (persistent menu bridges)
    const isSimulated = (ctx.state && ctx.state.isSimulated) || 
                       (ctx.callbackQuery && ctx.callbackQuery.id === 'fake') ||
                       (ctx.update && ctx.update.callback_query && ctx.update.callback_query.id === 'fake');
    
    if (isSimulated) {
        return next();
    }
    
    return limitMiddleware(ctx, next);
});

bot.use(botSession);

// Handle simulated callback queries from persistent menu
bot.use(async (ctx, next) => {
    if (ctx.callbackQuery && ctx.callbackQuery.id === 'fake') {
        const originalAnswer = ctx.answerCbQuery.bind(ctx);
        ctx.answerCbQuery = async (text, options) => {
            try {
                return await originalAnswer(text, options);
            } catch (e) {
                // Ignore "query is too old and response timeout" for fake queries
                return true;
            }
        };
    }
    return next();
});

// Error Handling
bot.catch((err, ctx) => {
    logger.error(`Telegraf error for ${ctx.updateType}: ${err.message}`, err);
});

// Load Handlers
require('./handlers/startHandler')(bot);
require('./handlers/languageHandler')(bot);
require('./handlers/infoHandlers')(bot);
require('./handlers/dynamicHandlers')(bot);
require('./handlers/contactHandler')(bot);
require('./handlers/persistentMenuHandler')(bot);
require('./handlers/adminHandlers')(bot);
require('./handlers/subscriptionHandler')(bot);

// --- Server Launch Logic ---
const PORT = process.env.PORT || 3000;

const launchApp = async () => {
    // 1. Start Bot
    if (process.env.WEBHOOK_URL) {
        app.use(bot.webhookCallback('/webhook'));
        
        // Only trigger setWebhook from the primary PM2 instance to avoid conflicts/rate-limits
        if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
            await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
            logger.info(`🚀 Webhook registered with Telegram: ${process.env.WEBHOOK_URL}/webhook`);
        } else {
            logger.info(`🚀 Webhook listener active (Worker instance ${process.env.NODE_APP_INSTANCE})`);
        }
    } else {
        bot.launch();
        logger.info('🚀 Bot running via Long Polling');
    }

    // 2. Start Express Server
    app.listen(PORT, () => {
        logger.info(`💻 Admin Panel available at http://localhost:${PORT}/admin`);
    });
};

launchApp().catch((err) => {
    logger.error('Failed to launch application:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
