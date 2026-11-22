<script setup>
import { computed, ref, watch } from "vue";
import { formatPokemonName } from "../../utils/formatters.js";

const props = defineProps({
    pokemon: {
        type: Object,
        required: true,
    },
    currentPokemonId: {
        type: Number,
        default: null,
    },
});

const emit = defineEmits(["select"]);

const artworkIndex = ref(0);
const artworkUnavailable = ref(false);

const imageCandidates = computed(() =>
    Array.isArray(props.pokemon.imageCandidates)
        ? props.pokemon.imageCandidates.filter(Boolean)
        : [props.pokemon.image].filter(Boolean)
);

const currentArtwork = computed(
    () => imageCandidates.value[artworkIndex.value] || ""
);

watch(
    () => props.pokemon.id,
    () => {
        artworkIndex.value = 0;
        artworkUnavailable.value = false;
    }
);

function handleArtworkError() {
    if (artworkIndex.value + 1 < imageCandidates.value.length) {
        artworkIndex.value += 1;
        return;
    }

    artworkUnavailable.value = true;
}

function selectPokemon() {
    emit("select", Number(props.pokemon.id));
}
</script>

<template>
    <div class="evolution-node">
        <button
            type="button"
            class="evolution-card"
            :title="`View ${formatPokemonName(pokemon.name)}`"
            @click="selectPokemon"
        >
            <img
                v-if="currentArtwork && !artworkUnavailable"
                :src="currentArtwork"
                :alt="`${formatPokemonName(pokemon.name)} artwork`"
                loading="eager"
                decoding="async"
                @error="handleArtworkError"
            >
            <img
                v-else
                class="image-unavailable"
                :src="null"
                alt="Artwork unavailable"
            >
            <span class="evolution-name">
                {{ formatPokemonName(pokemon.name) }}
            </span>
            <span class="evolution-id">
                #{{ String(pokemon.id).padStart(3, "0") }}
            </span>
        </button>

        <template v-if="pokemon.evolvesTo?.length">
            <div class="evolution-arrow">↓</div>
            <div class="evolution-branches">
                <EvolutionNode
                    v-for="evolution in pokemon.evolvesTo"
                    :key="evolution.id"
                    :pokemon="evolution"
                    :current-pokemon-id="currentPokemonId"
                    @select="emit('select', $event)"
                />
            </div>
        </template>
    </div>
</template>
