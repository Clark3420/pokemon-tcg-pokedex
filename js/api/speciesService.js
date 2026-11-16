import { getJSON } from "./apiClient.js";
export async function getPokemonSpecies(pokemonOrIdentifier) {
    if (pokemonOrIdentifier && typeof pokemonOrIdentifier === "object") {
        const speciesUrl = pokemonOrIdentifier.species?.url;
        if (speciesUrl) {
            const match = String(speciesUrl).match(/\/pokemon-species\/(\d+)\/?(?:$|[?#])/);
            if (!match) throw new Error("Invalid Pokémon species URL.");
            return getJSON(`/pokemon-species/${Number(match[1])}/`);
        }
        const speciesName = pokemonOrIdentifier.species?.name;
        if (speciesName) {
            return getJSON(`/pokemon-species/${encodeURIComponent(speciesName)}/`);
        }
        throw new Error("Pokémon data does not include species metadata.");
    }
    if (typeof pokemonOrIdentifier === "string" && /pokemon-species\//.test(pokemonOrIdentifier)) {
        const match = pokemonOrIdentifier.match(/\/pokemon-species\/(\d+)\/?(?:$|[?#])/);
        if (!match) throw new Error("Invalid Pokémon species URL.");
        return getJSON(`/pokemon-species/${Number(match[1])}/`);
    }
    if (typeof pokemonOrIdentifier === "string" && !/^\d+$/.test(pokemonOrIdentifier.trim())) {
        const name = pokemonOrIdentifier.trim();
        if (!name) throw new Error("Invalid Pokémon species name.");
        return getJSON(`/pokemon-species/${encodeURIComponent(name)}/`);
    }
    const speciesId = Number(pokemonOrIdentifier);
    if (!Number.isSafeInteger(speciesId) || speciesId < 1) {
        throw new Error("Invalid Pokémon species ID.");
    }
    return getJSON(`/pokemon-species/${speciesId}/`);
}
