const i18n = require('./i18n');
const User = require('../models/User');

/**
 * Translation helper to fetch strings based on the user's stored language in MongoDB.
 * @param {number} telegramId - The user's Telegram ID
 * @param {string} key - The translation key
 * @param {object} params - Optional parameters for translation
 */
const t = async (telegramId, key, params = {}) => {
  const user = await User.findOne({ telegramId });
  const locale = user ? user.language : 'en';
  return i18n.__({ phrase: key, locale }, params);
};

module.exports = { t };
