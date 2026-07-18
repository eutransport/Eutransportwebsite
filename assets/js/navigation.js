/* ==========================================================================
   Fleetline — Navigation
   Voegt .header--scrolled toe zodra de gebruiker begint met scrollen.
   ========================================================================== */

(function () {
    'use strict';

    const header = document.getElementById('siteHeader');
    if (!header) return;

    const SCROLL_THRESHOLD = 20; // px
    let ticking = false;

    function updateHeader() {
        if (window.scrollY > SCROLL_THRESHOLD) {
            header.classList.add('header--scrolled');
        } else {
            header.classList.remove('header--scrolled');
        }
        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }

    // Init (bij page load, bijv. na refresh mid-page)
    updateHeader();

    window.addEventListener('scroll', onScroll, { passive: true });
})();
