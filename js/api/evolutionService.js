import { getJSON } from "./apiClient.js";
import { getPokemon } from "./pokemonService.js";
import { getPokemonSpecies } from "./speciesService.js";
function getResourceId(url, resourceName) {
    if (typeof url !== "string") {
        throw new Error(`This Pokémon has no ${resourceName} resource URL.`);
    }
    const match = url.match(new RegExp(`/${resourceName}/(\\d+)/?$`));
    if (!match) {
        throw new Error(`Invalid ${resourceName} URL returned by PokeAPI.`);
    }
    return Number(match[1]);
}
async function buildEvolutionTree(node) {
    const pokemon = await getPokemon(node.species.name);
    const evolutions = await Promise.all(
        node.evolves_to.map((child) => buildEvolutionTree(child))
    );
    return {
        id: pokemon.id,
        name: pokemon.name,
        imageCandidates: [
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg`,
            pokemon.sprites.other?.["official-artwork"]?.front_default,
        ].filter(Boolean),
        evolvesTo: evolutions,
    };
}
export async function getEvolutionChain(identifier) {
    const pokemon = await getPokemon(identifier);
    const speciesId = getResourceId(
        pokemon.species?.url,
        "pokemon-species"
    );
    const species = await getPokemonSpecies(speciesId);
    if (!species.evolution_chain?.url) {
        throw new Error("Evolution chain information is unavailable.");
    }
    const chainId = getResourceId(
        species.evolution_chain.url,
        "evolution-chain"
    );
    const response = await getJSON(`/evolution-chain/${chainId}/`);
    return buildEvolutionTree(response.chain);
}
