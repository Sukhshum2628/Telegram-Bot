const cron = require('node-cron');
const Hotel = require('../models/Hotel');
const User = require('../models/User');
const logger = require('./logger');
const { syncFromSheets } = require('../services/sheetsService');

/**
 * Daily job to check for expired listings and subscriptions.
 * Runs at 00:00 every day.
 */
const setupCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running Daily Expiry Check Job...');

    try {
      // 1. Expire Hotel/Vendor Listings
      const expiredListings = await Hotel.updateMany(
        { 
          tier: { $ne: 'free' }, 
          expiryDate: { $lt: new Date() } 
        },
        { 
          $set: { 
            tier: 'free', 
            tierRank: 1, 
            expiryDate: null 
          } 
        }
      );
      logger.info(`Expired ${expiredListings.modifiedCount} listings.`);

      // 2. Expire User Premium Subscriptions
      const expiredSubs = await User.updateMany(
        { 
          subscriptionStatus: 'premium', 
          subscriptionExpiry: { $lt: new Date() } 
        },
        { 
          $set: { 
            subscriptionStatus: 'free', 
            subscriptionExpiry: null 
          } 
        }
      );
      logger.info(`Expired ${expiredSubs.modifiedCount} premium subscriptions.`);

      // 3. Sync from Google Sheets
      await syncFromSheets();

    } catch (error) {
      logger.error('Error in Daily Expiry Job:', error.message);
    }
  });
  
  logger.info('Cron Jobs initialized.');
};

module.exports = { setupCronJobs };
