import { ref, computed, reactive } from "vue";
import { getPokemon, getAllPokemonIds } from "../services/pokemonService.js";
import { getPokemonSpecies } from "../services/speciesService.js";
import {
    getPokemonArtworkCandidates,
    getPokemonTypeBadgeUrl,
} from "../utils/pokemonCardUtils.js";

const BASE_POKEMON_COUNT = 1025;

function createDefaultNavigationIds() {
    return Array.from(
        { length: BASE_POKEMON_COUNT },
        (_, index) => index + 1
    );
}

function preloadImage(url, timeout = 8000) {
    return new Promise((resolve) => {
        const image = new Image();
        let settled = false;

        const finish = (result) => {
            if (settled) return;

            settled = true;
            window.clearTimeout(timeoutId);
            resolve(result);
        };

        const timeoutId = window.setTimeout(
            () => finish(false),
            timeout
        );

        image.onload = async () => {
            try {
                if (typeof image.decode === "function") {
                    await image.decode();
                }
            } catch {
            }

            finish(true);
        };

        image.onerror = () => finish(false);
        image.src = url;

        if (image.complete && image.naturalWidth > 0) {
            finish(true);
        }
    });
}

async function preloadPokemonArtwork(pokemon) {
    const candidates = getPokemonArtworkCandidates(pokemon);

    for (let index = 0; index < candidates.length; index += 1) {
        const loaded = await preloadImage(candidates[index]);

        if (loaded) {
            return candidates.slice(index);
        }
    }

    return candidates;
}

async function preloadPokemonTypeBadges(types = []) {
    const names = types.map((entry) =>
        typeof entry === "string"
            ? entry.toLowerCase()
            : entry?.type?.name?.toLowerCase()
    ).filter(Boolean);

    const urls = names
        .map(getPokemonTypeBadgeUrl)
        .filter(Boolean);

    await Promise.all(
        [...new Set(urls)].map((url) => preloadImage(url, 8000))
    );
}

export function usePokemonNavigation() {
    const currentPokemonId = ref(25);
    const currentPokemon = ref(null);
    const currentSpecies = ref(null);
    const artworkCandidates = ref([]);

    const navigationIds = ref(createDefaultNavigationIds());
    const unavailableNavigationIds = reactive(new Set());

    const navigationInProgress = ref(false);
    const isLoading = ref(false);
    const loadingCompact = ref(false);
    const isCardSwapping = ref(false);

    const error = ref(null);
    const lastFailedNavigation = ref(null);
    const navigationDirection = ref(0);

    let navigationRequestId = 0;

    const currentIndex = computed(() =>
        navigationIds.value.indexOf(currentPokemonId.value)
    );

    function findAvailableIndex(startIndex, direction) {
        let index = startIndex + direction;

        while (
            index >= 0 &&
            index < navigationIds.value.length
        ) {
            if (
                !unavailableNavigationIds.has(
                    navigationIds.value[index]
                )
            ) {
                return index;
            }

            index += direction;
        }

        return -1;
    }

    const canNavigatePrevious = computed(() =>
        !navigationInProgress.value &&
        findAvailableIndex(currentIndex.value, -1) >= 0
    );

    const canNavigateNext = computed(() =>
        !navigationInProgress.value &&
        findAvailableIndex(currentIndex.value, 1) >= 0
    );

    function setNavigationCollection(pokemonList) {
        unavailableNavigationIds.clear();

        navigationIds.value = [...new Set(
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

        return [...navigationIds.value];
    }

    function getNavigationCollection() {
        return [...navigationIds.value];
    }

    function setCurrentPokemonId(id) {
        currentPokemonId.value = Number(id);
    }

    function invalidatePendingNavigation() {
        navigationRequestId += 1;
        navigationInProgress.value = false;
        isLoading.value = false;
        loadingCompact.value = false;
        isCardSwapping.value = false;
        navigationDirection.value = 0;
    }

    async function navigateToPokemon(id, direction = 0) {
        if (navigationInProgress.value) {
            return false;
        }

        navigationInProgress.value = true;
        navigationDirection.value = direction;

        const requestId = ++navigationRequestId;
        const hasVisibleCard = Boolean(currentPokemon.value);

        error.value = null;
        lastFailedNavigation.value = null;

        isLoading.value = true;
        loadingCompact.value = hasVisibleCard && direction !== 0;

        try {
            const pokemon = await getPokemon(id);

            if (requestId !== navigationRequestId) {
                return false;
            }

            if (!navigationIds.value.includes(Number(pokemon.id))) {
                try {
                    const allPokemonIds = await getAllPokemonIds();

                    if (requestId !== navigationRequestId) {
                        return false;
                    }

                    setNavigationCollection(allPokemonIds);
                } catch {
                    navigationIds.value = [...new Set([
                        ...navigationIds.value,
                        Number(pokemon.id),
                    ])]
                        .filter(
                            (value) =>
                                Number.isSafeInteger(value) &&
                                value > 0
                        )
                        .sort((a, b) => a - b);
                }
            }

            let species = null;

            try {
                species = await getPokemonSpecies(pokemon);
            } catch (speciesError) {
                console.warn(
                    "Species metadata unavailable:",
                    speciesError.message
                );
            }

            if (requestId !== navigationRequestId) {
                return false;
            }

            const [loadedArtwork] = await Promise.all([
                preloadPokemonArtwork(pokemon),
                preloadPokemonTypeBadges(pokemon.types),
            ]);

            if (requestId !== navigationRequestId) {
                return false;
            }

            if (direction !== 0 && hasVisibleCard) {
                isLoading.value = false;
                loadingCompact.value = false;
                isCardSwapping.value = true;

                await new Promise((resolve) => {
                    window.setTimeout(resolve, 285);
                });

                if (requestId !== navigationRequestId) {
                    return false;
                }
            }

            currentPokemon.value = pokemon;
            currentSpecies.value = species;
            artworkCandidates.value = loadedArtwork;

            unavailableNavigationIds.delete(Number(pokemon.id));
            setCurrentPokemonId(pokemon.id);

            if (direction !== 0 && hasVisibleCard) {
                await new Promise((resolve) => {
                    window.setTimeout(resolve, 335);
                });

                if (requestId !== navigationRequestId) {
                    return false;
                }

                isCardSwapping.value = false;
            }

            return true;
        } catch (requestError) {
            if (requestId !== navigationRequestId) {
                return false;
            }

            const isNotFound =
                requestError.status === 404 ||
                /^No Pokémon found/i.test(requestError.message || "") ||
                /requested Pokémon or resource was not found/i.test(
                    requestError.message || ""
                );

            if (direction !== 0 && isNotFound) {
                unavailableNavigationIds.add(Number(id));
            }

            const friendlyMessage = isNotFound
                ? "We couldn't find that Pokémon."
                : requestError.status === 429
                    ? "PokeAPI is receiving too many requests right now."
                    : /timed out/i.test(requestError.message || "")
                        ? "The request took too long to finish."
                        : /connect to PokeAPI|internet connection/i.test(
                            requestError.message || ""
                        )
                            ? "We couldn't connect to the Pokémon database."
                            : "We couldn't load this Pokémon right now.";

            error.value = {
                title: isNotFound
                    ? "Pokémon not found"
                    : "Unable to load Pokémon",
                message: isNotFound
                    ? "Check the name or Pokédex number and try again."
                    : `${friendlyMessage} ${requestError.message || ""} Your current card has been kept.`,
                hint: isNotFound
                    ? "Try a name like Pikachu, Charizard, or an official Pokédex number."
                    : "Check your connection, then try again.",
            };

            lastFailedNavigation.value = isNotFound
                ? null
                : { id, direction };

            return false;
        } finally {
            if (requestId === navigationRequestId) {
                navigationInProgress.value = false;
                isLoading.value = false;
                loadingCompact.value = false;
                isCardSwapping.value = false;
                navigationDirection.value = 0;
            }
        }
    }

    function navigateByOffset(offset) {
        if (navigationInProgress.value) {
            return;
        }

        const direction = offset > 0 ? 1 : -1;
        const nextIndex = findAvailableIndex(
            currentIndex.value,
            direction
        );

        if (nextIndex < 0) {
            return;
        }

        navigateToPokemon(
            navigationIds.value[nextIndex],
            direction
        );
    }

    function retryLastNavigation() {
        if (
            !lastFailedNavigation.value ||
            navigationInProgress.value
        ) {
            return;
        }

        const { id, direction } = lastFailedNavigation.value;

        return navigateToPokemon(id, direction);
    }

    return {
        currentPokemonId,
        currentPokemon,
        currentSpecies,
        artworkCandidates,
        navigationIds,
        navigationInProgress,
        isLoading,
        loadingCompact,
        isCardSwapping,
        error,
        lastFailedNavigation,
        navigationDirection,
        currentIndex,
        canNavigatePrevious,
        canNavigateNext,
        setNavigationCollection,
        getNavigationCollection,
        setCurrentPokemonId,
        invalidatePendingNavigation,
        navigateToPokemon,
        navigateByOffset,
        retryLastNavigation,
    };
}
