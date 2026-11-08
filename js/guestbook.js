/* the guestbook: sign the orbit.
   the whole footer is space. an ascii planet turns slowly (the same glyph
   ramp as the planet she lands on in the intro), her real cloud art and a few
   ascii clouds drift past, and everyone's doodles go round the planet in a
   slow ring. one of the things in orbit is a tiny station with 707 on its
   panel, for the mystic messenger fans. every so often something drifts past
   (a ringed planet, a moon, a ufo, a comet, a satellite), one or two at a
   time, all drawn the intro's way: shaded first, then turned into glyphs.
   a floating glyph satellite is the button that opens the drawing pad.

   storage is a google sheet behind an apps script web app (see
   guestbook/Code.gs). only rows hen has ticked "approved" come back, so
   nothing shows for anyone else until she's had a look. until ENDPOINT is
   set it runs locally, keeping doodles in this browser only. either way you
   always see your own doodles straight away. */
(function () {
  const ENDPOINT = ''; // the apps script web app url goes here

  const root = document.querySelector('[data-guestbook]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  root.classList.add('gb-ready');

  const INKS = ['#ffe45c', '#ff6fae', '#2fd0bd', '#f6eeda', '#ff7a3d'];
  const SIZES = [5, 11];
  const GRID = 256;                 // strokes are stored on a 256 grid, as ints
  const MAX_POINTS = 1600;
  const GLYPHS = '.:-=+*#%@';       // the intro's ramp, dark to bright
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ── the pad, in a modal ─────────────────────────────── */
  const modal = document.querySelector('.gb-modal');
  const pad = modal.querySelector('.gb-draw');
  const pctx = pad.getContext('2d');
  const nameIn = modal.querySelector('.gb-name');
  const sendBtn = modal.querySelector('.gb-send');
  const note = modal.querySelector('.gb-note');
  const noteText = note.textContent;
  let ink = 0, size = 0, strokes = [], cur = null;

  function fitPad() {
    const r = pad.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    if (!r.width) return;
    pad.width = Math.round(r.width * d); pad.height = Math.round(r.height * d);
    redrawPad();
  }
  function drawStrokes(ctx, list, w, h, glow, weight = 1) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of list) {
      const [c, z, ...pts] = s;
      ctx.strokeStyle = INKS[c] || INKS[0];
      ctx.lineWidth = SIZES[z] * (w / 300) * weight;
      if (glow) { ctx.shadowColor = INKS[c]; ctx.shadowBlur = 8; }
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i] / GRID * w, y = pts[i + 1] / GRID * h;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (pts.length === 2) ctx.lineTo(pts[0] / GRID * w + .01, pts[1] / GRID * h);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  function redrawPad() {
    pctx.clearRect(0, 0, pad.width, pad.height);
    drawStrokes(pctx, strokes, pad.width, pad.height);
    sendBtn.disabled = !strokes.length;
  }
  const count = () => strokes.reduce((n, s) => n + (s.length - 2) / 2, 0);
  function at(e) {
    const r = pad.getBoundingClientRect();
    return [Math.max(0, Math.min(GRID - 1, Math.round((e.clientX - r.left) / r.width * GRID))),
            Math.max(0, Math.min(GRID - 1, Math.round((e.clientY - r.top) / r.height * GRID)))];
  }
  pad.addEventListener('pointerdown', e => {
    if (count() >= MAX_POINTS) return;
    pad.setPointerCapture(e.pointerId);
    cur = [ink, size, ...at(e)]; strokes.push(cur); redrawPad();
  });
  pad.addEventListener('pointermove', e => {
    if (!cur || count() >= MAX_POINTS) return;
    const [x, y] = at(e), n = cur.length;
    if (Math.abs(cur[n - 2] - x) + Math.abs(cur[n - 1] - y) < 2) return;
    cur.push(x, y); redrawPad();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => pad.addEventListener(t, () => { cur = null; }));

  modal.querySelectorAll('.gb-ink').forEach((b, i) => {
    b.style.setProperty('--ink', INKS[i]);
    b.addEventListener('click', () => {
      ink = i; modal.querySelectorAll('.gb-ink').forEach(x => x.setAttribute('aria-pressed', x === b));
    });
  });
  modal.querySelectorAll('.gb-size').forEach((b, i) => b.addEventListener('click', () => {
    size = i; modal.querySelectorAll('.gb-size').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  modal.querySelector('.gb-undo').addEventListener('click', () => { strokes.pop(); redrawPad(); });
  modal.querySelector('.gb-clear').addEventListener('click', () => { strokes = []; redrawPad(); });
  modal.querySelector('.gb-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });   // a click on the backdrop
  root.querySelector('.gb-sat').addEventListener('click', () => {
    note.textContent = noteText;
    document.body.classList.add('gb-drawing');
    modal.showModal(); fitPad();
  });
  modal.addEventListener('close', () => document.body.classList.remove('gb-drawing'));

  /* ── the sky ─────────────────────────────────────────── */
  const cv = root.querySelector('.gb-orbit');
  const ctx = cv.getContext('2d');
  const sign = root.querySelector('.gb-sat');
  const countEl = root.querySelector('.gb-count');
  let W = 0, H = 0, dpr = 1, P = { x: 0, y: 0, r: 0 }, items = [], t0 = performance.now();

  // a little seeded random so the stars sit in the same places every visit
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 140 }, () => ({ x: rnd(), y: rnd(), r: .4 + rnd() * 1.1, p: rnd() * 6 }));

  // her real clouds, very dim, just two of them, drifting slowly
  const cloudImgs = ['/sky/cloud-a.webp', '/sky/cloud-c.webp'].map(u => { const i = new Image(); i.src = u; return i; });
  const clouds = cloudImgs.map((img, i) => ({ img, x: [.15, .7][i], y: [.62, .55][i], w: [.24, .2][i], v: .003, a: .07 }));

  /* the ascii look, the same way the intro does it: paint a thing with real
     shading first, then read it back cell by cell and swap each cell for a
     glyph off the ramp by how bright it is, in that cell's own colour.
     cells are taller than wide, so the painting is squashed to match */
  const CW = .62;
  function glyphSprite(cols, rows, paint, cell = 10) {
    const src = document.createElement('canvas'); src.width = cols; src.height = rows;
    const g = src.getContext('2d');
    g.setTransform(1, 0, 0, CW, 0, 0);
    paint(g, cols, rows / CW);
    const d = g.getImageData(0, 0, cols, rows).data;
    const out = document.createElement('canvas');
    out.width = Math.ceil(cols * cell * CW); out.height = rows * cell;
    const o = out.getContext('2d');
    o.font = `700 ${cell * .98}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    o.textAlign = 'center'; o.textBaseline = 'middle';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4, a = d[i + 3] / 255;
      if (a < .12) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const lum = Math.min(1, (r * .3 + gg * .59 + b * .11) / 255 * (.4 + .6 * a) * 1.25);
      const ch = GLYPHS[Math.max(1, Math.min(GLYPHS.length - 1, Math.round(lum * (GLYPHS.length - 1))))];
      o.fillStyle = `rgba(${r},${gg},${b},${.45 + .55 * a})`;
      o.fillText(ch, (x + .5) * cell * CW, (y + .5) * cell);
    }
    return out;
  }
  const ball = (g, x, y, r, light, mid, dark) => {
    const gr = g.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r);
    gr.addColorStop(0, light); gr.addColorStop(.55, mid); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  const PAINT = {
    // a ringed planet, the ring passing behind and then in front
    ringed(g, w, h) {
      const cx = w / 2, cy = h / 2, r = h * .3;
      const ring = front => { g.save(); g.translate(cx, cy); g.rotate(-.18); g.lineWidth = h * .045;
        g.strokeStyle = '#f2b36a'; g.beginPath(); g.ellipse(0, 0, w * .45, h * .1, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); g.stroke(); g.restore(); };
      ring(false);
      ball(g, cx, cy, r, '#ffd9a8', '#e0855a', '#5a2a3a');
      ring(true);
    },
    // a cratered moon
    moon(g, w, h) {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * .46;
      ball(g, cx, cy, r, '#f3f0ff', '#a9a3c9', '#3a3658');
      g.fillStyle = 'rgba(40,36,70,.55)';
      [[-.3, -.1, .2], [.25, .25, .16], [.1, -.4, .1], [-.15, .4, .09]].forEach(([dx, dy, s]) => { g.beginPath(); g.arc(cx + dx * r, cy + dy * r, s * r, 0, Math.PI * 2); g.fill(); });
    },
    // a little ufo: glass dome, metal saucer, three lights
    ufo(g, w, h) {
      const cx = w / 2, cy = h * .55;
      const dome = g.createRadialGradient(cx - w * .05, cy - h * .3, 1, cx, cy - h * .15, w * .2);
      dome.addColorStop(0, '#e8fffb'); dome.addColorStop(1, '#2fa89a');
      g.fillStyle = dome; g.beginPath(); g.ellipse(cx, cy - h * .1, w * .17, h * .3, 0, Math.PI, 0); g.fill();
      const body = g.createLinearGradient(0, cy - h * .12, 0, cy + h * .2);
      body.addColorStop(0, '#dfe6ff'); body.addColorStop(1, '#4a5a9a');
      g.fillStyle = body; g.beginPath(); g.ellipse(cx, cy, w * .46, h * .16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe45c'; [-.25, 0, .25].forEach(dx => { g.beginPath(); g.arc(cx + dx * w, cy + h * .02, h * .05, 0, Math.PI * 2); g.fill(); });
    },
    // a comet: bright head, a tail that fades out behind it
    comet(g, w, h) {
      const hx = w * .82, hy = h / 2;
      const tail = g.createLinearGradient(hx, 0, 0, 0);
      tail.addColorStop(0, 'rgba(159,220,255,.95)'); tail.addColorStop(1, 'rgba(159,180,255,0)');
      g.fillStyle = tail; g.beginPath(); g.moveTo(hx, hy - h * .22); g.lineTo(0, hy); g.lineTo(hx, hy + h * .22); g.fill();
      ball(g, hx, hy, h * .26, '#ffffff', '#bfe9ff', '#5a8ad8');
    },
    // a small pink planet with soft bands
    banded(g, w, h) {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * .46;
      ball(g, cx, cy, r, '#ffd0ec', '#d66aa8', '#3c1a4a');
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
      g.fillStyle = 'rgba(150,120,255,.45)';
      [-.35, .05, .4].forEach(dy => g.fillRect(cx - r, cy + dy * r, r * 2, r * .16));
      g.restore();
    },
    // a satellite: a gold body, a dish, and two blue panels with their cells
    satellite(g, w, h) {
      const cx = w / 2, cy = h / 2;
      const panel = x => {
        const pg = g.createLinearGradient(0, cy - h * .2, 0, cy + h * .2);
        pg.addColorStop(0, '#c6d6ff'); pg.addColorStop(1, '#5b78d8');
        g.fillStyle = pg; g.fillRect(x, cy - h * .2, w * .3, h * .4);
        g.fillStyle = 'rgba(10,16,48,.85)';
        for (let i = 1; i < 4; i++) g.fillRect(x + i * w * .075, cy - h * .2, 1.2, h * .4);
        g.fillRect(x, cy - .6, w * .3, 1.2);
      };
      panel(w * .02); panel(w * .68);
      g.fillStyle = '#9aa3c0'; g.fillRect(w * .3, cy - 1, w * .4, 2);
      const body = g.createLinearGradient(cx - w * .1, 0, cx + w * .1, 0);
      body.addColorStop(0, '#fff2b8'); body.addColorStop(1, '#b98b3c');
      g.fillStyle = body; g.fillRect(cx - w * .07, cy - h * .26, w * .14, h * .52);
      g.strokeStyle = '#dfe6ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - h * .3); g.lineTo(cx, cy - h * .42); g.stroke();
      g.fillStyle = '#ff6fae'; g.beginPath(); g.arc(cx, cy - h * .44, h * .04, 0, Math.PI * 2); g.fill();
    },
  };
  const VISITORS = [
    ['ringed', 46, 17, 8], ['moon', 22, 12, 8], ['ufo', 34, 12, 8], ['comet', 40, 9, 7], ['banded', 24, 13, 8],
  ].map(([k, c, r, cell]) => ({ k, img: glyphSprite(c, r, PAINT[k], cell) }));
  // the button's satellite isn't a visitor, there's only ever the one
  const SAT = glyphSprite(44, 13, PAINT.satellite, 7);

  /* only one or two visitors are ever out at once. each drifts across the
     whole sky over half a minute and leaves, and the next turns up a few
     seconds later, so the sky stays mostly empty */
  const out = [];
  let nextAt = 2;
  function visitors(t) {
    if (t >= nextAt && out.length < 2) {
      const pick = VISITORS[Math.floor(Math.random() * VISITORS.length)];
      if (!out.some(o => o.v === pick)) {
        const dir = Math.random() < .5 ? 1 : -1;
        const y = H * (Math.random() < .5 ? .1 + Math.random() * .2 : .62 + Math.random() * .14);
        out.push({ v: pick, born: t, dur: 26 + Math.random() * 12, dir, y, bob: Math.random() * 6 });
      }
      nextAt = t + 7 + Math.random() * 8;
    }
    for (let i = out.length - 1; i >= 0; i--) {
      const o = out[i], p = (t - o.born) / o.dur;
      if (p >= 1) { out.splice(i, 1); continue; }
      const img = o.v.img, w = img.width, h = img.height;
      const x = o.dir > 0 ? -w + p * (W + w * 2) : W + w - p * (W + w * 2);
      ctx.globalAlpha = Math.min(1, p * 8, (1 - p) * 8) * .85;
      ctx.drawImage(img, x - w / 2, o.y + Math.sin(t * .6 + o.bob) * 6 - h / 2);
    }
    ctx.globalAlpha = 1;
  }

  function sprite(entry) {             // each doodle, drawn once onto its own little canvas
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    drawStrokes(c.getContext('2d'), entry.s || [], S, S, true, 3);
    return c;
  }
  // the 707 station in orbit: two long panels and a module, in glyphs, with its number on top
  function station() {
    const g = glyphSprite(30, 7, (p, w, h) => {
      const cy = h / 2;
      [[w * .01, w * .36], [w * .63, w * .36]].forEach(([x, pw]) => {
        const pg = p.createLinearGradient(0, cy - h * .3, 0, cy + h * .3);
        pg.addColorStop(0, '#9fb4ff'); pg.addColorStop(1, '#2a3f86');
        p.fillStyle = pg; p.fillRect(x, cy - h * .3, pw, h * .6);
      });
      const b = p.createLinearGradient(0, cy - h * .45, 0, cy + h * .45);
      b.addColorStop(0, '#ffffff'); b.addColorStop(1, '#b8b0d8');
      p.fillStyle = b; p.fillRect(w * .4, cy - h * .45, w * .2, h * .9);
    }, 7);
    const c = g.getContext('2d');
    c.font = '800 11px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ff6fae'; c.fillText('707', g.width / 2, g.height / 2);
    return g;
  }

  function layout() {
    const r = root.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    P = { x: W / 2, y: H * .5, r: Math.max(48, Math.min(W * .075, H * .2)) };
    // the satellite button drifts up and left of the planet, clear of the ring
    sign.style.setProperty('--sx', Math.max(130, P.x - RX() * 1.35) + 'px');
    sign.style.setProperty('--sy', Math.max(20, P.y - P.r * 2.1) + 'px');
  }

  // the planet: glyphs on a grid, lit from the top left, with bands that turn
  function drawPlanet(t) {
    const cell = Math.max(7, P.r / 9), R = P.r;
    ctx.font = `700 ${cell * 1.15}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let y = -R; y <= R; y += cell) for (let x = -R; x <= R; x += cell * .62) {
      const d = Math.hypot(x, y) / R; if (d > 1) continue;
      const z = Math.sqrt(1 - d * d);
      const light = Math.max(0, (-x * .5 - y * .6 + z * .7 * R) / R);
      const lon = Math.atan2(x / R, z) + t * .12, lat = y / R;
      const band = .5 + .5 * Math.sin(lat * 7 + Math.sin(lon * 3) * 1.4);
      const v = Math.min(1, light * .75 + band * .35);
      const g = GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(v * GLYPHS.length))];
      const hue = band > .55 ? [255, 120, 190] : [150, 120, 255];
      ctx.fillStyle = `rgba(${hue[0]},${hue[1]},${hue[2]},${.35 + .65 * v})`;
      ctx.fillText(g, P.x + x, P.y + y);
    }
  }
  const RX = () => Math.min(W * .44, P.r * 3.6), RY = () => P.r * .7, TILT = -.08;
  function ringHalf(back) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(TILT);
    ctx.strokeStyle = 'rgba(47,208,189,.4)'; ctx.setLineDash([2, 8]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, RX(), RY(), 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI); ctx.stroke();
    ctx.restore();
  }
  function place(it, t) {
    const a = it.a + t * it.v;
    const x0 = Math.cos(a) * RX(), y0 = Math.sin(a) * RY();
    return { x: P.x + x0 * Math.cos(TILT) - y0 * Math.sin(TILT), y: P.y + x0 * Math.sin(TILT) + y0 * Math.cos(TILT),
             front: Math.sin(a) > 0, depth: (Math.sin(a) + 1) / 2 };
  }
  function drawItem(it, t) {
    let { x, y, depth } = place(it, t), k = 1;
    if (it.born) {                       // a fresh doodle rises up into the ring
      const p = Math.min(1, (performance.now() - it.born) / 1400), e = 1 - Math.pow(1 - p, 3);
      x = it.fromX + (x - it.fromX) * e; y = it.fromY + (y - it.fromY) * e; k = 2.4 - 1.4 * e;
      if (p >= 1) it.born = 0;
    }
    const s = (it.station ? 130 : 70) * (.7 + .45 * depth) * k, h = s * it.img.height / it.img.width;
    ctx.globalAlpha = .5 + .5 * depth;
    ctx.drawImage(it.img, x - s / 2, y - h / 2, s, h);
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    const t = calm ? 0 : (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = .35 + .35 * Math.sin(t * 1.3 + s.p);
      ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of clouds) {
      if (!c.img.complete || !c.img.naturalWidth) continue;
      const w = c.w * W, h = w * c.img.naturalHeight / c.img.naturalWidth;
      const x = ((c.x + t * c.v) % 1.3 - .15) * W;
      ctx.globalAlpha = c.a; ctx.drawImage(c.img, x - w / 2, c.y * H, w, h);
    }
    ctx.globalAlpha = 1;
    visitors(t);
    ringHalf(true);
    for (const it of items) if (!place(it, t).front && !it.born) drawItem(it, t);
    drawPlanet(t);
    ringHalf(false);
    for (const it of items) if (place(it, t).front || it.born) drawItem(it, t);
    if (running && !calm) raf = requestAnimationFrame(frame);
  }
  let raf = 0, running = false;
  const start = () => { if (running) return; running = true; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(es => es[0].isIntersecting ? start() : stop()).observe(root);

  function setCount() {
    const n = items.filter(i => !i.station).length;
    countEl.textContent = n ? `${n} ${n === 1 ? 'doodle' : 'doodles'} in orbit so far` : '';
  }
  function rebuild(list) {
    const keep = items.filter(i => i.born), n = list.length;
    items = [{ img: station(), a: 2.2, v: .06, station: true }];
    list.forEach((e, i) => items.push({ img: sprite(e), a: (i / Math.max(1, n)) * Math.PI * 2, v: .04 + (i % 5) * .006, id: e.id }));
    items.push(...keep);
    setCount();
    if (calm) frame(performance.now());
  }

  /* ── storage ─────────────────────────────────────────── */
  const mine = () => store.get('gb.mine', []);
  async function load() {
    let shared = [];
    if (ENDPOINT) {
      try { const r = await fetch(ENDPOINT + '?action=list'); const j = await r.json(); shared = j.items || []; } catch (e) {}
    } else shared = store.get('gb.local', []);
    const ids = new Set(shared.map(e => e.id));
    rebuild([...shared, ...mine().filter(e => !ids.has(e.id))]);
  }
  async function send() {
    if (!strokes.length || sendBtn.disabled) return;
    if (Date.now() - store.get('gb.last', 0) < 20000) { note.textContent = 'give it a sec before sending another one :)'; return; }
    const entry = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
                    n: (nameIn.value || '').trim().slice(0, 24), s: strokes };
    sendBtn.disabled = true;
    store.set('gb.mine', [...mine(), entry].slice(-12));
    store.set('gb.last', Date.now());
    if (!ENDPOINT) store.set('gb.local', [...store.get('gb.local', []), entry].slice(-80));
    modal.close();
    // it rises up from the satellite and joins the ring
    const sr = sign.getBoundingClientRect(), rr = root.getBoundingClientRect();
    items.push({ img: sprite(entry), a: Math.random() * Math.PI * 2, v: .05, id: entry.id, born: performance.now(),
                 fromX: sr.left + sr.width / 2 - rr.left, fromY: sr.top - rr.top });
    start(); setCount();
    strokes = []; redrawPad();
    if (ENDPOINT) {
      try { await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry) }); }
      catch (e) {}
    }
  }
  sendBtn.addEventListener('click', send);

  addEventListener('resize', () => { layout(); if (modal.open) fitPad(); if (calm) frame(performance.now()); });
  // the button's satellite is the same glyph satellite as the visitors
  const satCv = sign.querySelector('.gb-sat-art');
  if (satCv) {
    const s = SAT;
    satCv.width = s.width; satCv.height = s.height; satCv.getContext('2d').drawImage(s, 0, 0);
  }
  layout(); load();
})();
