import {
    formatPokemonName,
    formatStatName,
    formatHeight,
    formatWeight,
    formatPokemonId,
} from "../utils/formatters.js";
import { recordDiscoveredPokemon } from "../features/collectionDashboard.js";
const TYPE_COLORS = {
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD",
};
const TYPE_IDS = {
    normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5,
    rock: 6, bug: 7, ghost: 8, steel: 9, fire: 10, water: 11,
    grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16,
    dark: 17, fairy: 18,
};
const decodedTypeBadgeUrls = new Set();
export async function preloadPokemonTypeBadges(types = []) {
    const names = types.map((entry) =>
        typeof entry === "string" ? entry.toLowerCase() : entry?.type?.name?.toLowerCase()
    ).filter(Boolean);
    await Promise.all(names.map(async (typeName) => {
        const typeId = TYPE_IDS[typeName];
        if (!typeId) return;
        const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${typeId}.png`;
        if (decodedTypeBadgeUrls.has(url)) return;
        await new Promise((resolve) => {
            const image = new Image();
            const finish = () => resolve();
            image.onload = async () => {
                try {
                    if (typeof image.decode === "function") await image.decode();
                    decodedTypeBadgeUrls.add(url);
                } catch {
                    if (image.naturalWidth > 0) decodedTypeBadgeUrls.add(url);
                }
                finish();
            };
            image.onerror = finish;
            image.src = url;
            if (image.complete && image.naturalWidth > 0) image.onload();
        });
    }));
}
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Required HTML element not found: #${id}`);
    }
    return element;
}
function renderTypes(types) {
    const container = getElement("pokemon-types");
    container.replaceChildren();
    types.forEach(({ type }) => {
        const typeName = type.name.toLowerCase();
        const typeId = TYPE_IDS[typeName];
        const badge = document.createElement("img");
        badge.className = "type-badge";
        badge.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${typeId}.png`;
        badge.alt = `${typeName} type`;
        badge.title = `${typeName.charAt(0).toUpperCase()}${typeName.slice(1)}`;
        badge.loading = "eager";
        badge.decoding = "sync";
        container.appendChild(badge);
    });
}
function renderStats(stats) {
    const container = getElement("pokemon-stats");
    container.replaceChildren();
    stats.forEach(({ base_stat, stat }) => {
        const row = document.createElement("div");
        row.className = "stat-row";
        const label = document.createElement("span");
        label.className = "stat-label";
        label.textContent = formatStatName(stat.name);
        const bar = document.createElement("div");
        bar.className = "stat-bar";
        bar.setAttribute("role", "progressbar");
        const fill = document.createElement("div");
        fill.className = "stat-bar-fill";
        fill.style.width = `${Math.min(base_stat / 255 * 100, 100)}%`;
        bar.appendChild(fill);
        const value = document.createElement("span");
        value.className = "stat-value";
        value.textContent = base_stat;
        row.append(label, bar, value);
        container.appendChild(row);
    });
}
function renderAbilities(abilities) {
    const container = getElement("pokemon-abilities");
    container.replaceChildren();
    abilities.forEach(({ ability, is_hidden }) => {
        const item = document.createElement("div");
        item.className = "ability-item";
        const name = document.createElement("div");
        name.className = "ability-name";
        name.textContent = formatPokemonName(ability.name);
        if (is_hidden) {
            const hiddenLabel = document.createElement("span");
            hiddenLabel.className = "badge text-bg-info ms-2";
            hiddenLabel.textContent = "Hidden";
            name.appendChild(hiddenLabel);
        }
        item.appendChild(name);
        container.appendChild(item);
    });
}
export async function preloadPokemonArtwork(pokemon) {
    const candidates = [
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg`,
        pokemon.sprites.other?.["official-artwork"]?.front_default,
    ].filter((url, index, urls) => url && urls.indexOf(url) === index);
    for (let index = 0; index < candidates.length; index += 1) {
        const url = candidates[index];
        const loaded = await new Promise((resolve) => {
            const image = new Image();
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                resolve(result);
            };
            const timeoutId = window.setTimeout(() => finish(false), 8000);
            image.onload = async () => {
                try {
                    if (typeof image.decode === "function") await image.decode();
                } catch {
                }
                finish(true);
            };
            image.onerror = () => finish(false);
            image.src = url;
        });
        if (loaded) return candidates.slice(index);
    }
    return candidates;
}
export function renderPokemonCard(pokemon, species, artworkCandidates = null) {
    const dreamWorldArtwork =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg`;
    const officialArtwork =
        pokemon.sprites.other?.["official-artwork"]?.front_default;
    const imageCandidates = artworkCandidates?.length
        ? artworkCandidates
        : [dreamWorldArtwork, officialArtwork].filter(Boolean);
    getElement("pokemon-name").textContent =
        formatPokemonName(pokemon.name);
    getElement("pokemon-id").textContent =
        formatPokemonId(pokemon.id);
    ["pokemon-image", "back-pokemon-image"].forEach((id) => {
        const image = getElement(id);
        let candidateIndex = 0;
        image.onerror = () => {
            candidateIndex += 1;
            if (candidateIndex < imageCandidates.length) {
                image.classList.remove("image-unavailable");
                image.src = imageCandidates[candidateIndex];
                return;
            }
            image.onerror = null;
            image.removeAttribute("src");
            image.classList.add("image-unavailable");
        };
        image.classList.remove("image-unavailable");
        image.src = imageCandidates[0] || dreamWorldArtwork;
        image.alt = `${formatPokemonName(pokemon.name)} artwork`;
    });
    getElement("back-pokemon-name").textContent =
        formatPokemonName(pokemon.name);
    getElement("pokemon-height").textContent =
        formatHeight(pokemon.height);
    getElement("pokemon-weight").textContent =
        formatWeight(pokemon.weight);
    renderTypes(pokemon.types);
    renderStats(pokemon.stats);
    renderAbilities(pokemon.abilities);
    const card = getElement("pokemon-card");
    card.classList.remove(
        "is-flipped",
        "is-legendary",
        "is-mythical",
        "is-prismatic"
    );
    card.style.setProperty(
        "--pokemon-type-color",
        TYPE_COLORS[pokemon.types[0]?.type.name] || "#d5b76a"
    );
    card.dataset.type = pokemon.types[0]?.type.name || "normal";
    document.body.dataset.pokemonType = pokemon.types[0]?.type.name || "normal";
    const isAlternateForm = Number(pokemon.id) >= 10001;
    const isSpecialSpecies = species?.is_legendary || species?.is_mythical;
    if (isAlternateForm && isSpecialSpecies) {
        card.classList.add("is-prismatic");
    } else if (!isAlternateForm && species?.is_legendary) {
        card.classList.add("is-legendary");
    } else if (!isAlternateForm && species?.is_mythical) {
        card.classList.add("is-mythical");
    }
    card.classList.remove("d-none");
    getElement("evolution-button").disabled = false;
    recordDiscoveredPokemon(pokemon.id);
}
