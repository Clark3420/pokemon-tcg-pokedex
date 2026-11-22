import { ref, onMounted, onUnmounted } from "vue";

const SWIPE_THRESHOLD = 70;
const CLICK_SUPPRESSION_DURATION = 400;

export function useCardInteractions(navigateByOffset, navigationInProgress) {
    const isFlipped = ref(false);
    const isTracking = ref(false);

    let startX = 0;
    let startY = 0;
    let suppressNextClick = false;
    let suppressionTimeout = null;

    function handlePointerDown(event) {
        if (!event.target.closest("#pokemon-card")) return;
        if (navigationInProgress.value) return;
        if (event.target.closest("button, a, input, select")) return;
        if (event.isPrimary === false) return;

        startX = event.clientX;
        startY = event.clientY;
        isTracking.value = true;
    }

    function handlePointerUp(event) {
        if (!isTracking.value) return;

        isTracking.value = false;

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        if (
            Math.abs(deltaX) < SWIPE_THRESHOLD ||
            Math.abs(deltaX) <= Math.abs(deltaY)
        ) {
            return;
        }

        suppressNextClick = true;
        navigateByOffset(deltaX < 0 ? 1 : -1);

        window.clearTimeout(suppressionTimeout);

        suppressionTimeout = window.setTimeout(() => {
            suppressNextClick = false;
        }, CLICK_SUPPRESSION_DURATION);
    }

    function handlePointerCancel() {
        isTracking.value = false;
    }

    function handleWindowBlur() {
        isTracking.value = false;
    }

    function toggleCard() {
        if (navigationInProgress.value) return;

        isFlipped.value = !isFlipped.value;
    }

    function handleViewerClickCapture(event) {
        if (!suppressNextClick) return;

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function handleDragStart(event) {
        event.preventDefault();
    }

    function resetCard() {
        isFlipped.value = false;
    }

    function clearSwipeState() {
        isTracking.value = false;
        suppressNextClick = false;
        window.clearTimeout(suppressionTimeout);
    }

    onMounted(() => {
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        window.addEventListener("blur", handleWindowBlur);
    });

    onUnmounted(() => {
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        window.removeEventListener("blur", handleWindowBlur);

        clearSwipeState();
    });

    return {
        isFlipped,
        isTracking,
        toggleCard,
        handlePointerDown,
        handleViewerClickCapture,
        handleDragStart,
        resetCard,
        clearSwipeState,
    };
}
