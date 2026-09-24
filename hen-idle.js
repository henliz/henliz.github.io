/* ── Hen's idle ────────────────────────────────────────────────────
   She loops a gentle sway, and every eight to seventeen seconds she
   does one of three other things instead.

   This lives in its own file rather than in footer.html because the
   footer is pulled in by fetch-and-clone on most routes, and that path
   copies <style> and the <footer> element but never runs <script>. The
   base sprite's own onload attribute is what asks for this file, and
   an attribute survives cloneNode where a script tag does not. */
(function () {
  if (window.__henIdleRunning) return;

  function start() {
    var stage = document.getElementById('henSprite');
    if (!stage || stage.dataset.live) return false;
    var base = stage.querySelector('.base');
    if (!base) return false;
    stage.dataset.live = '1';
    window.__henIdleRunning = true;

    /* A still frame instead of any of it if the reader asked for less
       motion. An animated webp has no pause: the only way to hold it
       still is to not load it. */
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (calm.matches) { base.src = '/hen-still.webp'; return true; }

    /* frame count x 83ms, which is what they were encoded at */
    var MOVES = [
      { src: '/hen-cast.webp', ms: 41 * 83 },   /* gathers a handful of magic */
      { src: '/hen-flip.webp', ms: 23 * 83 },   /* winks, throws her hair over */
      { src: '/hen-toss.webp', ms: 23 * 83 }
    ];
    var last = -1, busy = false;

    /* Warm them once the page is done with more important things, so the
       first flourish is not an empty square while 250KB arrives. */
    function warm(){ MOVES.forEach(function (m) { new Image().src = m.src; }); }
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 6000 });
    else setTimeout(warm, 3000);

    function next(){ setTimeout(play, 8000 + Math.random() * 9000); }

    function play() {
      if (busy || document.hidden || calm.matches) return next();
      busy = true;
      var i; do { i = Math.floor(Math.random() * MOVES.length); }
      while (MOVES.length > 1 && i === last);
      last = i;

      /* A fresh element every time. Pointing src at a one-shot webp the
         browser already has cached does not rewind it, so the second
         play of a flourish would show nothing but its last frame. */
      var el = document.createElement('img');
      el.className = 'flourish';
      el.alt = ''; el.setAttribute('aria-hidden', 'true');
      el.src = MOVES[i].src;
      stage.appendChild(el);

      function run() {
        requestAnimationFrame(function () {
          el.classList.add('on'); base.classList.add('under');
        });
        setTimeout(function () {
          el.classList.remove('on'); base.classList.remove('under');
          setTimeout(function () { el.remove(); busy = false; next(); }, 400);
        }, Math.max(400, MOVES[i].ms - 240));
      }
      if (el.decode) el.decode().then(run, run); else el.onload = run;
    }
    next();
    return true;
  }

  if (!start()) {
    /* the footer may still be on its way in */
    var tries = 0;
    var t = setInterval(function () {
      if (start() || ++tries > 40) clearInterval(t);
    }, 250);
  }
})();
