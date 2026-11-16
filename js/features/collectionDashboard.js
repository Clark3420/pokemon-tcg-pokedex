const BASE_POKEMON_COUNT = 1351;
const DISCOVERED_STORAGE_KEY = "pokemon-tcg-discovered";
const TOTAL_VIEWS_STORAGE_KEY = "pokemon-tcg-total-views";
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
function readTotalViews(discoveredCount = 0) {
    try {
        const stored = localStorage.getItem(TOTAL_VIEWS_STORAGE_KEY);
        if (stored === null) {
            localStorage.setItem(TOTAL_VIEWS_STORAGE_KEY, String(discoveredCount));
            return discoveredCount;
        }
        const parsed = Number(stored);
        return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : discoveredCount;
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
    const totalViews = readTotalViews(discovered.length);
    const discoveredElement = document.getElementById("dashboard-discovered");
    const discoveredProgressElement = document.getElementById("dashboard-discovered-progress");
    const completionElement = document.getElementById("dashboard-completion");
    const progressFillElement = document.getElementById("dashboard-progress-fill");
    const completion = Math.min(100, (discoveredBasePokemon / BASE_POKEMON_COUNT) * 100);
    if (discoveredElement) discoveredElement.textContent = totalViews.toLocaleString();
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
    const totalViews = readTotalViews(discovered.length);
    writeTotalViews(totalViews + 1);
    if (!discovered.includes(pokemonId)) {
        discovered.push(pokemonId);
        discovered.sort((a, b) => a - b);
        writeStoredIds(DISCOVERED_STORAGE_KEY, discovered);
    }
    updateCollectionDashboard();
}
window.addEventListener("storage", (event) => {
    if (event.key === DISCOVERED_STORAGE_KEY || event.key === TOTAL_VIEWS_STORAGE_KEY) {
        updateCollectionDashboard();
    }
});
updateCollectionDashboard();
