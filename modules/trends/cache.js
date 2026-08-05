const cache = new Map();

export function getCache(key) {

    const item = cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expire) {

        cache.delete(key);

        return null;

    }

    return item.value;

}

export function setCache(key, value, ttl = 1000 * 60 * 30) {

    cache.set(key, {
        value,
        expire: Date.now() + ttl
    });

}

export function clearCache(key = null) {

    if (key) {

        cache.delete(key);

        return;

    }

    cache.clear();

}
