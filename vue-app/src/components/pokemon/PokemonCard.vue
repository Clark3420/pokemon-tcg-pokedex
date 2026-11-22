
<script setup>
import { computed, ref, watch } from "vue";
import {
    formatPokemonName,
    formatPokemonId,
    formatStatName,
    formatHeight,
    formatWeight,
} from "../../utils/formatters.js";
import {
    getPokemonTypeBadgeUrl,
    getPokemonArtworkCandidates,
    getPokemonCardClass,
    getPokemonTypeColor,
} from "../../utils/pokemonCardUtils.js";

const props = defineProps({
    pokemon: {
        type: Object,
        default: null,
    },
    species: {
        type: Object,
        default: null,
    },
    artworkCandidates: {
        type: Array,
        default: null,
    },
    isFlipped: {
        type: Boolean,
        default: false,
    },
    selectedForm: {
        type: Object,
        default: null,
    },
    isCardLoading: {
        type: Boolean,
        default: false,
    },
    isCardSwapping: {
        type: Boolean,
        default: false,
    },
    navigationDirection: {
        type: Number,
        default: 0,
    },
});

const emit = defineEmits(["flip"]);

const artworkIndex = ref(0);
const artworkUnavailable = ref(false);

const displayPokemon = computed(() => {
    if (!props.pokemon) return null;

    const form = props.selectedForm;

    if (!form) return props.pokemon;

    const types = Array.isArray(form.types) && form.types.length
        ? form.types.map((type) => ({ type: { name: typeof type === "string" ? type : type.type.name } }))
        : props.pokemon.types;

    return {
        ...props.pokemon,
        types,
    };
});

const displayName = computed(() => {
    if (!props.pokemon) return "Pokémon";
    if (!props.selectedForm) return formatPokemonName(props.pokemon.name);

    const name = formatPokemonName(props.selectedForm.name || props.pokemon.name);
    const formName = String(props.selectedForm.formName || "").trim();

    return formName
        ? `${name} (${formatPokemonName(formName)} Form)`
        : name;
});

const imageCandidates = computed(() => {
    if (props.selectedForm?._loadedArtworkSrc) {
        return [
            props.selectedForm._loadedArtworkSrc,
            ...(props.selectedForm.imageCandidates || []).filter(
                (candidate) => candidate !== props.selectedForm._loadedArtworkSrc
            ),
        ];
    }

    if (props.selectedForm?.imageCandidates?.length) {
        return props.selectedForm.imageCandidates;
    }

    if (props.selectedForm?.image) {
        return [props.selectedForm.image];
    }

    return props.artworkCandidates?.length
        ? props.artworkCandidates
        : getPokemonArtworkCandidates(displayPokemon.value);
});

const currentArtwork = computed(() => {
    return imageCandidates.value[artworkIndex.value] || "";
});

const cardClass = computed(() => {
    return getPokemonCardClass(displayPokemon.value, props.species);
});

const typeColor = computed(() => {
    return getPokemonTypeColor(displayPokemon.value);
});

const primaryType = computed(() => {
    return displayPokemon.value?.types?.[0]?.type?.name || "normal";
});

watch(
    [
        () => props.pokemon?.id,
        () => props.selectedForm?.formId,
        () => props.selectedForm?.formName,
        () => props.selectedForm?.formResourceName,
    ],
    () => {
        artworkIndex.value = 0;
        artworkUnavailable.value = false;
    }
);

function handleArtworkError() {
    if (artworkIndex.value + 1 < imageCandidates.value.length) {
        artworkIndex.value += 1;
        artworkUnavailable.value = false;
        return;
    }

    artworkUnavailable.value = true;
}

function getStatWidth(baseStat) {
    return `${Math.min(baseStat / 255 * 100, 100)}%`;
}

function flipCard() {
    if (props.pokemon) {
        emit("flip");
    }
}
</script>


<template>
    <div
        id="pokemon-card"
        class="pokemon-card"
        :class="[
            cardClass,
            {
                'is-flipped': isFlipped,
                'card-is-loading': isCardLoading,
                'd-none': !pokemon,
                'card-swap-next': isCardSwapping && navigationDirection > 0,
                'card-swap-previous': isCardSwapping && navigationDirection < 0,
            },
        ]"
        :style="{ '--pokemon-type-color': typeColor }"
        :data-type="primaryType"
        tabindex="0"
        title="Flip Pokémon card"
        @click="flipCard"
        @keydown.enter.prevent="flipCard"
        @keydown.space.prevent="flipCard"
    >
        <div class="pokemon-card-inner">
            <article class="pokemon-card-face pokemon-card-front">
                <div class="card-frame">
                    <div class="card-heading">
                        <h2 id="pokemon-name">
                            {{ displayName }}
                        </h2>
                        <span id="pokemon-id">
                            {{ pokemon ? formatPokemonId(pokemon.id) : "#000" }}
                        </span>
                    </div>

                    <div class="pokemon-artwork-container">
                        <img
                            v-if="currentArtwork && !artworkUnavailable"
                            id="pokemon-image"
                            :src="currentArtwork"
                            :alt="`${displayName} artwork`"
                            :class="{ 'image-unavailable': artworkUnavailable }"
                            loading="eager"
                            fetchpriority="high"
                            decoding="async"
                            @error="handleArtworkError"
                        >
                        <img
                            v-else
                            id="pokemon-image"
                            class="image-unavailable"
                            src=""
                            alt="Pokémon artwork"
                        >
                    </div>

                    <div id="pokemon-types" class="pokemon-types">
                        <img
                            v-for="entry in displayPokemon?.types || []"
                            :key="entry.type.name"
                            class="type-badge"
                            :src="getPokemonTypeBadgeUrl(entry.type.name)"
                            :alt="`${entry.type.name} type`"
                            :title="formatPokemonName(entry.type.name)"
                            loading="eager"
                            decoding="sync"
                        >
                    </div>

                    <div class="pokemon-measurements">
                        <p>
                            Height:
                            <span id="pokemon-height">
                                {{ pokemon ? formatHeight(pokemon.height) : "—" }}
                            </span>
                        </p>
                        <p>
                            Weight:
                            <span id="pokemon-weight">
                                {{ pokemon ? formatWeight(pokemon.weight) : "—" }}
                            </span>
                        </p>
                    </div>

                    <h3 class="stats-heading">Base Stats</h3>

                    <div id="pokemon-stats" class="pokemon-stats">
                        <div
                            v-for="entry in pokemon?.stats || []"
                            :key="entry.stat.name"
                            class="stat-row"
                        >
                            <span class="stat-label">
                                {{ formatStatName(entry.stat.name) }}
                            </span>
                            <div class="stat-bar">
                                <div
                                    class="stat-bar-fill"
                                    :style="{ width: getStatWidth(entry.base_stat) }"
                                ></div>
                            </div>
                            <span class="stat-value">
                                {{ entry.base_stat }}
                            </span>
                        </div>
                    </div>

                    <p class="flip-hint">
                        Click or tap to reveal abilities
                    </p>
                </div>
            </article>

            <article class="pokemon-card-face pokemon-card-back">
                <div class="card-frame">
                    <h2 id="back-pokemon-name">
                        {{ displayName }}
                    </h2>

                    <div class="card-back-artwork">
                        <img
                            v-if="currentArtwork && !artworkUnavailable"
                            id="back-pokemon-image"
                            :src="currentArtwork"
                            :alt="`${displayName} artwork`"
                            loading="lazy"
                            decoding="async"
                            @error="handleArtworkError"
                        >
                        <img
                            v-else
                            id="back-pokemon-image"
                            src=""
                            alt=""
                        >
                    </div>

                    <h3>Abilities</h3>

                    <div id="pokemon-abilities" class="pokemon-abilities">
                        <div
                            v-for="entry in pokemon?.abilities || []"
                            :key="entry.ability.name"
                            class="ability-item"
                        >
                            <div class="ability-name">
                                {{ formatPokemonName(entry.ability.name) }}
                                <span
                                    v-if="entry.is_hidden"
                                    class="badge text-bg-info ms-2"
                                >
                                    Hidden
                                </span>
                            </div>
                        </div>
                    </div>

                    <p class="flip-hint">
                        Click or tap to return
                    </p>
                </div>
            </article>
        </div>
    </div>
</template>

