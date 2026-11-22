export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPokemonName(name) {
    return name
        .split("-")
        .map(capitalize)
        .join(" ");
}

export function formatStatName(name) {
    const statNames = {
        hp: "HP",
        attack: "ATK",
        defense: "DEF",
        "special-attack": "SP. ATK",
        "special-defense": "SP. DEF",
        speed: "SPD",
    };

    return statNames[name] || formatPokemonName(name);
}

export function formatHeight(height) {
    return `${(height / 10).toFixed(1)} m`;
}

export function formatWeight(weight) {
    return `${(weight / 10).toFixed(1)} kg`;
}

export function formatPokemonId(id) {
    return `#${String(id).padStart(3, "0")}`;
}
