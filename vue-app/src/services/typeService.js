import { getJSON } from "./apiClient.js";

export async function getPokemonByType(type) {
    const query = String(type).trim().toLowerCase();

    if (!query || query === "all") {
        return [];
    }

    const data = await getJSON(`/type/${encodeURIComponent(query)}/`);

    return data.pokemon
        .map(({ pokemon }) => {
            const match = pokemon.url.match(/\/pokemon\/(\d+)\/?$/);

            return {
                id: match ? Number(match[1]) : null,
                name: pokemon.name,
            };
        })
        .filter((pokemon) => pokemon.id !== null);
}
