// hen's cafe, the footer toy. everything on the counter and the shelves is a
// matter.js body you can grab and chuck around, and you make a drink the
// way you would irl: tilt the kettle to pour hot water, drop a tea bag in
// and it hooks on the rim and steeps, dip the honey stick in the jar and
// then in your drink, grind beans and brew the grounds, make matcha in the
// bowl and pour it over, pour milk, tip ice out of the bucket.
// the glass names whatever you made. tip it over to dump it and start again.
// matter only loads once the footer is close to the screen, so the rest of
// the site never pays for it
(() => {
  const root = document.querySelector('[data-cafe]');
  if (!root || root.dataset.cafeOn) return;
  root.dataset.cafeOn = '1';

  // the canvas covers the whole footer, the stall sits where [data-cafe]
  // is, so you can carry things off the counter and leave them anywhere
  const foot = root.closest('footer') || root.parentElement;
  const canvas = foot.querySelector('.cafe-canvas');
  const ctx = canvas.getContext('2d');
  const orderEl = foot.querySelector('.cafe-order');
  const keysEl = root.querySelector('.cafe-keys');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MATTER = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js';
  const INK = '#3e241b';

  // every thing on the counter. size is its longest side in px on a big
  // screen. box is the solid part of the sprite (a kettle's spout and
  // handle don't collide, the tea bag's string and tag just dangle).
  // mouth is where stuff comes out when you tip it, pour is what comes out
  const KINDS = {
    glass: { size: 168 },
    kettle: { size: 165, box: [.32, .03, .8, .98], mouth: [.02, .22], pour: 'water' },
    milk: { size: 83, mouth: [.03, .13], pour: 'milk' },
    matcha: { size: 75, mouth: [.5, .03], pour: 'powder', open: true },
    sugarbowl: { size: 66, mouth: [.5, .12], pour: 'sugar', open: true },
    whisk: { size: 90, box: [.14, .02, .86, .98] },
    teabag: { size: 108, box: [.02, .25, .6, .98] },
    dipper: { size: 92, box: [.3, .02, .7, .98], group: -2 },
    honey: { size: 70, group: -2 },
    bean: { size: 50, round: true },
    ice: { size: 42, float: true },
    lemon: { size: 68, round: true, float: true },
    cinnamon: { size: 80 },
    cookiejar: { size: 88, mouth: [.5, .03], spawn: 'cookie', open: true },
    cookie: { size: 46, round: true },
    plant: { size: 100, box: [.17, .32, .83, .99] },
    // the ice bucket keeps a few cubes, tip it and one tumbles out. chuck a
    // cube back in and it keeps it
    bucket: { size: 74, mouth: [.5, .08], spawn: 'ice', open: true },
    // beans go in the top, crank the handle, tip the drawer end over the glass
    grinder: { size: 120, box: [.1, .22, .9, .98], mouth: [.12, .55], pour: 'grounds' },
    // the matcha bowl: powder and a splash of hot water in, whisk, pour
    chawan: { size: 92, box: [.05, .2, .95, .96], mouth: [.5, .2], pour: 'bowl', open: true },
  };

  // where everything starts: x as a fraction of the width, on a shelf or
  // the counter. phones get fewer things
  const BIG = {
    shelves: [[.03, .34], [.69, .97]],
    items: [
      ['plant', 0, .07], ['matcha', 0, .14], ['sugarbowl', 0, .2], ['lemon', 0, .255], ['cinnamon', 0, .31],
      ['honey', 1, .725], ['dipper', 1, .775], ['cookiejar', 1, .845], ['bucket', 1, .925],
      ['teabag', -1, .05], ['grinder', -1, .14], ['bean', -1, .22], ['bean', -1, .25], ['bean', -1, .28],
      ['kettle', -1, .44], ['glass', -1, .575], ['milk', -1, .685], ['chawan', -1, .785], ['whisk', -1, .885],
    ],
  };
  const SMALL = {
    shelves: [[.03, .44], [.56, .97]],
    items: [
      ['matcha', 0, .09], ['sugarbowl', 0, .2], ['bucket', 0, .34],
      ['honey', 1, .63], ['dipper', 1, .72], ['bean', 1, .8], ['bean', 1, .86], ['whisk', 1, .93],
      ['teabag', -1, .06], ['grinder', -1, .18], ['kettle', -1, .38], ['glass', -1, .62], ['milk', -1, .79], ['chawan', -1, .92],
    ],
  };

  // the glass, in its own sprite's 0..1 coords. the walls are where the
  // drawn sides are so things really land inside it
  const WALLS = [[.06, .17, .21, .92], [.74, .17, .60, .92], [.16, .93, .65, .93]];
  const HANDLE = [.74, .24, .96, .70];
  const LEFT = (v) => .06 + (.21 - .06) * (v - .17) / .75;
  const RIGHT = (v) => .74 + (.60 - .74) * (v - .17) / .75;

  // colours of things in the glass
  const C = {
    water: [214, 232, 240], tea: [176, 104, 40], coffee: [104, 62, 36], matcha: [128, 166, 68],
    milk: [246, 236, 218], honey: [226, 164, 52], lemon: [242, 214, 110],
  };
  // what each poured drop looks like and how much of the glass it fills
  const DROP = {
    water: { col: 'rgba(225,242,255,.85)', r: 2.6, amt: .0055 },
    milk: { col: 'rgba(250,244,230,.95)', r: 2.6, amt: .0055 },
    powder: { col: 'rgba(124,168,70,.95)', r: 1.6, amt: .0012 },
    sugar: { col: 'rgba(255,255,255,.95)', r: 1.5, amt: .004, square: true },
    honey: { col: 'rgba(226,164,52,.95)', r: 3, amt: .012 },
    grounds: { col: 'rgba(74,44,29,.95)', r: 1.5, amt: .004, square: true },
    bowl: { col: 'rgba(140,176,80,.92)', r: 2.6, amt: .0055 },
  };
  const DUSTY = { powder: 1, sugar: 1, grounds: 1 };

  const imgs = {};
  let M, engine, W = 0, H = 0, floorY = 0, stage = { x: 0, y: 0, w: 0, h: 0 }, deco = null, CAB = 42, f = 1, built = false, running = false, dropped = false;
  let cup = null, bodies = [], shelves = [], drag = null, hover = false, hook = null;
  let G = fresh(), shown = { lvl: 0, rgb: C.water.slice(), a: 0 };
  let drops = [], steam = [], stars = [], lastName = '', inGlass = {};

  // what's in the glass. water, milk and espresso take up room, the rest
  // just changes it. grounds brew into coffee once there's water on them
  function fresh() { return { water: 0, milk: 0, shot: 0, shots: 0, tea: 0, matcha: 0, powder: 0, honey: 0, sugar: 0, foam: 0, grounds: 0, coffee: 0, cookie: false }; }
  const vol = () => G.water + G.milk + G.shot;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

  // the name. real drinks when it's a real drink, honest when it isn't
  function nameOf() {
    const v = vol(), ice = inGlass.ice > 0, lemon = inGlass.lemon > 0, cin = inGlass.cinnamon > 0;
    const beans = inGlass.bean > 0 ? ' (with whole beans in??)' : '';
    if (v < .03) {
      if (G.grounds > .01) return 'a glass of coffee grounds';
      if (G.powder > .01) return 'a pile of matcha powder';
      if (beans) return 'a glass of beans';
      if (G.honey > .02) return 'just honey??';
      if (G.sugar > .02) return 'a cup of sugar';
      if (G.shots) return 'espresso';
      if (ice) return 'a glass of ice';
      return '';
    }
    const tc = G.tea / v, mc = (G.matcha + G.powder) / v, milkF = G.milk / v;
    if (milkF > .1 && lemon) return 'curdled... oops';
    const cc = (G.coffee + G.grounds * .5) / v, isBrew = cc > .02;
    const isTea = tc > .04, isMat = mc > .02, isCof = G.shots > 0 || isBrew;
    let core, str = '';
    if (isTea + isMat + isCof === 3) core = 'the everything brew';
    else if (isCof && isMat) core = 'dirty matcha';
    else if (isCof && isTea) core = milkF > .15 ? 'yuenyeung' : 'tea with a shot';
    else if (isTea && isMat) core = 'double green tea';
    else if (isTea) {
      core = cin ? (milkF > .15 ? 'chai latte' : 'spiced tea')
        : milkF > .15 ? (milkF > .6 ? 'milky milk tea' : 'milk tea')
        : G.honey > .02 && lemon ? 'honey lemon tea'
        : lemon ? 'lemon tea' : 'tea';
      str = tc < .15 ? 'weak' : tc > .7 ? 'strong' : '';
    } else if (isBrew && !G.shots) {
      // coffee from the grinder, brewed in the glass
      core = G.grounds > G.coffee ? 'coffee (still brewing)'
        : milkF > .15 ? (cin ? 'cinnamon latte' : G.foam > .5 ? 'cappuccino' : 'café au lait')
        : 'coffee';
      str = cc < .06 ? 'weak' : cc > .3 ? 'strong' : '';
    } else if (isCof) {
      core = milkF > .15 ? (cin ? 'cinnamon latte' : G.foam > .5 ? 'cappuccino' : G.shots > 1 ? 'flat white' : 'latte')
        : G.water > .1 ? 'americano'
        : G.shots >= 4 ? 'rocket fuel' : G.shots === 3 ? 'triple shot' : G.shots === 2 ? 'double shot' : 'espresso';
    } else if (isMat) {
      core = G.powder > G.matcha ? 'clumpy matcha (whisk it!)'
        : milkF > .15 ? (G.foam > .4 ? 'frothy matcha latte' : 'matcha latte')
        : G.foam > .4 ? 'whisked matcha' : 'matcha';
    } else {
      core = milkF > .5 ? (G.honey > .02 ? 'honey milk' : 'a glass of milk')
        : milkF > .15 ? 'milky water??'
        : G.honey > .02 && lemon ? 'honey lemon water'
        : lemon ? 'lemon water'
        : ice ? 'ice water' : 'hot water';
    }
    const pre = str ? [str] : [];
    const sw = G.sugar / v;
    if (sw > .15) pre.push('very sweet'); else if (sw > .03) pre.push('sweet');
    if (ice && !core.includes('ice')) pre.push('iced');
    if (G.honey > .02 && !core.includes('honey')) pre.push('honey');
    if (cin && !/chai|cinnamon|spiced/.test(core)) pre.push('cinnamon');
    if (lemon && !core.includes('lemon')) pre.push('lemon');
    return [...pre, core].join(' ') + (G.cookie ? ' + a dunked cookie' : '') + beans;
  }

  // what colour it is and how full
  function look() {
    const v = Math.max(vol(), .05);
    const tc = G.tea / v, cc = (G.shot + G.coffee * .8) / v * 2.5, mc = (G.matcha + G.powder * .5) / v * 2.5;
    const dye = tc + cc + mc;
    let rgb = C.water.slice(), a = .28;
    if (dye > 0) {
      const dc = [0, 1, 2].map((i) => (C.tea[i] * tc + C.coffee[i] * cc + C.matcha[i] * mc) / dye);
      const s = 1 - Math.exp(-3 * dye);
      rgb = mix(rgb, dc, s); a = .28 + .64 * s;
    }
    const milkF = G.milk / v;
    if (milkF) { rgb = mix(rgb, C.milk, milkF * .8); a = Math.max(a, .3 + .65 * milkF); }
    if (G.honey) rgb = mix(rgb, C.honey, Math.min(.25, G.honey / v * .5));
    if (inGlass.lemon) rgb = mix(rgb, C.lemon, .08);
    return { rgb, a, lvl: Math.min(.95, vol()) };
  }

  // loading

  function loadMatter() {
    if (window.Matter) return Promise.resolve(window.Matter);
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = MATTER; s.onload = () => ok(window.Matter); s.onerror = no;
      document.head.appendChild(s);
    });
  }
  function loadImgs() {
    return Promise.all(Object.keys(KINDS).map((k) => new Promise((ok) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { imgs[k] = im; masks[k] = alphaOf(im); ok(); }; im.onerror = ok;
      im.src = `/cafe/${k}.webp`;
    })));
  }

  // each picture's see-through bits, so you can grab a thing anywhere it's
  // drawn (the kettle by its handle) and not by the empty space around it
  const masks = {};
  function alphaOf(im) {
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    try { return { w: im.width, h: im.height, a: x.getImageData(0, 0, im.width, im.height).data }; } catch { return null; }
  }
  function solidAt(b, p) {
    const { u, v } = toUV(b, p), m = masks[b.cafe.k];
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    if (!m) return true;
    return m.a[(Math.floor(v * (m.h - 1)) * m.w + Math.floor(u * (m.w - 1))) * 4 + 3] > 40;
  }

  // building the room

  function dims(k) {
    const im = imgs[k];
    const s = KINDS[k].size * f / Math.max(im.width, im.height);
    return { w: im.width * s, h: im.height * s };
  }

  function makeItem(k, x, y) {
    const { Bodies, Body } = M;
    const K = KINDS[k], { w, h } = dims(k);
    const [x0, y0, x1, y1] = K.box || [.06, .06, .94, .94];
    const bw = (x1 - x0) * w, bh = (y1 - y0) * h;
    const opts = { restitution: .2, friction: .6, frictionAir: .014, density: k === 'kettle' || k === 'grinder' ? .002 : .0012 };
    if (K.group) opts.collisionFilter = { group: K.group };
    const b = K.round
      ? Bodies.circle(x, y, Math.min(bw, bh) / 2, opts)
      : Bodies.rectangle(x, y, bw, bh, { ...opts, chamfer: { radius: Math.min(bw, bh) * .2 } });
    b.cafe = { k, w, h, dx: -((x0 + x1) / 2) * w, dy: -((y0 + y1) / 2) * h, coat: 0 };
    if (k === 'bucket') b.cafe.n = 3;
    if (k === 'grinder') Object.assign(b.cafe, { beans: 0, grounds: 0, turn: 0, crank: 0 });
    if (k === 'chawan') b.cafe.m = { water: 0, powder: 0, matcha: 0, foam: 0 };
    return b;
  }

  // the glass is one compound body: two slanted walls, a bottom and the handle
  function makeCup(x, y) {
    const { Bodies, Body } = M;
    const { w, h } = dims('glass');
    const sx = x - w / 2, sy = y - h / 2, t = Math.max(7, 10 * f);
    const P = WALLS.map(([u0, v0, u1, v1]) => {
      const ax = sx + u0 * w, ay = sy + v0 * h, bx = sx + u1 * w, by = sy + v1 * h;
      return Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, Math.hypot(bx - ax, by - ay) + t, t, { angle: Math.atan2(by - ay, bx - ax) });
    });
    const [hx0, hy0, hx1, hy1] = HANDLE;
    P.push(Bodies.rectangle(sx + (hx0 + hx1) / 2 * w, sy + (hy0 + hy1) / 2 * h, (hx1 - hx0) * w, (hy1 - hy0) * h, { chamfer: { radius: 10 * f } }));
    const b = Body.create({ parts: P, restitution: .1, friction: .7, frictionAir: .015 });
    Body.setDensity(b, .01);
    b.cafe = { k: 'glass', w, h, dx: sx - b.position.x, dy: sy - b.position.y };
    return b;
  }

  // physics categories: the footer's edges, and the counter and shelves
  const EDGE = 0x2, FIXTURE = 0x4, ALL = 0xffffffff;
  function build() {
    const { Engine, Bodies, Composite } = M;
    const r = foot.getBoundingClientRect(), sr = root.getBoundingClientRect();
    W = r.width; H = r.height;
    stage = { x: sr.left - r.left, y: sr.top - r.top, w: sr.width, h: sr.height };
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const small = stage.w < 600;
    const L = small ? SMALL : BIG;
    // it's a mini cafe, so everything's drawn at about 60% of the art size
    f = clamp(stage.w / 860, .72, 1) * .6;
    CAB = small ? 36 : 42;
    floorY = stage.y + stage.h - CAB;
    const X = (fx) => stage.x + fx * stage.w;

    if (engine) Composite.clear(engine.world, false);
    else engine = Engine.create({ enableSleeping: true });
    drag = null; hook = null;

    const th = 200, edge = { isStatic: true, friction: .8, collisionFilter: { category: EDGE } };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + th / 2 - 2, W * 3, th, edge),
      Bodies.rectangle(-th / 2, H / 2, th, H * 4, edge),
      Bodies.rectangle(W + th / 2, H / 2, th, H * 4, edge),
      Bodies.rectangle(W / 2, -th / 2, W * 3, th, edge),
      // the counter, which only runs the width of the stall
      Bodies.rectangle(stage.x + stage.w / 2, floorY + CAB / 2, stage.w, CAB, { isStatic: true, friction: .8, collisionFilter: { category: FIXTURE } }),
    ]);
    // one shelf each side, high enough for the kettle and grinder to fit under
    const sy = floorY - Math.max(112, 200 * f);
    shelves = L.shelves.map(([a, b]) => ({ x0: X(a), x1: X(b), y: sy, t: 9 }));
    Composite.add(engine.world, shelves.map((s) => Bodies.rectangle((s.x0 + s.x1) / 2, s.y + s.t / 2, s.x1 - s.x0, s.t, { isStatic: true, friction: .8, collisionFilter: { category: FIXTURE } })));

    const entrance = !calm && !dropped;
    bodies = [];
    L.items.forEach(([k, on, fx], i) => {
      const x = X(fx), top = on < 0 ? floorY : shelves[on].y;
      const { h } = dims(k);
      if (k === 'glass') { cup = makeCup(x, floorY - h / 2 - 2); return; }
      // counter things under a shelf can't fall in from the top, they'd land on it
      const under = on < 0 && shelves.some((s) => x > s.x0 - 30 && x < s.x1 + 30);
      const b = makeItem(k, x, entrance && !under ? top - h / 2 - 60 - (i % 4) * 26 : top - h / 2 - 2);
      b.cafe.home = { x, y: top - h / 2 - 30 };
      bodies.push(b);
    });
    Composite.add(engine.world, cup);
    if (entrance) bodies.forEach((b, i) => setTimeout(() => { if (built && bodies.includes(b)) M.Composite.add(engine.world, b); }, 100 + i * 70));
    else Composite.add(engine.world, bodies);
    dropped = true;
    built = true;
    deco = null;
    syncKeys();
  }

  // geometry helpers

  // a world point in a body's own sprite coords (0..1 across the picture)
  function toUV(b, p) {
    const a = -b.angle, c = Math.cos(a), s = Math.sin(a);
    const x = p.x - b.position.x, y = p.y - b.position.y;
    return { u: (x * c - y * s - b.cafe.dx) / b.cafe.w, v: (x * s + y * c - b.cafe.dy) / b.cafe.h };
  }
  function fromUV(b, u, v) {
    const lx = b.cafe.dx + u * b.cafe.w, ly = b.cafe.dy + v * b.cafe.h;
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    return { x: b.position.x + lx * c - ly * s, y: b.position.y + lx * s + ly * c };
  }
  const tiltOf = (b) => Math.abs(Math.atan2(Math.sin(b.angle), Math.cos(b.angle)));
  function inside(p, slack = 0) {
    const { u, v } = toUV(cup, p);
    return v > .18 - slack && v < .92 && u > LEFT(v) + .02 - slack && u < RIGHT(v) - .02 + slack;
  }
  // the drink's surface, as a height on screen
  const surfV = () => .94 - .76 * shown.lvl;
  const surfaceY = () => fromUV(cup, .4, surfV()).y;
  const wetAt = (p) => shown.lvl > .03 && inside(p, .02) && p.y > surfaceY() - 2;

  // the glass's insides

  function overflow() {
    const v = vol();
    if (v <= 1) return;
    const k = 1 / v;
    G.water *= k; G.milk *= k; G.shot *= k;
    const rim = [fromUV(cup, .08, .17), fromUV(cup, .72, .17)];
    for (let i = 0; i < 2; i++) {
      const p = rim[Math.random() < .5 ? 0 : 1];
      drops.push({ x: p.x, y: p.y, vx: (p.x - cup.position.x) * .6, vy: 0, kind: 'spill', col: tint(), r: 2.4 });
    }
  }
  const tint = () => `rgba(${shown.rgb.map(Math.round).join(',')},${Math.max(.55, shown.a)})`;

  function sparkle(p) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.8, s = 60 + Math.random() * 80;
      stars.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
    }
  }

  function rename() {
    const n = nameOf();
    if (n === lastName) return;
    lastName = n;
    orderEl.classList.remove('on');
    if (n) { orderEl.textContent = n; void orderEl.offsetWidth; orderEl.classList.add('on'); }
  }

  // tipping the glass over pours it out until there's nothing left
  function empty(dt) {
    const v = vol() + G.powder + G.honey + G.sugar;
    if (v < .01) { if (lastName) { G = fresh(); } return; }
    const k = Math.max(0, 1 - .7 * dt / Math.max(vol(), .05));
    for (const key of ['water', 'milk', 'shot', 'tea', 'matcha', 'powder', 'honey', 'sugar']) G[key] *= k;
    if (vol() < .015) { G = fresh(); }
    const rim = fromUV(cup, .4, .16);
    for (let i = 0; i < 2; i++) drops.push({ x: rim.x + (Math.random() - .5) * 26 * f, y: rim.y, vx: (Math.random() - .5) * 80, vy: 30, kind: 'spill', col: tint(), r: 2 + Math.random() * 2.5 });
  }

  // everything that happens each step besides the physics itself
  function tick(dt) {
    const up = tiltOf(cup) < .7;

    // what's floating around in the glass right now
    inGlass = { ice: 0, lemon: 0, cinnamon: 0, bean: 0 };
    const grinder = find('grinder'), bucket = find('bucket'), bowl = find('chawan');
    for (const b of bodies.slice()) {
      const k = b.cafe.k, isIn = up && inside(b.position);
      const held = drag && drag.body === b;
      if (isIn && k in inGlass) inGlass[k]++;

      // a bean dropped in the grinder's hopper waits there to be ground. a
      // fresh one turns up back where it came from
      if (k === 'bean' && grinder && !held && grinder.cafe.beans < 4 && tiltOf(grinder) < .6 && within(grinder, b.position, .12, .88, .02, .3)) {
        swallow(b); grinder.cafe.beans++; continue;
      }
      // ice chucked back in the bucket stays there
      if (k === 'ice' && bucket && !held && bucket.cafe.n < 4 && tiltOf(bucket) < .6 && within(bucket, b.position, .1, .9, -.1, .6)) {
        gone(b); bucket.cafe.n++; continue;
      }

      // ice and lemon float
      if (KINDS[k].float && wetAt(b.position)) {
        M.Body.applyForce(b, b.position, { x: 0, y: -b.mass * .0016 });
        M.Body.setVelocity(b, { x: b.velocity.x * .92, y: b.velocity.y * .9 });
      }

      // a dunked cookie counts once it's been under for a moment
      if (k === 'cookie' && wetAt(b.position)) { b.cafe.soak = (b.cafe.soak || 0) + dt; if (b.cafe.soak > .6) G.cookie = true; }

      // the tea bag steeps while it's in the water, faster when it's hot
      if (k === 'teabag' && (wetAt(fromUV(b, .3, .9)) || wetAt(fromUV(b, .3, .6)))) G.tea += dt * (inGlass.ice ? .02 : .055);

      // the whisk mixes in matcha powder and makes foam the faster you go,
      // in the matcha bowl (the proper way) or right in the glass
      if (k === 'whisk') {
        const tip = fromUV(b, .5, .25), sp = Math.min(b.speed, 12);
        if (wetAt(tip)) {
          const d = Math.min(G.powder, sp * dt * .08);
          G.powder -= d; G.matcha += d;
          if (G.matcha + G.powder > .01 || G.milk > .05) G.foam = Math.min(1, G.foam + sp * dt * .05);
        } else if (bowl && bowl.cafe.m.water > .01 && within(bowl, tip, .08, .92, -.12, .85)) {
          const m = bowl.cafe.m, d = Math.min(m.powder, sp * dt * .08);
          m.powder -= d; m.matcha += d;
          if (m.matcha > .005) m.foam = Math.min(1, m.foam + sp * dt * .06);
        }
      }

      // the honey stick picks honey up from the jar and leaves it in the drink
      if (k === 'dipper') {
        const tip = fromUV(b, .5, .14);
        const jar = bodies.find((x) => x.cafe.k === 'honey');
        b.cafe.inJar = false;
        if (jar) {
          const { u, v } = toUV(jar, tip);
          if (u > .12 && u < .88 && v > .22 && v < .95) { b.cafe.coat = Math.min(1, b.cafe.coat + dt * 2); b.cafe.inJar = true; }
        }
        if (b.cafe.coat > .05 && (wetAt(tip) || (up && inside(tip) && vol() < .05))) {
          const a = Math.min(b.cafe.coat, dt * 1.2);
          b.cafe.coat -= a; G.honey += a * .15;
          if (b.cafe.coat < .05) sparkle(tip);
        }
        if (b.cafe.coat > .25 && !b.cafe.inJar && !calm && Math.random() < dt * 1.4 * b.cafe.coat) {
          drops.push({ x: tip.x, y: tip.y + 6 * f, vx: 0, vy: 20, kind: 'honey', ...DROP.honey });
          b.cafe.coat -= .04;
        }
      }

      // tipping something that pours. it pours once its mouth points below
      // level, but only while you're holding it, or a kettle knocked on its
      // side would pour forever
      const K = KINDS[k];
      if (K.mouth) {
        const c = fromUV(b, (K.box ? (K.box[0] + K.box[2]) / 2 : .5), .5);
        const m = fromUV(b, K.mouth[0], K.mouth[1]);
        const dx = m.x - c.x, dy = m.y - c.y, len = Math.hypot(dx, dy) || 1;
        const down = dy / len;
        b.cafe.cd = (b.cafe.cd || 0) - dt;
        if (down > .05) {
          if (K.pour && held && hasStock(b)) {
            const rate = clamp((down - .05) * 6, .2, 1) * (DUSTY[K.pour] ? 32 : 110);
            b.cafe.acc = (b.cafe.acc || 0) + rate * dt;
            while (b.cafe.acc >= 1 && hasStock(b)) {
              b.cafe.acc--;
              const s = 40 + Math.random() * 40;
              drops.push({ x: m.x + (Math.random() - .5) * 4, y: m.y, vx: dx / len * s + b.velocity.x * 30, vy: dy / len * s, kind: K.pour, ...DROP[K.pour], ...take(b) });
            }
          } else if (K.spawn && down > .3 && b.cafe.cd <= 0 && (k === 'bucket' ? b.cafe.n > 0 : bodies.filter((x) => x.cafe.k === K.spawn).length < 3)) {
            // turn the cookie jar or the ice bucket over and one falls out
            // tipped over the glass, it drops straight in rather than bouncing off the rim
            const aim = b.cafe.assist && k === 'bucket' ? fromUV(cup, .4, -.12) : null;
            const c2 = makeItem(K.spawn, aim ? aim.x : m.x, aim ? Math.min(aim.y, m.y + 14 * f) : m.y + 14 * f);
            M.Body.setVelocity(c2, aim ? { x: 0, y: 1 } : { x: dx / len * 3, y: 2 });
            bodies.push(c2); M.Composite.add(engine.world, c2);
            b.cafe.cd = k === 'bucket' ? .45 : 1.2;
            if (k === 'bucket') b.cafe.n--;
          }
        }
      }
    }

    // grounds sitting in water brew into coffee, slower when it's iced
    if (G.grounds > 0 && G.water > .05) {
      const d = Math.min(G.grounds, dt * (inGlass.ice ? .012 : .03));
      G.grounds -= d; G.coffee += d;
    }

    // a little help while you're holding something. a kettle, jug, tin or
    // bowl held over the glass tips itself to pour and stands back up when
    // you move it away, so you don't spill it all over the counter. the
    // honey stick and the whisk hang tip down so they're easy to dip
    if (drag && drag.body && drag.body !== cup) {
      const b = drag.body, K = KINDS[b.cafe.k];
      let want = null, gain = .06;
      if (K.pour || K.spawn) {
        const m = fromUV(b, K.mouth[0], K.mouth[1]);
        // what it can pour into: the glass, and for water and matcha the bowl
        const bowl = find('chawan');
        const tos = [[cup, .1, .7, .17, up]];
        if (bowl && bowl !== b && (K.pour === 'water' || K.pour === 'powder')) tos.push([bowl, .1, .9, .22, tiltOf(bowl) < .6]);
        // a bit of slack once it's pouring so it doesn't wobble in and out
        const s = b.cafe.assist ? 90 : 35;
        const to = tos.find(([t, u0, u1, v, ok]) => {
          const l = fromUV(t, u0, v), r = fromUV(t, u1, v);
          return ok && m.x > l.x - s * f && m.x < r.x + s * f && m.y < l.y + (b.cafe.assist ? 70 : 10);
        });
        const over = !!to;
        b.cafe.assist = over;
        // spouts point left so they tip left. open tops (the tin, the sugar
        // bowl) tip right over towards whichever side the glass is on
        const open = K.open;
        want = !over ? 0 : open ? (b.position.x > to[0].position.x ? -2.1 : 2.1) : -.95;
        if (!over) gain = .04;
      } else if (b.cafe.k === 'dipper' || b.cafe.k === 'whisk') want = Math.PI;
      if (want !== null) {
        const diff = Math.atan2(Math.sin(want - b.angle), Math.cos(want - b.angle));
        M.Body.setAngularVelocity(b, b.angularVelocity * .8 + diff * gain);
      }
    }

    // the tea bag hooks its string on the rim when you let go of it inside
    // the glass, and comes off when you pull it out
    const bag = bodies.find((b) => b.cafe.k === 'teabag');
    if (bag) {
      const held = drag && drag.body === bag;
      // only once it's properly down in the glass, not perched on the rim,
      // and the string is as long as it is right then so it doesn't yank
      if (!hook && !held && up && inside(bag.position) && toUV(cup, bag.position).v > .4) {
        const rim = fromUV(cup, .68, .17), top = fromUV(bag, .37, .22);
        hook = M.Constraint.create({
          bodyA: cup, pointA: { x: rim.x - cup.position.x, y: rim.y - cup.position.y },
          bodyB: bag, pointB: { x: top.x - bag.position.x, y: top.y - bag.position.y },
          length: Math.max(Math.hypot(top.x - rim.x, top.y - rim.y), cup.cafe.h * .3), stiffness: .02, damping: .05,
        });
        M.Composite.add(engine.world, hook);
      } else if (hook && (held && !inside(bag.position, .12) || tiltOf(cup) > 1.3)) {
        M.Composite.remove(engine.world, hook); hook = null;
      }
    }

    // something you just let go of stays a ghost until it's not inside
    // anything, so dropping it on top of stuff doesn't make it explode
    for (const b of [cup, ...bodies]) {
      if (!b.cafe.ghost) continue;
      const others = engine.world.bodies.filter((x) => x !== b && !x.isStatic);
      if (!M.Query.collides(b, others).length) { b.cafe.ghost = false; carry(b, false); }
    }

    // poured drops fly until they land in the glass or hit something
    for (const d of drops) {
      d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      // water and matcha land in the matcha bowl too
      if (bowl && (d.kind === 'water' || d.kind === 'powder') && tiltOf(bowl) < .6 && within(bowl, d, .1, .9, .1, .45)) {
        d.dead = true;
        const m = bowl.cafe.m;
        if (d.kind === 'water') m.water = Math.min(.15, m.water + d.amt); else m.powder += d.amt;
        continue;
      }
      if (d.kind !== 'spill' && up && inside(d)) {
        d.dead = true;
        if (d.kind === 'bowl') { G.water += d.w; G.matcha += d.mt; G.powder += d.pw; G.foam = Math.max(G.foam, d.fo * .8); continue; }
        if (d.kind === 'grounds') { G.grounds += d.amt; continue; }
        if (d.kind === 'water') G.water += d.amt;
        else if (d.kind === 'milk') G.milk += d.amt;
        else if (d.kind === 'powder') G.powder += d.amt;
        else if (d.kind === 'sugar') G.sugar += d.amt;
        else if (d.kind === 'honey') G.honey += d.amt;
        continue;
      }
      if (d.y > H || (d.y > floorY && d.x > stage.x && d.x < stage.x + stage.w)) d.dead = true;
      for (const s of shelves) if (d.x > s.x0 && d.x < s.x1 && d.y > s.y && d.y < s.y + s.t) d.dead = true;
      if (d.x < -20 || d.x > W + 20) d.dead = true;
    }
    drops = drops.filter((d) => !d.dead);
    if (drops.length > 900) drops.splice(0, drops.length - 900);

    // the foam settles if you leave it
    G.foam = Math.max(0, G.foam - dt * .015);
    if (bowl) bowl.cafe.m.foam = Math.max(0, bowl.cafe.m.foam - dt * .01);
    overflow();
    if (tiltOf(cup) > 1.5) empty(dt);
    rename();
  }

  const find = (k) => bodies.find((b) => b.cafe.k === k);
  // is a point inside part of a thing, in its sprite coords
  function within(b, p, u0, u1, v0, v1) {
    const { u, v } = toUV(b, p);
    return u > u0 && u < u1 && v > v0 && v < v1;
  }
  // the grinder only pours grounds it has, the bowl only what's in it
  function hasStock(b) {
    if (b.cafe.k === 'grinder') return b.cafe.grounds > .0005;
    if (b.cafe.k === 'chawan') { const m = b.cafe.m; return m.water + m.powder + m.matcha > .0005; }
    return true;
  }
  // what one poured drop takes out of the thing pouring it
  function take(b) {
    if (b.cafe.k === 'grinder') { const a = Math.min(DROP.grounds.amt, b.cafe.grounds); b.cafe.grounds -= a; return { amt: a }; }
    if (b.cafe.k !== 'chawan') return {};
    const m = b.cafe.m, tot = m.water + m.powder + m.matcha, r = Math.min(1, DROP.bowl.amt / Math.max(tot, 1e-6));
    const d = { w: m.water * r, mt: m.matcha * r, pw: m.powder * r, fo: m.foam, col: bowlCol(m) };
    m.water -= d.w; m.matcha -= d.mt; m.powder -= d.pw;
    if (m.water + m.powder + m.matcha < .001) Object.assign(m, { water: 0, powder: 0, matcha: 0, foam: 0 });
    return d;
  }
  function bowlCol(m) {
    const c = clamp((m.matcha + m.powder) / Math.max(m.water, .02) * 4, 0, 1);
    const rgb = mix(mix(C.water, C.matcha, c), [236, 244, 214], m.foam * .45).map(Math.round);
    return `rgba(${rgb.join(',')},.95)`;
  }
  // gone for good (ice back in the bucket)
  function gone(b) {
    M.Composite.remove(engine.world, b);
    bodies = bodies.filter((x) => x !== b);
    if (drag && drag.body === b) letGo();
  }

  // the bean goes into the grinder, a new one drops back home after a bit
  function swallow(b) {
    gone(b);
    const { k, home } = b.cafe;
    setTimeout(() => {
      if (!built) return;
      const nb = makeItem(k, home.x, home.y - 40);
      nb.cafe.home = home;
      bodies.push(nb); M.Composite.add(engine.world, nb);
    }, 1600);
  }

  // dragging: a soft spring from your pointer to where you grabbed, so
  // things swing and can be thrown

  const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function hit(p) {
    const g = find('grinder');
    if (g && nearCrank(g, p)) return g;
    for (let i = bodies.length - 1; i >= 0; i--) if (solidAt(bodies[i], p)) return bodies[i];
    if (solidAt(cup, p) || inside(p, .04)) return cup;
    return null;
  }
  // the grinder's crank: the handle on top swings round its post. you
  // turn it by circling your pointer round the post
  const pivotOf = (g) => fromUV(g, .5, .1);
  function knobOf(g) {
    const R = g.cafe.w * .55, a = g.cafe.crank, lx = Math.cos(a) * R, ly = Math.sin(a) * R * .3 - 4 * f;
    const c = Math.cos(g.angle), s = Math.sin(g.angle), o = pivotOf(g);
    return { x: o.x + lx * c - ly * s, y: o.y + lx * s + ly * c };
  }
  function nearCrank(g, p) {
    if (tiltOf(g) > .5) return false;
    const k = knobOf(g), o = pivotOf(g);
    return Math.hypot(p.x - k.x, p.y - k.y) < 16 || Math.hypot(p.x - o.x, p.y - o.y) < 12 || (solidAt(g, p) && toUV(g, p).v < .2);
  }
  function crankTo(p) {
    const g = drag.crank, o = pivotOf(g), a = Math.atan2(p.y - o.y, p.x - o.x);
    if (Math.hypot(p.x - o.x, p.y - o.y) < 6) return;
    const d = Math.atan2(Math.sin(a - drag.a), Math.cos(a - drag.a));
    drag.a = a;
    g.cafe.crank += d;
    if (!g.cafe.beans) { g.cafe.turn = 0; return; }
    // about one turn grinds one bean
    g.cafe.turn += Math.abs(d);
    if (!calm && Math.random() < Math.abs(d) * 1.5) {
      const q = fromUV(g, .5, .5);
      stars.push({ x: q.x + (Math.random() - .5) * 20, y: q.y - 20 * f, vx: (Math.random() - .5) * 60, vy: -60, t: .2, dust: true });
    }
    if (g.cafe.turn > Math.PI * 1.6) {
      g.cafe.turn = 0; g.cafe.beans--; g.cafe.grounds += .1;
      sparkle(fromUV(g, .5, .7));
    }
  }

  // while you carry something it ghosts through the other things (not the
  // counter, shelves or the footer's edges), and goes solid again once you
  // let go and it's clear of them
  function carry(b, on) {
    for (const p of b.parts) p.collisionFilter.mask = on ? EDGE | FIXTURE : ALL;
  }
  function grab(p) {
    const body = hit(p);
    if (!body) return false;
    if (body.cafe.k === 'grinder' && nearCrank(body, p)) {
      const o = pivotOf(body);
      drag = { crank: body, a: Math.atan2(p.y - o.y, p.x - o.x) };
      canvas.classList.add('grabbing');
      return true;
    }
    M.Sleeping.set(body, false);
    carry(body, true);
    const c = M.Constraint.create({ pointA: { ...p }, bodyB: body, pointB: { x: p.x - body.position.x, y: p.y - body.position.y }, stiffness: .18, damping: .1, length: 0 });
    M.Composite.add(engine.world, c);
    drag = { body, c };
    canvas.classList.add('grabbing');
    return true;
  }
  function letGo() {
    if (!drag) return;
    if (drag.c) M.Composite.remove(engine.world, drag.c);
    if (drag.body) drag.body.cafe.ghost = true;
    drag = null;
    canvas.classList.remove('grabbing');
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!built || e.button > 0) return;
    if (grab(pt(e))) { canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!built) return;
    const p = pt(e);
    if (drag && drag.crank) { crankTo(p); return; }
    if (drag) { drag.c.pointA.x = p.x; drag.c.pointA.y = p.y; M.Sleeping.set(drag.body, false); return; }
    const over = e.pointerType === 'mouse' && !!hit(p);
    if (over !== hover) { hover = over; canvas.classList.toggle('grab', over); }
  });
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);
  // on a phone a finger on a thing grabs it, anywhere else still scrolls
  canvas.addEventListener('touchstart', (e) => {
    if (!built) return;
    const t = e.touches[0];
    if (t && hit(pt(t))) e.preventDefault();
  }, { passive: false });

  // keyboard: the same steps as buttons
  function syncKeys() {
    if (keysEl.childElementCount) return;
    const acts = [
      ['pour hot water', () => { G.water += .3; }],
      ['steep a tea bag', () => { G.tea += .15; }],
      ['brew some coffee', () => { G.coffee += .1; }],
      ['add whisked matcha', () => { G.matcha += .06; G.foam = .6; }],
      ['pour milk', () => { G.milk += .2; }],
      ['add honey', () => { G.honey += .08; }],
      ['add sugar', () => { G.sugar += .05; }],
      ['add ice', () => {
        const bk = find('bucket');
        if (!bk || bk.cafe.n < 1) return;
        const p = fromUV(cup, .4, -.15), c = makeItem('ice', p.x, p.y);
        bodies.push(c); M.Composite.add(engine.world, c); bk.cafe.n--;
      }],
      ['empty the glass', () => { for (let i = 0; i < 20; i++) empty(.05); G = fresh(); }],
    ];
    for (const [label, fn] of acts) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => { if (built) { fn(); overflow(); sparkle(fromUV(cup, .4, .2)); rename(); } });
      keysEl.appendChild(b);
    }
  }

  // drawing

  function sprite(b) {
    const { w, h, dx, dy, k } = b.cafe;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    if (k === 'teabag' && hook) {
      // hooked: just the bag, the string and tag get drawn over the rim
      const im = imgs.teabag;
      ctx.drawImage(im, 0, im.height * .2, im.width * .63, im.height * .8, dx, dy + h * .2, w * .63, h * .8);
    } else ctx.drawImage(imgs[k], dx, dy, w, h);
    const X = (u) => dx + u * w, Y = (v) => dy + v * h;
    if (k === 'bucket') {
      // the cubes it's holding, poking out the top
      const iw = w * .3;
      [[.34, .08, -.2], [.62, .06, .25], [.48, .0, .05], [.42, -.04, .4]].slice(0, b.cafe.n).forEach(([u, v, r]) => {
        ctx.save(); ctx.translate(X(u), Y(v)); ctx.rotate(r);
        ctx.drawImage(imgs.ice, -iw / 2, -iw / 2, iw, iw); ctx.restore();
      });
    }
    if (k === 'grinder') {
      // beans waiting in the hopper, and the grounds showing in the drawer window
      for (let i = 0; i < b.cafe.beans; i++) {
        const bw = w * .2;
        ctx.save(); ctx.translate(X(.38 + (i % 3) * .12), Y(.24 - (i > 2) * .03)); ctx.rotate(i * 1.3 + b.cafe.crank * .1);
        ctx.drawImage(imgs.bean, -bw / 2, -bw / 2, bw, bw); ctx.restore();
      }
      if (b.cafe.grounds > 0) {
        const lv = Math.min(1, b.cafe.grounds / .3), y1 = Y(.815), y0 = y1 - (Y(.815) - Y(.73)) * lv;
        ctx.fillStyle = '#7a4a2c';
        ctx.beginPath(); ctx.moveTo(X(.33), y1); ctx.lineTo(X(.33), y0 + 2); ctx.quadraticCurveTo(X(.5), y0 - 3, X(.67), y0 + 2); ctx.lineTo(X(.67), y1); ctx.fill();
      }
    }
    if (k === 'chawan') {
      const m = b.cafe.m, tot = m.water + m.powder + m.matcha;
      if (tot > .002) {
        const lv = clamp(tot / .2, .35, 1);
        ctx.fillStyle = bowlCol(m);
        ctx.beginPath(); ctx.ellipse(X(.5), Y(.27 + (1 - lv) * .05), w * .4 * (.8 + .2 * lv), h * .095 * (.8 + .2 * lv), 0, 0, 7); ctx.fill();
        // dry powder floats in clumps till it's whisked, foam gets little bubbles
        ctx.fillStyle = 'rgba(100,140,52,.95)';
        for (let i = 0; i < Math.min(18, m.powder * 400); i++) { ctx.beginPath(); ctx.arc(X(.5) + ((i * 37) % 23 - 11) * w * .025, Y(.27) + ((i * 13) % 5 - 2) * h * .012, 1.4 * f / .6, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,240,.7)';
        for (let i = 0; i < m.foam * 12; i++) { ctx.beginPath(); ctx.arc(X(.5) + ((i * 29) % 21 - 10) * w * .03, Y(.27) + ((i * 7) % 5 - 2) * h * .015, 1.2 * f / .6, 0, 7); ctx.fill(); }
      }
    }
    if (k === 'dipper' && b.cafe.coat > .02) {
      // a glossy blob of honey on the end
      const c = b.cafe.coat;
      ctx.globalAlpha = .55 + .4 * c;
      ctx.fillStyle = '#e8a93a';
      ctx.beginPath(); ctx.ellipse(dx + w * .5, dy + h * .16, w * (.42 + .12 * c), h * (.13 + .04 * c), 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,190,.8)';
      ctx.beginPath(); ctx.ellipse(dx + w * .36, dy + h * .1, w * .08, h * .03, -.4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function crank(g) {
    const o = pivotOf(g), k = knobOf(g), lw = 3 * f / .6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = lw + 4;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(k.x, k.y); ctx.stroke();
    ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(k.x, k.y); ctx.stroke();
    ctx.fillStyle = '#8a5638'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const kw = 7 * f / .6, kh = 12 * f / .6;
    ctx.beginPath(); ctx.roundRect(k.x - kw / 2, k.y - kh, kw, kh, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.arc(o.x, o.y, 3.5 * f / .6, 0, 7); ctx.fill(); ctx.stroke();
  }

  // the string from the bag over the rim, and the tag hanging outside
  function teaString() {
    const bag = hook && bodies.find((b) => b.cafe.k === 'teabag');
    if (!bag) return;
    const top = fromUV(bag, .37, .22), rim = fromUV(cup, .68, .15), out = fromUV(cup, .8, .34);
    ctx.strokeStyle = 'rgba(120,96,80,.9)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(top.x + 4, rim.y - 6, rim.x, rim.y - 2);
    ctx.quadraticCurveTo(rim.x + 10 * f, rim.y - 4, out.x, out.y - 10 * f);
    ctx.stroke();
    const im = imgs.teabag, tw = bag.cafe.w * .3, th = bag.cafe.h * .34;
    ctx.save(); ctx.translate(out.x, out.y); ctx.rotate(cup.angle * .5);
    ctx.drawImage(im, im.width * .69, im.height * .55, im.width * .31, im.height * .36, -tw / 2, -th * .25, tw, th);
    ctx.restore();
  }

  // the inside of the glass, traced off the drawing, so the drink is
  // round at the bottom and bulges where the glass does
  const INNER = [[.04, .17], [.04, .3], [.05, .44], [.065, .52], [.08, .6], [.1, .68], [.125, .74], [.15, .8], [.175, .86], [.2, .895],
    [.235, .92], [.29, .94], [.4, .947], [.5, .94], [.57, .92], [.605, .895], [.63, .86], [.65, .82], [.665, .78], [.68, .74],
    [.705, .68], [.722, .6], [.73, .5], [.735, .3], [.725, .17]];
  function hollow() {
    const { w, h, dx, dy } = cup.cafe;
    ctx.beginPath();
    INNER.forEach(([u, v], i) => ctx[i ? 'lineTo' : 'moveTo'](dx + u * w, dy + v * h));
    ctx.closePath();
  }
  // how wide the inside is at a height, for the drink's top
  function widthAt(v) {
    const L = INNER.slice(0, 13), R = INNER.slice(12).reverse();
    const at = (side) => { for (let i = 1; i < side.length; i++) if (side[i][1] >= v) { const [u0, v0] = side[i - 1], [u1, v1] = side[i]; return u0 + (u1 - u0) * (v - v0) / ((v1 - v0) || 1); } return side[side.length - 1][0]; };
    return [at(L), at(R)];
  }

  function liquid(t) {
    const { w, h, dx, dy } = cup.cafe;
    // a faint light behind the glass so it (and a dark coffee) reads on the night footer
    ctx.save(); ctx.translate(cup.position.x, cup.position.y); ctx.rotate(cup.angle);
    hollow(); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.restore();
    if (shown.lvl < .01) return;
    ctx.save();
    ctx.translate(cup.position.x, cup.position.y);
    ctx.rotate(cup.angle);
    hollow(); ctx.clip();
    // the top stays flat while the glass tilts
    const sv = surfV(), [ul, ur] = widthAt(sv), upright = tiltOf(cup) < .25;
    ctx.translate(dx + (ul + ur) / 2 * w, dy + sv * h);
    ctx.rotate(-cup.angle);
    const [r, g, b] = shown.rgb.map(Math.round);
    const rx = (ur - ul) / 2 * w, ry = Math.min(5 * f / .6, rx * .16);
    ctx.fillStyle = `rgba(${r},${g},${b},${shown.a * .88})`;
    ctx.fillRect(-w * 2, 0, w * 4, h * 3);
    // the top of the drink is an oval when the glass is standing up, so it
    // looks round like the glass instead of a flat cut
    if (upright) {
      ctx.fillStyle = `rgba(${mix([r, g, b], [255, 255, 255], .25).map(Math.round).join(',')},${Math.min(1, shown.a * .95)})`;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
    }
    if (G.foam > .05) {
      const fh = (3 + 7 * G.foam) * f;
      ctx.fillStyle = `rgba(${mix([r, g, b], [255, 250, 238], .6).map(Math.round).join(',')},.96)`;
      ctx.fillRect(-w * 2, -1, w * 4, fh);
      if (upright) { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.arc(i * 8 * f + Math.sin(t * 2 + i) * 1.2, fh * .5, 1.5 * f, 0, 7); ctx.fill(); }
    } else if (upright) {
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 0, rx * .92, ry * .8, 0, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(-w * 2, 0, w * 4, 2);
    }
    // matcha powder that hasn't been whisked in sits on top in clumps
    ctx.fillStyle = 'rgba(64,38,24,.9)';
    for (let i = 0; i < Math.min(30, G.grounds * 200); i++) {
      const x = ((i * 41) % 29 - 14) * 3.2 * f, y = 2 + ((i * 17) % 9) * 2.5 * f;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.fillStyle = 'rgba(110,150,60,.95)';
    for (let i = 0; i < Math.min(26, G.powder * 260); i++) {
      const x = ((i * 37) % 23 - 11) * 4 * f, s = (1.4 + (i % 3) * .8) * f;
      ctx.beginPath(); ctx.arc(x, 1 + (i % 2), s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // the stall: a striped awning with a sign, a tiled wall, a chalkboard
  // menu, an open sign, shelves and a cabinet counter. it doesn't move, so
  // it's drawn once into its own canvas and redrawn on resize or theme flip
  const night = () => document.documentElement.dataset.theme !== 'light';
  function pal() {
    return night()
      ? { wall: '#3a3048', tile: '#43384f', grout: 'rgba(255,240,220,.08)', awA: '#6f8a52', awB: '#d9ccb0', board: '#26302a', chalk: '#e9e4d4', top: '#b97a4c', cab: '#7f4d31', door: '#93603f' }
      : { wall: '#f6e3c3', tile: '#fbf1de', grout: 'rgba(62,36,27,.12)', awA: '#9bb070', awB: '#fdf6e7', board: '#2f3b33', chalk: '#f3efe2', top: '#c88b5a', cab: '#9a6038', door: '#b07246' };
  }
  const awning = () => ({ y: stage.y + 14, h: 30 });
  function drawDecor() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    deco = document.createElement('canvas');
    deco.width = canvas.width; deco.height = canvas.height;
    const c = deco.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const P = pal(), { x: sx, w: sw } = stage, aw = awning(), x0 = sx + 10, x1 = sx + sw - 10;

    // the back wall, with subway tiles along the bottom
    const wy = aw.y + aw.h - 6;
    c.fillStyle = P.wall; c.lineWidth = 2.5;
    c.fillRect(x0, wy, x1 - x0, floorY - wy);
    const ty = floorY - Math.min(74, (floorY - wy) * .4), tw = 24, tH = 12;
    c.save(); c.beginPath(); c.rect(x0, ty, x1 - x0, floorY - ty); c.clip();
    c.fillStyle = P.tile; c.fillRect(x0, ty, x1 - x0, floorY - ty);
    c.strokeStyle = P.grout; c.lineWidth = 1;
    for (let y = ty, row = 0; y < floorY; y += tH, row++) {
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      for (let x = x0 + (row % 2) * tw / 2; x < x1; x += tw) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + tH); c.stroke(); }
    }
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x0, ty); c.lineTo(x1, ty); c.stroke();
    c.strokeRect(x0, wy, x1 - x0, floorY - wy);

    // the chalkboard menu, in the middle of the wall
    const roomy = sw >= 600, bw = Math.min(150, Math.max(116, sw * .2)), bh = bw * .58, bx = sx + sw * .5 - bw / 2, by = wy + 30;
    c.fillStyle = '#8a5638'; c.beginPath(); c.roundRect(bx - 6, by - 6, bw + 12, bh + 12, 5); c.fill(); c.stroke();
    c.fillStyle = P.board; c.beginPath(); c.roundRect(bx, by, bw, bh, 3); c.fill(); c.lineWidth = 1.5; c.stroke();
    c.fillStyle = P.chalk;
    const fs = Math.max(9, Math.round(bw / 12));
    c.font = `${fs + 3}px DotempDemo, monospace`; c.fillText('menu', bx + bw / 2, by + bh * .2);
    c.font = `${fs}px DotempDemo, monospace`;
    c.globalAlpha = .9;
    c.fillText('tea ~ coffee', bx + bw / 2, by + bh * .5);
    c.fillText('matcha ~ ???', bx + bw / 2, by + bh * .75);
    c.globalAlpha = .35; c.lineWidth = 1; c.strokeStyle = P.chalk;
    c.beginPath(); c.moveTo(bx + bw * .3, by + bh * .33); c.lineTo(bx + bw * .7, by + bh * .33); c.stroke();
    c.globalAlpha = 1; c.strokeStyle = INK;

    // a little open sign hanging off a nail (big screens only, phones are full)
    if (roomy) {
    const ox = sx + sw * .385, oy = wy + 40;
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(ox - 16, oy); c.lineTo(ox, oy - 12); c.lineTo(ox + 16, oy); c.stroke();
    c.fillStyle = '#e8c870'; c.beginPath(); c.arc(ox, oy - 12, 2.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#d9694e'; c.lineWidth = 2; c.beginPath(); c.roundRect(ox - 24, oy, 48, 20, 5); c.fill(); c.stroke();
    c.fillStyle = '#fff7ea'; c.font = '11px DotempDemo, monospace'; c.fillText('open', ox, oy + 10.5);
    }

    // shelves: a wood plank with an ink outline and two little brackets
    c.lineWidth = 2.5;
    for (const s of shelves) {
      for (const bx2 of [s.x0 + 18, s.x1 - 18]) {
        c.fillStyle = '#8a5638';
        c.beginPath(); c.moveTo(bx2 - 6, s.y + s.t); c.lineTo(bx2 + 6, s.y + s.t); c.lineTo(bx2, s.y + s.t + 18); c.closePath();
        c.fill(); c.stroke();
      }
      c.fillStyle = '#b97a4c';
      c.beginPath(); c.roundRect(s.x0, s.y, s.x1 - s.x0, s.t, 3); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,230,190,.35)'; c.fillRect(s.x0 + 4, s.y + 2, s.x1 - s.x0 - 8, 2);
    }

    // the cabinet counter: a top that overhangs a bit, doors with knobs
    c.fillStyle = P.cab; c.beginPath(); c.rect(sx + 8, floorY + 6, sw - 16, CAB - 6); c.fill(); c.stroke();
    const n = Math.max(3, Math.round(sw / 130)), dw = (sw - 28) / n;
    for (let i = 0; i < n; i++) {
      const dx = sx + 14 + i * dw;
      c.fillStyle = P.door; c.lineWidth = 2; c.beginPath(); c.roundRect(dx + 3, floorY + 13, dw - 6, CAB - 19, 4); c.fill(); c.stroke();
      c.fillStyle = '#ecd3a3'; c.beginPath(); c.arc(dx + (i % 2 ? 11 : dw - 11), floorY + 13 + (CAB - 19) / 2, 2.6, 0, 7); c.fill(); c.lineWidth = 1.5; c.stroke();
    }
    c.lineWidth = 2.5; c.fillStyle = P.top;
    c.beginPath(); c.roundRect(sx - 4, floorY - 2, sw + 8, 9, 4); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,235,200,.4)'; c.fillRect(sx + 2, floorY, sw - 4, 2);

    // the striped awning with scallops, and the sign on top of it
    const stripes = Math.max(8, Math.round(sw / 48)), sWd = (sw + 12) / stripes, ax = sx - 6;
    for (let i = 0; i < stripes; i++) {
      const x = ax + i * sWd;
      c.fillStyle = i % 2 ? P.awB : P.awA;
      c.beginPath(); c.moveTo(x, aw.y); c.lineTo(x + sWd, aw.y); c.lineTo(x + sWd, aw.y + aw.h);
      c.arc(x + sWd / 2, aw.y + aw.h, sWd / 2, 0, Math.PI); c.closePath(); c.fill();
    }
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(ax, aw.y);
    c.lineTo(ax + stripes * sWd, aw.y); c.lineTo(ax + stripes * sWd, aw.y + aw.h);
    for (let i = stripes - 1; i >= 0; i--) c.arc(ax + i * sWd + sWd / 2, aw.y + aw.h, sWd / 2, 0, Math.PI);
    c.closePath(); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(ax, aw.y, stripes * sWd, 5);
    const pw = 112, px = sx + sw / 2 - pw / 2, py = aw.y - 12;
    c.fillStyle = '#b97a4c'; c.beginPath(); c.roundRect(px, py, pw, 24, 6); c.fill(); c.stroke();
    c.fillStyle = '#fff4df'; c.font = '13px DotempDemo, monospace'; c.fillText('hen’s cafe', sx + sw / 2, py + 12.5);
  }

  // live bits of the stall: fairy lights under the awning, and a clock
  // with the real time
  function drawLive(t) {
    const aw = awning(), dark = night(), { x: sx, w: sw } = stage;
    const y0 = aw.y + aw.h + 12, swags = Math.max(3, Math.round(sw / 220)), sw1 = (sw - 40) / swags;
    ctx.strokeStyle = 'rgba(62,36,27,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < swags; i++) {
      const a = sx + 20 + i * sw1;
      ctx.moveTo(a, y0); ctx.quadraticCurveTo(a + sw1 / 2, y0 + 22, a + sw1, y0);
    }
    ctx.stroke();
    for (let i = 0; i < swags; i++) for (let j = 1; j < 6; j++) {
      const u = j / 6, a = sx + 20 + i * sw1, x = a + sw1 * u, y = y0 + 22 * 2 * u * (1 - u) + 4;
      const tw = calm ? 1 : .75 + .25 * Math.sin(t * 2.2 + i * 2 + j * 1.7);
      if (dark) { ctx.fillStyle = `rgba(255,205,110,${(.22 * tw).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); }
      ctx.fillStyle = ['#ffd36e', '#ff9f80', '#bfe3a0', '#ffe9b0'][(i + j) % 4];
      ctx.globalAlpha = dark ? tw : 1;
      ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // the clock (big screens only)
    if (sw < 600) return;
    const cx = sx + sw * .615, cy = aw.y + aw.h + 56, r = 15, now = new Date();
    ctx.fillStyle = '#fff7ea'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    const hand = (a, l, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l); ctx.stroke(); };
    const m = now.getMinutes() + now.getSeconds() / 60;
    hand((now.getHours() % 12 + m / 60) / 12 * Math.PI * 2, r * .5, 2);
    hand(m / 60 * Math.PI * 2, r * .75, 1.5);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, 7); ctx.fill();
  }

  // which surface a thing is resting over, for its shadow
  function groundUnder(b) {
    let y = b.position.x > stage.x && b.position.x < stage.x + stage.w && b.bounds.max.y <= floorY + 4 ? floorY : H;
    for (const s of shelves) if (b.position.x > s.x0 && b.position.x < s.x1 && b.bounds.max.y <= s.y + 4) y = Math.min(y, s.y);
    return y;
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    if (!deco) drawDecor();
    ctx.drawImage(deco, 0, 0, W, H);
    drawLive(t);
    ctx.fillStyle = 'rgba(30,14,8,.22)';
    for (const b of [cup, ...bodies]) {
      const gy = groundUnder(b), lift = clamp((gy - b.bounds.max.y) / 120, 0, 1);
      ctx.globalAlpha = 1 - lift;
      ctx.beginPath(); ctx.ellipse(b.position.x, gy + 1, (b.bounds.max.x - b.bounds.min.x) * .42 * (1 - lift * .5), 4 * f, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // things in the glass go under the drink so they look submerged, the
    // honey stick goes behind the jar while it's dipping
    const behind = [], front = [];
    for (const b of bodies) (inside(b.position, .06) ? behind : front).push(b);
    const jar = front.find((b) => b.cafe.k === 'honey'), dip = front.find((b) => b.cafe.k === 'dipper' && b.cafe.inJar);
    if (jar && dip) { front.splice(front.indexOf(dip), 1); front.splice(front.indexOf(jar), 0, dip); }
    behind.forEach(sprite);
    liquid(t);
    sprite(cup);
    teaString();
    front.forEach(sprite);
    const gr = find('grinder');
    if (gr) crank(gr);

    // steam off a hot drink, and a little off the kettle
    const hot = G.water > .05 && !inGlass.ice && tiltOf(cup) < .5;
    if (!calm) {
      if (hot && Math.random() < dt * 9) { const p = fromUV(cup, .3 + Math.random() * .25, .12); steam.push({ x: p.x, y: p.y, t: 0, life: 1.6 + Math.random(), ph: Math.random() * 6 }); }
      const kettle = bodies.find((b) => b.cafe.k === 'kettle');
      if (kettle && Math.random() < dt * 2) { const p = fromUV(kettle, .03, .2); steam.push({ x: p.x, y: p.y, t: 0, life: 1.2, ph: Math.random() * 6, small: true }); }
    }
    for (const s of steam) {
      s.t += dt;
      const k = s.t / s.life;
      ctx.fillStyle = `rgba(255,255,255,${((s.small ? .14 : .22) * Math.sin(Math.PI * k)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x + Math.sin(s.ph + s.t * 3) * 6, s.y - s.t * 26, (s.small ? 3 + k * 5 : 5 + k * 9) * f, 0, 7); ctx.fill();
    }
    steam = steam.filter((s) => s.t < s.life);

    for (const d of drops) {
      ctx.fillStyle = d.col;
      if (d.square) ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
      else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r * Math.max(f, .7), 0, 7); ctx.fill(); }
    }
    ctx.font = `${Math.round(12 * f + 5)}px sans-serif`;
    for (const s of stars) {
      s.t += dt; s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.dust) { ctx.fillStyle = 'rgba(90,56,36,.8)'; ctx.fillRect(s.x, s.y, 2, 2); continue; }
      ctx.fillStyle = `rgba(255,236,170,${Math.max(0, 1 - s.t / .7)})`;
      ctx.fillText('✦', s.x, s.y);
    }
    stars = stars.filter((s) => s.t < .7);

    // the name sits off to the left of the glass, out of the way of
    // whatever you're pouring in from above
    const side = fromUV(cup, .06, .3);
    orderEl.style.left = `${Math.max(orderEl.offsetWidth + 8, Math.min(side.x, cup.bounds.min.x + 6) - 14)}px`;
    orderEl.style.top = `${side.y}px`;
  }

  // the loop. physics at a fixed 60 steps a second however fast the screen is

  let last = 0, acc = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    acc += dt;
    while (acc >= 1 / 60) { M.Engine.update(engine, 1000 / 60); tick(1 / 60); acc -= 1 / 60; }
    const tg = look(), k = Math.min(1, dt * 4);
    shown.lvl += (tg.lvl - shown.lvl) * k;
    shown.a += (tg.a - shown.a) * k;
    shown.rgb = mix(shown.rgb, tg.rgb, k);
    draw(now / 1000, dt);
  }
  function play(on) {
    if (on === running || !built) return;
    running = on;
    if (on) { last = 0; raf = requestAnimationFrame(frame); }
    else cancelAnimationFrame(raf);
  }

  // only start (and only load matter) once you're nearly at the footer
  let near = false, starting = null;
  new IntersectionObserver(([e]) => {
    near = e.isIntersecting;
    if (near && !starting) {
      starting = Promise.all([loadMatter(), loadImgs()]).then(([m]) => {
        M = m;
        if (!imgs.glass) return;
        build();
        play(near);
      }).catch(() => {});
    } else play(near);
  }, { rootMargin: '200px 0px' }).observe(root);

  // a theme flip or the pixel font turning up redraws the stall
  new MutationObserver(() => { deco = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.fonts?.load('13px DotempDemo').then(() => { deco = null; }).catch(() => {});

  // a real resize lays the room out again, the drink stays
  let lastW = 0, rt = 0;
  new ResizeObserver(([e]) => {
    const w = e.contentRect.width;
    if (!built || Math.abs(w - lastW) < 2) { lastW = w; return; }
    lastW = w;
    clearTimeout(rt);
    rt = setTimeout(build, 200);
  }).observe(root);
})();
