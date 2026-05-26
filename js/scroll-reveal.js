/**
 * Lightweight scroll reveal disabled for max performance
 */
export function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal-on-scroll:not(.is-visible)');
    elements.forEach(el => el.classList.add('is-visible'));
}

export function refreshScrollReveal() {
    initScrollReveal();
}
