import { formatPokemonName } from "../utils/formatters.js";
import { navigateToPokemon } from "../features/navigation.js";

const modalElement = document.getElementById("forms-modal");
const contentElement = document.getElementById("forms-content");

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

export function displayPokemonForms(forms) {
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
        image.loading = "lazy";
        image.decoding = "async";
        let imageCandidateIndex = 0;
        image.onerror = () => {
            imageCandidateIndex += 1;
            if (imageCandidateIndex < imageCandidates.length) {
                image.src = imageCandidates[imageCandidateIndex];
                return;
            }

            image.onerror = null;
            image.classList.add("form-image-missing");
            image.removeAttribute("src");
        };
        if (imageCandidates.length) image.src = imageCandidates[0];
        else image.classList.add("form-image-missing");
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
            await hideModalAndWait();
            if (form.formResourceName) {
                window.dispatchEvent(new CustomEvent("pokemonformselected", { detail: { form } }));
                return;
            }

            const targetPokemonId = Number(form.pokemonId ?? form.id);
            if (Number.isSafeInteger(targetPokemonId) && targetPokemonId > 0) {
                await navigateToPokemon(targetPokemonId, 1);
            }
        });
        fragment.appendChild(card);
    });

    contentElement.appendChild(fragment);
}

export function showFormsModal() {
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}
