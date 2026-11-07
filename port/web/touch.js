/*
 * On-screen controls for touch devices, plus the quality guard that keeps the
 * game playable on a phone.
 *
 * The port reads the keyboard through SDL, so a button only has to send the
 * same keydown/keyup events a physical key sends. Keeping this in the page
 * means the WebAssembly build does not change.
 *
 * Add ?touch=1 to the URL to show the controls on a machine with a mouse,
 * ?touch=0 to hide them on a touch screen.
 *
 * The WebGL build draws every chunk and every scenery object within
 * Game.ini's visiblechunks (30 by default), and Emscripten's fixed-function
 * emulation pays JavaScript work for each of those draw calls. That is fine on
 * a desktop and too much for a phone. The guard below watches the frame rate
 * and uses the game's own [ and ] keys to shorten the draw distance until the
 * phone keeps up; if shortening does not help, it puts the distance back.
 * ?quality=high turns this off and keeps the game's own distance.
 * ?stats=1 shows the frame rate and the number of draw calls on screen.
 */
(function () {
  'use strict';

  var q = window.location.search || '';
  if (/(?:^|[?&])touch=0(?:&|$)/.test(q)) return;
  var force = /(?:^|[?&])touch=1(?:&|$)/.test(q);
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!force && !coarse && !(navigator.maxTouchPoints > 0)) return;

  var quality = /(?:^|[?&])quality=high(?:&|$)/.test(q) ? 'high'
              : /(?:^|[?&])quality=low(?:&|$)/.test(q) ? 'low' : 'auto';
  var stats = /(?:^|[?&])stats=1(?:&|$)/.test(q);
  var noObjects = /(?:^|[?&])objects=0(?:&|$)/.test(q);

  var KEYS = {
    left:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    gas:   { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38 },
    brake: { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40 },
    hand:  { key: ' ',          code: 'Space',      keyCode: 32 },
    enter: { key: 'Enter',      code: 'Enter',      keyCode: 13 },
    pause: { key: 'p',          code: 'KeyP',       keyCode: 80 }
  };
  /* keys the guard uses; not on the overlay */
  var SCENERY  = { key: 'o', code: 'KeyO',         keyCode: 79 };
  var DIST_DOWN = { key: '[', code: 'BracketLeft',  keyCode: 219 };
  var DIST_UP   = { key: ']', code: 'BracketRight', keyCode: 221 };

  function send(type, k) {
    var ev;
    try {
      ev = new KeyboardEvent(type, {
        key: k.key,
        code: k.code,
        bubbles: true,
        cancelable: true
      });
    } catch (e) {
      ev = document.createEvent('KeyboardEvent');
      ev.initKeyboardEvent(type, true, true, window, k.key, 0, '', false, '');
    }
    /* SDL's Emscripten backend reads the legacy keyCode/which fields. */
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return k.keyCode; } });
      Object.defineProperty(ev, 'which', { get: function () { return k.keyCode; } });
    } catch (e) { /* the browser did not allow it; key/code still carry the key */ }
    document.dispatchEvent(ev);
  }

  var css = document.createElement('style');
  css.textContent = [
    '#touch{position:fixed;top:0;right:0;bottom:0;left:0;z-index:20;pointer-events:none;',
    'font:600 15px/1 system-ui,-apple-system,"Segoe UI",sans-serif;',
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '#touch .pad{position:absolute;display:flex;gap:10px;align-items:flex-end}',
    '#touch .pad.left{left:14px;bottom:14px;',
    'left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom))}',
    '#touch .pad.right{right:14px;bottom:14px;',
    'right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom))}',
    '#touch .stack{display:flex;flex-direction:column;gap:10px}',
    '#touch button{pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;',
    'border:1px solid rgba(255,255,255,.3);border-radius:14px;background:rgba(17,19,23,.55);',
    'color:#fff;margin:0;padding:0;display:flex;align-items:center;justify-content:center;',
    'font:inherit;font-weight:700}',
    '#touch button:active{background:rgba(232,69,44,.85)}',
    '#touch .pad.left button,#touch .stack button{width:66px;height:66px;font-size:28px}',
    '#touch button.hand{width:54px;height:54px;font-size:20px}',
    '#touch .menu{position:absolute;top:12px;right:12px;',
    'top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));',
    'display:flex;gap:8px}',
    '#touch .menu button{height:42px;padding:0 16px;font-size:13px;letter-spacing:.05em}',
    '#touch .menu button.start{background:rgba(232,69,44,.8)}'
  ].join('');
  document.head.appendChild(css);

  var wrap = document.createElement('div');
  wrap.id = 'touch';
  wrap.className = 'hidden';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    '<div class="pad left">' +
      '<button type="button" data-key="left" aria-label="Links">◀</button>' +
      '<button type="button" data-key="right" aria-label="Rechts">▶</button>' +
    '</div>' +
    '<div class="pad right">' +
      '<button type="button" class="hand" data-key="hand" aria-label="Handrem">✋</button>' +
      '<div class="stack">' +
        '<button type="button" data-key="gas" aria-label="Gas">▲</button>' +
        '<button type="button" data-key="brake" aria-label="Rem">▼</button>' +
      '</div>' +
    '</div>' +
    '<div class="menu">' +
      '<button type="button" class="start" data-key="enter">ENTER</button>' +
      '<button type="button" data-key="pause" aria-label="Pauze">PAUZE</button>' +
    '</div>';
  document.body.appendChild(wrap);

  /* The buttons use pointer events.  Keep the browser's compatibility
   * mouse/touch events from bubbling to the game, or a tap on a button
   * could also land as a click on the menu behind it. */
  ['mousedown', 'mouseup', 'click'].forEach(function (type) {
    wrap.addEventListener(type, function (e) {
      e.preventDefault();
      e.stopPropagation();
    }, true);
  });
  ['touchstart', 'touchend'].forEach(function (type) {
    wrap.addEventListener(type, function (e) { e.stopPropagation(); }, true);
  });

  var held = [];

  function press(btn, e) {
    e.preventDefault();
    e.stopPropagation();
    var k = KEYS[btn.getAttribute('data-key')];
    if (!k || btn._down) return;
    btn._down = true;
    held.push(btn);
    if (btn._upTimer) {
      clearTimeout(btn._upTimer);
      btn._upTimer = 0;
    }
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* no capture */ }
    if (!btn._sent) {
      btn._sent = true;
      send('keydown', k);
    }
    btn._at = performance.now();
  }

  function release(btn, e, immediate) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!btn._down) return;
    btn._down = false;
    var i = held.indexOf(btn);
    if (i >= 0) held.splice(i, 1);
    var k = KEYS[btn.getAttribute('data-key')];
    /* A very quick tap can fall between two frames; keep the key down for
     * at least 50 ms so the game's polling sees it. */
    var wait = immediate ? 0 : Math.max(0, 50 - (performance.now() - (btn._at || 0)));
    if (btn._upTimer) clearTimeout(btn._upTimer);
    if (!wait) {
      if (btn._sent) {
        btn._sent = false;
        send('keyup', k);
      }
      return;
    }
    btn._upTimer = setTimeout(function () {
      btn._upTimer = 0;
      if (!btn._down && btn._sent) {
        btn._sent = false;
        send('keyup', k);
      }
    }, wait);
  }

  Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (btn) {
    btn.addEventListener('pointerdown', function (e) { press(btn, e); });
    btn.addEventListener('pointerup', function (e) { release(btn, e); });
    btn.addEventListener('pointercancel', function (e) { release(btn, e); });
    btn.addEventListener('lostpointercapture', function () { release(btn); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
  });

  function releaseAll() {
    held.slice().forEach(function (btn) { release(btn, null, true); });
  }
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') releaseAll();
  });

  var canvas = document.getElementById('canvas');

  /* The controls belong to the game, not to the file picker.  This is a
   * capture listener: start() enters the game's main loop and does not
   * return, so a bubble listener on the button would never run. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#play, #fullscreen')) {
      wrap.classList.remove('hidden');
      wrap.removeAttribute('aria-hidden');
    }
  }, true);

  /* ---- frame rate and draw calls ---------------------------------------
   * The race clears once per frame and draws several hundred times from
   * client-side arrays, which Emscripten's GL emulation has to copy and
   * upload per call.  Counting glClear (one frame) and the draw calls
   * between clears tells the guard how the phone is doing. */
  var frames = 0, drawSum = 0, draws = 0, lastFrameDraws = 0;
  var fps = 0, drawsPerFrame = 0;

  function countFrame() {
    frames++;
    drawSum += draws;
    lastFrameDraws = draws;
    draws = 0;
  }

  function patchGL(proto) {
    if (!proto || proto._a2counted) return;
    proto._a2counted = true;
    var clear = proto.clear;
    if (!clear) return;
    proto.clear = function () {
      countFrame();
      return clear.apply(this, arguments);
    };
    ['drawElements', 'drawArrays'].forEach(function (name) {
      var fn = proto[name];
      if (!fn) return;
      proto[name] = function () {
        draws++;
        return fn.apply(this, arguments);
      };
    });
  }
  if (window.WebGLRenderingContext)
    patchGL(WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext)
    patchGL(WebGL2RenderingContext.prototype);

  var perf = null;
  if (stats) {
    perf = document.createElement('div');
    perf.id = 'touch-stats';
    perf.style.cssText =
      'position:fixed;left:10px;top:max(10px,env(safe-area-inset-top));z-index:21;' +
      'padding:5px 8px;border-radius:6px;background:rgba(0,0,0,.6);color:#fff;' +
      'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'pointer-events:none;white-space:pre';
    document.body.appendChild(perf);
  }

  var guard = {
    state: 'idle',   // idle -> settle -> measure -> off (idle again in a menu)
    ticks: 0,
    quiet: 0,
    start: 30,
    radius: 30,
    chosen: 0,
    prevFps: 0,
    step: 0
  };
  var FLOOR = quality === 'low' ? 8 : 12;

  function readRadius() {
    try {
      if (typeof Module === 'undefined' || !Module.FS) return 30;
      var txt = Module.FS.readFile('/data/Game.ini', { encoding: 'utf8' });
      var m = /visiblechunks\s*=\s*(\d+)/i.exec(txt);
      if (m) return Math.max(1, parseInt(m[1], 10));
    } catch (e) { /* not there yet; the game's default */ }
    return 30;
  }

  function tap(k, done) {
    send('keydown', k);
    window.setTimeout(function () {
      send('keyup', k);
      if (done) done();
    }, 120);
  }

  /* one key at a time: the game polls the keyboard once per frame */
  function tapMany(n, k, done) {
    if (n <= 0) { if (done) done(); return; }
    tap(k, function () {
      window.setTimeout(function () { tapMany(n - 1, k, done); }, 60);
    });
  }

  function setRadius(r) {
    if (r < guard.start) tapMany(guard.start - r, DIST_DOWN);
    else if (r > guard.start) tapMany(r - guard.start, DIST_UP);
  }

  function finish() {
    guard.chosen = guard.radius;
    guard.state = 'off';
    console.log('A2 Racer II: ' + Math.round(fps) + ' fps, visiblechunks ' +
                guard.radius + (quality === 'auto' ? ' (automatic)' : ''));
  }

  function beginRace() {
    guard.start = readRadius();
    guard.radius = guard.start;
    guard.ticks = 0;
    guard.prevFps = 0;
    guard.quiet = 0;
    if (noObjects) tap(SCENERY);
    if (quality === 'high') {
      guard.state = 'off';
      return;
    }
    if (guard.chosen) {          /* a later race: back to the settled distance */
      setRadius(guard.chosen);
      guard.state = 'off';
      return;
    }
    if (quality === 'low') {     /* the shortest distance, without measuring */
      guard.radius = Math.min(FLOOR, guard.start);
      guard.chosen = guard.radius;
      setRadius(guard.radius);
      guard.state = 'off';
      return;
    }
    guard.state = 'settle';
  }

  var lastSample = performance.now();
  window.setInterval(function () {
    var now = performance.now();
    var dt = now - lastSample;
    lastSample = now;
    if (dt > 0) fps = frames * 1000 / dt;
    drawsPerFrame = frames ? drawSum / frames : 0;
    frames = 0;
    drawSum = 0;
    if (perf) {
      perf.textContent = Math.round(fps) + ' fps\n' +
                         Math.round(drawsPerFrame) + ' draws\n' +
                         'chunks ' + (guard.chosen || guard.radius) +
                         (quality === 'high' ? ' (high)' : '');
    }
  }, 1000);

  /* The menu also clears, but it draws only a handful of times per frame;
   * a race draws hundreds.  That is how the guard tells the two apart
   * without reaching into the game. */
  window.setInterval(function () {
    var racing = canvas && canvas.style.display === 'block' && lastFrameDraws > 80;
    if (!racing) {
      if (guard.state !== 'idle' && ++guard.quiet >= 2) {
        guard.state = 'idle';
        guard.ticks = 0;
      }
      return;
    }
    guard.quiet = 0;

    if (guard.state === 'idle') {
      beginRace();
      return;
    }
    if (guard.state === 'settle') {
      if (++guard.ticks < 2) return;
      if (!fps) { guard.ticks = 1; return; }   /* a loading stall, not a result */
      guard.prevFps = fps;
      if (fps >= 50 || guard.radius <= FLOOR) { finish(); return; }
      guard.step = Math.min(4, guard.radius - FLOOR);
      guard.radius -= guard.step;
      guard.ticks = 0;
      guard.state = 'measure';
      tapMany(guard.step, DIST_DOWN);
      return;
    }
    if (guard.state === 'measure') {
      if (++guard.ticks < 2) return;
      if (!fps) { guard.ticks = 1; return; }   /* a loading stall, not a result */
      if (fps >= 45) { finish(); return; }
      if (fps < guard.prevFps * 1.12) {
        /* shorter did not pay off: the draw calls are not the limit here */
        guard.radius += guard.step;
        tapMany(guard.step, DIST_UP);
        finish();
        return;
      }
      guard.prevFps = fps;
      if (guard.radius <= FLOOR) { finish(); return; }
      guard.step = Math.min(4, guard.radius - FLOOR);
      guard.radius -= guard.step;
      guard.ticks = 0;
      tapMany(guard.step, DIST_DOWN);
      return;
    }
  }, 1000);

  /* Fullscreen on the canvas would leave this overlay outside the fullscreen
   * element, so ask for the page instead; after Play the canvas is all there
   * is to see anyway. */
  if (canvas && canvas.requestFullscreen) {
    canvas.requestFullscreen = function () {
      if (document.documentElement.requestFullscreen)
        return document.documentElement.requestFullscreen();
      return Promise.reject(new Error('fullscreen unavailable'));
    };
  }
})();
