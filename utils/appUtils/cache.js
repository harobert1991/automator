import NodeCache from 'node-cache';

class CacheService {
    constructor(ttlSeconds = 3600) {
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2
        });
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value) {
        return this.cache.set(key, value);
    }

    delete(key) {
        return this.cache.del(key);
    }
}

export default new CacheService(); 