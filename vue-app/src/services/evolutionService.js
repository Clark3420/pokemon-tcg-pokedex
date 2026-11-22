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
async function preloadArtwork(candidates) {
    for (let index = 0; index < candidates.length; index += 1) {
        const url = candidates[index];
        const loaded = await new Promise((resolve) => {
            const image = new Image();
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                resolve(result);
            };
            const timeoutId = window.setTimeout(() => finish(false), 10000);
            image.onload = async () => {
                try {
                    if (typeof image.decode === "function") await image.decode();
                } catch {
                    finish(false);
                    return;
                }
                finish(image.naturalWidth > 0);
            };
            image.onerror = () => finish(false);
            image.src = url;
            if (image.complete) {
                if (image.naturalWidth > 0) {
                    if (typeof image.decode === "function") {
                        image.decode().then(() => finish(true)).catch(() => finish(false));
                    } else finish(true);
                } else finish(false);
            }
        });
        if (loaded) return candidates.slice(index);
    }
    return [];
}

async function buildEvolutionTree(node) {
    const pokemon = await getPokemon(node.species.name);
    const candidates = [
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg`,
        pokemon.sprites.other?.["official-artwork"]?.front_default,
    ].filter(Boolean);
    const [imageCandidates, evolutions] = await Promise.all([
        preloadArtwork(candidates),
        Promise.all(node.evolves_to.map((child) => buildEvolutionTree(child))),
    ]);
    return {
        id: pokemon.id,
        name: pokemon.name,
        imageCandidates: imageCandidates.length ? imageCandidates : candidates,
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
