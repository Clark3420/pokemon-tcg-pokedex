import { formatPokemonName } from "../utils/formatters.js";
import { navigateToPokemon, getCurrentPokemonId } from "../features/navigation.js";

const modalElement = document.getElementById("evolution-modal");
const contentElement = document.getElementById("evolution-content");
const loadingElement = document.getElementById("evolution-loading");
const modalBodyElement = modalElement.querySelector(".modal-body");

export function setEvolutionModalLoading(isLoading) {
    loadingElement.classList.toggle("d-none", !isLoading);
    modalBodyElement.classList.toggle("modal-is-loading", isLoading);
}

async function loadImageCandidates(image, candidates) {
    for (const candidate of candidates) {
        try {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = candidate;
                if (image.complete && image.naturalWidth > 0) resolve();
            });
            if (typeof image.decode === "function") {
                await image.decode().catch(() => {});
            }
            image.onload = null;
            image.onerror = null;
            return;
        } catch {
            image.onload = null;
            image.onerror = null;
        }
    }

    image.classList.add("image-unavailable");
    image.removeAttribute("src");
}

// Keep modal focus predictable without authored ARIA attributes.
let modalOpener = null;

function cleanModalAttributes() {
    modalElement.removeAttribute("aria-hidden");
    modalElement.removeAttribute("aria-modal");
    modalElement.removeAttribute("role");
    modalElement.querySelectorAll("*").forEach((element) => {
        element.removeAttribute("aria-hidden");
        element.removeAttribute("aria-modal");
        element.removeAttribute("role");
    });
}

modalElement.addEventListener("show.bs.modal", () => {
    modalOpener = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
});

modalElement.addEventListener("shown.bs.modal", () => {
    cleanModalAttributes();
    const closeButton = modalElement.querySelector(".btn-close");
    closeButton?.focus();
});

modalElement.addEventListener("hide.bs.modal", () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && modalElement.contains(activeElement)) {
        activeElement.blur();
    }
});

modalElement.addEventListener("hidden.bs.modal", () => {
    cleanModalAttributes();
    if (modalOpener instanceof HTMLElement && modalOpener.isConnected) {
        modalOpener.focus();
    }
    modalOpener = null;
});


function hideModalAndWait() {
    return new Promise((resolve) => {
        if (!modalElement.classList.contains("show")) {
            resolve();
            return;
        }
        modalElement.addEventListener("hidden.bs.modal", resolve, { once: true });
        bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    });
}

function createEvolutionNode(pokemon, imageTasks) {
    const node = document.createElement("div");
    node.className = "evolution-node";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "evolution-card";

    card.title = `View ${formatPokemonName(pokemon.name)}`;

    const image = document.createElement("img");
    const imageCandidates = Array.isArray(pokemon.imageCandidates)
        ? pokemon.imageCandidates.filter(Boolean)
        : [pokemon.image].filter(Boolean);
    image.alt = imageCandidates.length
        ? `${formatPokemonName(pokemon.name)} artwork`
        : "Artwork unavailable";
    image.loading = "eager";
    image.decoding = "async";
    if (imageCandidates.length) {
        imageTasks.push(loadImageCandidates(image, imageCandidates));
    } else {
        image.classList.add("image-unavailable");
    }

    const name = document.createElement("span");
    name.className = "evolution-name";
    name.textContent = formatPokemonName(pokemon.name);

    const id = document.createElement("span");
    id.className = "evolution-id";
    id.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

    card.append(image, name, id);

    card.addEventListener("click", async () => {
        const selectedPokemonId = Number(pokemon.id);
        const currentPokemonId = Number(getCurrentPokemonId());

        // Selecting the Pokémon already on the main card only closes the modal.
        // Do not trigger loading, navigation, or an artwork reload.
        if (selectedPokemonId === currentPokemonId) {
            await hideModalAndWait();
            return;
        }

        await hideModalAndWait();
        const direction = selectedPokemonId > currentPokemonId ? 1 : -1;
        await navigateToPokemon(selectedPokemonId, direction);
    });

    node.appendChild(card);

    if (pokemon.evolvesTo.length > 0) {
        const arrow = document.createElement("div");
        arrow.className = "evolution-arrow";
        arrow.textContent = "↓";

        node.appendChild(arrow);

        const branches = document.createElement("div");
        branches.className = "evolution-branches";

        pokemon.evolvesTo.forEach((evolution) => {
            branches.appendChild(createEvolutionNode(evolution, imageTasks));
        });

        node.appendChild(branches);
    }

    return node;
}

export async function displayEvolutionChain(chain) {
    contentElement.replaceChildren();
    const imageTasks = [];
    const tree = createEvolutionNode(chain, imageTasks);
    contentElement.appendChild(tree);
    await Promise.all(imageTasks);
}

export function showEvolutionModal() {
    bootstrap.Modal
        .getOrCreateInstance(modalElement)
        .show();
}
