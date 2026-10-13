/* motion-kit.js — shared motion helpers for the demo apps (ADR 0065 Amend (3), 2026-10-12).
 * Dependency-free, classic script (exposes window.MK) and ES-module friendly (MK is also returned).
 * Standard: demo-design.md section 10-3 — strong and impressive, never blocks input.
 * Floors (do not remove):
 *   1. prefers-reduced-motion: reduce OR body.capture-mode  -> every helper jumps to the final state.
 *   2. Nothing is hidden by default; pre-reveal hiding is added by JS only when motion is on.
 * Every animation is interruptible: helpers cancel running animations on the same element first,
 * and never set pointer-events:none on the page.
 */
(function (root) {
  'use strict';
  var doc = root.document;

  /* ── floor ────────────────────────────────────────────────────────────── */
  try {
    if (new URLSearchParams(root.location.search).get('capture') === '1') {
      var addCap = function () { doc.body && doc.body.classList.add('capture-mode'); };
      if (doc.body) addCap(); else doc.addEventListener('DOMContentLoaded', addCap);
    }
  } catch (e) { /* noop */ }
  var rmq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function off() {
    return !!(rmq.matches || (doc.body && doc.body.classList.contains('capture-mode')));
  }

  /* ── tokens (read from CSS custom properties, with fallbacks) ─────────── */
  var FALLBACK = { '--dur-1': 120, '--dur-2': 220, '--dur-3': 360, '--dur-4': 640, '--dur-5': 1100, '--stagger': 45 };
  function ms(name) {
    var v = doc.documentElement && getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
    if (!v) return FALLBACK[name] || 300;
    return /ms$/.test(v) ? parseFloat(v) : /s$/.test(v) ? parseFloat(v) * 1000 : parseFloat(v) || FALLBACK[name];
  }
  var EASE = {
    out: 'cubic-bezier(.2,.7,.2,1)', inOut: 'cubic-bezier(.65,0,.35,1)',
    spring: 'cubic-bezier(.34,1.56,.64,1)', expo: 'cubic-bezier(.16,1,.3,1)', in: 'cubic-bezier(.4,0,1,1)'
  };

  function els(x, scope) {
    if (!x) return [];
    if (typeof x === 'string') return Array.prototype.slice.call((scope || doc).querySelectorAll(x));
    if (x.length !== undefined && !x.nodeType) return Array.prototype.slice.call(x);
    return [x];
  }
  function stop(el) {
    if (el && el.getAnimations) el.getAnimations().forEach(function (a) { if (a.id === 'mk') a.cancel(); });
  }
  function anim(el, frames, opts) {
    if (off() || !el || !el.animate) return null;
    stop(el);
    var a = el.animate(frames, Object.assign({ fill: 'both', easing: EASE.expo }, opts));
    a.id = 'mk';
    var clear = function () { try { a.commitStyles && el.isConnected && a.commitStyles(); } catch (e) { /* noop */ } a.cancel(); };
    a.finished.then(clear, function () { /* cancelled */ });
    return a;
  }
  function done(a) {
    if (a && a.finished) return a.finished.catch(function () {});
    if (a && typeof a.then === 'function') return a.then(null, function () {});
    return Promise.resolve();
  }

  /* ── entry choreography ───────────────────────────────────────────────── */
  /** Stagger children in: rise + fade (+ optional scale). opts: {y, scale, delay, dur, step, max} */
  function enter(targets, opts) {
    opts = opts || {};
    var list = els(targets, opts.scope);
    var step = opts.step != null ? opts.step : ms('--stagger');
    var max = opts.max || 14;
    var y = opts.y != null ? opts.y : 18;
    var dur = opts.dur || ms('--dur-4');
    var anims = list.map(function (el, i) {
      var from = { opacity: 0, transform: 'translateY(' + y + 'px)' + (opts.scale ? ' scale(' + opts.scale + ')' : '') };
      if (opts.blur) from.filter = 'blur(' + opts.blur + 'px)';
      var to = { opacity: 1, transform: 'none' };
      if (opts.blur) to.filter = 'blur(0)';
      return anim(el, [from, to], { duration: dur, delay: (opts.delay || 0) + Math.min(i, max) * step, easing: EASE.expo });
    });
    return Promise.all(anims.map(done));
  }

  /** Screen/tab switch. update() performs the DOM change (toggle hidden, swap content).
   *  incoming: element shown after update (gets a directional slide + its [data-mk-stagger] children stagger).
   *  opts: {dir: 1|-1, stagger: selector} */
  function swap(update, incoming, opts) {
    opts = opts || {};
    if (off()) { update(); return Promise.resolve(); }
    var dir = opts.dir || 1;
    if (doc.startViewTransition && !opts.noVT) {
      var vt = doc.startViewTransition(function () { update(); });
      vt.ready.then(function () {
        var el = typeof incoming === 'function' ? incoming() : incoming;
        if (el && opts.stagger) enter(els(opts.stagger, el), { y: 14, delay: 60 });
      }).catch(function () {});
      return vt.finished.catch(function () {});
    }
    update();
    var el2 = typeof incoming === 'function' ? incoming() : incoming;
    if (!el2) return Promise.resolve();
    var a = anim(el2, [
      { opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: ms('--dur-3') });
    if (opts.stagger) enter(els(opts.stagger, el2), { y: 14, delay: 60 });
    return done(a);
  }

  /* ── overlays (open/close both ways) ─────────────────────────────────── */
  /** Animate an overlay in. kind: 'pop' (scale) | 'sheet' (from bottom) | 'drawer' (from right) | 'fade' */
  function overlayIn(el, kind, backdrop) {
    kind = kind || 'pop';
    if (backdrop) anim(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-2'), easing: EASE.out });
    var f = {
      pop: [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }],
      sheet: [{ transform: 'translateY(100%)' }, { transform: 'none' }],
      drawer: [{ transform: 'translateX(100%)' }, { transform: 'none' }],
      fade: [{ opacity: 0 }, { opacity: 1 }]
    }[kind];
    return done(anim(el, f, { duration: kind === 'pop' ? ms('--dur-3') : ms('--dur-4'), easing: kind === 'pop' ? EASE.spring : EASE.expo }));
  }
  /** Animate an overlay out, then run hide() (e.g. el.hidden = true / dialog.close()). Interruptible. */
  function overlayOut(el, kind, hide, backdrop) {
    kind = kind || 'pop';
    if (off() || !el || !el.animate) { hide && hide(); return Promise.resolve(); }
    if (backdrop) anim(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: ms('--dur-2'), easing: EASE.in });
    var f = {
      pop: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px) scale(.97)' }],
      sheet: [{ transform: 'none' }, { transform: 'translateY(100%)' }],
      drawer: [{ transform: 'none' }, { transform: 'translateX(100%)' }],
      fade: [{ opacity: 1 }, { opacity: 0 }]
    }[kind];
    var a = anim(el, f, { duration: ms('--dur-2'), easing: EASE.in, fill: 'forwards' });
    return a.finished.then(function () { hide && hide(); a.cancel(); }, function () { /* re-opened mid-close */ });
  }
  /** Wire a <dialog>: animated showModal/close, Esc + backdrop click animate too. Returns {open, close}. */
  function dialog(dlg, kind) {
    if (!dlg || dlg.__mk) return dlg && dlg.__mk;
    var api = {
      open: function () { if (!dlg.open) { dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); } overlayIn(dlg, kind); },
      close: function (rv) { return overlayOut(dlg, kind, function () { dlg.close ? dlg.close(rv) : dlg.removeAttribute('open'); }); }
    };
    dlg.addEventListener('cancel', function (e) { if (!off()) { e.preventDefault(); api.close(); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.dataset.mkBackdropClose !== '0') api.close(); });
    dlg.__mk = api;
    return api;
  }

  /* ── data motion ──────────────────────────────────────────────────────── */
  /** Count a number up. fmt(value) -> string; defaults to locale integer. opts: {from, dur, decimals} */
  function countUp(el, to, opts) {
    opts = opts || {};
    var dec = opts.decimals || 0;
    var fmt = opts.fmt || function (v) { return v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (!el) return Promise.resolve();
    if (off()) { el.textContent = fmt(to); return Promise.resolve(); }
    var from = opts.from != null ? opts.from : 0;
    var dur = opts.dur || ms('--dur-4');
    var t0 = null;
    if (el.__mkRaf) cancelAnimationFrame(el.__mkRaf);
    return new Promise(function (res) {
      function tick(t) {
        if (t0 == null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        var v = from + (to - from) * e;
        el.textContent = fmt(dec ? v : Math.round(v));
        if (p < 1) el.__mkRaf = requestAnimationFrame(tick); else { el.__mkRaf = 0; res(); }
      }
      el.__mkRaf = requestAnimationFrame(tick);
    });
  }
  /** Count every [data-mk-count] inside scope (value = attribute or parsed text). */
  function countAll(scope) {
    return Promise.all(els('[data-mk-count]', scope).map(function (el) {
      var raw = el.getAttribute('data-mk-count') || el.textContent;
      var n = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
      if (!isFinite(n)) return null;
      var dec = (String(raw).split('.')[1] || '').replace(/\D/g, '').length;
      var suffix = String(el.textContent).replace(/^[\d.,\s-]+/, '');
      return countUp(el, n, { decimals: dec, fmt: function (v) { return v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; } });
    }));
  }

  /** FLIP: measure children, run mutate(), animate survivors from old to new position, new ones in.
   *  key(el) identifies items across re-render (default: data-key || id). */
  function flip(container, mutate, key) {
    key = key || function (el) { return el.getAttribute('data-key') || el.id; };
    if (off() || !container) { mutate(); return Promise.resolve(); }
    var before = {};
    Array.prototype.forEach.call(container.children, function (c) { var k = key(c); if (k) before[k] = c.getBoundingClientRect(); });
    mutate();
    var anims = [];
    Array.prototype.forEach.call(container.children, function (c, i) {
      var k = key(c); var b = k && before[k];
      if (c.hidden) return;
      if (b) {
        var a = c.getBoundingClientRect();
        var dx = b.left - a.left, dy = b.top - a.top;
        if (dx || dy) anims.push(anim(c, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: ms('--dur-3') }));
      } else {
        anims.push(anim(c, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: ms('--dur-3'), delay: Math.min(i, 10) * 25 }));
      }
    });
    return Promise.all(anims.map(done));
  }

  /** Draw SVG strokes (path, line, polyline, circle, rect). opts: {dur, step, delay} */
  function draw(targets, opts) {
    opts = opts || {};
    var list = els(targets, opts.scope);
    return Promise.all(list.map(function (p, i) {
      if (off() || !p.getTotalLength) return null;
      var L = p.getTotalLength();
      p.style.strokeDasharray = L;
      var a = anim(p, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: opts.dur || ms('--dur-5'), delay: (opts.delay || 0) + i * (opts.step || 80), easing: EASE.inOut });
      return done(a).then(function () { p.style.strokeDasharray = ''; });
    }).map(done));
  }

  /* ── micro-interactions ───────────────────────────────────────────────── */
  function pop(el) { return done(anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: ms('--dur-3'), easing: EASE.spring })); }
  function shake(el) { return done(anim(el, [{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 380, easing: 'ease-out' })); }
  function flash(el, color) {
    return done(anim(el, [{ backgroundColor: color || 'color-mix(in srgb, var(--accent, #2b6cb0) 22%, transparent)' }, { backgroundColor: 'transparent' }], { duration: 900, easing: EASE.out }));
  }
  /** Animated success check: inserts an inline SVG check that draws itself into el (replaces content). */
  function check(el) {
    if (!el) return Promise.resolve();
    el.innerHTML = '<svg class="mk-check" viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    pop(el);
    return draw(el.querySelectorAll('path'), { dur: ms('--dur-4') });
  }
  /** Ripple from pointer position on elements matching selector (delegated). */
  function ripple(selector, scope) {
    (scope || doc).addEventListener('pointerdown', function (e) {
      if (off()) return;
      var t = e.target.closest && e.target.closest(selector);
      if (!t || t.getAttribute('aria-disabled') === 'true' || t.disabled) return;
      var r = t.getBoundingClientRect();
      var s = Math.max(r.width, r.height) * 2;
      var dot = doc.createElement('span');
      dot.className = 'mk-ripple';
      dot.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
      t.style.overflow = t.style.overflow || 'hidden';
      t.appendChild(dot);
      var a = dot.animate([{ transform: 'scale(0)', opacity: .35 }, { transform: 'scale(1)', opacity: 0 }], { duration: 600, easing: EASE.out });
      a.finished.then(function () { dot.remove(); }, function () { dot.remove(); });
    }, { passive: true });
  }

  /** Sliding indicator for a tablist: keeps an absolutely positioned bar under the selected tab. */
  function indicator(tablist, selectedSel) {
    if (!tablist) return function () {};
    selectedSel = selectedSel || '[aria-selected="true"], .active, .is-active, [aria-current="page"]';
    var bar = tablist.querySelector(':scope > .mk-indicator');
    if (!bar) { bar = doc.createElement('span'); bar.className = 'mk-indicator'; bar.setAttribute('aria-hidden', 'true'); tablist.appendChild(bar); }
    if (getComputedStyle(tablist).position === 'static') tablist.style.position = 'relative';
    function place() {
      var sel = tablist.querySelector(selectedSel);
      if (!sel) { bar.style.opacity = '0'; return; }
      var a = tablist.getBoundingClientRect(), b = sel.getBoundingClientRect();
      bar.style.opacity = '1';
      bar.style.width = b.width + 'px';
      bar.style.transform = 'translate(' + (b.left - a.left + tablist.scrollLeft) + 'px,' + (b.bottom - a.top - bar.offsetHeight + tablist.scrollTop) + 'px)';
    }
    place();
    root.addEventListener('resize', place);
    return place;
  }

  /** Toast: show text, animate in, auto-dismiss with exit animation. Returns element. */
  function toast(text, opts) {
    opts = opts || {};
    var host = doc.querySelector('.mk-toasts');
    if (!host) { host = doc.createElement('div'); host.className = 'mk-toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); doc.body.appendChild(host); }
    var t = doc.createElement('div');
    t.className = 'mk-toast' + (opts.kind ? ' mk-toast--' + opts.kind : '');
    t.textContent = text;
    if (opts.action) {
      var b = doc.createElement('button'); b.type = 'button'; b.textContent = opts.action.label;
      b.addEventListener('click', function () { opts.action.run(); remove(); });
      t.appendChild(b);
    }
    host.appendChild(t);
    anim(t, [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: ms('--dur-3'), easing: EASE.spring });
    var timer = setTimeout(remove, opts.ms || 3200);
    function remove() { clearTimeout(timer); overlayOut(t, 'fade', function () { t.remove(); }); }
    return t;
  }

  /* ── scroll reveal (floor 2: hidden only when JS adds .mk-pre and motion is on) ── */
  function reveal(targets, opts) {
    opts = opts || {};
    var list = els(targets, opts.scope);
    if (off() || !('IntersectionObserver' in root)) return;
    list.forEach(function (el) { el.classList.add('mk-pre'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var i = list.indexOf(en.target) % 6;
        en.target.classList.remove('mk-pre');
        anim(en.target, [{ opacity: 0, transform: 'translateY(' + (opts.y || 28) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: ms('--dur-4'), delay: i * ms('--stagger') });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    list.forEach(function (el) { io.observe(el); });
    /* safety: if something never intersects (e.g. inside a hidden tab), show it after 4s */
    setTimeout(function () { list.forEach(function (el) { el.classList.remove('mk-pre'); }); }, 4000);
  }

  /** Ambient rAF loop that pauses off-screen / hidden tab; draws one static frame when motion is off.
   *  frame(tMs) draws; target is the element whose visibility gates the loop. Returns stop(). */
  function loop(target, frame) {
    if (off()) { frame(0, true); return function () {}; }
    var raf = 0, visible = true, running = true, t0 = performance.now();
    function tick(t) { if (!running) return; frame(t - t0, false); raf = requestAnimationFrame(tick); }
    function sync() {
      var go = visible && !doc.hidden && !off();
      if (go && !raf) raf = requestAnimationFrame(tick);
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    if ('IntersectionObserver' in root && target) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }).observe(target);
    doc.addEventListener('visibilitychange', sync);
    if (rmq.addEventListener) rmq.addEventListener('change', function () { if (off()) { cancelAnimationFrame(raf); raf = 0; frame(0, true); } else sync(); });
    sync();
    return function () { running = false; cancelAnimationFrame(raf); raf = 0; };
  }

  var MK = {
    off: off, ms: ms, EASE: EASE, anim: anim, stop: stop,
    enter: enter, swap: swap, overlayIn: overlayIn, overlayOut: overlayOut, dialog: dialog,
    countUp: countUp, countAll: countAll, flip: flip, draw: draw,
    pop: pop, shake: shake, flash: flash, check: check, ripple: ripple, indicator: indicator, toast: toast,
    reveal: reveal, loop: loop
  };
  root.MK = MK;
  if (typeof module === 'object' && module.exports) module.exports = MK;
})(typeof window !== 'undefined' ? window : globalThis);
