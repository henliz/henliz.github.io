/* click or tap a case study image to see it bigger.

   it has to be on purpose: a quick press that barely moves. a scroll, a
   swipe, a pinch or a long press over an image never opens it. links,
   buttons, decorative images (alt="") and anything small stay as they were.
   in the viewer: tap to zoom in where you tapped, pinch or ctrl/cmd + scroll
   (trackpad pinch) to zoom, drag to pan, + / − / fit buttons and keys, tap
   outside it or press esc to close. made for walking someone through a diagram. */
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
    .lb.full .lb-stage{ place-items:start; cursor:grab; touch-action:none }
    .lb.full .lb-stage.drag{ cursor:grabbing }
    .lb.full .lb-stage img{ max-width:none; max-height:none; cursor:inherit; border-radius:0; transition:none }
    .lb-zoom{ position:absolute; top:calc(10px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%);
              display:flex; align-items:center; gap:2px; padding:4px; border-radius:24px; background:rgba(20,18,16,.82); box-shadow:0 4px 18px rgba(0,0,0,.3); z-index:2 }
    .lb-zoom button{ min-width:36px; height:36px; padding:0 10px; border:0; border-radius:18px; background:none; color:#fff;
                     font:600 15px/36px system-ui,-apple-system,sans-serif; cursor:pointer }
    .lb-zoom button:hover{ background:rgba(255,255,255,.18) }
    .lb-zoom button:focus-visible,.lb-x:focus-visible{ outline:2px solid #fff; outline-offset:1px }
    .lb-zoom .lb-pct{ min-width:64px; font-size:13px; font-variant-numeric:tabular-nums }
    .lb-cap{ position:relative; z-index:2; background:rgba(14,12,10,.92); padding-top:10px !important; color:#eee; font:14px/1.45 system-ui,-apple-system,sans-serif; text-align:center;
             padding:0 16px calc(14px + env(safe-area-inset-bottom)); max-width:760px; margin:0 auto; opacity:.85 }
    .lb-x{ position:absolute; top:calc(10px + env(safe-area-inset-top)); right:10px; width:44px; height:44px;
           border:0; border-radius:50%; background:rgba(255,255,255,.14); color:#fff; font-size:24px;
           line-height:44px; cursor:pointer; z-index:2; background:rgba(20,18,16,.82) }
    .lb-x:hover{ background:rgba(60,56,52,.9) }
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
    const bar = document.createElement('div'); bar.className = 'lb-zoom';
    const mk = (label, text) => { const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('aria-label', label); btn.textContent = text; bar.appendChild(btn); return btn; };
    const out = mk('Zoom out', '−'), pct = mk('Fit to screen', 'Fit'), inn = mk('Zoom in', '+');
    pct.classList.add('lb-pct');
    box.append(x, bar, stage, cap);
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => box.classList.add('on'));
    x.focus({ preventScroll: true });

    // zoom is relative to the fitted size. z = 1 fits the screen, up to 6x for small diagram text
    let z = 1, fitW = 0;
    const MAXZ = 6;
    const measure = () => { if (z === 1) fitW = big.getBoundingClientRect().width || fitW; };
    big.addEventListener('load', measure); requestAnimationFrame(measure);
    function zoomTo(nz, cx, cy) {
      measure();
      nz = Math.min(MAXZ, Math.max(1, nz));
      if (Math.abs(nz - z) < 0.001) return;
      const r = stage.getBoundingClientRect();
      const px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top;
      const ib = big.getBoundingClientRect();
      // which spot of the picture is under the pointer, 0 to 1
      const fx = (px + r.left - ib.left) / ib.width, fy = (py + r.top - ib.top) / ib.height;
      z = nz;
      if (z === 1) { box.classList.remove('full'); big.style.width = ''; pct.textContent = 'Fit'; return; }
      box.classList.add('full');
      big.style.width = (fitW * z) + 'px';
      const nb = big.getBoundingClientRect();
      stage.scrollLeft += nb.left + fx * nb.width - (px + r.left);
      stage.scrollTop += nb.top + fy * nb.height - (py + r.top);
      pct.textContent = Math.round(z * 100) + '%';
    }
    out.addEventListener('click', () => zoomTo(z / 1.5));
    inn.addEventListener('click', () => zoomTo(z * 1.5));
    pct.addEventListener('click', () => zoomTo(1));
    box._key = e => {
      if (e.key === '+' || e.key === '=') zoomTo(z * 1.5);
      else if (e.key === '-' || e.key === '_') zoomTo(z / 1.5);
      else if (e.key === '0') zoomTo(1);
    };
    // trackpad pinch arrives as ctrl + wheel. plain wheel scrolls around when zoomed
    stage.addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(z * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    }, { passive: false });

    // drag to pan, two fingers to pinch
    const pts = new Map(); let pan = null, pinch = null, moved = false;
    stage.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (pts.size === 2) {
        const [a, b2] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b2.x, a.y - b2.y), z };
        pan = null;
      } else if (z > 1) {
        pan = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
        stage.setPointerCapture(e.pointerId); stage.classList.add('drag');
      }
    });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b2] = [...pts.values()];
        zoomTo(pinch.z * Math.hypot(a.x - b2.x, a.y - b2.y) / pinch.d, (a.x + b2.x) / 2, (a.y + b2.y) / 2);
        moved = true;
      } else if (pan) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (Math.hypot(dx, dy) > 4) moved = true;
        stage.scrollLeft = pan.sl - dx; stage.scrollTop = pan.st - dy;
      }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { pan = null; stage.classList.remove('drag'); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

    // a tap on the picture zooms in where you tapped, a tap when zoomed in goes back to fit
    big.addEventListener('click', e => {
      e.stopPropagation();
      if (moved || performance.now() - openedAt < 400) return;
      if (z > 1) zoomTo(1); else zoomTo(2.5, e.clientX, e.clientY);
    });
    // the tap that opened it can arrive here as a click on some phones, so give it a moment
    stage.addEventListener('click', e => { if (e.target === stage && !moved && z === 1 && performance.now() - openedAt > 400) close(); });
    x.addEventListener('click', close);
    addEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); else if (box && box._key) box._key(e); }
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
