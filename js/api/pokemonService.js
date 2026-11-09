import { getJSON } from "./apiClient.js";
let pokemonNameIndexPromise = null;

function normalizePokemonName(value) {
    return String(value)
        .trim()
        .toLocaleLowerCase("en")
        .replace(/♀/g, " female ")
        .replace(/♂/g, " male ")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, "")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function compactPokemonName(value) {
    return normalizePokemonName(value).replace(/[^a-z0-9]/g, "");
}

async function getPokemonNameIndex() {
    if (!pokemonNameIndexPromise) {
        pokemonNameIndexPromise = getJSON("/pokemon?limit=20000&offset=0")
            .then((result) => (result.results || []).map((pokemon) => {
                const match = String(pokemon.url || "").match(/\/pokemon\/(\d+)\/?$/);
                const id = match ? Number(match[1]) : null;
                const name = String(pokemon.name || "");

                return {
                    name,
                    id: Number.isSafeInteger(id) && id > 0 ? id : null,
                    normalizedName: normalizePokemonName(name),
                    compactName: compactPokemonName(name),
                    hasSeparator: name.includes("-"),
                };
            }))
            .catch((error) => {
                pokemonNameIndexPromise = null;
                throw error;
            });
    }

    return pokemonNameIndexPromise;
}

export async function getAllPokemonIds() {
    const pokemonIndex = await getPokemonNameIndex();

    return [...new Set(
        pokemonIndex
            .map((pokemon) => pokemon.id)
            .filter((id) => id !== null)
    )].sort((a, b) => a - b);
}

export async function getPokemonSuggestions(query, limit = 8) {
    const compactQuery = compactPokemonName(query);

    if (compactQuery.length < 2 || !Number.isInteger(limit) || limit < 1) {
        return [];
    }

    const pokemonIndex = await getPokemonNameIndex();

    return pokemonIndex
        .filter((pokemon) =>
            pokemon.id !== null && pokemon.compactName.includes(compactQuery)
        )
        .sort((a, b) => {
            const aStarts = a.compactName.startsWith(compactQuery);
            const bStarts = b.compactName.startsWith(compactQuery);
            if (aStarts !== bStarts) return aStarts ? -1 : 1;
            const lengthDifference = a.compactName.length - b.compactName.length;
            if (lengthDifference !== 0) return lengthDifference;
            return a.name.localeCompare(b.name);
        })
        .slice(0, limit)
        .map(({ name, id }) => ({ name, id }));
}

async function findCanonicalPokemonName(query) {
    const normalizedQuery = normalizePokemonName(query);
    const compactQuery = compactPokemonName(query);

    if (!normalizedQuery) {
        return null;
    }

    const pokemonIndex = await getPokemonNameIndex();
    const exactMatch = pokemonIndex.find(
        (pokemon) => pokemon.normalizedName === normalizedQuery
    );

    if (exactMatch) {
        return exactMatch.name;
    }

    const compactMatches = pokemonIndex.filter(
        (pokemon) => pokemon.compactName === compactQuery
    );

    if (compactMatches.length === 1) {
        return compactMatches[0].name;
    }
    if (compactQuery.length >= 3) {
        const partialMatches = pokemonIndex
            .filter((pokemon) => pokemon.compactName.startsWith(compactQuery))
            .sort((a, b) => {
                const lengthDifference = a.compactName.length - b.compactName.length;
                if (lengthDifference !== 0) return lengthDifference;

                if (a.hasSeparator !== b.hasSeparator) {
                    return a.hasSeparator ? 1 : -1;
                }

                return a.name.localeCompare(b.name);
            });

        if (partialMatches.length > 0) {
            return partialMatches[0].name;
        }
    }

    return null;
}

export async function getPokemon(identifier) {
    const rawQuery = String(identifier).trim();

    if (!rawQuery) {
        throw new Error("Please enter a Pokémon name or ID.");
    }
    if (/^\d+$/.test(rawQuery)) {
        const id = Number(rawQuery);
        if (!Number.isSafeInteger(id) || id < 1) {
            throw new Error("Please enter a valid Pokémon name or numeric ID.");
        }
        return getJSON(`/pokemon/${id}/`);
    }

    const normalizedQuery = normalizePokemonName(rawQuery);

    if (!normalizedQuery) {
        throw new Error("Please enter a Pokémon name or numeric ID.");
    }
    const RESOURCE_NAME_ALIASES = {
        shaymin: "shaymin-land",
        meloetta: "meloetta-aria",
        deoxys: "deoxys-normal",
    };

    // Resolve partial and formatted searches against the cached name index
    // before calling PokeAPI. This avoids predictable 404 requests for input
    // such as "pika" when the intended result is "pikachu".
    const requestName = RESOURCE_NAME_ALIASES[normalizedQuery]
        || await findCanonicalPokemonName(rawQuery);

    if (!requestName) {
        throw new Error(
            `No Pokémon found for “${rawQuery}”. Check the spelling or try its Pokédex ID.`
        );
    }

    return getJSON(`/pokemon/${encodeURIComponent(requestName)}/`);
}
