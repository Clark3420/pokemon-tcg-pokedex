import { getPokemon, getAllPokemonIds } from "../api/pokemonService.js";
import { getPokemonSpecies } from "../api/speciesService.js";
import { renderPokemonCard, preloadPokemonArtwork } from "../components/pokemonCard.js";
import { setActiveCollectionCount } from "./collectionDashboard.js";

const BASE_POKEMON_COUNT = 1025;

let currentPokemonId = 25;
let navigationRequestId = 0;
let navigationInProgress = false;
const unavailableNavigationIds = new Set();

let activeCardAnimation = null;

function clearCardNavigationAnimation() {
    if (!activeCardAnimation) return;

    const { cardElement, className, onEnd, timeoutId } = activeCardAnimation;
    cardElement.removeEventListener("animationend", onEnd);
    cardElement.removeEventListener("animationcancel", onEnd);
    window.clearTimeout(timeoutId);
    cardElement.classList.remove(className);
    activeCardAnimation = null;
}

function playCardNavigationAnimation(direction) {
    clearCardNavigationAnimation();

    if (!direction || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const className = direction > 0
        ? "card-enter-from-right"
        : "card-enter-from-left";

    card.classList.remove(
        "card-enter-from-left",
        "card-enter-from-right",
        "card-exit-to-left",
        "card-exit-to-right"
    );
    void card.offsetWidth;
    card.classList.add(className);

    const finish = (event) => {
        if (event && event.target !== card) return;
        clearCardNavigationAnimation();
    };

    const timeoutId = window.setTimeout(() => finish(), 850);
    activeCardAnimation = {
        cardElement: card,
        className,
        onEnd: finish,
        timeoutId,
    };
    card.addEventListener("animationend", finish);
    card.addEventListener("animationcancel", finish);
}

function playCardExitAnimation(direction) {
    if (!direction || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return Promise.resolve();
    }

    clearCardNavigationAnimation();
    const className = direction > 0 ? "card-exit-to-left" : "card-exit-to-right";
    card.classList.remove("card-enter-from-left", "card-enter-from-right",
        "card-exit-to-left", "card-exit-to-right");
    void card.offsetWidth;
    card.classList.add(className);

    return new Promise((resolve) => {
        let settled = false;
        const finish = (event) => {
            if (event && event.target !== card) return;
            if (settled) return;
            settled = true;
            card.removeEventListener("animationend", finish);
            window.clearTimeout(timeoutId);
            card.classList.remove(className);
            resolve();
        };
        const timeoutId = window.setTimeout(() => finish(), 390);
        card.addEventListener("animationend", finish);
    });
}


function playCardSwapAnimation(direction, replaceCardContent) {
    if (!direction || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        replaceCardContent();
        return Promise.resolve();
    }

    clearCardNavigationAnimation();
    const className = direction > 0
        ? "card-swap-next"
        : "card-swap-previous";

    card.classList.remove(
        "card-enter-from-left",
        "card-enter-from-right",
        "card-exit-to-left",
        "card-exit-to-right",
        "card-swap-next",
        "card-swap-previous"
    );
    void card.offsetWidth;
    card.classList.add(className);

    return new Promise((resolve) => {
        let swapped = false;
        let settled = false;

        const swapContent = () => {
            if (swapped) return;
            swapped = true;
            replaceCardContent();
        };

        const finish = (event) => {
            if (event && event.target !== card) return;
            if (settled) return;
            settled = true;
            window.clearTimeout(swapTimer);
            window.clearTimeout(fallbackTimer);
            swapContent();
            card.removeEventListener("animationend", finish);
            card.classList.remove(className);
            resolve();
        };

        const swapTimer = window.setTimeout(swapContent, 285);
        const fallbackTimer = window.setTimeout(() => finish(), 700);
        card.addEventListener("animationend", finish);
    });
}

export function invalidatePendingNavigation() {
    navigationRequestId += 1;
    navigationInProgress = false;
    card.classList.remove("card-navigation-in-progress");
    clearCardNavigationAnimation();
    loadingIndicator.classList.add("d-none");
    loadingIndicator.classList.remove("loading-compact");
    card.classList.remove("card-is-loading");
    searchButton.disabled = false;
    updateNavigationButtons();
}

let navigationIds = Array.from(
    { length: BASE_POKEMON_COUNT },
    (_, index) => index + 1
);

let currentIndex = navigationIds.indexOf(currentPokemonId);

const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const card = document.getElementById("pokemon-card");
const loadingIndicator = document.getElementById("loading-indicator");
const errorMessage = document.getElementById("error-message");
const searchButton = document.getElementById("search-button");
const errorMessageText = document.getElementById("error-message-text");
const errorMessageTitle = document.getElementById("error-message-title");
const errorMessageHint = document.getElementById("error-message-hint");
const retryButton = document.getElementById("retry-button");
let lastFailedNavigation = null;



function updateNavigationButtons() {
    previousButton.disabled = navigationInProgress || findAvailableIndex(currentIndex, -1) < 0;
    nextButton.disabled = navigationInProgress || findAvailableIndex(currentIndex, 1) < 0;
}

function findAvailableIndex(startIndex, direction) {
    let index = startIndex + direction;
    while (index >= 0 && index < navigationIds.length) {
        if (!unavailableNavigationIds.has(navigationIds[index])) return index;
        index += direction;
    }
    return -1;
}

export function setNavigationCollection(pokemonList) {
    unavailableNavigationIds.clear();
    navigationIds = [...new Set(
        pokemonList.map((pokemon) =>
            typeof pokemon === "number"
                ? pokemon
                : pokemon.id
        )
    )]
        .filter(
            (id) =>
                Number.isSafeInteger(id) &&
                id >= 1
        )
        .sort((a, b) => a - b);

    currentIndex = navigationIds.indexOf(currentPokemonId);

    updateNavigationButtons();
    setActiveCollectionCount(navigationIds.length);
    return navigationIds;
}

export function getNavigationCollection() {
    return [...navigationIds];
}

export function setCurrentPokemonId(id) {
    currentPokemonId = Number(id);
    currentIndex = navigationIds.indexOf(currentPokemonId);

    updateNavigationButtons();
}

export async function navigateToPokemon(id, direction = 0) {
    if (navigationInProgress) return false;
    navigationInProgress = true;
    card.classList.add("card-navigation-in-progress");
    const requestId = ++navigationRequestId;

    // Clear the existing panel's child nodes without replacing its contents.
    // Assigning errorMessage.textContent here would detach the title, message,
    // hint, and retry button from the DOM, leaving an empty outlined panel.
    if (errorMessageTitle) errorMessageTitle.textContent = "Something went wrong";
    if (errorMessageText) errorMessageText.textContent = "";
    if (errorMessageHint) {
        errorMessageHint.textContent = "Check the spelling or try another Pokédex number.";
    }
    if (retryButton) retryButton.classList.add("d-none");
    errorMessage.classList.add("d-none");

    const hasVisibleCard = !card.classList.contains("d-none");
    if (!hasVisibleCard) {
        loadingIndicator.classList.remove("d-none");
        loadingIndicator.classList.remove("loading-compact");
    } else {
        // Keep the current Pokémon fully visible while the next request loads.
        loadingIndicator.classList.add("d-none");
        loadingIndicator.classList.remove("loading-compact");
        card.classList.remove("card-is-loading");
    }

    previousButton.disabled = true;
    nextButton.disabled = true;
    searchButton.disabled = true;

    try {
        const pokemon = await getPokemon(id);

        if (requestId !== navigationRequestId) {
            return;
        }
        if (!navigationIds.includes(Number(pokemon.id))) {
            try {
                const allPokemonIds = await getAllPokemonIds();
                if (requestId !== navigationRequestId) {
                    return;
                }
                setNavigationCollection(allPokemonIds);
            } catch (indexError) {
                navigationIds = [...new Set([...navigationIds, Number(pokemon.id)])]
                    .filter((id) => Number.isSafeInteger(id) && id > 0)
                    .sort((a, b) => a - b);
                currentIndex = navigationIds.indexOf(Number(pokemon.id));
                updateNavigationButtons();
            }
        }

        let species = null;

        try {
            species = await getPokemonSpecies(pokemon);
        } catch (error) {
            console.warn(
                "Species metadata unavailable:",
                error.message
            );
        }

        if (requestId !== navigationRequestId) {
            return;
        }

        // Decode the incoming artwork before the card becomes visible again.
        // This prevents the browser from briefly painting the previous image
        // while the new image is still being fetched or decoded.
        const artworkCandidates = await preloadPokemonArtwork(pokemon);
        if (requestId !== navigationRequestId) {
            return;
        }

        const commitPokemon = () => {
            renderPokemonCard(pokemon, species, artworkCandidates);
            card.classList.remove("d-none", "card-is-loading");
            errorMessage.classList.add("d-none");
            lastFailedNavigation = null;
            if (retryButton) retryButton.classList.add("d-none");
        };

        if (direction !== 0 && hasVisibleCard) {
            // One continuous slide: old artwork exits, content swaps at the
            // invisible midpoint, and the new artwork enters from the other side.
            await playCardSwapAnimation(direction, commitPokemon);
            if (requestId !== navigationRequestId) return;
        } else {
            clearCardNavigationAnimation();
            commitPokemon();
        }
        window.dispatchEvent(new CustomEvent("pokemonloaded", {
            detail: { pokemon, species }
        }));

        unavailableNavigationIds.delete(Number(pokemon.id));
        setCurrentPokemonId(pokemon.id);
        return true;
    } catch (error) {
        if (requestId !== navigationRequestId) {
            return;
        }

        const isNotFound = error.status === 404
            || /^No Pokémon found/i.test(error.message || "")
            || /requested Pokémon or resource was not found/i.test(error.message || "");
        const canRetry = !isNotFound;

        if (direction !== 0 && isNotFound) {
            unavailableNavigationIds.add(Number(id));
            updateNavigationButtons();
        }

        const friendlyMessage = isNotFound
            ? "We couldn't find that Pokémon."
            : error.status === 429
                ? "PokeAPI is receiving too many requests right now."
                : /timed out/i.test(error.message || "")
                    ? "The request took too long to finish."
                    : /connect to PokeAPI|internet connection/i.test(error.message || "")
                        ? "We couldn't connect to the Pokémon database."
                        : "We couldn't load this Pokémon right now.";

        if (errorMessageTitle) {
            errorMessageTitle.textContent = isNotFound ? "Pokémon not found" : "Unable to load Pokémon";
        }
        if (errorMessageText) {
            errorMessageText.textContent = isNotFound
                ? "Check the name or Pokédex number and try again."
                : `${friendlyMessage} ${error.message || ""} Your current card has been kept.`;
        } else {
            errorMessage.textContent = `${friendlyMessage} ${error.message || ""}`;
        }
        if (errorMessageHint) {
            errorMessageHint.textContent = isNotFound
                ? "Try a name like Pikachu, Charizard, or an official Pokédex number."
                : "Check your connection, then try again.";
        }
        errorMessage.classList.remove("d-none");

        lastFailedNavigation = canRetry ? { id, direction } : null;
        if (retryButton) retryButton.classList.toggle("d-none", !canRetry);
        return false;
    } finally {
        if (requestId === navigationRequestId) {
            navigationInProgress = false;
            card.classList.remove("card-navigation-in-progress");
            loadingIndicator.classList.add("d-none");
            loadingIndicator.classList.remove("loading-compact");
            card.classList.remove("card-is-loading");
            searchButton.disabled = false;
            updateNavigationButtons();
        }
    }
}

export function navigateByOffset(offset) {
    if (navigationInProgress) return;

    const nextIndex = findAvailableIndex(currentIndex, offset > 0 ? 1 : -1);

    if (nextIndex < 0) {
        return;
    }

    navigateToPokemon(navigationIds[nextIndex], offset);
}

[previousButton, nextButton].forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
    });

    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (navigationInProgress) return;
        navigateByOffset(button === nextButton ? 1 : -1);
    });
});

retryButton?.addEventListener("click", () => {
    if (!lastFailedNavigation || navigationInProgress) return;
    const { id, direction } = lastFailedNavigation;
    errorMessage.classList.add("d-none");
    retryButton.classList.add("d-none");
    navigateToPokemon(id, direction);
});

updateNavigationButtons();

// Populate the initial Previous and Next preview cards.
