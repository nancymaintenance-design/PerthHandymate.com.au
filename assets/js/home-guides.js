// Generated from typescript/assets/js/home-guides.ts; edit the TypeScript source.
/* Progressively enhanced guides: static links and native scrolling remain usable. */
(() => {
    const track = document.getElementById('home-guide-track');
    if (!track)
        return;
    const section = document.getElementById('repair-planning-guides');
    const controls = section.querySelector('.home-guides-controls');
    const previous = section.querySelector('[data-guide-prev]');
    const next = section.querySelector('[data-guide-next]');
    const position = section.querySelector('[data-guide-position]');
    const autoplay = section.querySelector('[data-guide-autoplay]');
    const pauseLabel = autoplay.querySelector('[data-guide-pause-label]');
    const resumeLabel = autoplay.querySelector('[data-guide-resume-label]');
    const cards = [...track.children];
    if (!cards.length)
        return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let requested = !reducedMotion.matches;
    let focused = section.contains(document.activeElement);
    let visible = false;
    let timer;
    const current = () => {
        const edge = track.getBoundingClientRect().left;
        return cards.reduce((best, card, index) => Math.abs(card.getBoundingClientRect().left - edge) < Math.abs(cards[best].getBoundingClientRect().left - edge) ? index : best, 0);
    };
    const update = () => {
        previous.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
        const label = `${current() + 1} / ${cards.length}`;
        if (position.textContent !== label)
            position.textContent = label;
    };
    const move = (index, automatic = false) => {
        const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
        track.scrollTo({ left: track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left - 4, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        if (!automatic)
            schedule();
    };
    const schedule = () => {
        window.clearTimeout(timer);
        timer = undefined;
        const playing = requested && visible && !focused && !document.hidden && cards.length > 1;
        pauseLabel.hidden = !requested;
        resumeLabel.hidden = requested;
        // Automatic movement must not repeatedly interrupt screen-reader reading.
        position.setAttribute('aria-live', playing ? 'off' : 'polite');
        if (playing)
            timer = window.setTimeout(() => {
                move(track.scrollLeft >= track.scrollWidth - track.clientWidth - 2 ? 0 : current() + 1, true);
                schedule();
            }, 5000);
    };
    autoplay.addEventListener('click', () => { requested = !requested; schedule(); });
    section.addEventListener('focusin', () => { focused = true; schedule(); });
    section.addEventListener('focusout', event => {
        focused = section.contains(event.relatedTarget);
        schedule();
    });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches)
            requested = false;
        schedule();
    });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting);
            schedule();
        }).observe(section);
    }
    previous.addEventListener('click', () => move(current() - 1));
    next.addEventListener('click', () => move(current() + 1));
    track.addEventListener('keydown', event => {
        if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey)
            return;
        const targets = { ArrowLeft: current() - 1, ArrowRight: current() + 1, Home: 0, End: cards.length - 1 };
        if (!Object.hasOwn(targets, event.key))
            return;
        event.preventDefault();
        move(targets[event.key]);
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    controls.hidden = false;
    update();
    schedule();
})();
