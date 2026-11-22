
<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
    region: {
        type: String,
        default: "all",
    },
    type: {
        type: String,
        default: "all",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    "update:region",
    "update:type",
    "random",
]);

const regions = [
    { value: "all", label: "All Regions" },
    { value: "kanto", label: "Kanto" },
    { value: "johto", label: "Johto" },
    { value: "hoenn", label: "Hoenn" },
    { value: "sinnoh", label: "Sinnoh" },
    { value: "unova", label: "Unova" },
    { value: "kalos", label: "Kalos" },
    { value: "alola", label: "Alola" },
    { value: "galar", label: "Galar" },
    { value: "hisui", label: "Hisui" },
    { value: "paldea", label: "Paldea" },
];

const types = [
    { value: "all", label: "All Types" },
    { value: "normal", label: "Normal" },
    { value: "fire", label: "Fire" },
    { value: "water", label: "Water" },
    { value: "electric", label: "Electric" },
    { value: "grass", label: "Grass" },
    { value: "ice", label: "Ice" },
    { value: "fighting", label: "Fighting" },
    { value: "poison", label: "Poison" },
    { value: "ground", label: "Ground" },
    { value: "flying", label: "Flying" },
    { value: "psychic", label: "Psychic" },
    { value: "bug", label: "Bug" },
    { value: "rock", label: "Rock" },
    { value: "ghost", label: "Ghost" },
    { value: "dragon", label: "Dragon" },
    { value: "dark", label: "Dark" },
    { value: "steel", label: "Steel" },
    { value: "fairy", label: "Fairy" },
];

const TYPE_FILTER_COLORS = {
    all: "#cbd5e1",
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

const regionDropdown = ref(null);
const typeDropdown = ref(null);
const isRegionOpen = ref(false);
const isTypeOpen = ref(false);

const selectedRegionLabel = () =>
    regions.find((region) => region.value === props.region)?.label || "All Regions";

const selectedTypeLabel = () =>
    types.find((type) => type.value === props.type)?.label || "All Types";

function selectRegion(value) {
    if (props.disabled) return;

    emit("update:region", value);
    isRegionOpen.value = false;
}

function selectType(value) {
    if (props.disabled) return;

    emit("update:type", value);
    isTypeOpen.value = false;
}

function toggleRegionMenu() {
    if (props.disabled) return;

    isRegionOpen.value = !isRegionOpen.value;
    isTypeOpen.value = false;
}

function toggleTypeMenu() {
    if (props.disabled) return;

    isTypeOpen.value = !isTypeOpen.value;
    isRegionOpen.value = false;
}

function handleOutsideClick(event) {
    if (!regionDropdown.value?.contains(event.target)) {
        isRegionOpen.value = false;
    }

    if (!typeDropdown.value?.contains(event.target)) {
        isTypeOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
    document.removeEventListener("click", handleOutsideClick);
});
</script>

<template>
    <section class="filter-section mb-4">
        <div class="row g-3 align-items-end">
            <div class="col-12 col-sm-4 col-xl-4">
                <label for="region-filter" class="form-label">
                    Region
                </label>

                <select
                    id="region-filter"
                    class="form-select d-none"
                    tabindex="-1"
                    :value="region"
                    :disabled="disabled"
                    @change="selectRegion($event.target.value)"
                >
                    <option
                        v-for="option in regions"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </option>
                </select>

                <div
                    ref="regionDropdown"
                    class="type-filter-dropdown region-filter-dropdown"
                    id="region-filter-dropdown"
                >
                    <button
                        type="button"
                        class="type-filter-trigger"
                        id="region-filter-trigger"
                        :class="{ 'is-open': isRegionOpen }"
                        :disabled="disabled"
                        @click.stop="toggleRegionMenu"
                    >
                        {{ selectedRegionLabel() }}
                        <span class="type-filter-chevron"></span>
                    </button>

                    <div
                        class="type-filter-menu"
                        :class="{ 'd-none': !isRegionOpen }"
                        id="region-filter-menu"
                    >
                        <button
                            v-for="option in regions"
                            :key="option.value"
                            type="button"
                            class="type-filter-option region-filter-option"
                            :class="{
                                'is-selected': region === option.value
                            }"
                            :disabled="disabled"
                            @click="selectRegion(option.value)"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-sm-4 col-xl-4">
                <label for="type-filter" class="form-label">
                    Pokémon Type
                </label>

                <select
                    id="type-filter"
                    class="form-select d-none"
                    tabindex="-1"
                    :value="type"
                    :disabled="disabled"
                    @change="selectType($event.target.value)"
                >
                    <option
                        v-for="option in types"
                        :key="option.value"
                        :value="option.value"
                    >
                        {{ option.label }}
                    </option>
                </select>

                <div
                    ref="typeDropdown"
                    class="type-filter-dropdown"
                    id="type-filter-dropdown"
                >
                    <button
                        type="button"
                        class="type-filter-trigger"
                        id="type-filter-trigger"
                        :class="{ 'is-open': isTypeOpen }"
                        :disabled="disabled"
                        @click.stop="toggleTypeMenu"
                    >
                        {{ selectedTypeLabel() }}
                        <span class="type-filter-chevron"></span>
                    </button>

                    <div
                        class="type-filter-menu"
                        :class="{ 'd-none': !isTypeOpen }"
                        id="type-filter-menu"
                    >
                        <button
                            v-for="option in types"
                            :key="option.value"
                            type="button"
                            class="type-filter-option"
                            :class="{
                                'is-selected': type === option.value
                            }"
                            :style="{
                                '--type-color': TYPE_FILTER_COLORS[option.value] || '#cbd5e1'
                            }"
                            :disabled="disabled"
                            @click="selectType(option.value)"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-sm-4 col-xl-4">
                <button
                    type="button"
                    id="random-button"
                    class="btn btn-outline-danger w-100"
                    :disabled="disabled"
                    @click="emit('random')"
                >
                    🎲 Random Pokémon
                </button>
            </div>
        </div>
    </section>
</template>
