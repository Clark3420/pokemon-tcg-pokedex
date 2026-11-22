export const TYPE_COLORS = {
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD",
};

export const TYPE_IDS = {
    normal: 1,
    fighting: 2,
    flying: 3,
    poison: 4,
    ground: 5,
    rock: 6,
    bug: 7,
    ghost: 8,
    steel: 9,
    fire: 10,
    water: 11,
    grass: 12,
    electric: 13,
    psychic: 14,
    ice: 15,
    dragon: 16,
    dark: 17,
    fairy: 18,
};

const TYPE_BADGE_BASE_URL =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet";

export function getPokemonTypeBadgeUrl(typeName) {
    const typeId = TYPE_IDS[typeName?.toLowerCase()];

    return typeId
        ? `${TYPE_BADGE_BASE_URL}/${typeId}.png`
        : null;
}

export function getPokemonArtworkCandidates(pokemon) {
    if (!pokemon) {
        return [];
    }

    const dreamWorldArtwork =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg`;

    const officialArtwork =
        pokemon.sprites?.other?.["official-artwork"]?.front_default;

    return [
        dreamWorldArtwork,
        officialArtwork,
    ].filter((url, index, urls) => url && urls.indexOf(url) === index);
}

export function getPokemonCardClass(pokemon, species) {
    const isAlternateForm = Number(pokemon?.id) >= 10001;

    if (isAlternateForm && (species?.is_legendary || species?.is_mythical)) {
        return "is-prismatic";
    }

    if (!isAlternateForm && species?.is_legendary) {
        return "is-legendary";
    }

    if (!isAlternateForm && species?.is_mythical) {
        return "is-mythical";
    }

    return "";
}

export function getPokemonTypeColor(pokemon) {
    const primaryType = pokemon?.types?.[0]?.type?.name;

    return TYPE_COLORS[primaryType] || "#d5b76a";
}
