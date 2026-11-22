
<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import PokemonCard from "./components/pokemon/PokemonCard.vue";
import { usePokemonNavigation } from "./composables/usePokemonNavigation.js";
import { useCardInteractions } from "./composables/useCardInteractions.js";
import { useCollection } from "./composables/useCollection.js";
import { getAllPokemonIds } from "./services/pokemonService.js";
import { usePokemonSearch } from "./composables/usePokemonSearch.js";
import PokemonFilters from "./components/pokemon/PokemonFilters.vue";
import { getFilteredPokemon } from "./services/collectionService.js";
import EvolutionModal from "./components/modals/EvolutionModal.vue";
import FormsModal from "./components/modals/FormsModal.vue";
import { getPokemonForms } from "./services/formsService.js";
import { getPokemonTypeBadgeUrl } from "./utils/pokemonCardUtils.js";

const navigation = usePokemonNavigation();
const collection = useCollection();
const {
    totalViews,
    discoveredBasePokemon,
    completion,
    formattedCompletion,
    activeCollectionCount,
} = collection;
const evolutionModal = ref(null);
const formsModal = ref(null);
const selectedForm = ref(null);
const isApplyingForm = ref(false);
let formApplyRequestId = 0;
const availableForms = ref([]);
const isCheckingForms = ref(false);
let formsRequestId = 0;
let currentDisplayedFormResourceName = "";
const selectedRegion = ref("all");
const selectedType = ref("all");
const isFiltering = ref(false);
const filterStatus = ref("");
const hasFilterResults = ref(true);

const search = usePokemonSearch();

const {
    searchQuery,
    suggestions,
    activeSuggestionIndex,
    handleSearchInput,
    handleSearchKeydown,
    selectSuggestion,
    handleSearchBlur,
    invalidateSuggestions,
} = search;

const {
    currentPokemon,
    currentSpecies,
    artworkCandidates,
    navigationInProgress,
    isLoading,
    loadingCompact,
    isCardSwapping,
    navigationDirection,
    error,
    canNavigatePrevious,
    canNavigateNext,
    navigateToPokemon,
    navigateByOffset,
    retryLastNavigation,
} = navigation;

const {
    isFlipped,
    toggleCard,
    handlePointerDown,
    handleViewerClickCapture,
    handleDragStart,
    resetCard,
} = useCardInteractions(navigateByOffset, navigationInProgress);

watch(
    () => currentPokemon.value?.id,
    async (id) => {
        const requestId = ++formsRequestId;

        formApplyRequestId += 1;
        isApplyingForm.value = false;
        selectedForm.value = null;
        availableForms.value = [];
        isCheckingForms.value = Boolean(id);
        currentDisplayedFormResourceName = currentPokemon.value?.name || "";

        if (!id) {
            resetCard();
            return;
        }

        resetCard();
        collection.recordDiscoveredPokemon(id);

        const primaryType = currentPokemon.value?.types?.[0]?.type?.name;
        if (primaryType) {
            document.body.dataset.pokemonType = primaryType;
        }

        try {
            const forms = await getPokemonForms(currentPokemon.value);

            if (requestId !== formsRequestId) return;

            availableForms.value = forms;
        } catch (error) {
            if (requestId !== formsRequestId) return;

            availableForms.value = [];
            console.warn("Pokémon forms unavailable:", error.message);
        } finally {
            if (requestId === formsRequestId) {
                isCheckingForms.value = false;
            }
        }
    },
    { immediate: true }
);

onMounted(() => {
    collection.setActiveCollectionCount(1351);
    navigateToPokemon(25);
});

onUnmounted(() => {
    formsRequestId += 1;
    navigation.invalidatePendingNavigation();
});

async function submitSearch(identifier = searchQuery.value) {
    const query = String(identifier).trim();

    if (!query || navigationInProgress.value || isFiltering.value) {
        return;
    }

    invalidateSuggestions();
    searchQuery.value = query;

    selectedRegion.value = "all";
    selectedType.value = "all";
    filterStatus.value = "";
    hasFilterResults.value = true;

    navigation.invalidatePendingNavigation();

    try {
        const allPokemonIds = await getAllPokemonIds();
        navigation.setNavigationCollection(allPokemonIds);
    } catch {
        navigation.setNavigationCollection(
            Array.from({ length: 1351 }, (_, index) => index + 1)
        );
    }

    collection.setActiveCollectionCount(1351);

    await navigateToPokemon(query);
}

async function applyFilters() {
    if (isFiltering.value || navigationInProgress.value) {
        return;
    }

    isFiltering.value = true;
    filterStatus.value = "";

    navigation.invalidatePendingNavigation();

    try {
        const filteredPokemon = await getFilteredPokemon(
            selectedRegion.value,
            selectedType.value
        );

        navigation.setNavigationCollection(
            filteredPokemon.map((pokemon) => pokemon.id)
        );
        collection.setActiveCollectionCount(filteredPokemon.length);

        if (filteredPokemon.length === 0) {
            hasFilterResults.value = false;
            filterStatus.value = "No Pokémon match the selected filters.";
            return;
        }

        hasFilterResults.value = true;

        await navigateToPokemon(filteredPokemon[0].id);
    } catch (error) {
        filterStatus.value = `Unable to apply filters: ${error.message}`;
    } finally {
        isFiltering.value = false;
    }
}

async function showRandomPokemon() {
    if (isFiltering.value || navigationInProgress.value) {
        return;
    }

    const availableIds = navigation.getNavigationCollection();

    if (availableIds.length === 0) {
        filterStatus.value = "There are no Pokémon in the current collection.";
        return;
    }

    const currentId = currentPokemon.value?.id;

    const candidates = availableIds.length > 1
        ? availableIds.filter((id) => Number(id) !== Number(currentId))
        : availableIds;

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const randomId = candidates[randomIndex];

    const direction = Number(randomId) > Number(currentId) ? 1 : -1;

    filterStatus.value = "";

    await navigateToPokemon(randomId, direction);
}

function chooseSuggestion(pokemon) {
    const identifier = selectSuggestion(pokemon);
    submitSearch(identifier);
}

function handleSearchInputKeydown(event) {
    const selectedPokemon = handleSearchKeydown(event);

    if (selectedPokemon) {
        submitSearch(selectedPokemon);
    }
}

function handleRegionChange(region) {
    selectedRegion.value = region;
    applyFilters();
}

function handleTypeChange(type) {
    selectedType.value = type;
    applyFilters();
}

function openEvolutionModal() {
    if (currentPokemon.value) {
        evolutionModal.value?.open();
    }
}

function openFormsModal() {
    if (currentPokemon.value && availableForms.value.length >= 2) {
        formsModal.value?.open();
    }
}

function preloadImage(url) {
    if (!url) return Promise.resolve(false);

    return new Promise((resolve) => {
        const image = new Image();
        image.onload = async () => {
            try {
                if (typeof image.decode === "function") {
                    await image.decode();
                }
            } catch {
            }
            resolve(true);
        };
        image.onerror = () => resolve(false);
        image.src = url;

        if (image.complete && image.naturalWidth > 0) {
            resolve(true);
        }
    });
}

async function preloadFormArtwork(form) {
    const candidates = Array.isArray(form.imageCandidates) && form.imageCandidates.length
        ? form.imageCandidates.filter(Boolean)
        : [form.image].filter(Boolean);

    for (const candidate of candidates) {
        if (await preloadImage(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function handleFormSelection(form) {
    if (!form || !currentPokemon.value) return;

    const targetPokemonId = Number(form.pokemonId ?? form.id);
    const currentPokemonId = Number(currentPokemon.value.id);
    const targetFormResourceName = form.formResourceName || form.name;

    if (!Number.isSafeInteger(targetPokemonId) || targetPokemonId < 1) {
        return;
    }

    if (
        targetPokemonId === currentPokemonId &&
        targetFormResourceName === currentDisplayedFormResourceName
    ) {
        return;
    }

    if (targetPokemonId !== currentPokemonId) {
        await navigateToPokemon(
            targetPokemonId,
            targetPokemonId > currentPokemonId ? 1 : -1
        );
        return;
    }

    const requestId = ++formApplyRequestId;
    isApplyingForm.value = true;

    try {
        const types = Array.isArray(form.types) ? form.types : [];
        await Promise.all(
            types.map((type) => preloadImage(getPokemonTypeBadgeUrl(type)))
        );

        const loadedArtwork = await preloadFormArtwork(form);

        if (requestId !== formApplyRequestId) return;

        if (loadedArtwork) {
            form._loadedArtworkSrc = loadedArtwork;
        }

        currentDisplayedFormResourceName = targetFormResourceName;
        selectedForm.value = { ...form };

        const primaryType = types[0] || "normal";
        document.body.dataset.pokemonType = primaryType;
    } finally {
        if (requestId === formApplyRequestId) {
            isApplyingForm.value = false;
        }
    }
}

</script>

<template>
    <header class="app-header">
        <div class="container py-4 py-lg-5">
            <div class="text-center mb-4">
                <p class="eyebrow mb-2">YOUR GATEWAY TO THE WORLD OF POKÉMON</p>
                <h1 class="app-title">POKÉDEX <span>TCG</span></h1>
                <p class="app-subtitle">Discover. Explore. Learn.</p>
            </div>

            <form
                    id="search-form"
                    class="search-form mx-auto"
                    @submit.prevent="submitSearch()"
                >
                    <div class="input-group">
                        <input
                            id="search-input"
                            type="search"
                            class="form-control"
                            placeholder="Search Pokémon by name or ID..."
                            autocomplete="off"
                            required
                            :value="searchQuery"
                            @input="handleSearchInput($event.target.value)"
                            @keydown="handleSearchInputKeydown"
                            @blur="handleSearchBlur"
                        >

                        <button
                            id="search-button"
                            type="submit"
                            class="btn btn-danger"
                            :disabled="navigationInProgress || isFiltering"
                        >
                            Search
                        </button>
                    </div>

                    <div
                        id="search-suggestions"
                        class="search-suggestions"
                        :class="{ 'd-none': suggestions.length === 0 }"
                    >
                        <button
                            v-for="(pokemon, index) in suggestions"
                            :key="pokemon.id"
                            type="button"
                            class="search-suggestion"
                            :class="{ 'is-active': index === activeSuggestionIndex }"
                            @mousedown.prevent
                            @click="chooseSuggestion(pokemon)"
                        >
                            <span class="search-suggestion-name">
                                {{ pokemon.name.replace(/-/g, " ") }}
                            </span>

                            <span class="search-suggestion-id">
                                #{{ pokemon.id }}
                            </span>
                        </button>
                    </div>
                </form>

                <label class="visually-hidden" for="search-input">
                    Search Pokémon by name or ID
                </label>

                <section
                    id="error-message"
                    v-if="error"
                    class="pokemon-error-panel mt-3"
                >
                    <div class="pokemon-error-icon">!</div>

                    <div class="pokemon-error-content">
                        <strong>{{ error.title }}</strong>
                        <p class="mb-0">{{ error.message }}</p>
                        <small>{{ error.hint }}</small>
                    </div>

                </section>
        </div>
    </header>

    <main class="container app-main py-4 py-lg-5">
        <section class="collection-dashboard mb-4">
            <div class="dashboard-heading">
                <div>
                    <p class="eyebrow mb-1">YOUR JOURNEY</p>
                    <h2 id="dashboard-title">Collection overview</h2>
                </div>

                <span class="dashboard-total">
                    <span>{{ activeCollectionCount.toLocaleString() }}</span>
                    in current view
                </span>
            </div>

            <div class="dashboard-stats">
                <article class="dashboard-stat">
                    <span class="dashboard-stat-icon">◈</span>

                    <div class="dashboard-stat-copy">
                        <span class="dashboard-stat-label">Total Pokémon Views</span>
                        <strong>{{ totalViews.toLocaleString() }}</strong>
                        <small>Times Pokémon cards viewed</small>
                    </div>
                </article>

                <article class="dashboard-stat dashboard-progress-stat">
                    <span class="dashboard-stat-icon progress-icon">↗</span>

                    <div class="dashboard-stat-copy">
                        <div class="progress-label-row">
                            <span class="dashboard-stat-label">Pokédex completion</span>
                            <strong>{{ formattedCompletion }}</strong>
                        </div>

                        <div class="collection-progress">
                            <span :style="{ width: `${completion}%` }"></span>
                        </div>

                        <small>
                            {{ discoveredBasePokemon.toLocaleString() }}
                            of 1,351 unique Pokémon discovered
                        </small>
                    </div>
                </article>
            </div>
        </section>

        <PokemonFilters
            :region="selectedRegion"
            :type="selectedType"
            :disabled="isFiltering"
            @update:region="handleRegionChange"
            @update:type="handleTypeChange"
            @random="showRandomPokemon"
        />

          <p
              v-if="filterStatus"
              class="text-center text-danger mb-3"
          >
              {{ filterStatus }}
          </p>

        <section
              v-if="hasFilterResults"
              id="pokemon-viewer"
              class="pokemon-viewer"
              @pointerdown="handlePointerDown"
              @click.capture="handleViewerClickCapture"
          >
            <button
                type="button"
                class="navigation-button"
                title="Previous Pokémon"
                :disabled="!canNavigatePrevious"
                @click="navigateByOffset(-1)"
            >
                <span>‹</span>
            </button>

            <div class="pokemon-card-wrapper">
                <div
                    v-if="isLoading && !currentPokemon"
                    class="text-center py-5"
                >
                    <div class="pokeball-loader">
                        <span class="pokeball-loader-center"></span>
                    </div>
                    <p class="mt-3">{{ isApplyingForm ? "Loading Pokémon form..." : "Loading Pokémon..." }}</p>
                </div>

                <PokemonCard
                    :pokemon="currentPokemon"
                    :species="currentSpecies"
                    :artwork-candidates="artworkCandidates"
                    :is-flipped="isFlipped"
                    :selected-form="selectedForm"
                    :is-card-loading="isApplyingForm"
                    :is-card-swapping="isCardSwapping"
                    :navigation-direction="navigationDirection"
                    @flip="toggleCard"
                    @dragstart="handleDragStart"
                />

                <div
                    v-if="(isLoading || isApplyingForm) && currentPokemon"
                    class="pokemon-loading-overlay"
                    :class="{ 'loading-compact': loadingCompact || isApplyingForm }"
                >
                    <div class="pokeball-loader">
                        <span class="pokeball-loader-center"></span>
                    </div>
                    <p class="mt-3">{{ isApplyingForm ? "Loading Pokémon form..." : "Loading Pokémon..." }}</p>
                </div>
            </div>

            <button
                type="button"
                class="navigation-button"
                title="Next Pokémon"
                :disabled="!canNavigateNext"
                @click="navigateByOffset(1)"
            >
                <span>›</span>
            </button>
        </section>

        <section
            v-if="hasFilterResults"
            class="card-actions d-flex justify-content-center flex-wrap gap-3 mt-4"
        >
            <button
                type="button"
                class="btn btn-danger px-4"
                :disabled="!currentPokemon || navigationInProgress"
                @click="openEvolutionModal"
            >
                View Evolution Chain
            </button>

            <button
                type="button"
                class="btn btn-info px-4"
                :disabled="isCheckingForms || availableForms.length < 2 || navigationInProgress"
                :title="
                    isCheckingForms
                        ? 'Checking whether this Pokémon has alternate forms.'
                        : availableForms.length < 2
                            ? 'This Pokémon has no alternate forms.'
                            : 'View this Pokémon’s alternate forms.'
                "
                @click="openFormsModal"
            >
                {{ isCheckingForms ? "Checking Forms..." : "View Pokémon Forms" }}
            </button>
        </section>
        <EvolutionModal
            ref="evolutionModal"
            :pokemon="currentPokemon"
            @select-pokemon="navigateToPokemon"
        />
        <FormsModal
            ref="formsModal"
            :pokemon="currentPokemon"
            :forms="availableForms"
            @select-form="handleFormSelection"
        />
    </main>
</template>
