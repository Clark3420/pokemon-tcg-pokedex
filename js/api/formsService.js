import { getJSON } from "./apiClient.js";
import { getPokemon } from "./pokemonService.js";

const FORM_LIST_PAGE_SIZE = 1000;
const FORM_DETAIL_CONCURRENCY = 4;
let formNamesPromise = null;

function resourceId(url, resource) {
    const match = String(url || "").match(new RegExp(`/${resource}/(\\d+)/?$`));
    if (!match) throw new Error(`Unable to identify this Pokémon's ${resource} resource.`);
    return Number(match[1]);
}

function pokemonArtworkCandidates(pokemon, formName = null) {
    const pokemonId = Number(pokemon?.id);
    if (!Number.isSafeInteger(pokemonId) || pokemonId <= 0) return [];

    const pokemonName = String(pokemon?.name || "").toLowerCase();
    const normalizedFormName = String(formName || "").toLowerCase();
    const formSuffix = normalizedFormName.startsWith(`${pokemonName}-`)
        ? normalizedFormName.slice(pokemonName.length + 1)
        : "";

    const formDreamWorldArtwork = formSuffix
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemonId}-${formSuffix}.svg`
        : null;
    const baseDreamWorldArtwork =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemonId}.svg`;

    return [
        formDreamWorldArtwork,
        baseDreamWorldArtwork,
        pokemon?.sprites?.other?.["official-artwork"]?.front_default,
    ].filter(Boolean);
}
function pokemonArtwork(pokemon) {
    return pokemonArtworkCandidates(pokemon)[0] || "";
}

function titleName(value) {
    return String(value || "").toLowerCase();
}

async function getAllPokemonFormNames() {
    if (!formNamesPromise) {
        formNamesPromise = (async () => {
            const names = new Set();
            let offset = 0;
            let expectedCount = Infinity;
            while (offset < expectedCount) {
                const page = await getJSON(`/pokemon-form?limit=${FORM_LIST_PAGE_SIZE}&offset=${offset}`);
                const results = Array.isArray(page.results) ? page.results : [];
                expectedCount = Number.isFinite(page.count) ? page.count : offset + results.length;
                results.forEach((entry) => {
                    if (typeof entry?.name === "string" && entry.name.trim()) names.add(entry.name);
                });

                if (!results.length || !page.next || offset + results.length >= expectedCount) break;
                offset += results.length;
            }

            return [...names];
        })().catch((error) => {
            formNamesPromise = null;
            throw error;
        });
    }

    return formNamesPromise;
}

async function mapWithConcurrency(items, limit, mapper) {
    const output = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (true) {
            const index = cursor++;
            if (index >= items.length) return;
            output[index] = await mapper(items[index], index);
        }
    });
    await Promise.all(workers);
    return output;
}

async function getVarietyForms(species) {
    const varieties = Array.isArray(species.varieties) ? species.varieties : [];
    if (varieties.length < 2) return [];

    const results = await mapWithConcurrency(varieties, FORM_DETAIL_CONCURRENCY, async (variety) => {
        try {
            const pokemon = await getPokemon(variety.pokemon.name);
            return {
                id: pokemon.id,
                pokemonId: pokemon.id,
                formId: null,
                name: pokemon.name,
                formName: variety.pokemon.name === species.name
                    ? ""
                    : variety.pokemon.name.slice(species.name.length + 1),
                isDefault: Boolean(variety.is_default),
                image: pokemonArtworkCandidates(pokemon)[0] || "",
                imageCandidates: pokemonArtworkCandidates(pokemon),
                types: (pokemon.types || []).map((item) => item.type.name),
                selectablePokemon: true,
            };
        } catch (error) {
            console.warn(`Could not load Pokémon variety ${variety.pokemon?.name || "unknown"}:`, error.message);
            return null;
        }
    });

    return results.filter(Boolean);
}

async function getPokemonFormEntries(speciesName) {
    const normalizedSpecies = titleName(speciesName);
    const names = await getAllPokemonFormNames();
    const matchingNames = names.filter((name) => {
        const normalizedName = titleName(name);
        return normalizedName === normalizedSpecies || normalizedName.startsWith(`${normalizedSpecies}-`);
    });
    if (matchingNames.length < 2) return [];

    const entries = await mapWithConcurrency(matchingNames, FORM_DETAIL_CONCURRENCY, async (name) => {
        try {
            const form = await getJSON(`/pokemon-form/${encodeURIComponent(name)}/`);
            const pokemonId = resourceId(form.pokemon?.url, "pokemon");
            const formId = Number(form.id);
            const formTypes = (form.types || []).map((item) => item.type.name).filter(Boolean);
            const formName = form.form_name || (name === normalizedSpecies ? "" : name.slice(normalizedSpecies.length + 1));
            let associatedPokemon = null;
            let imageCandidates = [];
            try {
                associatedPokemon = await getPokemon(pokemonId);
                imageCandidates = pokemonArtworkCandidates(
                    associatedPokemon,
                    form.name
                );
            } catch (error) {
                console.warn(`Could not load Pokémon artwork for form ${name}:`, error.message);
            }

            return {
                id: pokemonId,
                pokemonId,
                formId,
                name: normalizedSpecies,
                formName,
                isDefault: Boolean(form.is_default),
                image: imageCandidates[0] || "",
                imageCandidates,
                types: formTypes,
                selectablePokemon: true,
                formResourceName: form.name,
            };
        } catch (error) {
            console.warn(`Could not load Pokémon form ${name}:`, error.message);
            return null;
        }
    });
    const unique = new Map();
    for (const form of entries.filter(Boolean)) {
        const key = `${titleName(form.formName) || "default"}:${form.types.join(",")}`;
        if (!unique.has(key)) unique.set(key, form);
    }
    return [...unique.values()];
}

export async function getPokemonForms(pokemon) {
    if (!pokemon || typeof pokemon !== "object") {
        throw new Error("Pokémon data is unavailable for form lookup.");
    }

    const speciesId = resourceId(pokemon.species?.url, "pokemon-species");
    const species = await getJSON(`/pokemon-species/${speciesId}/`);

    const apiForms = await getPokemonFormEntries(species.name);
    if (apiForms.length > 1) {
        let base = apiForms.find((form) => form.isDefault);
        if (!base) {
            const basePokemon = await getPokemon(species.name);
            base = {
                id: basePokemon.id,
                pokemonId: basePokemon.id,
                formId: null,
                name: basePokemon.name,
                formName: "",
                isDefault: true,
                image: pokemonArtwork(basePokemon),
                imageCandidates: pokemonArtworkCandidates(basePokemon),
                types: (basePokemon.types || []).map((item) => item.type.name),
                selectablePokemon: true,
            };
        }

        const forms = [
            { ...base, isDefault: true },
            ...apiForms.filter((form) => form !== base).map((form) => ({ ...form, isDefault: false })),
        ];
        const deduped = new Map();
        forms.forEach((form) => {
            const key = `${form.formResourceName || form.name}:${form.types.join(",")}`;
            if (!deduped.has(key)) deduped.set(key, form);
        });
        return [...deduped.values()].sort((a, b) =>
            Number(b.isDefault) - Number(a.isDefault)
            || a.formName.localeCompare(b.formName)
        );
    }

    const varietyForms = await getVarietyForms(species);
    if (varietyForms.length > 1) {
        return varietyForms.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    }

    return [];
}
