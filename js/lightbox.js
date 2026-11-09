/* click or tap a case study image to see it bigger.

   it has to be on purpose: a quick press that barely moves. a scroll, a
   swipe, a pinch or a long press over an image never opens it. links,
   buttons, decorative images (alt="") and anything small stay as they were.
   in the viewer, tap the image to see it at full size and drag around,
   tap outside it or press esc to close. */
(function () {
  const SKIP = 'a, button, [role="button"], .phone, .tot-matrix, .tot-park, .no-zoom, nav';
  const MIN = 140;           // px on screen. smaller than this is an icon, not a picture
  const MOVE = 8, TIME = 450; // an intentional tap: under 8px of travel, under 450ms

  const zoomable = img =>
    img instanceof HTMLImageElement &&
    img.getAttribute('alt') && !img.closest(SKIP) &&
    img.getBoundingClientRect().width >= MIN;

  const css = document.createElement('style');
  css.textContent = `
    .lb-hint{ cursor:zoom-in }
    .lb{ position:fixed; inset:0; z-index:2147483000; display:flex; flex-direction:column;
         background:rgba(14,12,10,.9); opacity:0; transition:opacity .2s ease; overscroll-behavior:contain }
    .lb.on{ opacity:1 }
    .lb-stage{ flex:1; overflow:auto; display:grid; place-items:center; padding:clamp(12px,3vw,40px);
               -webkit-overflow-scrolling:touch }
    .lb-stage img{ max-width:100%; max-height:calc(100vh - 120px); width:auto; height:auto; display:block;
                   border-radius:8px; box-shadow:0 20px 60px rgba(0,0,0,.45); cursor:zoom-in;
                   transform:scale(.97); transition:transform .22s cubic-bezier(.2,.8,.2,1) }
    .lb.on .lb-stage img{ transform:none }
    .lb.full .lb-stage{ place-items:start; }
    .lb.full .lb-stage img{ max-width:none; max-height:none; cursor:zoom-out; border-radius:0 }
    .lb-cap{ color:#eee; font:14px/1.45 system-ui,-apple-system,sans-serif; text-align:center;
             padding:0 16px calc(14px + env(safe-area-inset-bottom)); max-width:760px; margin:0 auto; opacity:.85 }
    .lb-x{ position:absolute; top:calc(10px + env(safe-area-inset-top)); right:10px; width:44px; height:44px;
           border:0; border-radius:50%; background:rgba(255,255,255,.14); color:#fff; font-size:24px;
           line-height:44px; cursor:pointer; z-index:2 }
    .lb-x:hover{ background:rgba(255,255,255,.26) }
    @media (prefers-reduced-motion:reduce){ .lb, .lb-stage img{ transition:none } }`;
  document.head.appendChild(css);

  // the zoom-in cursor only on what will actually open
  document.addEventListener('pointerover', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && !img.classList.contains('lb-hint') && zoomable(img)) img.classList.add('lb-hint');
  });

  let down = null;
  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button > 0) { down = null; return; }
    down = zoomable(e.target) ? { img: e.target, x: e.clientX, y: e.clientY, t: performance.now(), sy: scrollY } : null;
  }, true);
  document.addEventListener('pointercancel', () => { down = null; }, true);   // the browser took it for a scroll
  document.addEventListener('pointerup', e => {
    const d = down; down = null;
    if (!d || e.target !== d.img) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE) return;
    if (performance.now() - d.t > TIME) return;
    if (Math.abs(scrollY - d.sy) > 2) return;
    if (String(getSelection()).length) return;
    open(d.img);
  }, true);
  // keyboard: an image that is focusable opens on enter
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && zoomable(e.target)) open(e.target);
  });

  function caption(img) {
    const fig = img.closest('figure');
    const fc = fig && fig.querySelector('figcaption');
    if (fc) return fc.textContent.trim();
    let n = img.closest('div, figure, picture') || img;
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      const next = n.nextElementSibling;
      if (next && next.classList.contains('cap')) return next.textContent.trim();
    }
    return img.alt;
  }

  let box = null, last = null, openedAt = 0;
  function open(img) {
    if (box) return;
    openedAt = performance.now();
    last = document.activeElement;
    box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', img.alt);
    const stage = document.createElement('div'); stage.className = 'lb-stage';
    const big = document.createElement('img');
    big.src = img.dataset.full || img.currentSrc || img.src; big.alt = img.alt;
    stage.appendChild(big);
    const x = document.createElement('button'); x.className = 'lb-x'; x.type = 'button';
    x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    const cap = document.createElement('p'); cap.className = 'lb-cap'; cap.textContent = caption(img);
    box.append(x, stage, cap);
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => box.classList.add('on'));
    x.focus({ preventScroll: true });

    // tap the picture for full size (only if there is more to see), tap around it to close
    big.addEventListener('click', e => {
      e.stopPropagation();
      if (performance.now() - openedAt < 400) return;
      if (!box.classList.contains('full') && big.naturalWidth <= big.clientWidth * 1.05 &&
          big.naturalHeight <= big.clientHeight * 1.05) return;
      box.classList.toggle('full');
    });
    // the tap that opened it can arrive here as a click on some phones, so give it a moment
    stage.addEventListener('click', e => { if (e.target === stage && performance.now() - openedAt > 400) close(); });
    x.addEventListener('click', close);
    addEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    if (!box) return;
    const b = box; box = null;
    removeEventListener('keydown', onKey);
    document.documentElement.style.overflow = '';
    b.classList.remove('on');
    setTimeout(() => b.remove(), 200);
    if (last && last.focus) last.focus({ preventScroll: true });
  }
})();
