/* ==========================================================================
   Fleetline / E&U Transport — Contact form
   - Anti-robot: honeypot + "ik ben geen robot" checkbox + rekensom
   - Verstuurt via Web3Forms zodat je e-mailadres nooit in de HTML staat
   - Puur client-side, geen backend/database nodig
   ========================================================================== */

(function () {
    'use strict';

    const form   = document.getElementById('contactForm');
    if (!form) return;

    const status  = document.getElementById('cf-status');
    const submit  = form.querySelector('.contact-form__submit');
    const mathQ   = document.getElementById('cf-math-q');
    const mathIn  = document.getElementById('cf-math');
    const human   = document.getElementById('cf-human');
    const hp      = form.querySelector('.contact-form__hp');
    const message = document.getElementById('cf-message');
    const subject = form.querySelector('input[name="subject"]');

    // ---------- Sollicitatie-triggers: als iemand op "Solliciteer" klikt,
    //            vul dan subject + bericht alvast voor. ----------
    document.querySelectorAll('[data-job-apply]').forEach((link) => {
        link.addEventListener('click', () => {
            const jobName = link.getAttribute('data-job-apply') || 'Sollicitatie';
            if (subject) subject.value = 'Sollicitatie: ' + jobName;
            if (message && !message.value.trim()) {
                message.value =
                    'Beste E&U Transport,\n\n' +
                    'Ik reageer graag op de vacature "' + jobName + '".\n\n' +
                    '(Vertel hier kort iets over jezelf, je ervaring en wanneer je beschikbaar bent.)\n\n' +
                    'Met vriendelijke groet,\n';
            }
            // Focus op naam-veld na de scroll
            setTimeout(() => {
                const nameField = document.getElementById('cf-name');
                if (nameField) nameField.focus({ preventScroll: true });
            }, 700);
        });
    });

    // ---------- Genereer een verse rekensom ----------
    let mathAnswer = 0;
    function newMathChallenge() {
        const a = Math.floor(Math.random() * 8) + 2;   // 2..9
        const b = Math.floor(Math.random() * 8) + 2;   // 2..9
        mathAnswer = a + b;
        if (mathQ) mathQ.textContent = `${a} + ${b}`;
        if (mathIn) mathIn.value = '';
    }
    newMathChallenge();

    // ---------- Status helper ----------
    function setStatus(msg, kind) {
        status.textContent = msg || '';
        status.className = 'contact-form__status' + (kind ? ' contact-form__status--' + kind : '');
    }

    // ---------- Submit ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        setStatus('', 'info');

        // 1. Honeypot — als een bot dit veld invult, doen alsof het lukte
        if (hp && hp.value.trim() !== '') {
            setStatus('Bedankt! Je bericht is verstuurd.', 'ok');
            form.reset();
            newMathChallenge();
            return;
        }

        // 2. Native HTML5 validatie
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // 3. "Ik ben geen robot" checkbox
        if (!human.checked) {
            setStatus('Bevestig eerst dat je geen robot bent.', 'err');
            return;
        }

        // 4. Rekensom
        if (parseInt(mathIn.value, 10) !== mathAnswer) {
            setStatus('De rekensom klopt niet. Probeer het opnieuw.', 'err');
            newMathChallenge();
            return;
        }

        // 5. Access-key sanity check
        const accessKey = form.querySelector('input[name="access_key"]').value;
        if (!accessKey || accessKey.startsWith('VUL_HIER')) {
            setStatus('Formulier nog niet geconfigureerd (Web3Forms access key ontbreekt).', 'err');
            return;
        }

        // 6. Versturen via Web3Forms
        submit.disabled = true;
        setStatus('Bericht wordt verstuurd…', 'info');

        try {
            const formData = new FormData(form);
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatus('Bedankt! Je bericht is verstuurd. We nemen z.s.m. contact op.', 'ok');
                form.reset();
                newMathChallenge();
            } else {
                setStatus((data && data.message) ? data.message : 'Er ging iets mis bij het versturen. Probeer het later opnieuw.', 'err');
            }
        } catch (err) {
            setStatus('Netwerkfout — controleer je verbinding en probeer opnieuw.', 'err');
        } finally {
            submit.disabled = false;
        }
    });
})();
