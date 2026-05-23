/**
 * Lightweight scroll reveal (GPU-friendly transforms only)
 */

let scrollRevealObserver = null;

export function initScrollReveal() {
    if (scrollRevealObserver) {
        scrollRevealObserver.disconnect();
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.reveal-on-scroll');

    if (prefersReduced || !elements.length) {
        elements.forEach(el => el.classList.add('is-visible'));
        return;
    }

    scrollRevealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                scrollRevealObserver.unobserve(entry.target);
            });
        },
        { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    elements.forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 60}ms`);
        scrollRevealObserver.observe(el);
    });
}

export function refreshScrollReveal() {
    initScrollReveal();
}
