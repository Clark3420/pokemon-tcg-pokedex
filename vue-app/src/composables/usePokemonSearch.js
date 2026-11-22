
import { ref, onUnmounted } from "vue";
import { getPokemonSuggestions } from "../services/pokemonService.js";

export function usePokemonSearch() {
    const searchQuery = ref("");
    const suggestions = ref([]);
    const activeSuggestionIndex = ref(-1);
    const isLoadingSuggestions = ref(false);

    let suggestionTimer = null;
    let suggestionRequestId = 0;

    function hideSuggestions() {
        suggestions.value = [];
        activeSuggestionIndex.value = -1;
        isLoadingSuggestions.value = false;
    }

    function setActiveSuggestion(index) {
        if (suggestions.value.length === 0) {
            return;
        }

        activeSuggestionIndex.value =
            (index + suggestions.value.length) % suggestions.value.length;
    }

    async function loadSuggestions(query) {
        const requestId = ++suggestionRequestId;

        if (query.length < 2 || /^\d+$/.test(query)) {
            hideSuggestions();
            return;
        }

        isLoadingSuggestions.value = true;

        try {
            const results = await getPokemonSuggestions(query, 8);

            if (
                requestId !== suggestionRequestId ||
                searchQuery.value.trim() !== query
            ) {
                return;
            }

            suggestions.value = results;
            activeSuggestionIndex.value = -1;
        } catch {
            if (requestId === suggestionRequestId) {
                hideSuggestions();
            }
        } finally {
            if (requestId === suggestionRequestId) {
                isLoadingSuggestions.value = false;
            }
        }
    }

    function handleSearchInput(value) {
        searchQuery.value = value;

        window.clearTimeout(suggestionTimer);

        const query = value.trim();

        if (query.length < 2 || /^\d+$/.test(query)) {
            suggestionRequestId += 1;
            hideSuggestions();
            return;
        }

        suggestionTimer = window.setTimeout(() => {
            loadSuggestions(query);
        }, 140);
    }

    function handleSearchKeydown(event) {
        if (suggestions.value.length === 0) {
            return null;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveSuggestion(activeSuggestionIndex.value + 1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();

            setActiveSuggestion(
                activeSuggestionIndex.value < 0
                    ? suggestions.value.length - 1
                    : activeSuggestionIndex.value - 1
            );
        } else if (
            event.key === "Enter" &&
            activeSuggestionIndex.value >= 0
        ) {
            event.preventDefault();

            return suggestions.value[activeSuggestionIndex.value].name;
        } else if (event.key === "Escape") {
            hideSuggestions();
        }

        return null;
    }

    function selectSuggestion(pokemon) {
        searchQuery.value = pokemon.name;
        hideSuggestions();
        return pokemon.name;
    }

    function handleSearchBlur() {
        window.setTimeout(hideSuggestions, 120);
    }

    function invalidateSuggestions() {
        suggestionRequestId += 1;
        window.clearTimeout(suggestionTimer);
        hideSuggestions();
    }

    onUnmounted(() => {
        window.clearTimeout(suggestionTimer);
        suggestionRequestId += 1;
    });

    return {
        searchQuery,
        suggestions,
        activeSuggestionIndex,
        isLoadingSuggestions,
        handleSearchInput,
        handleSearchKeydown,
        selectSuggestion,
        handleSearchBlur,
        hideSuggestions,
        invalidateSuggestions,
    };
}
