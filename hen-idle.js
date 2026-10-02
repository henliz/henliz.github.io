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

    /* frame count x 42ms: the source's own 24fps, kept all the way
       through. An earlier cut of this dropped every second frame to save
       bandwidth and the result stepped badly, which is not a trade worth
       making for something whose whole job is to look alive.

       Every one of these files now opens AND closes on the same single
       image, with three blended frames easing into and out of the action,
       so there is no cut to hide and nothing to fade.

       The idle is spliced from two of the takes, because no single one of
       them holds both halves of it: the skirt only ever sways in the
       third take while her hair is swinging too, and the take whose hair
       stays put never blinks. So the base is clip two's tail, where the
       skirt drifts and nothing else does, and clip three's blink is cut
       into it. The two takes sit 1.6 apart where a neighbouring pair of
       frames inside one take sits 0.36 apart, which a two frame bridge
       covers without showing.

       It is also encoded at a much higher quality than the gestures are,
       which looks like waste and is not. Lossy webp adds noise to every
       frame, and on a character this close to still that noise was four
       times the size of the real movement: the whole figure crawled, and
       it read as her hair moving on its own. The gestures do not need it,
       because there the same noise is seven percent of what is already
       happening. */
    var IDLE_MS = 40 * 42;                      /* one turn of the idle */
    var MOVES = [
      { src: '/hen-cast.webp', ms: 185 * 42 },  /* gathers a handful of magic */
      { src: '/hen-flip.webp', ms: 142 * 42 },  /* winks, throws her hair over */
      { src: '/hen-toss.webp', ms: 127 * 42 }
    ];
    /* when the idle last restarted, so a flourish can be timed to begin
       on the frame the idle is actually showing */
    var idleT0 = performance.now();
    var last = -1, busy = false;

    /* Warm them once the page is done with more important things, so the
       first flourish is not an empty square while 250KB arrives. */
    function warm(){ MOVES.forEach(function (m) { new Image().src = m.src; }); }
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 6000 });
    else setTimeout(warm, 3000);

    /* She is nearly still between gestures, because the footage gives no
       lively idle that also returns to the shared pose. So the gaps are
       short: the stillness reads as a beat between moves rather than as
       a photograph.

       The wait is then rounded up to the idle's next loop boundary. The
       idle is at its anchor frame the instant it wraps, and that is the
       frame every flourish opens on, so the swap happens at the one
       moment the two images are identical. */
    function next(){
      var wait = 3500 + Math.random() * 5000;
      var since = performance.now() + wait - idleT0;
      setTimeout(play, wait + (IDLE_MS - (since % IDLE_MS)) % IDLE_MS);
    }

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

      /* Whichever of these arrives first wins, and the timer means none of
         them has to. decode() on a megabyte of animated webp can sit
         unresolved for a long time (a backgrounded tab will do it), and the
         first cut of this waited on it alone: one stalled promise and she
         was frozen behind an invisible layer for good, because nothing
         ever cleared the busy flag. */
      var started = false;
      function run() {
        if (started) return;
        started = true;
        /* No fade either way. The flourish's first frame and the idle's
           anchor frame are the same image, and the swap is timed for the
           moment the idle is showing it. The idle is then rebuilt rather
           than revealed, so it restarts from the very frame the flourish
           finished on. */
        el.classList.add('on');
        base.style.visibility = 'hidden';
        setTimeout(function () {
          var fresh = base.cloneNode(false);
          fresh.style.visibility = '';
          fresh.src = base.getAttribute('src');
          base.replaceWith(fresh);
          base = fresh;
          idleT0 = performance.now();   /* the loop starts again here */
          el.remove();
          busy = false; next();
        }, MOVES[i].ms);
      }
      el.addEventListener('load', run);
      el.addEventListener('error', function () {
        started = true; el.remove(); busy = false; next();
      });
      if (el.decode) el.decode().then(run, run);
      setTimeout(run, 2000);
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
