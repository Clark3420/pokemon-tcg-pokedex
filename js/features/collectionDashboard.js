const BASE_POKEMON_COUNT = 1351;
const DISCOVERED_STORAGE_KEY = "pokemon-tcg-discovered";

function isValidPokemonId(id) {
    return Number.isSafeInteger(id) && id >= 1;
}

function readStoredIds(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed)) return [];
        return [...new Set(parsed.filter((id) => Number.isInteger(id) && isValidPokemonId(id)))];
    } catch {
        return [];
    }
}

function writeStoredIds(key, ids) {
    try {
        localStorage.setItem(key, JSON.stringify(ids));
        return true;
    } catch {
        return false;
    }
}

export function updateCollectionDashboard() {
    const discovered = readStoredIds(DISCOVERED_STORAGE_KEY);
    const discoveredBasePokemon = discovered.filter((id) => id <= BASE_POKEMON_COUNT).length;

    const discoveredElement = document.getElementById("dashboard-discovered");
    const discoveredProgressElement = document.getElementById("dashboard-discovered-progress");
    const completionElement = document.getElementById("dashboard-completion");
    const progressFillElement = document.getElementById("dashboard-progress-fill");

    const completion = Math.min(100, (discoveredBasePokemon / BASE_POKEMON_COUNT) * 100);

    if (discoveredElement) discoveredElement.textContent = discovered.length.toLocaleString();
    if (discoveredProgressElement) discoveredProgressElement.textContent = discoveredBasePokemon.toLocaleString();
    if (completionElement) {
        completionElement.textContent = `${completion.toFixed(completion > 0 && completion < 1 ? 1 : 0)}%`;
    }
    if (progressFillElement) progressFillElement.style.width = `${completion}%`;
}

export function setActiveCollectionCount(count) {
    const element = document.getElementById("dashboard-active-count");
    if (element) element.textContent = Math.max(0, Number(count) || 0).toLocaleString();
}

export function recordDiscoveredPokemon(id) {
    const pokemonId = Number(id);
    if (!Number.isInteger(pokemonId) || !isValidPokemonId(pokemonId)) return;

    const discovered = readStoredIds(DISCOVERED_STORAGE_KEY);
    if (!discovered.includes(pokemonId)) {
        discovered.push(pokemonId);
        discovered.sort((a, b) => a - b);
        writeStoredIds(DISCOVERED_STORAGE_KEY, discovered);
    }
    updateCollectionDashboard();
}

window.addEventListener("storage", (event) => {
    if (event.key === DISCOVERED_STORAGE_KEY) {
        updateCollectionDashboard();
    }
});

updateCollectionDashboard();
