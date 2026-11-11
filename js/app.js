import {
    setNavigationCollection,
    getNavigationCollection,
    navigateToPokemon,
    getCurrentPokemonId,
    invalidatePendingNavigation,
} from "./features/navigation.js";

import { getFilteredPokemon } from "./features/collection.js";

import { getEvolutionChain } from "./api/evolutionService.js";

import {
    displayEvolutionChain,
    showEvolutionModal,
    setEvolutionModalLoading,
} from "./components/evolutionModal.js";

import "./features/cardFlip.js";
import "./features/swipe.js";
import { getAllPokemonIds, getPokemonSuggestions } from "./api/pokemonService.js";
import { getPokemonForms } from "./api/formsService.js";
import { preloadPokemonTypeBadges } from "./components/pokemonCard.js";
import {
    displayPokemonForms,
    showFormsModal,
    setFormsModalLoading,
} from "./components/formsModal.js";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");

const errorMessage = document.getElementById("error-message");
const loadingIndicator = document.getElementById("loading-indicator");
const pokemonCard = document.getElementById("pokemon-card");
const statusMessage = document.getElementById("status-message");

const regionFilter = document.getElementById("region-filter");
const regionFilterTrigger = document.getElementById("region-filter-trigger");
const regionFilterMenu = document.getElementById("region-filter-menu");
const regionFilterDropdown = document.getElementById("region-filter-dropdown");
const typeFilter = document.getElementById("type-filter");
const typeFilterTrigger = document.getElementById("type-filter-trigger");
const typeFilterMenu = document.getElementById("type-filter-menu");
const typeFilterDropdown = document.getElementById("type-filter-dropdown");
const TYPE_FILTER_COLORS = {
    all: "#cbd5e1", normal: "#A8A77A", fire: "#EE8130", water: "#6390F0",
    electric: "#F7D02C", grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28",
    poison: "#A33EA1", ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587",
    bug: "#A6B91A", rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC",
    dark: "#705746", steel: "#B7B7CE", fairy: "#D685AD"
};

function syncRegionFilterDropdown() {
    const selected = regionFilter.selectedOptions[0];
    if (selected) {
        regionFilterTrigger.textContent = selected.textContent;
        const chevron = document.createElement("span");
        chevron.className = "type-filter-chevron";
        regionFilterTrigger.append(chevron);
    }
    regionFilterMenu.querySelectorAll(".type-filter-option").forEach((button) => {
        const isSelected = button.dataset.value === regionFilter.value;
        button.classList.toggle("is-selected", isSelected);
        button.disabled = regionFilter.disabled;
    });
    regionFilterTrigger.disabled = regionFilter.disabled;
}

function closeRegionFilterMenu() {
    regionFilterMenu.classList.add("d-none");
    regionFilterTrigger.classList.remove("is-open");
}

function initializeRegionFilterDropdown() {
    [...regionFilter.options].forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "type-filter-option region-filter-option";
        button.textContent = option.textContent;
        button.dataset.value = option.value;
        button.addEventListener("click", () => {
            if (regionFilter.disabled || regionFilter.value === option.value) {
                closeRegionFilterMenu();
                return;
            }
            regionFilter.value = option.value;
            syncRegionFilterDropdown();
            closeRegionFilterMenu();
            regionFilter.dispatchEvent(new Event("change", { bubbles: true }));
        });
        regionFilterMenu.append(button);
    });
    regionFilterTrigger.addEventListener("click", () => {
        if (regionFilter.disabled) return;
        const willOpen = regionFilterMenu.classList.contains("d-none");
        regionFilterMenu.classList.toggle("d-none", !willOpen);
        regionFilterTrigger.classList.toggle("is-open", willOpen);
    });
    document.addEventListener("click", (event) => {
        if (!regionFilterDropdown.contains(event.target)) closeRegionFilterMenu();
    });
    regionFilter.addEventListener("change", syncRegionFilterDropdown);
    syncRegionFilterDropdown();
}

function syncTypeFilterDropdown() {
    const selected = typeFilter.selectedOptions[0];
    if (selected) {
        typeFilterTrigger.textContent = selected.textContent;
        const chevron = document.createElement("span");
        chevron.className = "type-filter-chevron";
        typeFilterTrigger.append(chevron);
    }
    typeFilterMenu.querySelectorAll(".type-filter-option").forEach((button) => {
        const isSelected = button.dataset.value === typeFilter.value;
        button.classList.toggle("is-selected", isSelected);
        button.disabled = typeFilter.disabled;
    });
    typeFilterTrigger.disabled = typeFilter.disabled;
}

function closeTypeFilterMenu() {
    typeFilterMenu.classList.add("d-none");
    typeFilterTrigger.classList.remove("is-open");
}

function initializeTypeFilterDropdown() {
    [...typeFilter.options].forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "type-filter-option";
        button.textContent = option.textContent;
        button.dataset.value = option.value;
        button.style.setProperty("--type-color", TYPE_FILTER_COLORS[option.value] || "#cbd5e1");
        button.addEventListener("click", () => {
            if (typeFilter.disabled || typeFilter.value === option.value) {
                closeTypeFilterMenu();
                return;
            }
            typeFilter.value = option.value;
            syncTypeFilterDropdown();
            closeTypeFilterMenu();
            typeFilter.dispatchEvent(new Event("change", { bubbles: true }));
        });
        typeFilterMenu.append(button);
    });
    typeFilterTrigger.addEventListener("click", () => {
        if (typeFilter.disabled) return;
        const willOpen = typeFilterMenu.classList.contains("d-none");
        typeFilterMenu.classList.toggle("d-none", !willOpen);
        typeFilterTrigger.classList.toggle("is-open", willOpen);
    });
    document.addEventListener("click", (event) => {
        if (!typeFilterDropdown.contains(event.target)) closeTypeFilterMenu();
    });
    typeFilter.addEventListener("change", syncTypeFilterDropdown);
    syncTypeFilterDropdown();
}

const randomButton = document.getElementById("random-button");
const evolutionButton = document.getElementById("evolution-button");
const formsButton = document.getElementById("forms-button");
let currentRequestId = 0;
let evolutionRequestInProgress = false;
let filterRequestInProgress = false;
let currentFormsRequestId = 0;
let currentPokemonForForms = null;
let currentDisplayedFormResourceName = null;
let formsRequestInProgress = false;

function showError(message) {
    const title = document.getElementById("error-message-title");
    const text = document.getElementById("error-message-text");
    const hint = document.getElementById("error-message-hint");
    if (title) title.textContent = "Please check your search";
    if (text) text.textContent = message;
    else errorMessage.textContent = message;
    if (hint) hint.textContent = "Enter a Pokémon name or a valid Pokédex number.";
    document.getElementById("retry-button")?.classList.add("d-none");
    errorMessage.classList.remove("d-none");
}

function clearError() {
    const title = document.getElementById("error-message-title");
    const text = document.getElementById("error-message-text");
    const hint = document.getElementById("error-message-hint");
    if (title) title.textContent = "Something went wrong";
    if (text) text.textContent = "";
    else errorMessage.textContent = "";
    if (hint) hint.textContent = "Check the spelling or try another Pokédex number.";
    document.getElementById("retry-button")?.classList.add("d-none");
    errorMessage.classList.add("d-none");
}

async function searchPokemon(identifier) {
    invalidatePendingNavigation();
    const requestId = ++currentRequestId;
    clearError();
    statusMessage.textContent = "";
    loadingIndicator.classList.remove("d-none");
    loadingIndicator.classList.remove("loading-compact");

    try {
        const allPokemonIds = await getAllPokemonIds();
        if (requestId !== currentRequestId) {
            return;
        }

        setNavigationCollection(allPokemonIds);
    } catch (error) {
        if (requestId !== currentRequestId) {
            return;
        }
        setNavigationCollection(
            Array.from({ length: 1351 }, (_, index) => index + 1)
        );
        statusMessage.textContent =
            "Full alternate-form navigation is temporarily unavailable; using the base Pokédex.";
    }

    if (requestId !== currentRequestId) {
        return;
    }

    loadingIndicator.classList.add("d-none");
    await navigateToPokemon(identifier);
}

initializeRegionFilterDropdown();
initializeTypeFilterDropdown();

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideSearchSuggestions();

    const query = searchInput.value.trim();

    if (!query) {
        showError("Please enter a Pokémon name or ID.");
        return;
    }
    regionFilter.value = "all";
    typeFilter.value = "all";
    syncTypeFilterDropdown();

    await searchPokemon(query);
});

const suggestionsContainer = document.getElementById("search-suggestions");
let suggestionItems = [];
let activeSuggestionIndex = -1;
let suggestionTimer = null;
let suggestionRequestId = 0;

function hideSearchSuggestions() {
    suggestionsContainer.classList.add("d-none");
    suggestionsContainer.replaceChildren();
    suggestionItems = [];
    activeSuggestionIndex = -1;
}

function setActiveSuggestion(index) {
    if (suggestionItems.length === 0) return;

    activeSuggestionIndex =
        (index + suggestionItems.length) % suggestionItems.length;

    suggestionsContainer.querySelectorAll(".search-suggestion").forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === activeSuggestionIndex);
    });
}

function chooseSuggestion(pokemon) {
    searchInput.value = pokemon.name;
    hideSearchSuggestions();
    searchForm.requestSubmit();
}

function renderSearchSuggestions(suggestions) {
    suggestionItems = suggestions;
    activeSuggestionIndex = -1;
    suggestionsContainer.replaceChildren();

    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }

    suggestions.forEach((pokemon) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-suggestion";

        const name = document.createElement("span");
        name.className = "search-suggestion-name";
        name.textContent = pokemon.name.replace(/-/g, " ");

        const id = document.createElement("span");
        id.className = "search-suggestion-id";
        id.textContent = `#${pokemon.id}`;

        button.append(name, id);
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => chooseSuggestion(pokemon));
        suggestionsContainer.appendChild(button);
    });

    suggestionsContainer.classList.remove("d-none");
}

searchInput.addEventListener("input", () => {
    window.clearTimeout(suggestionTimer);
    const query = searchInput.value.trim();
    const requestId = ++suggestionRequestId;

    if (query.length < 2 || /^\d+$/.test(query)) {
        hideSearchSuggestions();
        return;
    }

    suggestionTimer = window.setTimeout(async () => {
        try {
            const suggestions = await getPokemonSuggestions(query, 8);
            if (requestId !== suggestionRequestId || searchInput.value.trim() !== query) {
                return;
            }
            renderSearchSuggestions(suggestions);
        } catch {
            hideSearchSuggestions();
        }
    }, 140);
});

searchInput.addEventListener("keydown", (event) => {
    if (suggestionsContainer.classList.contains("d-none")) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestion(activeSuggestionIndex + 1);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestion(
            activeSuggestionIndex < 0
                ? suggestionItems.length - 1
                : activeSuggestionIndex - 1
        );
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
        searchInput.value = suggestionItems[activeSuggestionIndex].name;
        hideSearchSuggestions();
    } else if (event.key === "Escape") {
        hideSearchSuggestions();
    }
});

searchInput.addEventListener("blur", () => {
    window.setTimeout(hideSearchSuggestions, 120);
});

async function applyFilters() {
    invalidatePendingNavigation();
    if (filterRequestInProgress) {
        return;
    }

    const requestId = ++currentRequestId;
    const hadVisibleCard = !pokemonCard.classList.contains("d-none");

    filterRequestInProgress = true;
    regionFilter.disabled = true;
    typeFilter.disabled = true;
    syncTypeFilterDropdown();
    randomButton.disabled = true;

    clearError();
    statusMessage.textContent = "";
    loadingIndicator.classList.add("loading-compact");
    loadingIndicator.classList.remove("d-none");

    try {
        const collection = await getFilteredPokemon(
            regionFilter.value,
            typeFilter.value
        );

        if (requestId !== currentRequestId) {
            return;
        }

        if (collection.length === 0) {
            setNavigationCollection([]);
            pokemonCard.classList.add("d-none");
            evolutionButton.disabled = true;
            statusMessage.textContent =
                "No Pokémon match the selected filters.";
            return;
        }

        setNavigationCollection(collection);

        await navigateToPokemon(collection[0].id);
    } catch (error) {
        if (requestId !== currentRequestId) {
            return;
        }

        showError(
            `Unable to apply filters: ${error.message}`
        );
        pokemonCard.classList.toggle("d-none", !hadVisibleCard);
    } finally {
        if (requestId === currentRequestId) {
            loadingIndicator.classList.add("d-none");
            loadingIndicator.classList.remove("loading-compact");
        }

        filterRequestInProgress = false;
        regionFilter.disabled = false;
        typeFilter.disabled = false;
        syncTypeFilterDropdown();
        randomButton.disabled = false;
    }
}

function handleFilterChange() {
    applyFilters();
}

regionFilter.addEventListener("change", handleFilterChange);
typeFilter.addEventListener("change", handleFilterChange);

randomButton.addEventListener("click", async () => {
    const collection = getNavigationCollection();

    if (collection.length === 0) {
        statusMessage.textContent =
            "There are no Pokémon in the current collection.";
        return;
    }

    const currentPokemonId = getCurrentPokemonId();
    const availableIds = collection.length > 1
        ? collection.filter((id) => Number(id) !== Number(currentPokemonId))
        : collection;

    const randomIndex = Math.floor(
        Math.random() * availableIds.length
    );
    const randomPokemonId = availableIds[randomIndex];
    const direction = Number(randomPokemonId) > Number(currentPokemonId) ? 1 : -1;

    randomButton.disabled = true;
    try {
        await navigateToPokemon(randomPokemonId, direction);
    } finally {
        randomButton.disabled = false;
    }
});

evolutionButton.addEventListener("click", async () => {
    if (evolutionRequestInProgress) {
        return;
    }

    evolutionRequestInProgress = true;
    evolutionButton.disabled = true;
    evolutionButton.textContent = "Loading Evolutions...";
    statusMessage.textContent = "";
    setEvolutionModalLoading(true);
    showEvolutionModal();

    try {
        const chain = await getEvolutionChain(
            document.getElementById("pokemon-id").textContent
                .replace("#", "")
        );

        await displayEvolutionChain(chain);
        setEvolutionModalLoading(false);
    } catch (error) {
        setEvolutionModalLoading(false);
        statusMessage.textContent =
            `Unable to load evolution chain: ${error.message}`;
    } finally {
        evolutionRequestInProgress = false;
        evolutionButton.disabled = false;
        evolutionButton.textContent = "View Evolution Chain";
    }
});
window.addEventListener("pokemonloaded", async (event) => {
    const { pokemon } = event.detail || {};
    if (!pokemon) return;

    const requestId = ++currentFormsRequestId;
    currentPokemonForForms = pokemon;
    currentDisplayedFormResourceName = pokemon.name;
    formsButton.classList.remove("d-none");
    formsButton.disabled = true;
    formsButton.title = "Checking whether this Pokémon has alternate forms.";
    formsButton.textContent = "Checking Forms...";
    formsButton.dataset.forms = "[]";

    try {
        const forms = await getPokemonForms(pokemon);
        if (requestId !== currentFormsRequestId) return;
        formsButton.dataset.forms = JSON.stringify(forms);
        formsButton.disabled = forms.length < 2;
        formsButton.title = forms.length < 2
            ? "This Pokémon has no alternate forms."
            : "View this Pokémon’s alternate forms.";
        formsButton.textContent = "View Pokémon Forms";
    } catch (error) {
        if (requestId !== currentFormsRequestId) return;
        formsButton.disabled = true;
        formsButton.title = "Forms could not be loaded. Reload this Pokémon to retry.";
        formsButton.textContent = "View Pokémon Forms";
        console.warn("Pokémon forms unavailable:", error.message);
    }
});
window.addEventListener("pokemonformselected", async (event) => {
    const form = event.detail?.form;
    if (!form || !currentPokemonForForms) return;

    const targetPokemonId = Number(form.pokemonId ?? form.id);
    const currentPokemonId = Number(currentPokemonForForms.id);
    const targetFormResourceName = form.formResourceName || form.name;

    if (
        Number.isSafeInteger(targetPokemonId) &&
        targetPokemonId > 0 &&
        targetPokemonId === currentPokemonId &&
        targetFormResourceName === currentDisplayedFormResourceName
    ) return;

    if (Number.isSafeInteger(targetPokemonId) && targetPokemonId > 0 && targetPokemonId !== currentPokemonId) {
        const direction = targetPokemonId > currentPokemonId ? 1 : -1;
        await navigateToPokemon(targetPokemonId, direction);
        return;
    }

    // Keep the same loading experience when switching between forms of the
    // current Pokémon, even though this path updates the card in place.
    const loadingIndicator = document.getElementById("loading-indicator");
    const pokemonCard = document.getElementById("pokemon-card");
    if (loadingIndicator && pokemonCard) {
        loadingIndicator.classList.remove("d-none");
        loadingIndicator.classList.add("loading-compact");
        const loadingText = loadingIndicator.querySelector("p");
        if (loadingText) loadingText.textContent = "Loading Pokémon form...";
        pokemonCard.classList.add("card-is-loading");
    }

    try {
        await preloadPokemonTypeBadges(form.types || []);
        const candidates = Array.isArray(form.imageCandidates) && form.imageCandidates.length
            ? form.imageCandidates.filter(Boolean)
            : [form.image].filter(Boolean);
        if (candidates.length) {
            const loadedImage = await new Promise((resolve) => {
                let index = 0;
                const attempt = () => {
                    if (index >= candidates.length) { resolve(null); return; }
                    const image = new Image();
                    image.onload = async () => {
                        try { if (image.decode) await image.decode(); } catch { /* loaded image remains usable */ }
                        resolve({ src: candidates[index] });
                    };
                    image.onerror = () => { index += 1; attempt(); };
                    image.src = candidates[index];
                    if (image.complete && image.naturalWidth > 0) {
                        image.onload();
                    }
                };
                attempt();
            });
            if (loadedImage) form._loadedArtworkSrc = loadedImage.src;
        }
    } finally {
        if (loadingIndicator) {
            loadingIndicator.classList.add("d-none");
            loadingIndicator.classList.remove("loading-compact");
        }
        pokemonCard?.classList.remove("card-is-loading");
    }

    currentDisplayedFormResourceName = targetFormResourceName;

    const typeColors = {
        normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
        grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
        ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
        rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
        steel: "#B7B7CE", fairy: "#D685AD",
    };
    const formLabel = form.formName
        ? `${form.name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} (${form.formName.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} Form)`
        : form.name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

    ["pokemon-image", "back-pokemon-image"].forEach((id) => {
        const image = document.getElementById(id);
        if (image && form.image) {
            const candidates = form._loadedArtworkSrc
                ? [form._loadedArtworkSrc]
                : Array.isArray(form.imageCandidates) && form.imageCandidates.length
                    ? form.imageCandidates
                    : [form.image];
            let candidateIndex = 0;
            image.onerror = () => {
                candidateIndex += 1;
                if (candidateIndex < candidates.length) image.src = candidates[candidateIndex];
                else image.onerror = null;
            };
            image.src = candidates[0];
            image.alt = `${formLabel} artwork`;
        }
    });
    ["pokemon-name", "back-pokemon-name"].forEach((id) => {
        const name = document.getElementById(id);
        if (name) name.textContent = formLabel;
    });

    const typesContainer = document.getElementById("pokemon-types");
    typesContainer.replaceChildren();
    form.types.forEach((type) => {
        const typeIds = {
            normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5,
            rock: 6, bug: 7, ghost: 8, steel: 9, fire: 10, water: 11,
            grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16,
            dark: 17, fairy: 18,
        };
        const typeName = type.toLowerCase();
        const badge = document.createElement("img");
        badge.className = "type-badge";
        badge.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${typeIds[typeName]}.png`;
        badge.alt = `${typeName} type`;
        badge.title = `${typeName.charAt(0).toUpperCase()}${typeName.slice(1)}`;
        badge.loading = "eager";
        badge.decoding = "sync";
        typesContainer.appendChild(badge);
    });
    const firstType = form.types[0] || "normal";
    pokemonCard.style.setProperty("--pokemon-type-color", typeColors[firstType] || "#d5b76a");
    pokemonCard.dataset.type = firstType;
    document.body.dataset.pokemonType = firstType;
});

formsButton.addEventListener("click", async () => {
    if (formsRequestInProgress || !currentPokemonForForms) return;
    formsRequestInProgress = true;
    const requestId = currentFormsRequestId;
    formsButton.disabled = true;
    const previousLabel = formsButton.textContent;
    formsButton.textContent = "Loading Forms...";
    setFormsModalLoading(true);
    showFormsModal();
    try {
        let forms = [];
        try { forms = JSON.parse(formsButton.dataset.forms || "[]"); } catch { forms = []; }
        if (forms.length < 2) forms = await getPokemonForms(currentPokemonForForms);
        if (requestId !== currentFormsRequestId) {
            setFormsModalLoading(false);
            bootstrap.Modal.getOrCreateInstance(document.getElementById("forms-modal")).hide();
            return;
        }
        if (forms.length < 2) {
            setFormsModalLoading(false);
            bootstrap.Modal.getOrCreateInstance(document.getElementById("forms-modal")).hide();
            formsButton.disabled = true;
            formsButton.title = "This Pokémon has no alternate forms.";
            return;
        }
        formsButton.dataset.forms = JSON.stringify(forms);
        await displayPokemonForms(forms);
        setFormsModalLoading(false);
    } catch (error) {
        setFormsModalLoading(false);
        statusMessage.textContent = `Unable to load Pokémon forms: ${error.message}`;
    } finally {
        formsRequestInProgress = false;
        const knownForms = (() => { try { return JSON.parse(formsButton.dataset.forms || "[]"); } catch { return []; } })();
        formsButton.disabled = knownForms.length < 2;
        formsButton.textContent = "View Pokémon Forms";
    }
});
searchPokemon("pikachu");
