const card = document.getElementById("pokemon-card");

function flipCard() {
    if (
        card.classList.contains("d-none") ||
        card.classList.contains("card-is-loading") ||
        card.classList.contains("card-navigation-in-progress")
    ) {
        return;
    }

    card.classList.toggle("is-flipped");

}

card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, select")) {
        return;
    }

    flipCard();
});

card.addEventListener("keydown", (event) => {
    if (event.target !== card) {
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipCard();
    }
});

