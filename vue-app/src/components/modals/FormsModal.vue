<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Modal } from "bootstrap";
import { formatPokemonName } from "../../utils/formatters.js";

const props = defineProps({
    pokemon: {
        type: Object,
        default: null,
    },
    forms: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["select-form"]);

const modalElement = ref(null);
const forms = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const imageIndexes = reactive({});
const unavailableImages = reactive({});

let modalInstance = null;
let pendingForm = null;
let hiddenHandler = null;
let requestId = 0;

onMounted(() => {
    modalInstance = Modal.getOrCreateInstance(modalElement.value);
    hiddenHandler = () => {
        if (pendingForm) {
            const selectedForm = pendingForm;
            pendingForm = null;
            emit("select-form", selectedForm);
        }
    };
    modalElement.value.addEventListener("hidden.bs.modal", hiddenHandler);
});

onBeforeUnmount(() => {
    requestId += 1;

    if (modalElement.value && hiddenHandler) {
        modalElement.value.removeEventListener("hidden.bs.modal", hiddenHandler);
    }

    modalInstance?.dispose();
});

function getFormKey(form) {
    return `${form.formResourceName || form.name}-${form.formId ?? form.pokemonId ?? form.id}`;
}

function getImageCandidates(form) {
    return Array.isArray(form.imageCandidates) && form.imageCandidates.length
        ? form.imageCandidates.filter(Boolean)
        : [form.image].filter(Boolean);
}

function getCurrentImage(form) {
    const key = getFormKey(form);
    const candidates = getImageCandidates(form);
    return candidates[imageIndexes[key] || 0] || "";
}

function handleImageError(form) {
    const key = getFormKey(form);
    const candidates = getImageCandidates(form);
    const currentIndex = imageIndexes[key] || 0;

    if (currentIndex + 1 < candidates.length) {
        imageIndexes[key] = currentIndex + 1;
        return;
    }

    unavailableImages[key] = true;
}

function titleCase(value) {
    return String(value || "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFormTitle(form) {
    const name = titleCase(form.name);
    return form.formName ? `${name} (${titleCase(form.formName)} Form)` : name;
}

function getFormIdentifier(form) {
    const pokemonId = Number(form.pokemonId ?? form.id);
    const paddedPokemonId = String(pokemonId).padStart(4, "0");

    return form.formId
        ? `Pokémon #${paddedPokemonId} · Form #${form.formId}`
        : `Pokémon #${paddedPokemonId}`;
}

async function preloadFormArtwork(form) {
    const candidates = getImageCandidates(form);

    for (const candidate of candidates) {
        try {
            await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = resolve;
                image.onerror = reject;
                image.src = candidate;

                if (image.complete && image.naturalWidth > 0) {
                    resolve();
                }
            });

            return;
        } catch {
        }
    }
}

async function open() {
    if (!props.pokemon?.id || !modalInstance || isLoading.value) return;

    const currentRequestId = ++requestId;
    forms.value = [...props.forms];
    errorMessage.value = "";
    Object.keys(imageIndexes).forEach((key) => delete imageIndexes[key]);
    Object.keys(unavailableImages).forEach((key) => delete unavailableImages[key]);
    isLoading.value = true;
    modalInstance.show();

    try {
        await Promise.all(forms.value.map(preloadFormArtwork));

        if (currentRequestId !== requestId) return;
    } finally {
        if (currentRequestId === requestId) {
            isLoading.value = false;
        }
    }
}

function close() {
    modalInstance?.hide();
}

function selectForm(form) {
    pendingForm = form;
    close();
}

defineExpose({ open, close });
</script>

<template>
    <div
        id="forms-modal"
        ref="modalElement"
        class="modal fade"
        tabindex="-1"
    >
        <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div class="modal-content forms-modal-content">
                <div class="modal-header">
                    <div>
                        <p class="eyebrow mb-1">ALTERNATE FORMS</p>
                        <h2 class="modal-title fs-5" id="forms-modal-title">
                            Pokémon Forms
                        </h2>
                    </div>
                    <button
                        type="button"
                        class="btn-close"
                        title="Close"
                        @click="close"
                    ></button>
                </div>

                <div
                    class="modal-body"
                    :class="{ 'modal-is-loading': isLoading }"
                >
                    <div
                        class="modal-artwork-loading"
                        :class="{ 'd-none': !isLoading }"
                    >
                        <div class="pokeball-loader">
                            <span class="pokeball-loader-center"></span>
                        </div>
                        <p>Loading Pokémon forms...</p>
                    </div>

                    <p class="forms-intro">
                        Choose a form to view it in your Pokédex.
                    </p>

                    <p v-if="errorMessage" class="text-center text-danger mb-0">
                        {{ errorMessage }}
                    </p>

                    <p
                        v-else-if="!isLoading && forms.length === 0"
                        class="text-center mb-0"
                    >
                        No alternate forms are available for this Pokémon.
                    </p>

                    <div v-else id="forms-content" class="forms-grid">
                        <button
                            v-for="form in forms"
                            :key="getFormKey(form)"
                            type="button"
                            class="form-option-card"
                            :title="`View ${formatPokemonName(form.name)}, Pokédex ID ${form.pokemonId ?? form.id}`"
                            @click="selectForm(form)"
                        >
                            <span class="form-artwork-frame">
                                <img
                                    v-if="getCurrentImage(form) && !unavailableImages[getFormKey(form)]"
                                    :src="getCurrentImage(form)"
                                    :alt="`${getFormTitle(form)} artwork`"
                                    loading="eager"
                                    decoding="async"
                                    @error="handleImageError(form)"
                                >
                                <span
                                    v-else
                                    class="form-image-missing"
                                >
                                    Artwork unavailable
                                </span>
                            </span>

                            <strong>{{ getFormTitle(form) }}</strong>
                            <span class="form-option-id">
                                {{ getFormIdentifier(form) }}
                            </span>
                            <span class="form-option-types">
                                {{ (form.types || []).map(titleCase).join(" · ") }}
                            </span>
                            <span class="form-option-tag">
                                {{ form.isDefault ? "Base form" : "Alternate form" }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
