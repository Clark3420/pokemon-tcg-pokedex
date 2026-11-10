import { formatPokemonName } from "../utils/formatters.js";
import { navigateToPokemon, getCurrentPokemonId } from "../features/navigation.js";

const modalElement = document.getElementById("forms-modal");
const contentElement = document.getElementById("forms-content");
const loadingElement = document.getElementById("forms-loading");
const modalBodyElement = modalElement.querySelector(".modal-body");
const introElement = modalElement.querySelector(".forms-intro");

export function setFormsModalLoading(isLoading) {
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

    image.classList.add("form-image-missing");
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

function titleCase(value) {
    return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function displayPokemonForms(forms) {
    contentElement.replaceChildren();
    const fragment = document.createDocumentFragment();

    forms.forEach((form) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "form-option-card";
        card.title = `View ${formatPokemonName(form.name)}, Pokédex ID ${form.id}`;

        const artworkFrame = document.createElement("span");
        artworkFrame.className = "form-artwork-frame";
        const image = document.createElement("img");
        const imageCandidates = Array.isArray(form.imageCandidates) && form.imageCandidates.length
            ? form.imageCandidates
            : [form.image].filter(Boolean);
        image.alt = `${formatPokemonName(form.name)} ${form.formName ? titleCase(form.formName) + " form " : ""}artwork`;
        image.loading = "eager";
        image.decoding = "async";
        if (imageCandidates.length) {
            image.dataset.imageCandidates = JSON.stringify(imageCandidates);
        } else {
            image.classList.add("form-image-missing");
        }
        artworkFrame.appendChild(image);

        const name = document.createElement("strong");
        name.textContent = form.formName
            ? `${titleCase(form.name)} (${titleCase(form.formName)} Form)`
            : titleCase(form.name);
        const id = document.createElement("span");
        id.className = "form-option-id";
        const pokemonId = Number(form.pokemonId ?? form.id);
        id.textContent = form.formId
            ? `Pokémon #${String(pokemonId).padStart(4, "0")} · Form #${form.formId}`
            : `Pokémon #${String(pokemonId).padStart(4, "0")}`;

        const typeList = document.createElement("span");
        typeList.className = "form-option-types";
        typeList.textContent = form.types.map(titleCase).join(" · ");

        const tag = document.createElement("span");
        tag.className = "form-option-tag";
        tag.textContent = form.isDefault ? "Base form" : "Alternate form";

        card.append(artworkFrame, name, id, typeList, tag);
        card.addEventListener("click", async () => {
            const targetPokemonId = Number(form.pokemonId ?? form.id);
            const currentPokemonId = Number(getCurrentPokemonId());

            if (
                !form.formResourceName &&
                Number.isSafeInteger(targetPokemonId) &&
                targetPokemonId === currentPokemonId
            ) return;

            if (form.formResourceName) {
                window.dispatchEvent(new CustomEvent("pokemonformselected", { detail: { form } }));
                await hideModalAndWait();
                return;
            }

            await hideModalAndWait();
            if (Number.isSafeInteger(targetPokemonId) && targetPokemonId > 0) {
                const direction = targetPokemonId > currentPokemonId ? 1 : -1;
                await navigateToPokemon(targetPokemonId, direction);
            }
        });
        fragment.appendChild(card);
    });

    contentElement.appendChild(fragment);
    const imageTasks = [...contentElement.querySelectorAll("img")].map((image) => {
        let candidates = [];
        try { candidates = JSON.parse(image.dataset.imageCandidates || "[]"); } catch { candidates = []; }
        delete image.dataset.imageCandidates;
        return candidates.length ? loadImageCandidates(image, candidates) : Promise.resolve();
    });
    await Promise.all(imageTasks);
}

export function showFormsModal() {
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}
