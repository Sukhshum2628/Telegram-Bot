const cacheStore = new Map();

/**
 * Get a value from the in-memory cache
 */
const get = (key) => {
    const cached = cacheStore.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
        cacheStore.delete(key);
        return null;
    }
    return cached.value;
};

/**
 * Set a value in the in-memory cache with a TTL
 */
const set = (key, value, ttlSeconds = 300) => {
    cacheStore.set(key, {
        value,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
};

/**
 * Clear the entire cache (useful during sheets sync)
 */
const clear = () => {
    cacheStore.clear();
};

module.exports = { get, set, clear };
