<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Modal } from "bootstrap";
import EvolutionNode from "./EvolutionNode.vue";
import { getEvolutionChain } from "../../services/evolutionService.js";

const props = defineProps({
    pokemon: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(["select-pokemon"]);

const modalElement = ref(null);
const evolutionChain = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");

let modalInstance = null;
let pendingPokemonId = null;
let hiddenHandler = null;

onMounted(() => {
    modalInstance = Modal.getOrCreateInstance(modalElement.value);
    hiddenHandler = () => {
        if (pendingPokemonId !== null) {
            const selectedId = pendingPokemonId;
            pendingPokemonId = null;
            emit("select-pokemon", selectedId);
        }
    };
    modalElement.value.addEventListener("hidden.bs.modal", hiddenHandler);
});

onBeforeUnmount(() => {
    if (modalElement.value && hiddenHandler) {
        modalElement.value.removeEventListener("hidden.bs.modal", hiddenHandler);
    }

    modalInstance?.dispose();
});

async function open() {
    if (!props.pokemon?.id || !modalInstance) return;

    evolutionChain.value = null;
    errorMessage.value = "";
    isLoading.value = true;
    modalInstance.show();

    try {
        evolutionChain.value = await getEvolutionChain(props.pokemon.id);
    } catch (error) {
        errorMessage.value = error.message || "Unable to load the evolution chain.";
    } finally {
        isLoading.value = false;
    }
}

function close() {
    modalInstance?.hide();
}

function handlePokemonSelection(pokemonId) {
    if (Number(pokemonId) === Number(props.pokemon?.id)) {
        close();
        return;
    }

    pendingPokemonId = Number(pokemonId);
    close();
}

defineExpose({ open, close });
</script>

<template>
    <div
        id="evolution-modal"
        ref="modalElement"
        class="modal fade"
        tabindex="-1"
    >
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title fs-5" id="evolution-modal-title">
                        Evolution Chain
                    </h2>
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
                        <p>Loading evolution artwork...</p>
                    </div>

                    <p v-if="errorMessage" class="text-center text-danger mb-0">
                        {{ errorMessage }}
                    </p>

                    <div v-else id="evolution-content">
                        <EvolutionNode
                            v-if="evolutionChain"
                            :pokemon="evolutionChain"
                            :current-pokemon-id="Number(pokemon?.id)"
                            @select="handlePokemonSelection"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
