'use strict';

/* ================= helpers ================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const loadJSON = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fb : JSON.parse(v);
  } catch {
    return fb;
  }
};
const saveJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const fmtDur = (s) => {
  s = parseInt(s, 10);
  if (!s || s <= 0) return '\u2212'; // −
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
const clampInt = (v, min, max) => {
  let n = parseInt(v, 10);
  if (isNaN(n)) n = min;
  return Math.min(max, Math.max(min, n));
};
const youtubeId = (u) => {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/.exec(u);
  return m ? m[1] : null;
};

/* ================= toast ================= */

const toastEl = $('#toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3400);
}

/* ================= settings ================= */

const DEFAULT_SETTINGS = { focus: 25, short: 5, long: 15, sessions: 4, alarm: true, notify: true };
const settings = { ...DEFAULT_SETTINGS, ...loadJSON('spartacus.settings', {}) };

/* ================= ambient sound definitions ================= */

function binaural(beat, name, id) {
  return {
    id,
    name,
    tag: 'HEADPHONES',
    build(c, out, h) {
      void h;
      const L = c.createOscillator();
      const R = c.createOscillator();
      L.type = 'sine';
      R.type = 'sine';
      L.frequency.value = 180;
      R.frequency.value = 180 + beat;
      const pL = c.createStereoPanner();
      pL.pan.value = -1;
      const pR = c.createStereoPanner();
      pR.pan.value = 1;
      const gL = c.createGain();
      gL.gain.value = 0.16;
      const gR = c.createGain();
      gR.gain.value = 0.16;
      L.connect(pL); pL.connect(gL); gL.connect(out);
      R.connect(pR); pR.connect(gR); gR.connect(out);
      L.start();
      R.start();
      return { nodes: [L, R] };
    },
  };
}

const SOUNDS = [
  binaural(20, 'Binaural Beta', 'binaural-beta'),
  binaural(40, 'Binaural Gamma', 'binaural-gamma'),
  {
    id: 'rain',
    name: 'Rain',
    tag: '',
    build(c, out, h) {
      const s1 = c.createBufferSource();
      s1.buffer = h.buf(c, 'pink');
      s1.loop = true;
      s1.start();
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
      const g1 = c.createGain(); g1.gain.value = 0.5;
      s1.connect(hp); hp.connect(lp); lp.connect(g1); g1.connect(out);

      const s2 = c.createBufferSource();
      s2.buffer = h.buf(c, 'white');
      s2.loop = true;
      s2.start();
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 12;
      const g2 = c.createGain(); g2.gain.value = 0;
      s2.connect(bp); bp.connect(g2); g2.connect(out);

      const timers = [];
      (function drip() {
        timers.push(setTimeout(() => {
          const now = c.currentTime;
          g2.gain.cancelScheduledValues(now);
          g2.gain.setValueAtTime(0, now);
          g2.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.4, now + 0.02);
          g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
          drip();
        }, 90 + Math.random() * 330));
      })();
      return { nodes: [s1, s2], cleanup: () => timers.forEach(clearTimeout) };
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tag: '',
    build(c, out, h) {
      const s1 = c.createBufferSource();
      s1.buffer = h.buf(c, 'brown');
      s1.loop = true;
      s1.start();
      const lp1 = c.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 420;
      const g1 = c.createGain(); g1.gain.value = 0.35;
      s1.connect(lp1); lp1.connect(g1); g1.connect(out);
      const w1 = h.lfo(c, 0.07, 0.28); w1.out.connect(g1.gain);

      const s2 = c.createBufferSource();
      s2.buffer = h.buf(c, 'brown');
      s2.loop = true;
      s2.start();
      const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 1400;
      const g2 = c.createGain(); g2.gain.value = 0.08;
      s2.connect(lp2); lp2.connect(g2); g2.connect(out);
      const w2 = h.lfo(c, 0.11, 0.07); w2.out.connect(g2.gain);

      const s3 = c.createBufferSource();
      s3.buffer = h.buf(c, 'white');
      s3.loop = true;
      s3.start();
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const g3 = c.createGain(); g3.gain.value = 0;
      s3.connect(hp); hp.connect(g3); g3.connect(out);

      const timers = [];
      (function crash() {
        timers.push(setTimeout(() => {
          const now = c.currentTime;
          g3.gain.cancelScheduledValues(now);
          g3.gain.setValueAtTime(0, now);
          g3.gain.linearRampToValueAtTime(0.16, now + 1.2);
          g3.gain.exponentialRampToValueAtTime(0.0001, now + 4);
          crash();
        }, 7000 + Math.random() * 12000));
      })();
      return { nodes: [s1, s2, s3, w1.osc, w2.osc], cleanup: () => timers.forEach(clearTimeout) };
    },
  },
  {
    id: 'cafe',
    name: 'Bustling Caf\u00e9',
    tag: '',
    build(c, out, h) {
      const s1 = c.createBufferSource();
      s1.buffer = h.buf(c, 'brown');
      s1.loop = true;
      s1.start();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g1 = c.createGain(); g1.gain.value = 0.25;
      s1.connect(lp); lp.connect(g1); g1.connect(out);

      const timers = [];
      let alive = true;
      (function murmur() {
        timers.push(setTimeout(() => {
          if (!alive) return;
          const now = c.currentTime;
          g1.gain.cancelScheduledValues(now);
          g1.gain.setValueAtTime(g1.gain.value, now);
          g1.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.35, now + 0.12);
          murmur();
        }, 90 + Math.random() * 260));
      })();
      (function clink() {
        timers.push(setTimeout(() => {
          if (!alive) return;
          const now = c.currentTime;
          const o = c.createOscillator();
          o.type = 'sine';
          o.frequency.value = 1800 + Math.random() * 2600;
          const g = c.createGain();
          o.connect(g); g.connect(out);
          o.start(now);
          g.gain.setValueAtTime(0.04 + Math.random() * 0.05, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + Math.random() * 0.3);
          o.stop(now + 0.9);
          clink();
        }, 2500 + Math.random() * 7000));
      })();
      return { nodes: [s1], cleanup: () => { alive = false; timers.forEach(clearTimeout); } };
    },
  },
  {
    id: 'cabin',
    name: 'Airplane Cabin',
    tag: '',
    build(c, out, h) {
      const s1 = c.createBufferSource();
      s1.buffer = h.buf(c, 'brown');
      s1.loop = true;
      s1.start();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      const g1 = c.createGain(); g1.gain.value = 0.5;
      s1.connect(lp); lp.connect(g1); g1.connect(out);
      const w1 = h.lfo(c, 0.06, 0.12); w1.out.connect(g1.gain);

      const s2 = c.createBufferSource();
      s2.buffer = h.buf(c, 'white');
      s2.loop = true;
      s2.start();
      const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 1600;
      const g2 = c.createGain(); g2.gain.value = 0.05;
      s2.connect(lp2); lp2.connect(g2); g2.connect(out);

      return { nodes: [s1, s2, w1.osc] };
    },
  },
  {
    id: 'brown',
    name: 'Brown Noise',
    tag: '',
    build(c, out, h) {
      const s = c.createBufferSource();
      s.buffer = h.buf(c, 'brown');
      s.loop = true;
      s.start();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
      const g = c.createGain(); g.gain.value = 0.55;
      s.connect(lp); lp.connect(g); g.connect(out);
      return { nodes: [s] };
    },
  },
];

/* ================= ambient engine ================= */

const Engine = (() => {
  let ctx = null;
  let master = null;
  const active = new Map();
  let buffers = {};

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = loadJSON('spartacus.ambvol', 0.8);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function makeBuffer(kind) {
    const c = ensureCtx();
    if (buffers[kind]) return buffers[kind];
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    } else if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    buffers[kind] = buf;
    return buf;
  }

  function _buf(c, kind) { return makeBuffer(kind); }

  function _lfo(c, freq, depth) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g);
    o.start();
    return { osc: o, out: g };
  }

  function startSound(id) {
    if (active.has(id)) return;
    const def = SOUNDS.find((s) => s.id === id);
    if (!def) return;
    const c = ensureCtx();
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(master);
    const built = def.build(c, out, { buf: _buf, lfo: _lfo });
    const vol = loadJSON('spartacus.vol.' + id, 0.75);
    const t = c.currentTime;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vol, t + 1.6);
    active.set(id, { out, built });
  }

  function stopSound(id) {
    const inst = active.get(id);
    if (!inst) return;
    const c = ensureCtx();
    const t = c.currentTime;
    const g = inst.out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.linearRampToValueAtTime(0.0001, t + 0.7);
    const { built } = inst;
    setTimeout(() => {
      try {
        built.nodes.forEach((n) => { if (n.stop) n.stop(); });
        if (built.cleanup) built.cleanup();
      } catch { /* ignore */ }
      try { inst.out.disconnect(); } catch { /* ignore */ }
      maybeSuspend();
    }, 800);
    active.delete(id);
  }

  // Release the audio hardware and noise buffers when nothing is playing.
  function maybeSuspend() {
    if (ctx && active.size === 0 && ctx.state === 'running') {
      ctx.suspend().catch(() => {});
      buffers = {}; // noise buffers are regenerated on demand (~2 MB)
    }
  }

  function isActive(id) { return active.has(id); }

  function setSoundVol(id, v) {
    const inst = active.get(id);
    if (inst) {
      const c = ensureCtx();
      inst.out.gain.cancelScheduledValues(c.currentTime);
      inst.out.gain.setValueAtTime(v, c.currentTime);
    }
    saveJSON('spartacus.vol.' + id, v);
  }

  function getAmbientVol() { return master ? master.gain.value : loadJSON('spartacus.ambvol', 0.8); }
  function setAmbientVol(v) {
    if (master) master.gain.value = v;
    saveJSON('spartacus.ambvol', v);
  }

  function chime() {
    const c = ensureCtx();
    const t = c.currentTime;
    [523.25, 783.99].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.2);
      g.gain.linearRampToValueAtTime(0.16, t + i * 0.2 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.2 + 1.1);
      o.connect(g);
      g.connect(c.destination);
      o.start(t + i * 0.2);
      o.stop(t + i * 0.2 + 1.2);
    });
  }

  // Focus-complete alarm: gentle bell arpeggio (C5-E5-G5-C6) with a warm pad
  // underneath, repeated three times. Bell timbre = inharmonic sine partials
  // with exponential decay — clearly audible but pleasant.
  let alarmSources = [];

  const BELL_PARTIALS = [
    { ratio: 1.0, gain: 1.0 },
    { ratio: 2.76, gain: 0.5 },
    { ratio: 5.4, gain: 0.22 },
    { ratio: 8.93, gain: 0.1 },
  ];

  function scheduleBell(c, freq, t, amp, pan) {
    const g = c.createGain();
    const p = c.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    p.connect(c.destination);
    const dur = 2.6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const oscs = [];
    for (const part of BELL_PARTIALS) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * part.ratio;
      const og = c.createGain();
      og.gain.value = part.gain;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
      oscs.push(o);
    }
    alarmSources.push({
      stop: () => oscs.forEach((o) => { try { o.stop(); } catch { /* ignore */ } }),
    });
  }

  function alarm() {
    const c = ensureCtx();
    stopAlarm();
    const melody = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    const pans = [-0.35, 0.3, -0.2, 0.35];
    const amps = [0.26, 0.26, 0.26, 0.32];

    // Warm low pad (C4 + G4), barely audible, for body.
    [261.63, 392.0].forEach((f) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      const t = c.currentTime + 0.05;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 6.6);
      alarmSources.push({ stop: () => { try { o.stop(); } catch { /* ignore */ } } });
    });

    let t = c.currentTime + 0.05;
    for (let rep = 0; rep < 3; rep++) {
      for (let i = 0; i < melody.length; i++) {
        scheduleBell(c, melody[i], t, amps[i], pans[i]);
        t += 0.24;
      }
      t += 0.75; // breathe between repetitions
    }
  }

  function stopAlarm() {
    alarmSources.forEach((s) => s.stop());
    alarmSources = [];
  }

  return { startSound, stopSound, isActive, setSoundVol, getAmbientVol, setAmbientVol, chime, alarm, stopAlarm };
})();

/* ================= pomodoro timer ================= */

const Timer = (() => {
  const MODES = { focus: 'FOCUS', short: 'BREAK', long: 'LONG BREAK' };
  const RING_C = 2 * Math.PI * 140; // 879.65

  let mode = 'focus';
  let total = settings.focus * 60;
  let remaining = total;
  let running = false;
  let endAt = 0;
  let intervalId = null;
  let completed = loadJSON('spartacus.completed', 0) % settings.sessions;

  const modeTotal = (m) => (m === 'focus' ? settings.focus : m === 'short' ? settings.short : settings.long) * 60;

  function tick() {
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    if (remaining <= 0) { complete(); return; }
    // Skip DOM work entirely while the window is hidden/minimized.
    if (!document.hidden) render();
  }

  // Visible: render every 500 ms. Hidden: just watch for completion (chime
  // must still fire on time) with a slow 2 s check.
  function scheduleTick() {
    clearInterval(intervalId);
    intervalId = setInterval(tick, document.hidden ? 2000 : 500);
  }

  function start() {
    if (running || remaining <= 0) return;
    running = true;
    Engine.stopAlarm();
    window.spartacus.flash(false);
    endAt = Date.now() + remaining * 1000;
    scheduleTick();
    render();
  }

  function pause() {
    if (!running) return;
    running = false;
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    clearInterval(intervalId);
    render();
  }

  function reset() {
    running = false;
    clearInterval(intervalId);
    remaining = total;
    render();
  }

  function setMode(m) {
    running = false;
    clearInterval(intervalId);
    mode = m;
    total = modeTotal(m);
    remaining = total;
    render();
  }

  function complete() {
    clearInterval(intervalId);
    running = false;
    remaining = 0;
    if (mode === 'focus') {
      completed += 1;
      saveJSON('spartacus.completed', completed);
      const long = completed % settings.sessions === 0;
      if (settings.alarm) Engine.alarm();
      else Engine.chime();
      if (settings.notify) {
        window.spartacus.notify('SPARTACUS', `Focus complete \u2014 time for a ${long ? 'long' : 'short'} break.`);
      }
      window.spartacus.flash(true);
      setTimeout(() => window.spartacus.flash(false), 45000);
      if (long) {
        setMode('long');
        toast('Cycle complete \u2014 take a long break.');
      } else {
        setMode('short');
        toast('Focus session done \u2014 short break.');
      }
    } else {
      Engine.chime();
      if (settings.notify) window.spartacus.notify('SPARTACUS', 'Break over \u2014 time to focus.');
      if (mode === 'long') {
        completed = 0;
        saveJSON('spartacus.completed', completed);
      }
      setMode('focus');
      toast('Break over \u2014 time to focus.');
    }
  }

  function skip() {
    if (mode === 'focus') {
      completed += 1;
      saveJSON('spartacus.completed', completed);
      setMode(completed % settings.sessions === 0 ? 'long' : 'short');
    } else {
      if (mode === 'long') {
        completed = 0;
        saveJSON('spartacus.completed', completed);
      }
      setMode('focus');
    }
  }

  function applySettings() {
    completed = 0;
    saveJSON('spartacus.completed', completed);
    setMode('focus');
  }

  // React to minimize/restore: full-speed rendering only while visible.
  document.addEventListener('visibilitychange', () => {
    if (!running) return;
    if (document.hidden) scheduleTick();
    else { tick(); scheduleTick(); }
  });

  function render() {
    const frac = total > 0 ? remaining / total : 0;
    $('#timeDisplay').textContent = fmtTime(remaining);
    $('#modeLabel').textContent = MODES[mode];
    $('#ringProgress').style.strokeDashoffset = String(RING_C * (1 - frac));
    $('#startPauseBtn').textContent = running ? 'PAUSE' : 'START';
    $$('.mode-tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));

    // Mini-mode widget mirrors the same state.
    $('#miniTime').textContent = fmtTime(remaining);
    $('#miniLabel').textContent = MODES[mode];
    $('#miniProgressFill').style.width = (frac * 100).toFixed(1) + '%';

    let filled = completed % settings.sessions;
    if (completed > 0 && filled === 0 && mode !== 'focus') filled = settings.sessions;

    const dots = $('#sessionDots');
    dots.innerHTML = '';
    for (let i = 0; i < settings.sessions; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < filled ? ' filled' : '');
      dots.appendChild(d);
    }
    $('#sessionLabel').textContent = `${filled} / ${settings.sessions}`;

    document.title = running ? `${fmtTime(remaining)} \u00b7 ${MODES[mode]} \u2014 SPARTACUS` : 'SPARTACUS';
  }

  return { render, start, pause, toggle: () => (running ? pause() : start()), reset, skip, setMode, applySettings };
})();

/* ================= youtube audio player ================= */

// Bundled royalty-free/CC0 lofi tracks (see Settings → credits).
// Each track has its own themed background (Unsplash, free license).
const BUILTIN_TRACKS = [
  { id: 'hanging-lanterns', file: 'hanging-lanterns.mp3', title: 'Hanging Lanterns', author: 'Kalaido', duration: 234 },
  { id: 'bread', file: 'bread.mp3', title: 'Bread', author: 'Lukrembo', duration: 160 },
  { id: 'first-snow', file: 'first-snow.mp3', title: 'First Snow', author: 'Kerusu', duration: 193 },
  { id: 'waves', file: 'waves.mp3', title: 'Waves', author: 'Matt Quentin', duration: 202 },
  { id: 'pearl', file: 'pearl.mp3', title: 'Pearl', author: 'MISE', duration: 99 },
  { id: 'flicker', file: 'flicker.mp3', title: 'Flicker', author: 'MISE', duration: 120 },
  { id: 'skin', file: 'skin.mp3', title: 'Skin', author: 'MISE', duration: 100 },
  { id: 'pieces-of-stars', file: 'pieces-of-stars.mp3', title: 'Pieces of Stars', author: 'MISE', duration: 106 },
  { id: 'moment', file: 'moment.mp3', title: 'Moment', author: 'MISE', duration: 77 },
];

const BUILTIN_BG = {
  'hanging-lanterns': '../assets/backgrounds/hanging-lanterns.jpg',
  'bread': '../assets/backgrounds/bread.jpg',
  'first-snow': '../assets/backgrounds/first-snow.jpg',
  'waves': '../assets/backgrounds/waves.jpg',
  'pearl': '../assets/backgrounds/pearl.jpg',
  'flicker': '../assets/backgrounds/flicker.jpg',
  'skin': '../assets/backgrounds/skin.jpg',
  'pieces-of-stars': '../assets/backgrounds/pieces-of-stars.jpg',
  'moment': '../assets/backgrounds/moment.jpg',
};
const DEFAULT_BG = '../assets/background.jpg';

/* Crossfading background: two stacked layers, one visible at a time.
   Images are local files — they decode in well under the 1.4 s fade,
   so lazy loading keeps memory low without visible pop-in. */
let bgA = true;
let currentBg = DEFAULT_BG;

function setBackground(key) {
  const url = (key && BUILTIN_BG[key]) || DEFAULT_BG;
  if (url === currentBg) return;
  const activeEl = bgA ? $('#bgA') : $('#bgB');
  const nextEl = bgA ? $('#bgB') : $('#bgA');
  nextEl.style.backgroundImage = 'url(' + url + ')';
  nextEl.style.opacity = '1';
  activeEl.style.opacity = '0';
  bgA = !bgA;
  currentBg = url;
  // Free the previous layer's decoded bitmap after the fade completes.
  setTimeout(() => { activeEl.style.backgroundImage = 'none'; }, 1600);
}

const Player = (() => {
  const audio = new Audio();
  let queue = loadJSON('spartacus.queue', []);
  let current = loadJSON('spartacus.current', -1);
  const playstate = loadJSON('spartacus.playstate', { mode: 'youtube', builtinIdx: 0 });
  let mode = playstate.mode === 'builtin' ? 'builtin' : 'youtube';
  let builtinIdx = Math.min(Math.max(parseInt(playstate.builtinIdx, 10) || 0, 0), BUILTIN_TRACKS.length - 1);
  let loading = false;
  let fails = 0;
  let playToken = 0;
  // Separate volumes: built-in lofi sits lower (background level),
  // YouTube follows the music card slider.
  let lofiVol = loadJSON('spartacus.lofivol', 0.45);
  let ytVol = loadJSON('spartacus.musicvol', 0.85);
  audio.volume = mode === 'builtin' ? lofiVol : ytVol;
  audio.preload = 'none';

  const persistPlaystate = () => saveJSON('spartacus.playstate', { mode, builtinIdx });

  function currentTrack() {
    return mode === 'builtin' ? BUILTIN_TRACKS[builtinIdx] : queue[current] || null;
  }

  audio.addEventListener('playing', () => { loading = false; fails = 0; render(); });
  audio.addEventListener('waiting', () => { loading = true; render(); });
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => {
    if (mode === 'builtin') playBuiltin((builtinIdx + 1) % BUILTIN_TRACKS.length);
    else if (queue.length > 1) next();
    else render();
  });
  audio.addEventListener('error', () => {
    if (!audio.currentSrc) return; // intentional unload
    advanceOnFailure();
  });

  function advanceOnFailure() {
    fails += 1;
    const total = mode === 'builtin' ? BUILTIN_TRACKS.length : queue.length;
    if (fails < total && total > 1) {
      if (mode === 'builtin') playBuiltin((builtinIdx + 1) % BUILTIN_TRACKS.length);
      else next();
    } else {
      loading = false;
      render();
    }
  }

  async function play() {
    const t = currentTrack();
    if (!t) return;
    const token = ++playToken;
    loading = true;
    render();
    if (mode === 'builtin') {
      audio.volume = lofiVol;
      audio.src = window.spartacus.builtinUrl(t.file);
      setBackground(t.id);
      audio.play().catch(() => {});
      return;
    }
    const res = await window.spartacus.prepareTrack(t.url, t.id);
    if (token !== playToken) return; // user moved on meanwhile
    if (!res || !res.ok) {
      toast('Could not load: ' + ((res && res.error) || 'unknown error'));
      advanceOnFailure();
      return;
    }
    audio.volume = ytVol;
    audio.src = res.fileUrl;
    setBackground('default');
    audio.play().catch(() => {});
  }

  function toggle() {
    const t = currentTrack();
    if (!t) return;
    if (audio.paused) {
      if (audio.currentSrc) audio.play().catch(() => {});
      else play();
    } else {
      audio.pause();
    }
  }

  function playBuiltin(i) {
    if (i < 0 || i >= BUILTIN_TRACKS.length) return;
    mode = 'builtin';
    builtinIdx = i;
    persistPlaystate();
    play();
  }

  function playAt(i) {
    if (i < 0 || i >= queue.length) return;
    mode = 'youtube';
    current = i;
    persistPlaystate();
    saveJSON('spartacus.current', current);
    play();
  }

  function next() {
    if (mode === 'builtin') playBuiltin((builtinIdx + 1) % BUILTIN_TRACKS.length);
    else if (queue.length) playAt((current + 1) % queue.length);
  }

  function prev() {
    if (mode === 'builtin') playBuiltin((builtinIdx - 1 + BUILTIN_TRACKS.length) % BUILTIN_TRACKS.length);
    else if (queue.length) playAt((current - 1 + queue.length) % queue.length);
  }

  function remove(i) {
    if (i < 0 || i >= queue.length) return;
    const wasCurrent = mode === 'youtube' && i === current;
    const [removed] = queue.splice(i, 1);
    if (!wasCurrent) window.spartacus.uncache(removed.id);
    if (!queue.length) {
      current = -1;
      saveJSON('spartacus.current', current);
      if (mode === 'youtube') {
        playToken += 1;
        audio.removeAttribute('src');
        audio.load();
        setBackground('default');
      }
    } else if (wasCurrent) {
      playToken += 1;
      current = Math.min(i, queue.length - 1);
      playAt(current);
    } else if (i < current) {
      current -= 1;
      saveJSON('spartacus.current', current);
    }
    saveJSON('spartacus.queue', queue);
    render();
  }

  async function add(raw) {
    if (!youtubeId(raw)) { toast('That is not a YouTube link.'); return; }
    const input = $('#ytInput');
    const btn = $('#ytAddBtn');
    btn.disabled = true;
    input.disabled = true;
    try {
      const res = await window.spartacus.getVideoInfo(raw);
      if (!res || !res.ok) throw new Error((res && res.error) || 'unknown error');
      const d = res.data;
      if (!d.duration) { toast('Live streams are not supported \u2014 pick a regular video.'); return; }
      if (queue.some((t) => t.id === d.id)) {
        toast('That track is already in the queue.');
        if (current === -1) playAt(0);
        return;
      }
      queue.push({ id: d.id, url: d.url, title: d.title, author: d.author, duration: d.duration });
      saveJSON('spartacus.queue', queue);
      toast('Added \u2014 audio only, no video.');
      if (current === -1) playAt(0);
      render();
    } catch (e) {
      toast('Could not add: ' + e.message);
    } finally {
      btn.disabled = false;
      input.disabled = false;
      input.value = '';
      input.focus();
    }
  }

  function render() {
    const t = currentTrack();
    if (t) {
      $('#npTitle').textContent = t.title;
      $('#npMeta').textContent =
        (loading ? 'LOADING \u00b7 ' : '') + `${t.author || 'YOUTUBE'} \u00b7 ${fmtDur(t.duration)}`;
      $('#playBtn').textContent = audio.paused ? '\u25b6' : '\u275a\u275a';
    } else {
      $('#npTitle').textContent = 'NOTHING PLAYING';
      $('#npMeta').textContent = 'PICK A LOFI TRACK OR ADD A YOUTUBE LINK';
      $('#playBtn').textContent = '\u25b6';
    }

    const list = $('#queueList');
    list.innerHTML = '';
    if (!queue.length) {
      const li = document.createElement('li');
      li.className = 'q-empty';
      li.textContent = 'Queue is empty \u2014 paste a link above';
      list.appendChild(li);
    } else {
      queue.forEach((tr, i) => {
        const li = document.createElement('li');
        li.className = 'q-row' + (mode === 'youtube' && i === current ? ' current' : '');

        const idx = document.createElement('span');
        idx.className = 'q-idx';
        idx.textContent = pad(i + 1);

        const title = document.createElement('span');
        title.className = 'q-title';
        title.textContent = tr.title;

        const dur = document.createElement('span');
        dur.className = 'q-dur';
        dur.textContent = fmtDur(tr.duration);

        const rm = document.createElement('button');
        rm.className = 'q-remove';
        rm.textContent = '\u2715';
        rm.title = 'Remove';
        rm.addEventListener('click', (e) => { e.stopPropagation(); remove(i); });

        li.append(idx, title, dur, rm);
        li.addEventListener('click', () => {
          if (mode === 'youtube' && i === current) toggle();
          else playAt(i);
        });
        list.appendChild(li);
      });
    }

    const bl = $('#builtinList');
    bl.innerHTML = '';
    BUILTIN_TRACKS.forEach((tr, i) => {
      const li = document.createElement('li');
      li.className = 'q-row' + (mode === 'builtin' && i === builtinIdx ? ' current' : '');

      const idx = document.createElement('span');
      idx.className = 'q-idx';
      idx.textContent = pad(i + 1);

      const title = document.createElement('span');
      title.className = 'q-title';
      title.textContent = tr.title;

      const author = document.createElement('span');
      author.className = 'q-author';
      author.textContent = tr.author;

      const dur = document.createElement('span');
      dur.className = 'q-dur';
      dur.textContent = fmtDur(tr.duration);

      li.append(idx, title, author, dur);
      li.addEventListener('click', () => {
        if (mode === 'builtin' && i === builtinIdx) toggle();
        else playBuiltin(i);
      });
      bl.appendChild(li);
    });

    $('#musicVol').value = Math.round(ytVol * 100);
    $('#builtinVol').value = Math.round(lofiVol * 100);
  }

  return {
    render, add, toggle, next, prev, playBuiltin,
    setVolume: (v) => { ytVol = v; saveJSON('spartacus.musicvol', v); if (mode === 'youtube') audio.volume = v; },
    setLofiVolume: (v) => { lofiVol = v; saveJSON('spartacus.lofivol', v); if (mode === 'builtin') audio.volume = v; },
    isActuallyPlaying: () => !audio.paused && audio.currentTime > 0 && !audio.ended,
  };
})();

/* ================= ambience UI ================= */

function renderSounds() {
  const grid = $('#soundGrid');
  grid.innerHTML = '';
  SOUNDS.forEach((def) => {
    const el = document.createElement('div');
    el.className = 'sound' + (Engine.isActive(def.id) ? ' active' : '');

    const top = document.createElement('div');
    top.className = 's-top';
    const name = document.createElement('span');
    name.className = 's-name';
    name.textContent = def.name;
    top.appendChild(name);
    if (def.tag) {
      const tag = document.createElement('span');
      tag.className = 's-tag';
      tag.textContent = def.tag;
      top.appendChild(tag);
    }
    el.appendChild(top);

    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0;
    vol.max = 100;
    vol.className = 's-vol';
    vol.value = Math.round(loadJSON('spartacus.vol.' + def.id, 0.75) * 100);
    vol.addEventListener('input', (e) => {
      e.stopPropagation();
      Engine.setSoundVol(def.id, e.target.value / 100);
    });
    el.appendChild(vol);

    el.addEventListener('click', () => {
      if (Engine.isActive(def.id)) Engine.stopSound(def.id);
      else Engine.startSound(def.id);
      renderSounds();
    });

    grid.appendChild(el);
  });
  $('#masterVol').value = Math.round(Engine.getAmbientVol() * 100);
}

/* ================= settings UI ================= */

let updatesSupported = false;
let updateStatus = null;

function renderUpdateStatus() {
  const status = $('#updateStatus');
  const checkBtn = $('#updateCheckBtn');
  const installBtn = $('#updateInstallBtn');
  status.classList.remove('ready');
  installBtn.classList.add('hidden');
  if (!updatesSupported) {
    status.textContent = 'UPDATES WORK IN THE INSTALLED APP';
    checkBtn.disabled = true;
    return;
  }
  checkBtn.disabled = false;
  switch (updateStatus && updateStatus.state) {
    case 'checking': status.textContent = 'CHECKING\u2026'; break;
    case 'downloading': status.textContent = 'DOWNLOADING\u2026'; break;
    case 'ready':
      status.textContent = 'UPDATE READY' + (updateStatus.version ? ' \u00b7 V' + updateStatus.version : '');
      status.classList.add('ready');
      installBtn.classList.remove('hidden');
      break;
    case 'error': status.textContent = 'CHECK FAILED \u2014 TRY LATER'; break;
    default: status.textContent = 'UP TO DATE';
  }
}

window.spartacus.onUpdateStatus((s) => {
  updateStatus = s;
  renderUpdateStatus();
  if (s.state === 'downloading') toast('Update downloading in the background\u2026');
  else if (s.state === 'ready') toast('Update ready \u2014 restart to install.');
});

window.spartacus.updatesSupported().then((v) => {
  updatesSupported = v;
  renderUpdateStatus();
});

window.spartacus.getVersion().then((v) => {
  $('#updateVersion').textContent = 'VERSION ' + v;
});

function openSettings() {
  $('#setFocus').value = settings.focus;
  $('#setShort').value = settings.short;
  $('#setLong').value = settings.long;
  $('#setSessions').value = settings.sessions;
  $('#setAlarm').checked = settings.alarm;
  $('#setNotify').checked = settings.notify;
  renderUpdateStatus();
  $('#settingsOverlay').classList.add('open');
}

function saveSettings() {
  settings.focus = clampInt($('#setFocus').value, 1, 180);
  settings.short = clampInt($('#setShort').value, 1, 60);
  settings.long = clampInt($('#setLong').value, 1, 120);
  settings.sessions = clampInt($('#setSessions').value, 1, 12);
  settings.alarm = $('#setAlarm').checked;
  settings.notify = $('#setNotify').checked;
  saveJSON('spartacus.settings', settings);
  $('#settingsOverlay').classList.remove('open');
  Timer.applySettings();
  toast('Settings saved.');
}

/* ================= goals ================= */

const Goals = (() => {
  const data = loadJSON('spartacus.goals', { vision: [], yearly: {}, quarterly: {}, monthly: {} });
  // Normalize older persisted shapes (e.g., before yearly existed).
  data.vision = data.vision || [];
  data.yearly = data.yearly || {};
  data.quarterly = data.quarterly || {};
  data.monthly = data.monthly || {};
  let yKey = '';
  let qKey = '';
  let mKey = '';
  let Y_LABEL = '';
  let Q_LABEL = '';
  let M_LABEL = '';

  // Recompute on every render so year/quarter/month rollovers apply even if
  // the app stays open across the boundary.
  function updatePeriod() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    yKey = String(now.getFullYear());
    qKey = now.getFullYear() + '-Q' + q;
    mKey = now.getFullYear() + '-' + pad(now.getMonth() + 1);
    Y_LABEL = String(now.getFullYear());
    Q_LABEL = 'Q' + q + ' ' + now.getFullYear();
    M_LABEL = now.toLocaleString('en-US', { month: 'long' }).toUpperCase() + ' ' + now.getFullYear();
  }

  const save = () => saveJSON('spartacus.goals', data);

  const listFor = (kind) => {
    if (kind === 'vision') return data.vision;
    if (kind === 'year') { data.yearly[yKey] = data.yearly[yKey] || []; return data.yearly[yKey]; }
    if (kind === 'quarter') { data.quarterly[qKey] = data.quarterly[qKey] || []; return data.quarterly[qKey]; }
    data.monthly[mKey] = data.monthly[mKey] || [];
    return data.monthly[mKey];
  };

  function add(kind, text) {
    text = text.trim();
    if (!text) return null;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    listFor(kind).push({ id, text, done: false });
    save();
    render();
    return id;
  }

  function toggle(kind, id) {
    const it = listFor(kind).find((x) => x.id === id);
    if (it) { it.done = !it.done; save(); render(); }
  }

  function remove(kind, id) {
    const arr = listFor(kind);
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) { arr.splice(idx, 1); save(); render(); }
  }

  function renderList(ulId, arr, kind, countId) {
    const ul = $('#' + ulId);
    ul.innerHTML = '';
    const done = arr.filter((i) => i.done).length;
    $('#' + countId).textContent = done + '/' + arr.length;
    if (!arr.length) {
      const li = document.createElement('li');
      li.className = 'q-empty';
      li.textContent = 'No goals yet \u2014 add one below';
      ul.appendChild(li);
      return;
    }
    arr.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'goal-row' + (it.done ? ' done' : '');

      const chk = document.createElement('button');
      chk.className = 'goal-check';
      chk.title = 'Toggle done';
      chk.addEventListener('click', () => toggle(kind, it.id));

      const txt = document.createElement('span');
      txt.className = 'goal-text';
      txt.textContent = it.text;

      const rm = document.createElement('button');
      rm.className = 'goal-remove';
      rm.textContent = '\u2715';
      rm.title = 'Remove';
      rm.addEventListener('click', () => remove(kind, it.id));

      li.append(chk, txt, rm);
      ul.appendChild(li);
    });
  }

  function render() {
    updatePeriod();
    renderList('visionList', data.vision, 'vision', 'visionCount');
    renderList('yearList', listFor('year'), 'year', 'yearCount');
    renderList('quarterList', listFor('quarter'), 'quarter', 'quarterCount');
    renderList('monthList', listFor('month'), 'month', 'monthCount');
    $('#yearLabel').textContent = Y_LABEL;
    $('#quarterLabel').textContent = Q_LABEL;
    $('#monthLabel').textContent = M_LABEL;
  }

  return { render, add, toggle, remove };
})();

/* ================= motivational quote ================= */

const Quote = (() => {
  let cached = loadJSON('spartacus.quote', null);
  let refreshing = false;

  function show(q) {
    $('#quoteText').textContent = q.text;
    $('#quoteAuthor').textContent = q.author ? '\u2014 ' + q.author : '';
    $('#miniQuote').textContent = q.text;
  }

  async function refresh(manual = false) {
    if (refreshing) return false;
    refreshing = true;
    try {
      const res = await window.spartacus.fetchQuote();
      if (res && res.ok && res.quote && res.quote.text) {
        cached = { text: res.quote.text, author: res.quote.author || '', t: Date.now(), source: res.source };
        saveJSON('spartacus.quote', cached);
        show(cached);
        if (window.spartacus.smoke) console.log('[smoke] quote fetched from', res.source, ':', cached.text.slice(0, 60));
        if (manual) toast('Quote refreshed.');
        return true;
      }
      if (manual) toast('Could not reach the quote service \u2014 check your connection.');
      return false;
    } finally {
      refreshing = false;
    }
  }

  function init() {
    if (cached && cached.text) show(cached);
    refresh(); // fetch a fresh one in the background
    setInterval(() => refresh(), 30 * 60 * 1000); // rotate every 30 minutes
  }

  return { init, refresh };
})();

/* ================= view tabs ================= */

function setView(v) {
  $('#timerView').classList.toggle('hidden', v !== 'timer');
  $('#goalsView').classList.toggle('hidden', v !== 'goals');
  $$('.view-tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
}

/* ================= mini mode ================= */

let miniMode = false;

function enterMini() {
  if (miniMode) return;
  miniMode = true;
  document.body.classList.add('mini-mode');
  window.spartacus.setMiniMode(true);
  Timer.render(); // refresh the widget immediately
}

function exitMini() {
  if (!miniMode) return;
  miniMode = false;
  document.body.classList.remove('mini-mode');
  window.spartacus.setMiniMode(false);
  Timer.render();
}

/* ================= wiring ================= */

$('#startPauseBtn').addEventListener('click', () => Timer.toggle());
$('#resetBtn').addEventListener('click', () => Timer.reset());
$('#skipBtn').addEventListener('click', () => Timer.skip());
$$('.mode-tab').forEach((t) => t.addEventListener('click', () => Timer.setMode(t.dataset.mode)));

$('#viewTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.view-tab');
  if (b) setView(b.dataset.view);
});

// Goals wiring: ADD buttons + Enter key
const bindGoalInput = (inputId, btnId, kind) => {
  const input = $('#' + inputId);
  const add = () => { Goals.add(kind, input.value); input.value = ''; input.focus(); };
  $('#' + btnId).addEventListener('click', add);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
};
bindGoalInput('visionInput', 'visionAddBtn', 'vision');
bindGoalInput('yearInput', 'yearAddBtn', 'year');
bindGoalInput('quarterInput', 'quarterAddBtn', 'quarter');
bindGoalInput('monthInput', 'monthAddBtn', 'month');

// Click the quote to fetch a fresh one from the API.
$('#quoteLine').addEventListener('click', () => Quote.refresh(true));

$('#ytAddBtn').addEventListener('click', () => Player.add($('#ytInput').value.trim()));
$('#ytInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') Player.add(e.target.value.trim());
});
$('#playBtn').addEventListener('click', () => Player.toggle());
$('#nextBtn').addEventListener('click', () => Player.next());
$('#prevBtn').addEventListener('click', () => Player.prev());
$('#musicVol').addEventListener('input', (e) => Player.setVolume(e.target.value / 100));
$('#builtinVol').addEventListener('input', (e) => Player.setLofiVolume(e.target.value / 100));
$('#masterVol').addEventListener('input', (e) => Engine.setAmbientVol(e.target.value / 100));

$('#btnSettings').addEventListener('click', openSettings);
$('#settingsSave').addEventListener('click', saveSettings);
$('#settingsCancel').addEventListener('click', () => $('#settingsOverlay').classList.remove('open'));
$('#settingsOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) $('#settingsOverlay').classList.remove('open');
});

$('#updateCheckBtn').addEventListener('click', () => {
  updateStatus = { state: 'checking' };
  renderUpdateStatus();
  window.spartacus.checkUpdates();
});
$('#updateInstallBtn').addEventListener('click', () => window.spartacus.installUpdate());

$('#tbMin').addEventListener('click', enterMini);
$('#tbExpand').addEventListener('click', exitMini);
$('#miniBar').addEventListener('click', exitMini);
$('#tbMax').addEventListener('click', () => window.spartacus.toggleMaximize());
$('#tbClose').addEventListener('click', () => window.spartacus.close());
window.spartacus.onMaximized((v) => { $('#tbMax').textContent = v ? '\u274f' : '\u25a1'; });
window.spartacus.isMaximized().then((v) => { if (v) $('#tbMax').textContent = '\u274f'; });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && miniMode) { exitMini(); return; }
  if (e.target.closest('input, textarea, button')) return;
  if ($('#settingsOverlay').classList.contains('open')) return;
  if (e.code === 'Space') { e.preventDefault(); Timer.toggle(); }
  else if (e.key.toLowerCase() === 'r') Timer.reset();
  else if (e.key.toLowerCase() === 's') Timer.skip();
});

/* ================= init ================= */

Timer.render();
renderSounds();
Player.render();
Goals.render();
Quote.init();

// Smoke hook: exercise alarm + notification + taskbar flash without waiting.
if (window.spartacus.smoke) {
  setTimeout(() => {
    Engine.alarm();
    window.spartacus.notify('SPARTACUS', 'Smoke test \u2014 focus complete.');
    window.spartacus.flash(true);
    setTimeout(() => window.spartacus.flash(false), 3000);
    console.log('[smoke] alarm + notify + flash fired');
  }, 2500);
  setTimeout(() => {
    enterMini();
    const bar = document.getElementById('miniBar').getBoundingClientRect();
    const title = document.querySelector('.titlebar').getBoundingClientRect();
    const time = document.getElementById('miniTime').getBoundingClientRect();
    console.log('[smoke] mini mode entered | titlebar bottom:', title.bottom.toFixed(0),
      '| mini-bar top:', bar.top.toFixed(0),
      '| time visible:', time.top >= title.bottom ? 'YES' : 'NO',
      '| time text:', document.getElementById('miniTime').textContent);
    setTimeout(() => {
      exitMini();
      console.log('[smoke] mini mode exited');
    }, 1500);
  }, 6000);
  setTimeout(() => {
    Player.playBuiltin(0);
    setTimeout(() => {
      console.log('[smoke] builtin lofi playing:', Player.isActuallyPlaying(), '| track:', BUILTIN_TRACKS[0].title,
        '| background:', currentBg.includes('hanging-lanterns') ? 'switched OK' : 'NOT switched (' + currentBg + ')');
      Player.toggle(); // pause again
    }, 3000);
  }, 9000);
}
