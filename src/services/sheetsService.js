const axios = require('axios');
const logger = require('../utils/logger');
const Hotel = require('../models/Hotel');
const Vendor = require('../models/Vendor');
const Taxi = require('../models/Taxi');
const Tent = require('../models/Tent');
const EmergencyContact = require('../models/EmergencyContact');
const Parking = require('../models/Parking');
const Place = require('../models/Place');
const cache = require('../utils/cache');

/**
 * Robust CSV parser that handles quotes and commas inside cells
 */
function parseCSV(data) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    // Normalize line endings
    data = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const nextChar = data[i+1];
        
        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }
    // Handle last row if file doesn't end with newline
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }
    
    if (rows.length === 0) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
        return headers.reduce((obj, header, index) => {
            if (header) obj[header.trim()] = row[index] || '';
            return obj;
        }, {});
    });
}

/**
 * Service to sync data from Google Sheets (published as CSV) to MongoDB
 */
const syncFromSheets = async () => {
    try {
        logger.info('🔄 Starting Google Sheets synchronization...');
        const syncErrors = [];

        const hotelSheetUrl = process.env.SHEET_URL_HOTELS;
        const vendorSheetUrl = process.env.SHEET_URL_VENDORS;
        const taxiSheetUrl = process.env.SHEET_URL_TAXIS;
        const tentSheetUrl = process.env.SHEET_URL_TENTS;
        const emergencySheetUrl = process.env.SHEET_URL_EMERGENCY;
        const parkingSheetUrl = process.env.SHEET_URL_PARKING;
        const placesSheetUrl = process.env.SHEET_URL_PLACES;

        if (hotelSheetUrl) {
            try { await syncHotels(hotelSheetUrl); }
            catch (err) { logger.error('Hotels Sync Failed:', err.message); syncErrors.push(`Hotels (${err.message})`); }
        }
        if (vendorSheetUrl) {
            try { await syncVendors(vendorSheetUrl); }
            catch (err) { logger.error('Vendors Sync Failed:', err.message); syncErrors.push(`Vendors (${err.message})`); }
        }
        if (taxiSheetUrl) {
            try { await syncTaxis(taxiSheetUrl); }
            catch (err) { logger.error('Taxis Sync Failed:', err.message); syncErrors.push(`Taxis (${err.message})`); }
        }
        if (tentSheetUrl) {
            try { await syncTents(tentSheetUrl); }
            catch (err) { logger.error('Tents Sync Failed:', err.message); syncErrors.push(`Tents (${err.message})`); }
        }
        if (emergencySheetUrl) {
            try { await syncEmergencyContacts(emergencySheetUrl); }
            catch (err) { logger.error('Emergency Sync Failed:', err.message); syncErrors.push(`Emergency (${err.message})`); }
        }
        if (parkingSheetUrl) {
            try { await syncParking(parkingSheetUrl); }
            catch (err) { logger.error('Parking Sync Failed:', err.message); syncErrors.push(`Parking (${err.message})`); }
        }
        if (placesSheetUrl && !placesSheetUrl.includes('YOUR_TOURIST_PLACES_GID_HERE')) {
            try { await syncPlaces(placesSheetUrl); }
            catch (err) { logger.error('Places Sync Failed:', err.message); syncErrors.push(`Places (${err.message})`); }
        } else if (placesSheetUrl) {
            logger.warn('Skipping Places Sync: Placeholder GID found in SHEET_URL_PLACES.');
        }

        // Clear high-performance in-memory cache to load new data instantly
        cache.clear();

        if (syncErrors.length > 0) {
            logger.warn(`⚠️ Sync finished with some failures: ${syncErrors.join(', ')}`);
            return { 
                success: false, 
                message: `Sync partially failed. Errors in: ${syncErrors.join(', ')}` 
            };
        }

        logger.info('✅ Synchronization completed successfully.');
        return { success: true, message: 'All data synced successfully' };
    } catch (error) {
        logger.error('❌ Sync failed:', error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Helper to extract coordinates from Google Maps URLs
 */
const getCoordinatesFromUrl = async (url) => {
    if (!url || typeof url !== 'string') return { lat: 0, lng: 0 };
    
    let targetUrl = url.trim();
    
    // Follow redirect if it's a short link
    if (targetUrl.includes('maps.app.goo.gl') || targetUrl.includes('goo.gl/maps')) {
        try {
            const res = await axios.head(targetUrl, { maxRedirects: 5, validateStatus: null });
            if (res.headers.location) {
                targetUrl = res.headers.location;
            } else {
                // If HEAD fails or doesn't have location, try GET
                const getRes = await axios.get(targetUrl, { maxRedirects: 5, validateStatus: null });
                if (getRes.request && getRes.request.res && getRes.request.res.responseUrl) {
                    targetUrl = getRes.request.res.responseUrl;
                }
            }
        } catch (err) {
            logger.warn(`Failed to resolve short URL ${url}: ${err.message}`);
        }
    }
    
    // Attempt 1: Extract from path or query params like @33.3541,76.2979
    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }
    
    // Attempt 2: Extract from query parameters query= or q=
    const queryMatch = targetUrl.match(/[?&](?:query|q)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
        return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
    }
    
    // Attempt 3: Extract from place path place/33.3541,76.2979 or place/33.3541+76.2979
    const placeMatch = targetUrl.match(/place\/(-?\d+\.\d+)[\+,](-?\d+\.\d+)/);
    if (placeMatch) {
        return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }

    // Attempt 4: Match generic comma-separated numbers in URL that look like coordinates
    const genericMatch = targetUrl.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (genericMatch) {
        const lat = parseFloat(genericMatch[1]);
        const lng = parseFloat(genericMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
        }
    }
    
    return { lat: 0, lng: 0 };
};

const syncHotels = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Hotel.deleteMany({});
    
    const hotels = [];
    for (const r of records) {
        const rawMapsLink = r.mapsLink || r['Google Maps location'] || r['Google Maps Location'] || (r.Location && r.Location.includes('http') ? r.Location : '');
        const priceRange = r.priceRange || r.Price || '';
        const distance = r.distance || (r.Location && !r.Location.includes('http') ? r.Location : '') || '';
        const contact = r.contact || r['Phone Numbers'] || r['Phone Number'] || '';

        let lat = parseFloat(r.lat) || 0;
        let lng = parseFloat(r.lng) || 0;

        if ((!lat || !lng) && rawMapsLink) {
            const coords = await getCoordinatesFromUrl(rawMapsLink);
            lat = coords.lat;
            lng = coords.lng;
        }

        hotels.push({
            name: r.name || r.Name,
            priceRange,
            contact,
            distance,
            mapsLink: rawMapsLink,
            photo: r.photo || '',
            tier: r.tier || 'free',
            tierRank: parseInt(r.tierRank) || 1,
            lat,
            lng,
            active: r.active === 'TRUE' || r.active === 'true' || r.active === '1' || r.active === undefined,
            isVerified: r.isVerified === 'TRUE' || r.isVerified === 'true' || r.isVerified === '1' || r.Verified === 'TRUE',
            isSponsored: r.isSponsored === 'TRUE' || r.isSponsored === 'true' || r.isSponsored === '1' || r.Sponsored === 'TRUE',
            commissionRate: parseFloat(r.commissionRate) || parseFloat(r.Commission) || 0
        });
    }

    await Hotel.insertMany(hotels);
    logger.info(`🏨 Synced ${hotels.length} hotels.`);
};

const syncVendors = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Vendor.deleteMany({});
    
    const vendors = records.map(r => ({
        name: r.name || r.Name,
        items: r.items || r.Vendor || '',
        contact: r.contact || r['Phone Number'] || '',
        locationLink: r.locationLink || '',
        priceInfo: r.priceInfo || '',
        isActive: r.isActive === 'TRUE' || r.isActive === 'true' || r.isActive === '1' || r.isActive === undefined,
        isVerified: r.isVerified === 'TRUE' || r.isVerified === 'true' || r.isVerified === '1' || r.Verified === 'TRUE',
        isSponsored: r.isSponsored === 'TRUE' || r.isSponsored === 'true' || r.isSponsored === '1' || r.Sponsored === 'TRUE',
        commissionRate: parseFloat(r.commissionRate) || parseFloat(r.Commission) || 0
    }));

    await Vendor.insertMany(vendors);
    logger.info(`🍛 Synced ${vendors.length} vendors.`);
};

const syncTaxis = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Taxi.deleteMany({});
    
    const taxis = records.map(r => ({
        driverName: r.driverName || r.Name,
        vehicleNumber: r.vehicleNumber || '',
        vehicleType: r.vehicleType || '',
        contact: r.contact || r['Phone number'] || r['Phone Number'] || '',
        route: r.route || r.Route || '',
        priceInfo: r.priceInfo || '',
        isActive: r.isActive === 'TRUE' || r.isActive === 'true' || r.isActive === '1' || r.isActive === undefined,
        isVerified: r.isVerified === 'TRUE' || r.isVerified === 'true' || r.isVerified === '1' || r.Verified === 'TRUE',
        isSponsored: r.isSponsored === 'TRUE' || r.isSponsored === 'true' || r.isSponsored === '1' || r.Sponsored === 'TRUE',
        commissionRate: parseFloat(r.commissionRate) || parseFloat(r.Commission) || 0
    }));

    await Taxi.insertMany(taxis);
    logger.info(`🚕 Synced ${taxis.length} taxi drivers.`);
};

const syncTents = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Tent.deleteMany({});
    
    const tents = records.map(r => ({
        name: r.name || r.Name,
        location: r.location || r.Loaction || '',
        priceRange: r.priceRange || '',
        contact: r.contact || r['Phone Number'] || '',
        capacity: r.capacity || '',
        isActive: r.isActive === 'TRUE' || r.isActive === 'true' || r.isActive === '1' || r.isActive === undefined,
        isVerified: r.isVerified === 'TRUE' || r.isVerified === 'true' || r.isVerified === '1' || r.Verified === 'TRUE',
        isSponsored: r.isSponsored === 'TRUE' || r.isSponsored === 'true' || r.isSponsored === '1' || r.Sponsored === 'TRUE',
        commissionRate: parseFloat(r.commissionRate) || parseFloat(r.Commission) || 0
    }));

    await Tent.insertMany(tents);
    logger.info(`⛺ Synced ${tents.length} tent listings.`);
};

const syncEmergencyContacts = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await EmergencyContact.deleteMany({});
    
    const contacts = records.map(r => ({
        title: r.title || r.Name || '',
        number: r.number || r['Phone Number'] || '',
        icon: r.icon || '📞',
        order: parseInt(r.order) || 0
    }));

    await EmergencyContact.insertMany(contacts);
    logger.info(`☎️ Synced ${contacts.length} emergency contacts.`);
};

const syncParking = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Parking.deleteMany({});
    
    const listings = records.map(r => ({
        name: r.name || r.Name || '',
        location: r.location || r.Location || '',
        contact: r.contact || r.Contact || r['Phone Number'] || '',
        capacity: r.capacity || r.Capacity || '',
        priceInfo: r.priceInfo || r['Price Info'] || r.Price || '',
        isActive: r.isActive === 'TRUE' || r.isActive === 'true' || r.isActive === '1' || 
                  r.IsActive === 'TRUE' || r.IsActive === 'true' || r.IsActive === '1' ||
                  (r.isActive === undefined && r.IsActive === undefined),
        isVerified: r.isVerified === 'TRUE' || r.isVerified === 'true' || r.isVerified === '1' || r.Verified === 'TRUE',
        isSponsored: r.isSponsored === 'TRUE' || r.isSponsored === 'true' || r.isSponsored === '1' || r.Sponsored === 'TRUE',
        commissionRate: parseFloat(r.commissionRate) || parseFloat(r.Commission) || 0
    }));

    await Parking.insertMany(listings);
    logger.info(`🚗 Synced ${listings.length} parking locations.`);
};

const syncPlaces = async (url) => {
    const response = await axios.get(url);
    const records = parseCSV(response.data);

    await Place.deleteMany({});
    
    const places = [];
    for (const r of records) {
        const rawMapsLink = r.mapsLink || r['Google Maps location'] || r['Google Maps Location'] || (r.Location && r.Location.includes('http') ? r.Location : '');
        const description = r.description || r.Description || '';
        
        let lat = parseFloat(r.lat) || 0;
        let lng = parseFloat(r.lng) || 0;

        if ((!lat || !lng) && rawMapsLink) {
            const coords = await getCoordinatesFromUrl(rawMapsLink);
            lat = coords.lat;
            lng = coords.lng;
        }

        places.push({
            name: r.name || r.Name || '',
            description,
            mapsLink: rawMapsLink,
            lat,
            lng,
            isActive: r.isActive === 'TRUE' || r.isActive === 'true' || r.isActive === '1' || r.isActive === undefined
        });
    }

    await Place.insertMany(places);
    logger.info(`⛳ Synced ${places.length} tourist places in Paddar.`);
};

module.exports = { syncFromSheets };
