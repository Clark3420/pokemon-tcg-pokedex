import { computed, onMounted, onUnmounted, ref } from "vue";

const BASE_POKEMON_COUNT = 1351;
const DISCOVERED_STORAGE_KEY = "pokemon-tcg-discovered";
const TOTAL_VIEWS_STORAGE_KEY = "pokemon-tcg-total-views";

function isValidPokemonId(id) {
    return Number.isSafeInteger(id) && id >= 1;
}

function readStoredIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(DISCOVERED_STORAGE_KEY) || "[]");

        if (!Array.isArray(parsed)) return [];

        return [
            ...new Set(
                parsed.filter((id) => Number.isInteger(id) && isValidPokemonId(id))
            ),
        ];
    } catch {
        return [];
    }
}

function readTotalViews(discoveredCount = 0) {
    try {
        const stored = localStorage.getItem(TOTAL_VIEWS_STORAGE_KEY);

        if (stored === null) {
            localStorage.setItem(TOTAL_VIEWS_STORAGE_KEY, String(discoveredCount));
            return discoveredCount;
        }

        const parsed = Number(stored);

        return Number.isSafeInteger(parsed) && parsed >= 0
            ? parsed
            : discoveredCount;
    } catch {
        return discoveredCount;
    }
}

function writeTotalViews(count) {
    try {
        localStorage.setItem(TOTAL_VIEWS_STORAGE_KEY, String(count));
        return true;
    } catch {
        return false;
    }
}

function writeStoredIds(ids) {
    try {
        localStorage.setItem(DISCOVERED_STORAGE_KEY, JSON.stringify(ids));
        return true;
    } catch {
        return false;
    }
}

export function useCollection() {
    const discoveredIds = ref(readStoredIds());
    const totalViews = ref(readTotalViews(discoveredIds.value.length));
    const activeCollectionCount = ref(0);

    const discoveredBasePokemon = computed(() =>
        discoveredIds.value.filter((id) => id <= BASE_POKEMON_COUNT).length
    );

    const completion = computed(() =>
        Math.min(100, (discoveredBasePokemon.value / BASE_POKEMON_COUNT) * 100)
    );

    const formattedCompletion = computed(() => {
        const value = completion.value;

        return `${value.toFixed(value > 0 && value < 1 ? 1 : 0)}%`;
    });

    function recordDiscoveredPokemon(id) {
        const pokemonId = Number(id);

        if (!Number.isInteger(pokemonId) || !isValidPokemonId(pokemonId)) {
            return;
        }

        totalViews.value += 1;
        writeTotalViews(totalViews.value);

        if (!discoveredIds.value.includes(pokemonId)) {
            discoveredIds.value = [...discoveredIds.value, pokemonId].sort(
                (a, b) => a - b
            );

            writeStoredIds(discoveredIds.value);
        }
    }

    function setActiveCollectionCount(count) {
        activeCollectionCount.value = Math.max(0, Number(count) || 0);
    }

    function handleStorageChange(event) {
        if (
            event.key === DISCOVERED_STORAGE_KEY ||
            event.key === TOTAL_VIEWS_STORAGE_KEY
        ) {
            discoveredIds.value = readStoredIds();
            totalViews.value = readTotalViews(discoveredIds.value.length);
        }
    }

    onMounted(() => {
        window.addEventListener("storage", handleStorageChange);
    });

    onUnmounted(() => {
        window.removeEventListener("storage", handleStorageChange);
    });

    return {
        discoveredIds,
        totalViews,
        discoveredBasePokemon,
        completion,
        formattedCompletion,
        activeCollectionCount,
        recordDiscoveredPokemon,
        setActiveCollectionCount,
    };
}
