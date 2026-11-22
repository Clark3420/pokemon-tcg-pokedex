import { getPokemonByRegion } from "./regionService.js";
import { getPokemonByType } from "./typeService.js";

const MAX_POKEMON_ID = 1351;

export async function getFilteredPokemon(region, type) {
    let collection = null;

    if (region !== "all") {
        collection = await getPokemonByRegion(region);
    }

    if (type !== "all") {
        const typedPokemon = await getPokemonByType(type);

        if (collection === null) {
            collection = typedPokemon;
        } else {
            const typeIds = new Set(
                typedPokemon.map((pokemon) => pokemon.id)
            );

            collection = collection.filter(
                (pokemon) => typeIds.has(pokemon.id)
            );
        }
    }

    if (collection === null) {
        collection = Array.from(
            { length: MAX_POKEMON_ID },
            (_, index) => ({
                id: index + 1,
                name: String(index + 1),
            })
        );
    }

    return collection.sort((a, b) => a.id - b.id);
}
