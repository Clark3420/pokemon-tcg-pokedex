import { navigateByOffset } from "./navigation.js";

const viewer = document.getElementById("pokemon-viewer");
const card = document.getElementById("pokemon-card");

const SWIPE_THRESHOLD = 70;

let startX = 0;
let startY = 0;
let isTracking = false;
let suppressNextClick = false;

viewer.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("#pokemon-card")) return;
    if (card.classList.contains("card-is-loading")) return;
    if (event.target.closest("button, a, input, select")) return;
    if (event.isPrimary === false) return;

    startX = event.clientX;
    startY = event.clientY;
    isTracking = true;
});

window.addEventListener("pointerup", (event) => {
    if (!isTracking) return;
    isTracking = false;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (
        Math.abs(deltaX) < SWIPE_THRESHOLD ||
        Math.abs(deltaX) <= Math.abs(deltaY)
    ) return;

    suppressNextClick = true;
    navigateByOffset(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
        suppressNextClick = false;
    }, 400);
});

window.addEventListener("pointercancel", () => {
    isTracking = false;
});

viewer.addEventListener("click", (event) => {
    if (!suppressNextClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
}, true);

window.addEventListener("blur", () => {
    isTracking = false;
});

card.addEventListener("dragstart", (event) => {
    event.preventDefault();
});
