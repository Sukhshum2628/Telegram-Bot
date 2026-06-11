const axios = require('axios');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * WMO Weather interpretation codes
 */
const weatherCodes = {
    0: { desc: 'Clear sky', emoji: '☀️' },
    1: { desc: 'Mainly clear', emoji: '🌤' },
    2: { desc: 'Partly cloudy', emoji: '⛅' },
    3: { desc: 'Overcast', emoji: '☁️' },
    45: { desc: 'Fog', emoji: '🌫' },
    48: { desc: 'Depositing rime fog', emoji: '🌫' },
    51: { desc: 'Light drizzle', emoji: '🌦' },
    53: { desc: 'Moderate drizzle', emoji: '🌦' },
    55: { desc: 'Dense drizzle', emoji: '🌦' },
    61: { desc: 'Slight rain', emoji: '🌧' },
    63: { desc: 'Moderate rain', emoji: '🌧' },
    65: { desc: 'Heavy rain', emoji: '🌧' },
    71: { desc: 'Slight snowfall', emoji: '❄️' },
    73: { desc: 'Moderate snowfall', emoji: '❄️' },
    75: { desc: 'Heavy snowfall', emoji: '❄️' },
    77: { desc: 'Snow grains', emoji: '❄️' },
    80: { desc: 'Slight rain showers', emoji: '🌦' },
    81: { desc: 'Moderate rain showers', emoji: '🌦' },
    82: { desc: 'Violent rain showers', emoji: '⛈' },
    85: { desc: 'Slight snow showers', emoji: '🌨' },
    86: { desc: 'Heavy snow showers', emoji: '🌨' },
    95: { desc: 'Thunderstorm', emoji: '⚡' },
    96: { desc: 'Thunderstorm with slight hail', emoji: '⛈' },
    99: { desc: 'Thunderstorm with heavy hail', emoji: '⛈' }
};

const getWeather = async (ctx) => {
    const cached = cache.get('weather_info');
    if (cached) {
        return cached;
    }

    try {
        const url = 'https://wttr.in/Machail?format=j1';
        const response = await axios.get(url, { timeout: 4000 }); // Fast 4s timeout
        const data = response.data;
        
        const current = data.current_condition[0];
        const forecast = data.weather[0];
        
        const temp = parseInt(current.temp_C);
        const apparentTemp = parseInt(current.FeelsLikeC);
        const minTemp = parseInt(forecast.mintempC);
        const maxTemp = parseInt(forecast.maxtempC);
        const humidity = current.humidity;
        const windSpeed = current.windspeedKmph;
        const desc = current.weatherDesc[0].value;
        const weatherCode = parseInt(current.weatherCode);

        let emoji = '🌤';
        if (weatherCode === 113) emoji = '☀️';
        else if (weatherCode === 116) emoji = '🌤';
        else if (weatherCode === 119) emoji = '⛅';
        else if (weatherCode === 122) emoji = '☁️';
        else if ([248, 260].includes(weatherCode)) emoji = '🌫';
        else if ([263, 266, 293, 296, 302, 305, 308, 353, 356, 359].includes(weatherCode)) emoji = '🌧';
        else if ([227, 230, 323, 326, 329, 332, 335, 338, 368, 371].includes(weatherCode)) emoji = '❄️';
        else if ([386, 389, 392, 395].includes(weatherCode)) emoji = '⛈';

        let advisory = "✅ *Status*: Conditions are favorable for the Yatra.";
        let founderAdvice = "";

        if (emoji === '🌧') {
            advisory = "⚠️ *Caution*: Rain reported. Trails will be slippery.";
            founderAdvice = "💡 *Founder's Tip*: We recommend staying in a *Hotel* tonight instead of a Tent for better insulation.";
        } else if (emoji === '⛈') {
            advisory = "🚨 *DANGER*: Thunderstorms detected. Seek shelter. DO NOT trek.";
            founderAdvice = "💡 *Founder's Tip*: Stay at the base camp. Safety is priority #1.";
        } else if (emoji === '❄️') {
            advisory = "❄️ *Snow Alert*: Snowfall detected. Path is extremely cold.";
            founderAdvice = "💡 *Founder's Tip*: Use heavy winter gear. Consider a *Pony/Taxi* if the trail is blocked.";
        } else if (temp < 5 || minTemp < 0) {
            advisory = "⚠️ *Freezing Cold*: Sub-zero temperatures detected at night.";
            founderAdvice = "💡 *Founder's Tip*: Carry extra blankets. Our *Tents* section lists stays with heating if available.";
        } else if (weatherCode === 113 || weatherCode === 116) {
            founderAdvice = "💡 *Founder's Tip*: Perfect weather! Start early to catch the best views.";
        }

        const result = `🏔 *${ctx.i18n.__('weather_title') || 'Weather Forecast'} - Machail*\n\n` +
            `${emoji} *Current*: ${temp}°C\n` +
            `🌡 *Feels Like*: ${apparentTemp}°C\n` +
            `📉 *Today's Range*: ${minTemp}°C to ${maxTemp}°C\n` +
            `☁️ *Sky*: ${desc}\n` +
            `💦 *Humidity*: ${humidity}%\n` +
            `💨 *Wind*: ${windSpeed} km/h\n\n` +
            `${advisory}\n\n` +
            `${founderAdvice}\n\n` +
            `🕒 _Last updated: ${new Date().toLocaleTimeString()} (wttr.in)_`;

        // Cache successful response for 10 minutes
        cache.set('weather_info', result, 600);
        return result;

    } catch (wttrError) {
        logger.warn('wttr.in Weather failed, falling back to Open-Meteo:', wttrError.message);
        
        try {
            const lat = 33.3541;
            const lon = 76.2979;
            const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
            
            const response = await axios.get(fallbackUrl, { timeout: 4000 });
            const current = response.data.current;
            const daily = response.data.daily;
            
            const temp = Math.round(current.temperature_2m);
            const apparentTemp = Math.round(current.apparent_temperature);
            const minTemp = Math.round(daily.temperature_2m_min[0]);
            const maxTemp = Math.round(daily.temperature_2m_max[0]);
            
            const resultFallback = `🏔 *${ctx.i18n.__('weather_title') || 'Weather Forecast'} - Machail*\n\n` +
                `🌤 *Current*: ${temp}°C\n` +
                `🌡 *Feels Like*: ${apparentTemp}°C\n` +
                `📉 *Today's Range*: ${minTemp}°C to ${maxTemp}°C\n` +
                `💦 *Humidity*: ${current.relative_humidity_2m}%\n` +
                `💨 *Wind*: ${current.wind_speed_10m} km/h\n\n` +
                `✅ *Status*: Conditions are favorable for the Yatra. Carry warm clothes.\n\n` +
                `💡 *Founder's Tip*: Carry extra layers of blankets at night.\n\n` +
                `🕒 _Last updated: ${new Date().toLocaleTimeString()} (Open-Meteo Fallback)_`;

            // Cache fallback response for 10 minutes too
            cache.set('weather_info', resultFallback, 600);
            return resultFallback;
        } catch (meteoError) {
            logger.error('All weather providers failed:', meteoError.message);
            return `🌤 *${ctx.i18n.__('weather_title') || 'Weather Forecast'}*\n\n` +
                `⚠️ Weather service temporarily busy.\n` +
                `🏔 Region: Machail (Paddar)\n\n` +
                `💡 Tip: Himalayan weather changes fast. Always carry warm clothes and rain cover.`;
        }
    }
};

module.exports = { getWeather };
