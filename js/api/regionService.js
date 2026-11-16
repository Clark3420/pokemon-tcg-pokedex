import { getJSON } from "./apiClient.js";
function getEndpointFromUrl(url) {
    const match = url.match(/\/api\/v2(\/.*)$/);
    if (!match) {
        throw new Error("Invalid PokeAPI resource URL.");
    }
    return match[1];
}
export async function getPokemonByRegion(regionName) {
    const region = String(regionName).trim().toLowerCase();
    if (!region || region === "all") {
        return [];
    }
    let pokedexes;
    if (region === "hisui") {
        pokedexes = [await getJSON("/pokedex/hisui/")];
    } else {
        const regionData = await getJSON(
            `/region/${encodeURIComponent(region)}/`
        );
        if (!regionData.pokedexes?.length) {
            throw new Error(`No Pokédex data found for ${region}.`);
        }
        pokedexes = await Promise.all(
            regionData.pokedexes.map(({ url }) =>
                getJSON(getEndpointFromUrl(url))
            )
        );
    }
    const pokemonMap = new Map();
    for (const pokedex of pokedexes) {
        for (const entry of pokedex.pokemon_entries) {
            const species = entry.pokemon_species;
            const match = species.url.match(
                /\/pokemon-species\/(\d+)\/?$/
            );
            if (match) {
                const id = Number(match[1]);
                if (!pokemonMap.has(id)) {
                    pokemonMap.set(id, {
                        id,
                        name: species.name,
                    });
                }
            }
        }
    }
    return [...pokemonMap.values()].sort((a, b) => a.id - b.id);
}
