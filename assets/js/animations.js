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
    // 3. FLEET CAROUSEL — init vóór GSAP zodat vroege returns hem niet blokkeren
    // -----------------------------------------------------------------------
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);

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

    // -----------------------------------------------------------------------
    // 3b. FLEET CAROUSEL — implementatie (init hierboven aangeroepen)
    // -----------------------------------------------------------------------
    function initCarousel(root) {
        const track   = root.querySelector('[data-carousel-track]');
        const slides  = Array.from(root.querySelectorAll('.fleet-carousel__slide'));
        const prevBtn = root.querySelector('[data-carousel-prev]');
        const nextBtn = root.querySelector('[data-carousel-next]');
        const dotsWrap = root.querySelector('[data-carousel-dots]');
        if (!track || slides.length === 0) return;

        const AUTOPLAY_MS = 5500;
        let index = 0;
        let timer = null;
        let progressRAF = null;
        let progressStart = 0;
        let paused = false;

        // Build dots
        const dots = slides.map((_, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'fleet-carousel__dot' + (i === 0 ? ' is-active' : '');
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-label', `Ga naar foto ${i + 1}`);
            b.addEventListener('click', () => { goTo(i); restart(); });
            dotsWrap.appendChild(b);
            return b;
        });

        function goTo(i) {
            index = (i + slides.length) % slides.length;
            slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
            dots.forEach((d, k) => d.classList.toggle('is-active', k === index));
        }
        function next() { goTo(index + 1); }
        function prev() { goTo(index - 1); }

        function startProgress() {
            if (prefersReducedMotion) return;
            root.classList.add('is-playing');
            progressStart = performance.now();
            cancelAnimationFrame(progressRAF);
            const tick = (now) => {
                const p = Math.min(1, (now - progressStart) / AUTOPLAY_MS);
                root.style.setProperty('--progress', p.toFixed(3));
                if (p < 1 && !paused) progressRAF = requestAnimationFrame(tick);
            };
            progressRAF = requestAnimationFrame(tick);
        }
        function stopProgress() {
            cancelAnimationFrame(progressRAF);
            root.classList.remove('is-playing');
            root.style.setProperty('--progress', '0');
        }
        function start() {
            if (prefersReducedMotion) return;
            stop();
            timer = setInterval(() => { if (!paused) next(); }, AUTOPLAY_MS);
            startProgress();
        }
        function stop() {
            clearInterval(timer);
            timer = null;
            stopProgress();
        }
        function restart() {
            if (prefersReducedMotion) return;
            stop(); start();
        }

        // Controls
        prevBtn && prevBtn.addEventListener('click', () => { prev(); restart(); });
        nextBtn && nextBtn.addEventListener('click', () => { next(); restart(); });

        // Pause on hover / focus
        root.addEventListener('mouseenter', () => { paused = true; stopProgress(); });
        root.addEventListener('mouseleave', () => { paused = false; startProgress(); });
        root.addEventListener('focusin',    () => { paused = true; stopProgress(); });
        root.addEventListener('focusout',   () => { paused = false; startProgress(); });

        // Keyboard
        root.setAttribute('tabindex', '0');
        root.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); restart(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); restart(); }
        });

        // Swipe (touch)
        let startX = 0, dx = 0, dragging = false;
        const viewport = root.querySelector('[data-carousel-viewport]');
        viewport && viewport.addEventListener('touchstart', (e) => {
            dragging = true; startX = e.touches[0].clientX; dx = 0;
        }, { passive: true });
        viewport && viewport.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            dx = e.touches[0].clientX - startX;
        }, { passive: true });
        viewport && viewport.addEventListener('touchend', () => {
            if (!dragging) return;
            dragging = false;
            if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); restart(); }
        });

        // Only autoplay when in view (perf + polite)
        if ('IntersectionObserver' in window) {
            const vio = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) start(); else stop();
                });
            }, { threshold: 0.25 });
            vio.observe(root);
        } else {
            start();
        }

        // Init
        goTo(0);
    }
})();
