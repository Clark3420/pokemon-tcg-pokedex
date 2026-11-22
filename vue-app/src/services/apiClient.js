const API_BASE_URL = "https://pokeapi.co/api/v2";
const REQUEST_TIMEOUT = 10000;
const CACHE_PREFIX = "pokemon-tcg-pokedex:api:v2:";
const MEMORY_CACHE = new Map();
const STALE_CACHE = new Map();
const IN_FLIGHT = new Map();
const MAX_MEMORY_ENTRIES = 180;
const MAX_PERSISTED_ENTRIES = 80;
const MAX_PERSISTED_BYTES = 2_000_000;
const DEFAULT_TTL = 24 * 60 * 60 * 1000;
const LIST_TTL = 6 * 60 * 60 * 1000;
const CACHE_VERSION = 1;
let cacheGeneration = 0;

function getStorage() {
    try {
        return typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
        return null;
    }
}

function cacheTtl(endpoint) {
    return /\/(pokemon|pokemon-form|pokemon-species|type|generation|region|evolution-chain)(\?|$)/.test(endpoint)
        ? LIST_TTL
        : DEFAULT_TTL;
}

function cacheKey(url) {
    return `${CACHE_PREFIX}${url}`;
}

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

function projectPokemonResponse(data) {
    if (!data || typeof data !== "object" || !data.sprites || !data.stats) {
        return data;
    }

    return {
        id: data.id,
        name: data.name,
        height: data.height,
        weight: data.weight,
        types: data.types,
        stats: data.stats,
        abilities: data.abilities,
        species: data.species,
        sprites: {
            front_default: data.sprites.front_default,
            other: {
                "official-artwork": {
                    front_default: data.sprites.other?.["official-artwork"]?.front_default || null,
                },
            },
        },
    };
}

function readCache(url) {
    const now = Date.now();
    const memoryEntry = MEMORY_CACHE.get(url);

    if (memoryEntry) {
        if (memoryEntry.expiresAt > now) {
            rememberMemory(url, memoryEntry);
            return cloneData(memoryEntry.data);
        }

        STALE_CACHE.set(url, memoryEntry);
        MEMORY_CACHE.delete(url);
    }

    const storage = getStorage();

    if (!storage) return null;

    try {
        const raw = storage.getItem(cacheKey(url));

        if (!raw) return null;

        const entry = JSON.parse(raw);

        if (
            entry?.version !== CACHE_VERSION ||
            !Number.isFinite(entry.expiresAt) ||
            !Object.prototype.hasOwnProperty.call(entry, "data")
        ) {
            storage.removeItem(cacheKey(url));
            return null;
        }

        if (entry.expiresAt <= now) {
            STALE_CACHE.set(url, entry);
            return null;
        }

        rememberMemory(url, entry);
        return cloneData(entry.data);
    } catch {
        return null;
    }
}

function rememberMemory(url, entry) {
    MEMORY_CACHE.delete(url);
    MEMORY_CACHE.set(url, entry);

    while (MEMORY_CACHE.size > MAX_MEMORY_ENTRIES) {
        const oldestKey = MEMORY_CACHE.keys().next().value;
        MEMORY_CACHE.delete(oldestKey);
    }
}

function trimPersistedCache(requiredBytes = 0) {
    const storage = getStorage();

    if (!storage) return;

    try {
        const entries = [];

        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);

            if (!key?.startsWith(CACHE_PREFIX)) continue;

            try {
                const raw = storage.getItem(key) || "";
                const value = JSON.parse(raw);

                entries.push({
                    key,
                    expiresAt: Number(value?.expiresAt) || 0,
                    bytes: raw.length,
                });
            } catch {
                storage.removeItem(key);
            }
        }

        entries.sort((a, b) => a.expiresAt - b.expiresAt);

        let totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);

        while (
            entries.length > MAX_PERSISTED_ENTRIES ||
            totalBytes + requiredBytes > MAX_PERSISTED_BYTES
        ) {
            const oldest = entries.shift();

            if (!oldest) break;

            storage.removeItem(oldest.key);
            totalBytes -= oldest.bytes;
        }
    } catch {
    }
}

function writeCache(url, data, ttl) {
    const persistedData = /\/pokemon\/\d+\/?$/.test(url)
        ? projectPokemonResponse(data)
        : data;

    const entry = {
        version: CACHE_VERSION,
        expiresAt: Date.now() + ttl,
        data: persistedData,
    };

    rememberMemory(url, entry);
    STALE_CACHE.delete(url);

    const storage = getStorage();

    if (!storage) return;

    try {
        const serialized = JSON.stringify(entry);

        trimPersistedCache(serialized.length);
        storage.setItem(cacheKey(url), serialized);
    } catch {
    }
}

export async function getJSON(endpoint, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const url = `${API_BASE_URL}${endpoint}`;
    const shouldCache = method === "GET" && !options.signal;

    if (shouldCache) {
        const cached = readCache(url);

        if (cached !== null) return cached;

        if (IN_FLIGHT.has(url)) {
            return cloneData(await IN_FLIGHT.get(url));
        }
    }

    const requestGeneration = cacheGeneration;

    const requestPromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        const externalSignal = options.signal;

        const abortFromExternalSignal = () =>
            controller.abort(externalSignal?.reason);

        if (externalSignal?.aborted) {
            abortFromExternalSignal();
        } else {
            externalSignal?.addEventListener(
                "abort",
                abortFromExternalSignal,
                { once: true }
            );
        }

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    ...options.headers,
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    const error = new Error("The requested Pokémon or resource was not found.");
                    error.status = response.status;
                    throw error;
                }

                if (response.status === 429) {
                    const error = new Error("Too many requests. Please wait and try again.");
                    error.status = response.status;
                    throw error;
                }

                const error = new Error(
                    `API request failed with status ${response.status}.`
                );

                error.status = response.status;
                throw error;
            }

            const data = await response.json();

            if (shouldCache && requestGeneration === cacheGeneration) {
                writeCache(url, data, cacheTtl(endpoint));
            }

            return data;
        } catch (error) {
            const transientFailure =
                error.name === "AbortError" ||
                error instanceof TypeError ||
                /^API request failed with status 5\d\d\.$/.test(error.message || "");

            if (shouldCache && transientFailure) {
                const staleEntry = STALE_CACHE.get(url);

                if (staleEntry?.data !== undefined) {
                    console.warn(
                        `Using cached data while PokeAPI is unavailable: ${endpoint}`
                    );

                    return cloneData(staleEntry.data);
                }
            }

            if (error.name === "AbortError") {
                throw new Error(
                    "The request timed out. Please check your connection and try again."
                );
            }

            if (error instanceof TypeError) {
                throw new Error(
                    "Unable to connect to PokeAPI. Check your internet connection."
                );
            }

            throw error;
        } finally {
            clearTimeout(timeoutId);

            externalSignal?.removeEventListener(
                "abort",
                abortFromExternalSignal
            );
        }
    })();

    if (shouldCache) IN_FLIGHT.set(url, requestPromise);

    try {
        const data = await requestPromise;
        return cloneData(data);
    } finally {
        if (shouldCache && IN_FLIGHT.get(url) === requestPromise) {
            IN_FLIGHT.delete(url);
        }
    }
}

export function clearApiCache() {
    cacheGeneration += 1;

    MEMORY_CACHE.clear();
    STALE_CACHE.clear();
    IN_FLIGHT.clear();

    const storage = getStorage();

    if (!storage) return;

    try {
        const keysToRemove = [];

        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);

            if (key?.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => storage.removeItem(key));
    } catch {
    }
}
