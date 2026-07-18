/* ==========================================================================
   E&U Transport — Animations
   - Entrance & scroll-reveals via pure CSS + IntersectionObserver
     (werkt altijd — geen dependency op GSAP CDN)
   - GSAP wordt (indien geladen) alleen gebruikt voor parallax
   ========================================================================== */

(function () {
    'use strict';

    // Markeer dat JS actief is
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');

    const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // -----------------------------------------------------------------------
    // 1. SCROLL REVEAL — native IntersectionObserver (geen CDN nodig)
    // -----------------------------------------------------------------------
    const revealables = document.querySelectorAll('[data-reveal]');

    if (revealables.length) {
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            revealables.forEach((el) => el.classList.add('is-visible'));
        } else {
            const io = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    const el = entry.target;
                    el.classList.add('is-visible');

                    // Als het een sectie-brede reveal is, trigger dan met een
                    // korte delay ook de child-reveals & stagger binnenin.
                    // Zo ontstaat één vloeiende choreografie.
                    if (el.getAttribute('data-reveal') === 'section-up') {
                        const kids = el.querySelectorAll('[data-reveal]:not(.is-visible), .stagger:not(.is-visible)');
                        kids.forEach((kid, i) => {
                            setTimeout(() => {
                                kid.classList.add('is-visible');
                                observer.unobserve(kid);
                            }, 350 + i * 180);
                        });
                    }

                    observer.unobserve(el);
                });
            }, {
                root: null,
                rootMargin: '0px 0px -12% 0px',
                threshold: 0.12
            });

            revealables.forEach((el) => io.observe(el));

            // Stagger-containers zonder eigen data-reveal ook observeren
            document.querySelectorAll('.stagger:not([data-reveal])').forEach((el) => io.observe(el));
        }
    }

    // -----------------------------------------------------------------------
    // 2. GSAP PARALLAX (optioneel — enkel als GSAP + ScrollTrigger geladen)
    // -----------------------------------------------------------------------
    if (prefersReducedMotion) return;
    if (typeof window.gsap === 'undefined') return;
    if (typeof window.ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const heroSect = document.querySelector('.hero');
    const heroBg   = document.querySelector('.hero__bg');
    const heroCnt  = document.querySelector('.hero__content');

    if (heroSect && heroBg) {
        gsap.to(heroBg, {
            yPercent: 30,
            ease: 'none',
            scrollTrigger: {
                trigger: heroSect,
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }

    if (heroSect && heroCnt) {
        gsap.to(heroCnt, {
            yPercent: -40,
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
                trigger: heroSect,
                start: 'top top',
                end: '80% top',
                scrub: 0.6
            }
        });
    }

    // Parallax op de Over Ons foto
    const overImg  = document.querySelector('.over__media img');
    const overSect = document.querySelector('.over');
    if (overSect && overImg) {
        gsap.to(overImg, {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
                trigger: overSect,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    }
})();
