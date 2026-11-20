/* ═══════════════════════════════════════════════════════════
   KADAMA VAMSI KRISHNA — PORTFOLIO JAVASCRIPT
   Quest for the Code | main.js
   Requires: portfolio-config.js loaded BEFORE this file

   LIVE DATA SOURCE:
   ✅ GitHub  → api.github.com  (public, no key needed)
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   LIVE DATA CACHE  (fetched once per session)
══════════════════════════════════════════ */
const LIVE = {
  github:  null,   // { repos, followers, following, bio, repoList[] }
  loading: { github: false }
};

/* ══════════════════════════════════════════
   GITHUB API  — api.github.com (no auth needed)
   Pulls: repo count, public repo list
══════════════════════════════════════════ */
async function fetchGitHub() {
  if (LIVE.github || LIVE.loading.github) return;
  LIVE.loading.github = true;

  const username = PORTFOLIO_CONFIG.contact.github.split('/').filter(Boolean).pop();

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`)
    ]);

    const userData  = await userRes.json();
    const reposData = await reposRes.json();

    LIVE.github = {
      followers: userData.followers  ?? '—',
      following: userData.following  ?? '—',
      repos:     userData.public_repos ?? '—',
      bio:       userData.bio ?? '',
      repoList:  Array.isArray(reposData)
        ? reposData.map(r => ({
            name:        r.name,
            description: r.description || 'No description provided.',
            stars:       r.stargazers_count,
            forks:       r.forks_count,
            language:    r.language || null,
            url:         r.html_url,
            updated:     new Date(r.updated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
          })).sort((a, b) => b.stars - a.stars)
        : []
    };
    console.log('✅ GitHub loaded:', LIVE.github.repos, 'repos,', LIVE.github.followers, 'followers');
  } catch (err) {
    console.warn('⚠️ GitHub API failed:', err);
    LIVE.github = { followers: '—', following: '—', repos: '—', bio: '', repoList: [] };
  }

  LIVE.loading.github = false;
}

/* ══════════════════════════════════════════
   PREFETCH — kicks off immediately on load
   Data is ready by the time user clicks a zone
══════════════════════════════════════════ */
fetchGitHub();

/* ══════════════════════════════════════════
   RETRY HELPER
   Polls every 250ms until live data arrives,
   then runs the provided callback to update DOM
══════════════════════════════════════════ */
function retryWhenReady(key, callback, maxAttempts = 30) {
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (LIVE[key]) { clearInterval(poll); callback(LIVE[key]); return; }
    if (attempts >= maxAttempts) { clearInterval(poll); }
  }, 250);
}

/* ══════════════════════════════════════════
   LOADING SPINNER
══════════════════════════════════════════ */
function spinner(msg) {
  return `<div style="text-align:center; padding:36px; font-family:'Press Start 2P',monospace;
    font-size:9px; color:var(--dim); animation:blink 1s step-end infinite;">${msg || 'LOADING...'}</div>`;
}

/* ══════════════════════════════════════════
   STARFIELD
══════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   AUDIO ENGINE — Web Audio API (zero external files)
   Generates all sounds programmatically — no downloads needed
══════════════════════════════════════════════════════════════ */

const AUDIO = {
  ctx:        null,
  musicOn:    true,
  sfxOn:      true,
  musicNode:  null,   // currently playing background music source
  musicGain:  null,
  sfxGain:    null,
  started:    false,
};

function getAudioCtx() {
  if (!AUDIO.ctx) {
    AUDIO.ctx      = new (window.AudioContext || window.webkitAudioContext)();
    AUDIO.musicGain = AUDIO.ctx.createGain();
    AUDIO.sfxGain   = AUDIO.ctx.createGain();
    AUDIO.musicGain.gain.value = 0.18;
    AUDIO.sfxGain.gain.value   = 0.5;
    AUDIO.musicGain.connect(AUDIO.ctx.destination);
    AUDIO.sfxGain.connect(AUDIO.ctx.destination);
  }
  return AUDIO.ctx;
}

/* ── BACKGROUND MUSIC ─────────────────────────────────────────
   Ambient RPG dungeon atmosphere — deep pads + slow arpeggio
   Fades in/out smoothly on toggle
──────────────────────────────────────────────────────────────*/
function startBGM() {
  if (!AUDIO.musicOn) return;
  const ctx = getAudioCtx();
  if (AUDIO.musicNode) return;

  // Ambient pad chord — Cm: C3 Eb3 G3 Bb3
  const padNotes = [130.8, 155.6, 196.0, 233.1];

  // Slow arpeggio melody over the pad — pentatonic minor feel
  const arp = [
    196.0, 233.1, 261.6, 311.1,
    261.6, 233.1, 196.0, 174.6,
    174.6, 196.0, 233.1, 261.6,
    233.1, 196.0, 174.6, 130.8,
  ];
  const arpBeat = 60 / 72; // 72 BPM, slower & more atmospheric
  let t = ctx.currentTime + 0.2;

  // sustained pad oscillators — always running, fade in via gain
  padNotes.forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    // slight detune for warmth
    osc.detune.value = (Math.random() - 0.5) * 8;
    // LFO tremolo — very slow wobble
    lfo.type = 'sine';
    lfo.frequency.value = 0.25;
    lfoG.gain.value = 0.04;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.5); // fade in
    osc.connect(gain);
    gain.connect(AUDIO.musicGain);
    lfo.start();
    osc.start();
    // store refs so we can stop them
    AUDIO.padOscs = AUDIO.padOscs || [];
    AUDIO.padOscs.push({ osc, gain, lfo });
  });

  // arpeggio loop
  function scheduleArp() {
    arp.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * arpBeat);
      gain.gain.setValueAtTime(0, t + i * arpBeat);
      gain.gain.linearRampToValueAtTime(0.18, t + i * arpBeat + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * arpBeat + arpBeat * 0.9);
      osc.connect(gain);
      gain.connect(AUDIO.musicGain);
      osc.start(t + i * arpBeat);
      osc.stop(t + i * arpBeat + arpBeat);
    });
    const total = arp.length * arpBeat;
    AUDIO.musicNode = setTimeout(() => {
      t = ctx.currentTime + 0.05;
      if (AUDIO.musicOn) scheduleArp();
      else AUDIO.musicNode = null;
    }, (total - 0.3) * 1000);
  }
  scheduleArp();
}

function stopBGM() {
  // immediately ramp down pads smoothly
  if (AUDIO.padOscs && AUDIO.padOscs.length) {
    const ctx = getAudioCtx();
    AUDIO.padOscs.forEach(({ osc, gain, lfo }) => {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => { try { osc.stop(); lfo.stop(); } catch(e){} }, 500);
    });
    AUDIO.padOscs = [];
  }
  if (AUDIO.musicNode) {
    clearTimeout(AUDIO.musicNode);
    AUDIO.musicNode = null;
  }
}

/* ── SOUND EFFECTS ────────────────────────────────────────────*/

function playClick() {
  if (!AUDIO.sfxOn) return;
  const ctx = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(AUDIO.sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

function playZoneEnter() {
  if (!AUDIO.sfxOn) return;
  const ctx   = getAudioCtx();
  const notes = [523.3, 659.3, 783.9];
  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.08 + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.08 + 0.15);
    osc.connect(gain);
    gain.connect(AUDIO.sfxGain);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.2);
  });
}

function playXPGain() {
  if (!AUDIO.sfxOn) return;
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(AUDIO.sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

function playPressStart() {
  if (!AUDIO.sfxOn) return;
  const ctx   = getAudioCtx();
  const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 523.3, 659.3, 784.0];
  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i % 2 === 0 ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.07 + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.07 + 0.12);
    osc.connect(gain);
    gain.connect(AUDIO.sfxGain);
    osc.start(ctx.currentTime + i * 0.07);
    osc.stop(ctx.currentTime + i * 0.07 + 0.15);
  });
}

function playBackToMap() {
  if (!AUDIO.sfxOn) return;
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(523.3, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(261.6, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(AUDIO.sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

/* ── TOGGLE CONTROLS ──────────────────────────────────────────*/
function toggleMusic() {
  AUDIO.musicOn = !AUDIO.musicOn;
  const btn = document.getElementById('btn-music');
  if (AUDIO.musicOn) {
    btn.classList.add('active');
    btn.querySelector('.audio-icon').textContent = '♪';
    btn.querySelector('.audio-label').textContent = 'ANTHEM';
    startBGM();
  } else {
    btn.classList.remove('active');
    btn.querySelector('.audio-icon').textContent = '—';
    btn.querySelector('.audio-label').textContent = 'ANTHEM';
    stopBGM(); // fades out smoothly via gain ramp
  }
  playClick();
}

function toggleSFX() {
  AUDIO.sfxOn = !AUDIO.sfxOn;
  const btn = document.getElementById('btn-sfx');
  if (AUDIO.sfxOn) {
    btn.classList.add('active');
    btn.querySelector('.audio-icon').textContent = '▶';
    btn.querySelector('.audio-label').textContent = 'SPELL';
    playClick(); // confirm it's back on
  } else {
    btn.classList.remove('active');
    btn.querySelector('.audio-icon').textContent = '—';
    btn.querySelector('.audio-label').textContent = 'SPELL';
  }
}

/* ── INIT: start audio on first user interaction ─────────────*/
function initAudio() {
  if (AUDIO.started) return;
  AUDIO.started = true;
  getAudioCtx();
  if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume();
  startBGM();
}

document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

/* ══════════════════════════════════════════
   BACKGROUND FX ENGINE
   • 3-layer parallax starfield (follows the mouse)
   • Shooting stars
   • Zone-themed particles (fireflies, embers, code glyphs, ...)
   Toggle with the ✦ AURA button. Respects prefers-reduced-motion.
══════════════════════════════════════════ */
const canvas = document.getElementById('stars');
const ctx    = canvas.getContext('2d');

const FX = { on: true, raf: 0, last: 0, t: 0, mx: 0, my: 0, tx: 0, ty: 0, theme: 'title' };
(function initFxPref() {
  let saved = null;
  try { saved = localStorage.getItem('fx'); } catch (e) {}
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  FX.on = saved !== null ? saved === 'on' : !reduced;
})();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Zone themes — edit freely */
const FX_THEMES = {
  title:        { shape: 'dot',      n: 22, colors: ['#b388ff', '#00e5ff'],                 vx: [-.2, .2],  vy: [-.4, -.12], size: [1.5, 3.2], life: [5, 9] },
  about:        { shape: 'dot',      n: 28, colors: ['#ffe66d', '#9dff7a'],                 vx: [-.3, .3],  vy: [-.25, .15], size: [1.5, 3.4], life: [5, 10], wander: true },
  skills:       { shape: 'ember',    n: 42, colors: ['#ff6b35', '#ffb347', '#ff3d00'],      vx: [-.3, .3],  vy: [-1.3, -.5], size: [2.5, 4.5], life: [3, 6],  sway: true },
  experience:   { shape: 'sparkle',  n: 24, colors: ['#ffd700', '#fff3b0'],                 vx: [.1, .5],   vy: [-.35, -.05], size: [2, 4],    life: [4, 8] },
  projects:     { shape: 'glyph',    n: 26, colors: ['#00e5ff', '#00ff88'],                 vx: [-.15, .15], vy: [-.55, -.2], size: [11, 17],  life: [6, 10], glyphs: ['</>', '{ }', '01', '()=>', '#', 'fn', '==', '[ ]'] },
  blogs:        { shape: 'glyph',    n: 24, colors: ['#b388ff', '#e0b3ff', '#ffd700'],      vx: [-.2, .2],  vy: [-.4, -.1], size: [12, 18],  life: [6, 10], glyphs: ['✦', '✧', '◇', '✶', '❖'] },
  education:    { shape: 'glyph',    n: 24, colors: ['#7ad7ff', '#b388ff'],                 vx: [-.2, .2],  vy: [-.45, -.12], size: [13, 20],  life: [6, 10], glyphs: ['∑', 'π', 'λ', '∫', '√', 'Δ', '∞'] },
  achievements: { shape: 'confetti', n: 38, colors: ['#ffd700', '#ff6bd6', '#00e5ff', '#9dff7a'], vx: [-.4, .4], vy: [.3, .9], size: [3, 5], life: [6, 10] },
  arcade:       { shape: 'glyph',    n: 22, colors: ['#ff6bd6', '#00e5ff', '#ffd700'],      vx: [-.2, .2],  vy: [-.5, -.15], size: [12, 18], life: [6, 10], glyphs: ['▲', '●', '■', '◆', '✚'] },
  contact:      { shape: 'ring',     n: 4,  colors: ['#00e5ff', '#00ff88'],                 vx: [0, 0],     vy: [0, 0],     size: [0, 0],    life: [3.5, 4.5] },
};
FX_THEMES.map = FX_THEMES.title;

let fxStars = [];     // [{x,y,r,depth,phase,speed,base}]
let fxParts = [];     // particles
let fxShooters = [];
let fxNextShooter = 2;

function fxScale() { return window.innerWidth < 700 ? 0.55 : 1; }

function initStars() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const area = Math.max(0.5, Math.min(1.3, (canvas.width * canvas.height) / (1440 * 900)));
  const layers = [ { n: 90, r: 0.7, depth: 0.15 }, { n: 60, r: 1.1, depth: 0.45 }, { n: 28, r: 1.7, depth: 0.95 } ];
  fxStars = [];
  layers.forEach(L => {
    for (let i = 0; i < Math.round(L.n * area); i++) {
      fxStars.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: L.r * rand(0.7, 1.2), depth: L.depth,
        phase: Math.random() * 6.28, speed: rand(0.6, 2.2), base: rand(0.35, 0.8),
      });
    }
  });
  if (!FX.on) drawStatic();
}

function setBgTheme(zone) {
  FX.theme = FX_THEMES[zone] ? zone : 'map';
}

function spawnParticle(th) {
  const w = canvas.width, h = canvas.height;
  const p = {
    th, age: 0, maxLife: rand(th.life[0], th.life[1]),
    x: Math.random() * w, y: Math.random() * h,
    vx: rand(th.vx[0], th.vx[1]), vy: rand(th.vy[0], th.vy[1]),
    size: rand(th.size[0], th.size[1]), color: pick(th.colors),
    phase: Math.random() * 6.28, glyph: th.glyphs ? pick(th.glyphs) : '', rot: Math.random() * 6.28,
  };
  // Rising things start low, falling things start high, so they travel across the screen
  if (th.vy[1] < 0) p.y = rand(h * 0.4, h * 1.05);
  else if (th.vy[0] > 0) p.y = rand(-20, h * 0.5);
  if (th.shape === 'ring') { p.x = w / 2; p.y = h * 0.62; p.size = 0; }
  return p;
}

function updateParticles(dt) {
  const th = FX_THEMES[FX.theme];
  const target = Math.round(th.n * fxScale());
  // count only particles of the current theme toward the target; old-theme ones fade out on their own
  let current = 0;
  for (const p of fxParts) if (p.th === th) current++;
  if (current < target && Math.random() < 0.35) fxParts.push(spawnParticle(th));

  for (let i = fxParts.length - 1; i >= 0; i--) {
    const p = fxParts[i];
    const fast = p.th !== th ? 2.2 : 1;          // old theme ages out quicker
    p.age += (dt / 60) * fast;
    if (p.age >= p.maxLife) { fxParts.splice(i, 1); continue; }
    const s = p.th;
    if (s.shape === 'ring') { p.size = (p.age / p.maxLife) * Math.max(canvas.width, canvas.height) * 0.45; continue; }
    p.x += p.vx * dt + (s.sway ? Math.sin(FX.t * 2 + p.phase) * 0.35 * dt : 0) + (s.wander ? Math.sin(FX.t * 0.9 + p.phase) * 0.3 * dt : 0);
    p.y += p.vy * dt + (s.wander ? Math.cos(FX.t * 0.7 + p.phase) * 0.25 * dt : 0);
    p.rot += 0.03 * dt;
  }
}

function drawParticles() {
  const px = FX.mx * 10, py = FX.my * 6;
  for (const p of fxParts) {
    const k = p.age / p.maxLife;
    let a = Math.sin(Math.PI * k);                       // fade in / out
    const s = p.th;
    const x = p.x + px * 0.6, y = p.y + py * 0.6;
    ctx.save();
    if (s.shape === 'dot') {
      a *= 0.55 + 0.45 * Math.sin(FX.t * 3 + p.phase);   // firefly blink
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, p.size * 3.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.283); ctx.fill();
    } else if (s.shape === 'ember') {
      a *= 0.6 + 0.4 * Math.sin(FX.t * 12 + p.phase);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      const sz = p.size * (1 - k * 0.5);
      ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
    } else if (s.shape === 'sparkle') {
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(FX.t * 4 + p.phase)); ctx.fillStyle = p.color;
      const z = p.size;
      ctx.fillRect(x - z, y - z / 3, z * 2, z / 1.5);
      ctx.fillRect(x - z / 3, y - z, z / 1.5, z * 2);
    } else if (s.shape === 'glyph') {
      ctx.globalAlpha = a * 0.5; ctx.fillStyle = p.color;
      ctx.font = `${p.size}px "VT323", monospace`;
      ctx.fillText(p.glyph, x, y);
    } else if (s.shape === 'confetti') {
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color;
      ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(Math.cos(FX.t * 3 + p.phase), 1);
      ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
    } else if (s.shape === 'ring') {
      ctx.globalAlpha = (1 - k) * 0.35; ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }
}

function updateShooters(dt) {
  fxNextShooter -= dt / 60;
  if (fxNextShooter <= 0 && fxShooters.length < 2) {
    const w = canvas.width, h = canvas.height;
    fxShooters.push({
      x: rand(w * 0.3, w * 1.05), y: rand(-20, h * 0.35),
      vx: -rand(9, 14), vy: rand(4, 7), len: rand(90, 160), age: 0, maxLife: rand(0.8, 1.2),
    });
    fxNextShooter = rand(2.5, 7);
  }
  for (let i = fxShooters.length - 1; i >= 0; i--) {
    const s = fxShooters[i];
    s.age += dt / 60; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.age > s.maxLife) fxShooters.splice(i, 1);
  }
}

function drawShooters() {
  for (const s of fxShooters) {
    const a = Math.sin(Math.PI * (s.age / s.maxLife));
    const m = Math.hypot(s.vx, s.vy), tx = s.x - (s.vx / m) * s.len, ty = s.y - (s.vy / m) * s.len;
    const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 6.283); ctx.fill();
  }
}

function drawStarLayer(animated) {
  const w = canvas.width, h = canvas.height;
  for (const s of fxStars) {
    const tw = animated ? 0.3 * Math.sin(FX.t * s.speed + s.phase) : 0;
    const o  = Math.max(0.1, Math.min(1, s.base + tw));
    const ox = animated ? FX.mx * s.depth * 22 - FX.t * s.depth * 1.5 : 0;
    const oy = animated ? FX.my * s.depth * 14 : 0;
    const x = (((s.x + ox) % w) + w) % w;
    const y = (((s.y + oy) % h) + h) % h;
    ctx.fillStyle = `rgba(200,220,255,${o})`;
    ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
  }
}

function drawStatic() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStarLayer(false);
}

function fxFrame(ts) {
  if (!FX.on) return;
  const dt = Math.min(3, (ts - (FX.last || ts)) / 16.667);   // frame-rate independent, capped
  FX.last = ts; FX.t += dt / 60;
  FX.mx += (FX.tx - FX.mx) * 0.05 * dt;
  FX.my += (FX.ty - FX.my) * 0.05 * dt;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStarLayer(true);
  updateShooters(dt); drawShooters();
  updateParticles(dt); drawParticles();
  FX.raf = requestAnimationFrame(fxFrame);
}

function startFX() { cancelAnimationFrame(FX.raf); FX.last = 0; FX.raf = requestAnimationFrame(fxFrame); }

function toggleFX() {
  FX.on = !FX.on;
  try { localStorage.setItem('fx', FX.on ? 'on' : 'off'); } catch (e) {}
  const btn = document.getElementById('btn-fx');
  if (btn) btn.classList.toggle('active', FX.on);
  if (FX.on) startFX();
  else { cancelAnimationFrame(FX.raf); fxParts = []; fxShooters = []; drawStatic(); }
  if (typeof playClick === 'function') playClick();
}

window.addEventListener('mousemove', (e) => {
  FX.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
  FX.ty = (e.clientY / window.innerHeight - 0.5) * 2;
});
window.addEventListener('resize', initStars);

initStars();
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-fx');
  if (btn) btn.classList.toggle('active', FX.on);
});
if (FX.on) startFX(); else drawStatic();

/* ══════════════════════════════════════════
   BOOT — Populate from config on page load
══════════════════════════════════════════ */
function avatarHTML(size) {
  const a = PORTFOLIO_CONFIG.profile.avatar || '';
  const isImg = a.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(a);
  return isImg
    ? `<img src="${a}" alt="" style="width:${size}px;height:${size}px;image-rendering:pixelated;vertical-align:middle;">`
    : a;
}

function bootFromConfig() {
  const p  = PORTFOLIO_CONFIG.profile;
  const yr = new Date().getFullYear();

  document.getElementById('t-name').textContent    = `⚔ ${p.name} ⚔`;
  document.getElementById('t-avatar').innerHTML    = avatarHTML(140);
  document.getElementById('t-role').textContent    = `${p.title} • ${p.company}`;
  document.getElementById('t-tagline').textContent = p.tagline;
  document.getElementById('t-copy').textContent    = `© ${yr} ${p.name} — ALL RIGHTS RESERVED`;
  document.getElementById('hud-name').innerHTML    = `${avatarHTML(26)} ${p.name.split(' ')[0].toUpperCase()}`;
  document.getElementById('hud-level').textContent = p.level;
  document.title = `${p.name} | Quest for the Code`;
  if (p.openForWork) {
    const t = document.getElementById('t-ofw'); if (t) t.style.display = 'flex';
    const lvl = document.getElementById('hud-level');
    if (lvl) lvl.insertAdjacentHTML('afterend', '<span class="ofw-pill ofw-hud"><span class="ofw-dot"></span>OPEN FOR WORK</span>');
  }

  // Certificate count on the map card
  const certDesc = document.getElementById('blog-zone-desc');
  if (certDesc) certDesc.textContent = `${PORTFOLIO_CONFIG.certifications.length} certificates earned`;
}

/* ══════════════════════════════════════════
   GAME STATE
══════════════════════════════════════════ */
let xpLevel = 74;

function gainXP(el) {
  playXPGain();
  xpLevel = Math.min(100, xpLevel + 4);
  document.getElementById('xp-bar').style.width = xpLevel + '%';
  const rect    = el.getBoundingClientRect();
  const floater = document.createElement('div');
  floater.className   = 'xp-float';
  floater.textContent = '+XP';
  floater.style.left  = (rect.left + rect.width / 2) + 'px';
  floater.style.top   = rect.top + 'px';
  document.body.appendChild(floater);
  setTimeout(() => floater.remove(), 1200);
}

/* ══════════════════════════════════════════
   SCREEN NAVIGATION
══════════════════════════════════════════ */
function startGame() {
  playPressStart();
  document.getElementById('title-screen').classList.remove('active');
  document.getElementById('hud').classList.add('visible');
  document.getElementById('bottom-nav').classList.add('visible');
  document.getElementById('world-screen').classList.add('active');
  updateBottomNav('map');

  const p = PORTFOLIO_CONFIG.profile;
  setTimeout(() => {
    showDialog('SYSTEM', `Welcome, adventurer! You have entered the realm of ${p.name} — ${p.title} & ${p.classTitle}. Explore each zone to uncover the epic journey. Every zone visited grants XP!`);
  }, 600);
}

function backToMap() {
  playBackToMap();
  document.getElementById('panel-screen').classList.remove('active');
  document.getElementById('world-screen').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  updateBottomNav('map');
}

function updateBottomNav(zone) {
  setBgTheme(zone);
  const order = ['map','about','skills','experience','projects','blogs','education','achievements','arcade','contact'];
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const idx  = order.indexOf(zone);
  const btns = document.querySelectorAll('.bnav-btn');
  if (btns[idx]) btns[idx].classList.add('active');
}

/* ══════════════════════════════════════════
   DIALOG
══════════════════════════════════════════ */
function showDialog(name, text) {
  document.getElementById('dialog-name').textContent = name;
  document.getElementById('dialog-text').textContent = text;
  document.getElementById('dialog-box').classList.add('visible');
}
function closeDialog() {
  document.getElementById('dialog-box').classList.remove('visible');
}

/* ══════════════════════════════════════════
   ZONE SYSTEM
══════════════════════════════════════════ */
const ZONE_ORDER = ['about','skills','experience','projects','blogs','education','achievements','arcade','contact'];

const ZONE_NAMES = {
  about:        '👤 CHARACTER',
  skills:       '⚡ SKILLS FORGE',
  experience:   '💼 BATTLE LOG',
  projects:     '🏗 ARTIFACT HALL',
  blogs:        '📜 SCROLL LIBRARY',
  education:    '🎓 ACADEMY',
  achievements: '🏆 TROPHY VAULT',
  arcade:       '🕹 ARCADE',
  contact:      '📡 SIGNAL TOWER'
};

function showZone(zone) {
  playZoneEnter();
  document.getElementById('world-screen').classList.remove('active');
  document.getElementById('panel-screen').classList.add('active');
  document.getElementById('panel-screen').scrollTop = 0;
  updateBottomNav(zone);

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btns = document.querySelectorAll('.nav-btn');
  const idx  = ZONE_ORDER.indexOf(zone);
  if (btns[idx]) btns[idx].classList.add('active');

  const content = document.getElementById('panel-content');
  content.innerHTML = '';

  // Back + Prev/Next bar
  const zIdx    = ZONE_ORDER.indexOf(zone);
  const backBar = document.createElement('div');
  backBar.className = 'back-bar';
  backBar.innerHTML = `
    <button class="back-btn" onclick="backToMap()">◀ BACK TO MAP</button>
    <div class="zone-breadcrumb">WORLD MAP → <span>${ZONE_NAMES[zone] || zone.toUpperCase()}</span></div>
    <div style="margin-left:auto; display:flex; gap:7px;">
      ${zIdx > 0 ? `<button class="back-btn" style="border-color:var(--dim);color:var(--dim);" onclick="showZone('${ZONE_ORDER[zIdx-1]}')">◀ PREV</button>` : ''}
      ${zIdx < ZONE_ORDER.length - 1 ? `<button class="back-btn" style="border-color:var(--green);color:var(--green);" onclick="showZone('${ZONE_ORDER[zIdx+1]}')">NEXT ▶</button>` : ''}
    </div>
  `;
  content.appendChild(backBar);

  const inner = document.createElement('div');
  content.appendChild(inner);

  const renderers = {
    about:        renderAbout,
    skills:       renderSkills,
    experience:   renderExperience,
    projects:     renderProjects,
    blogs:        renderBlogs,
    education:    renderEducation,
    achievements: renderAchievements,
    arcade:       renderArcade,
    contact:      renderContact,
  };
  if (renderers[zone]) renderers[zone](inner);

  if (zone === 'skills') {
    setTimeout(() => {
      document.querySelectorAll('.skill-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    }, 100);
  }
}

/* ══════════════════════════════════════════
   ZONE RENDERERS
══════════════════════════════════════════ */

/* ── ABOUT ─────────────────────────────── */
function renderAbout(el) {
  const p  = PORTFOLIO_CONFIG.profile;
  const gh = LIVE.github;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">👤</span>
      <div class="panel-title">CHARACTER PROFILE</div>
    </div>
    <div style="display:flex; gap:22px; flex-wrap:wrap; margin-bottom:22px;">
      <div style="font-size:88px; filter:drop-shadow(0 0 20px var(--purple)); flex-shrink:0;">${avatarHTML(120)}</div>
      <div style="flex:1; min-width:200px;">
        <div style="font-family:'Orbitron',monospace; font-size:20px; color:var(--gold); margin-bottom:5px;">${p.name}</div>
        <div style="font-size:15px; color:var(--border); margin-bottom:14px;">${p.title} @ ${p.company}</div>
        <div style="font-size:15px; color:var(--text); line-height:1.8;">${p.bio}</div>
      </div>
    </div>
    ${p.openForWork ? `<div class="ofw-pill" style="margin-bottom:18px;"><span class="ofw-dot"></span>OPEN FOR WORK — ${p.status}</div>` : ''}
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-label">CLASS</div><div class="stat-value highlight">${p.title}</div></div>
      <div class="stat-box"><div class="stat-label">GUILD</div><div class="stat-value">${p.company}</div></div>
      <div class="stat-box"><div class="stat-label">REALM</div><div class="stat-value">${p.location}</div></div>
      <div class="stat-box"><div class="stat-label">POWER LEVEL</div><div class="stat-value highlight">${p.level} 🔥</div></div>
      <div class="stat-box">
        <div class="stat-label">🐙 GITHUB REPOS <span style="color:var(--green); font-size:10px;">LIVE</span></div>
        <div class="stat-value highlight" id="ab-repos">${gh ? gh.repos : spinner('...')}</div>
      </div>
    </div>
    <div class="section-label">HERO'S CREED</div>
    <div style="border-left:3px solid var(--purple); padding-left:14px; font-size:16px; color:var(--dim); line-height:1.8; font-style:italic;">
      "${p.creed}"
    </div>
  `;

  if (!gh) {
    retryWhenReady('github', (g) => {
      const r = document.getElementById('ab-repos');
      if (r) r.textContent = g.repos;
    });
  }
}

/* ── SKILLS ─────────────────────────────── */
function starsHTML(n) {
  return `<span class="stars" title="${n} / 5">${'★'.repeat(n)}<span class="stars-off">${'★'.repeat(5 - n)}</span></span>`;
}

function toggleSkillCat(btn) {
  const cat = btn.closest('.skill-cat');
  const open = cat.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  playClick();
}

function renderSkills(el) {
  const cats = PORTFOLIO_CONFIG.skillCategories;
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">⚡</span>
      <div class="panel-title">SKILLS FORGE</div>
    </div>
    <div class="section-label">MASTERED ABILITIES <span style="font-size:12px; color:var(--dim);">— tap ▼ to see star ratings</span></div>
    ${cats.map(cat => {
      const avg = cat.skills.reduce((s, k) => s + k.stars, 0) / cat.skills.length;
      const pct = Math.max(0, Math.min(100, cat.pct ?? Math.round(avg / 5 * 100)));
      return `
        <div class="skill-cat">
          <div class="skill-row" style="margin-bottom:0;">
            <span class="skill-name skill-cat-name">${cat.icon} ${cat.name}</span>
            <div class="skill-bar"><div class="skill-fill" data-pct="${pct}" style="width:0%"></div></div>
            <span class="skill-pct" style="width:44px;">${pct}%</span>
            <button class="skill-toggle" aria-expanded="false" aria-label="Show ${cat.name} skills" onclick="toggleSkillCat(this)">▼</button>
          </div>
          <div class="skill-list">
            ${cat.skills.map(s => `
              <div class="skill-item">
                <span class="skill-item-name">${s.name}</span>
                ${starsHTML(s.stars)}
              </div>`).join('')}
          </div>
        </div>`;
    }).join('')}
  `;
}

/* ── EXPERIENCE ─────────────────────────── */
function renderExperience(el) {
  const exp = PORTFOLIO_CONFIG.experience;
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">💼</span>
      <div class="panel-title">BATTLE LOG</div>
    </div>
    ${PORTFOLIO_CONFIG.profile.openForWork ? `
      <div class="open-for-work">
        <span class="ofw-dot"></span>
        <div>
          <div class="ofw-title">OPEN FOR WORK</div>
          <div class="ofw-sub">${PORTFOLIO_CONFIG.profile.status} — <a href="#" onclick="showZone('contact');return false;">send a message</a></div>
        </div>
      </div>` : ''}
    <div class="section-label">PROFESSIONAL CAMPAIGNS</div>
    ${exp.map(e => `
      <div class="timeline-item">
        <div class="timeline-dot">${e.icon}</div>
        <div class="timeline-body">
          <div class="timeline-title">${e.title}</div>
          <div class="timeline-company">🏰 ${e.company}</div>
          <div class="timeline-date">📅 ${e.date}</div>
          <div class="timeline-desc">${e.desc}</div>
        </div>
      </div>
    `).join('')}
  `;
}

/* ── PROJECTS (config + live GitHub repos) ── */
function renderProjects(el) {
  const projects = PORTFOLIO_CONFIG.projects;
  const gh       = LIVE.github;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">🏗</span>
      <div class="panel-title">ARTIFACT HALL</div>
    </div>
    <div class="section-label">LEGENDARY CREATIONS</div>
    ${projects.map(p => `
      <div class="project-card" ${p.link ? `onclick="window.open('${p.link}','_blank')" style="cursor:pointer;"` : ''}>
        <div class="project-name">${p.name}${p.link ? ' <span style="font-size:11px;color:var(--dim);">↗</span>' : ''}</div>
        <div style="font-size:15px; color:var(--text); line-height:1.6;">${p.desc}</div>
        <div class="project-tags">${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    `).join('')}

    <div class="section-label" style="margin-top:26px;">
      🐙 GITHUB REPOSITORIES
      <span style="color:var(--green); font-size:10px; margin-left:6px;">⚡ LIVE</span>
      <span id="gh-meta" style="font-size:12px; color:var(--dim); margin-left:6px;">
        ${gh ? `${gh.repos} repos` : '⏳ fetching...'}
      </span>
    </div>
    <div id="gh-repo-list">
      ${gh ? buildRepoCards(gh.repoList) : spinner('FETCHING GITHUB REPOS...')}
    </div>
  `;

  if (!gh) {
    retryWhenReady('github', (g) => {
      const list = document.getElementById('gh-repo-list');
      const meta = document.getElementById('gh-meta');
      if (list) list.innerHTML = buildRepoCards(g.repoList);
      if (meta) meta.textContent = `${g.repos} repos`;
    });
  }
}

function buildRepoCards(repos) {
  if (!repos || repos.length === 0) return `<div style="color:var(--dim);font-size:15px;padding:12px;">No public repos found.</div>`;
  return repos.slice(0, 12).map(r => `
    <div class="project-card" onclick="window.open('${r.url}','_blank')" style="cursor:pointer; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div class="project-name" style="font-size:13px;">🐙 ${r.name} <span style="font-size:11px;color:var(--dim);">↗</span></div>
        <div style="display:flex; gap:12px; font-size:13px; color:var(--dim); flex-shrink:0;">
          <span title="Stars">⭐ ${r.stars}</span>
          <span title="Forks">🍴 ${r.forks}</span>
        </div>
      </div>
      <div style="font-size:14px; color:var(--text); margin:5px 0;">${r.description}</div>
      <div style="display:flex; gap:10px; align-items:center; margin-top:7px; flex-wrap:wrap;">
        ${r.language ? `<span class="tag" style="border-color:var(--accent);color:var(--accent);">${r.language}</span>` : ''}
        <span style="font-size:12px; color:var(--dim);">Updated ${r.updated}</span>
      </div>
    </div>
  `).join('');
}

/* ── CERTIFICATIONS (Scroll Library) ───── */
function renderBlogs(el) {
  const certs = PORTFOLIO_CONFIG.certifications;
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">📜</span>
      <div class="panel-title">SCROLL LIBRARY</div>
    </div>
    <div style="font-size:15px; color:var(--dim); margin-bottom:16px;">
      Certifications earned · <span style="color:var(--purple);">${certs.length} scrolls</span>
    </div>
    <div class="section-label">CERTIFIED SCROLLS</div>
    ${certs.map((c, i) => {
      const meta = [c.issuer, c.date].filter(Boolean).join(' · ');
      const inner = `
        <span class="blog-num">#${String(i + 1).padStart(2, '0')}</span>
        <div class="blog-body">
          <div class="blog-title">${c.title}</div>
          <div class="blog-desc">${c.desc}</div>
          ${meta ? `<div class="blog-date">📅 ${meta}</div>` : ''}
        </div>
        ${c.link ? '<span style="color:var(--green); font-size:18px; flex-shrink:0;">↗</span>' : ''}`;
      return c.link
        ? `<a class="blog-card" href="${c.link}" target="_blank">${inner}</a>`
        : `<div class="blog-card" style="cursor:default;">${inner}</div>`;
    }).join('')}
  `;
}

/* ── EDUCATION ──────────────────────────── */
function renderEducation(el) {
  const edu   = PORTFOLIO_CONFIG.education;
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">🎓</span>
      <div class="panel-title">ACADEMY RECORDS</div>
    </div>
    <div class="section-label">KNOWLEDGE SCROLLS</div>
    ${edu.map(e => `
      <div class="timeline-item">
        <div class="timeline-dot">${e.icon}</div>
        <div class="timeline-body">
          <div class="timeline-title">${e.degree}</div>
          <div class="timeline-company">🎓 ${e.school}</div>
          <div class="timeline-date">📅 ${e.year}</div>
          <div class="timeline-desc">${e.desc}</div>
        </div>
      </div>
    `).join('')}
  `;
}

/* ── ACHIEVEMENTS (live stats) ─────────── */
function renderAchievements(el) {
  const badges = PORTFOLIO_CONFIG.achievements;
  const p      = PORTFOLIO_CONFIG.profile;
  const gh     = LIVE.github;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">🏆</span>
      <div class="panel-title">TROPHY VAULT</div>
    </div>
    <div class="section-label">ACHIEVEMENTS UNLOCKED</div>
    <div class="badges-grid">
      ${badges.map(b => `
        <div class="badge">
          <span class="badge-icon">${b.icon}</span>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>
      `).join('')}
    </div>
    <div class="section-label" style="margin-top:26px;">
      HERO STATS
      <span style="color:var(--green); font-size:10px; margin-left:6px;">⚡ LIVE</span>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-label">GRADUATING</div><div class="stat-value highlight">${p.batch}</div></div>
      <div class="stat-box"><div class="stat-label">PROJECTS BUILT</div><div class="stat-value highlight">${p.projectsBuilt}</div></div>
      <div class="stat-box"><div class="stat-label">CERTIFICATIONS</div><div class="stat-value highlight">${p.certCount}</div></div>
      <div class="stat-box"><div class="stat-label">TECH STACK</div><div class="stat-value highlight">${p.techStackSize}</div></div>
      <div class="stat-box">
        <div class="stat-label">🐙 GITHUB REPOS</div>
        <div class="stat-value highlight" id="ac-repos">${gh ? gh.repos : '⏳'}</div>
      </div>
    </div>
  `;

  if (!gh) retryWhenReady('github', (g) => {
    const r = document.getElementById('ac-repos');
    if (r) r.textContent = g.repos;
  });
}

/* ── ARCADE: BUG HUNTER ─────────────────── */
/* Catch falling code (</>, { }, ⭐), dodge the bugs (🐛). 3 lives. */
const BH = { W: 360, H: 480, token: 0, listeners: false, keys: { left: false, right: false }, best: 0 };

function bhTone(f1, f2, dur, type) {
  try {
    if (!AUDIO.sfxOn || !AUDIO.ctx) return;
    const t = AUDIO.ctx.currentTime, o = AUDIO.ctx.createOscillator(), g = AUDIO.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(AUDIO.sfxGain);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}

function renderArcade(el) {
  try { BH.best = parseInt(localStorage.getItem('bughunter-best') || '0', 10) || 0; } catch (e) {}
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">🕹</span>
      <div class="panel-title">ARCADE</div>
    </div>
    <div style="font-size:15px; color:var(--dim); margin-bottom:12px;">
      <span style="color:var(--gold);">BUG HUNTER</span> — catch the code <span style="color:var(--green);">&lt;/&gt;</span> and stars <span style="color:var(--gold);">★</span>, dodge the bugs 🐛 — you have 3 lives!
    </div>
    <div class="game-wrap">
      <canvas id="game-canvas" class="game-canvas"></canvas>
      <div class="game-pad">
        <button class="game-btn" id="gp-left"  aria-label="Move left">◀</button>
        <button class="game-btn" id="gp-right" aria-label="Move right">▶</button>
      </div>
      <div class="game-help">← → or A / D to move · drag on touch screens · SPACE to start</div>
    </div>
  `;
  bhStart(el.querySelector('#game-canvas'));
}

function bhStart(cv) {
  const token = ++BH.token;
  // Big-screen layout: wide 960x620 playfield on desktops/tablets, portrait 360x480 on phones.
  // The game world is drawn in "world units" (canvas px / S) so sizes and speeds stay the same in both.
  const wide = window.innerWidth >= 700;
  const CW = wide ? 960 : 360, CH = wide ? 620 : 480, S = wide ? 1.6 : 1;
  BH.W = CW / S; BH.H = CH / S;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = CW * dpr; cv.height = CH * dpr;
  cv.style.setProperty('--ar', (CW / CH).toFixed(4));
  const g = cv.getContext('2d');
  g.scale(dpr * S, dpr * S);

  const p = PORTFOLIO_CONFIG.profile;
  const img = new Image();
  const isImg = p.avatar && (p.avatar.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(p.avatar));
  if (isImg) img.src = p.avatar;

  const G = { state: 'ready', score: 0, lives: 3, time: 0, items: [], spawn: 0.6, px: BH.W / 2, flash: 0, shake: 0, pops: [], last: 0 };
  const PW = 52, PH = 52, PY = BH.H - 66;
  BH.G = G; BH.cv = cv;

  function reset() {
    Object.assign(G, { state: 'playing', score: 0, lives: 3, time: 0, items: [], spawn: 0.6, px: BH.W / 2, flash: 0, shake: 0, pops: [] });
  }

  function spawn() {
    const level = Math.floor(G.time / 12);
    const r = Math.random();
    const bugChance = Math.min(0.5, 0.28 + level * 0.03);
    let type = 'code';
    if (r < bugChance) type = 'bug'; else if (r > 0.92) type = 'star';
    const glyphs = ['</>', '{ }', '01', 'fn', '()'];
    G.items.push({
      type, x: 24 + Math.random() * (BH.W - 48), y: -20,
      vy: 110 + level * 22 + Math.random() * 40,
      glyph: type === 'code' ? glyphs[Math.floor(Math.random() * glyphs.length)] : '', wob: Math.random() * 6.28,
    });
  }

  function endGame() {
    G.state = 'over';
    if (G.score > BH.best) {
      BH.best = G.score;
      try { localStorage.setItem('bughunter-best', String(BH.best)); } catch (e) {}
    }
    bhTone(300, 60, 0.5, 'sawtooth');
  }

  function update(dt) {
    if (G.state !== 'playing') return;
    G.time += dt;
    const sp = 260;
    if (BH.keys.left)  G.px -= sp * dt;
    if (BH.keys.right) G.px += sp * dt;
    G.px = Math.max(PW / 2, Math.min(BH.W - PW / 2, G.px));

    G.spawn -= dt;
    if (G.spawn <= 0) { spawn(); G.spawn = Math.max(0.32, 0.85 - G.time * 0.008) * (0.8 + Math.random() * 0.4); }

    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      it.y += it.vy * dt;
      it.x += Math.sin(G.time * 3 + it.wob) * 14 * dt;
      const hit = Math.abs(it.x - G.px) < (PW / 2 + 10) && Math.abs(it.y - (PY + PH / 2)) < (PH / 2 + 8);
      if (hit) {
        G.items.splice(i, 1);
        if (it.type === 'bug') {
          G.lives--; G.flash = 0.35; G.shake = 0.25;
          G.pops.push({ x: G.px, y: PY, t: 0, text: '-1 ♥', color: '#ff5470' });
          bhTone(220, 70, 0.25, 'sawtooth');
          if (G.lives <= 0) endGame();
        } else {
          const pts = it.type === 'star' ? 25 : 10;
          G.score += pts;
          G.pops.push({ x: it.x, y: it.y, t: 0, text: '+' + pts, color: it.type === 'star' ? '#ffd700' : '#00ff88' });
          bhTone(it.type === 'star' ? 880 : 620, it.type === 'star' ? 1500 : 900, 0.12, 'square');
        }
      } else if (it.y > BH.H + 30) {
        G.items.splice(i, 1);
      }
    }
    for (let i = G.pops.length - 1; i >= 0; i--) { G.pops[i].t += dt; G.pops[i].y -= 40 * dt; if (G.pops[i].t > 0.7) G.pops.splice(i, 1); }
    if (G.flash > 0) G.flash -= dt;
    if (G.shake > 0) G.shake -= dt;
  }

  function text(s, x, y, size, color, align, font) {
    g.font = `${size}px ${font || '"Press Start 2P", monospace'}`;
    g.fillStyle = color; g.textAlign = align || 'center'; g.fillText(s, x, y);
  }

  function draw() {
    g.save();
    if (G.shake > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    g.clearRect(-10, -10, BH.W + 20, BH.H + 20);
    g.fillStyle = 'rgba(7,11,29,0.92)'; g.fillRect(0, 0, BH.W, BH.H);
    g.strokeStyle = 'rgba(0,229,255,0.07)'; g.lineWidth = 1;
    for (let x = 0; x < BH.W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, BH.H); g.stroke(); }
    for (let y = ((G.time * 40) % 30); y < BH.H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(BH.W, y); g.stroke(); }

    // items
    g.textBaseline = 'middle';
    for (const it of G.items) {
      if (it.type === 'bug')       text('🐛', it.x, it.y, 28, '#fff', 'center', 'sans-serif');
      else if (it.type === 'star') text('★', it.x, it.y, 30, '#ffd700', 'center', 'sans-serif');
      else                         text(it.glyph, it.x, it.y, 26, '#00ff88', 'center', '"VT323", monospace');
    }

    // player
    g.imageSmoothingEnabled = false;
    if (isImg && img.complete && img.naturalWidth) g.drawImage(img, G.px - PW / 2, PY, PW, PH);
    else text(p.avatar || '🧙', G.px, PY + PH / 2, 40, '#fff', 'center', 'sans-serif');

    // floating +points
    for (const pop of G.pops) { g.globalAlpha = Math.max(0, 1 - pop.t / 0.7); text(pop.text, pop.x, pop.y, 10, pop.color); g.globalAlpha = 1; }

    // HUD
    g.textBaseline = 'alphabetic';
    text('SCORE ' + G.score, 10, 22, 10, '#ffd700', 'left');
    text('BEST ' + BH.best, BH.W - 10, 22, 10, '#00e5ff', 'right');
    text('♥'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, 3 - G.lives)), BH.W / 2, 44, 12, '#ff5470');

    if (G.flash > 0) { g.fillStyle = `rgba(255,84,112,${G.flash})`; g.fillRect(0, 0, BH.W, BH.H); }

    if (G.state !== 'playing') {
      g.fillStyle = 'rgba(6,13,31,0.78)'; g.fillRect(0, 0, BH.W, BH.H);
      if (G.state === 'ready') {
        text('BUG HUNTER', BH.W / 2, 190, 20, '#ffd700');
        text('PRESS SPACE OR TAP', BH.W / 2, 250, 10, '#00e5ff');
        text('TO START', BH.W / 2, 272, 10, '#00e5ff');
      } else {
        text('GAME OVER', BH.W / 2, 170, 20, '#ff5470');
        text('SCORE ' + G.score, BH.W / 2, 225, 12, '#ffd700');
        text(G.score >= BH.best && G.score > 0 ? 'NEW BEST!' : 'BEST ' + BH.best, BH.W / 2, 250, 10, '#00ff88');
        text('SPACE OR TAP', BH.W / 2, 305, 10, '#00e5ff');
        text('TO PLAY AGAIN', BH.W / 2, 327, 10, '#00e5ff');
      }
    }
    g.restore();
  }

  function frame(ts) {
    if (token !== BH.token || !cv.isConnected) return;       // zone changed → stop the loop
    const dt = Math.min(0.05, (ts - (G.last || ts)) / 1000);
    G.last = ts;
    update(dt); draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ── input ──
  const begin = () => { if (G.state !== 'playing') { reset(); playClick(); } };
  const moveTo = (clientX) => { const r = cv.getBoundingClientRect(); G.px = ((clientX - r.left) / r.width) * BH.W; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e) => { if (G.state !== 'playing') begin(); else moveTo(e.clientX); });
  cv.addEventListener('pointermove', (e) => { if (G.state === 'playing' && (e.pointerType === 'touch' || e.buttons)) moveTo(e.clientX); });
  const hold = (id, dir, on) => {
    const b = document.getElementById(id); if (!b) return;
    const set = (v) => (e) => { e.preventDefault(); BH.keys[dir] = v; if (v && G.state !== 'playing') begin(); };
    b.addEventListener('pointerdown', set(true)); b.addEventListener('pointerup', set(false));
    b.addEventListener('pointerleave', set(false)); b.addEventListener('pointercancel', set(false));
  };
  hold('gp-left', 'left'); hold('gp-right', 'right');

  if (!BH.listeners) {
    BH.listeners = true;
    const keyHandler = (down) => (e) => {
      if (!BH.cv || !BH.cv.isConnected) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a')  { BH.keys.left  = down; e.preventDefault(); }
      if (k === 'arrowright' || k === 'd') { BH.keys.right = down; e.preventDefault(); }
      if (down && (k === ' ' || k === 'enter') && BH.G && BH.G.state !== 'playing') { e.preventDefault(); BH.G.begin && BH.G.begin(); }
    };
    window.addEventListener('keydown', keyHandler(true));
    window.addEventListener('keyup', keyHandler(false));
  }
  G.begin = begin;
  BH.keys.left = BH.keys.right = false;
}

/* ── CONTACT ────────────────────────────── */
function renderContact(el) {
  const c  = PORTFOLIO_CONFIG.contact;
  const p  = PORTFOLIO_CONFIG.profile;
  const gh = LIVE.github;
  const ghUser = c.github ? c.github.split('/').filter(Boolean).pop() : '';

  const links = [
    c.linkedin ? { href: c.linkedin, icon: '💼', label: 'LinkedIn', value: (c.linkedin.split('/in/')[1] || 'View Profile').replace(/\/$/, '') } : null,
    c.github   ? { href: c.github,   icon: '🐙', label: 'GitHub',   value: gh ? `@${ghUser} · ${gh.repos} repos` : '⏳ loading...', id: 'ct-github' } : null,
    c.email    ? { href: `mailto:${c.email}`, icon: '✉️', label: 'Email', value: c.email } : null,
    c.instagram ? { href: c.instagram, icon: '📸', label: 'Instagram', value: '@' + c.instagram.split('/').filter(Boolean).pop() } : null,
    c.facebook  ? { href: c.facebook,  icon: '📘', label: 'Facebook',  value: c.facebook.split('/').filter(Boolean).pop() } : null,
    c.discord   ? { href: c.discord,   icon: '💬', label: 'Discord',   value: 'Message me on Discord' } : null,
    c.twitter  ? { href: c.twitter,  icon: '🐦', label: 'X / Twitter', value: '@' + c.twitter.split('/').filter(Boolean).pop() } : null,
    c.website  ? { href: c.website,  icon: '🌐', label: 'Website',  value: c.website.replace(/^https?:\/\//, '') } : null,
  ].filter(Boolean);

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">📡</span>
      <div class="panel-title">SIGNAL TOWER</div>
    </div>
    <div class="section-label">REACH THE HERO</div>
    <div class="contact-grid">
      ${links.map(l => `
        <a class="contact-item" href="${l.href}" target="_blank">
          <span class="contact-icon">${l.icon}</span>
          <div style="min-width:0;">
            <div class="contact-label">${l.label}</div>
            <div class="contact-value" ${l.id ? `id="${l.id}"` : ''}>${l.value}</div>
          </div>
        </a>
      `).join('')}
    </div>
    <div class="section-label" style="margin-top:26px;">STATUS</div>
    <div style="display:flex; align-items:center; gap:10px; font-size:16px; margin-bottom:22px;">
      <span style="color:var(--green); font-size:20px;">●</span>
      <span style="color:var(--text);">${p.status} — Reach out to begin the quest together!</span>
    </div>
    <div style="background:var(--panel); border:1px solid var(--dim); padding:18px;">
      <div class="section-label" style="margin-top:0">LEAVE A MESSAGE</div>
      <div id="form-feedback" style="display:none; margin-bottom:10px; font-size:15px;"></div>
      <input id="msg-name"  type="text"  placeholder="Your Name..."           style="width:100%;background:#0a0a1a;border:1px solid var(--dim);color:var(--text);padding:9px;font-family:'VT323',monospace;font-size:16px;margin-bottom:9px;outline:none;display:block;">
      <input id="msg-email" type="email" placeholder="Your Email..."           style="width:100%;background:#0a0a1a;border:1px solid var(--dim);color:var(--text);padding:9px;font-family:'VT323',monospace;font-size:16px;margin-bottom:9px;outline:none;display:block;">
      <textarea id="msg-body" placeholder="Your message to the hero..."        style="width:100%;background:#0a0a1a;border:1px solid var(--dim);color:var(--text);padding:9px;font-family:'VT323',monospace;font-size:16px;height:75px;resize:none;outline:none;display:block;margin-bottom:9px;"></textarea>
      <button id="msg-btn" onclick="sendMessage()" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:9px 18px;background:transparent;border:2px solid var(--green);color:var(--green);cursor:pointer;">▶ SEND MESSAGE</button>
    </div>
  `;

  if (!gh) retryWhenReady('github', (g) => {
    const el = document.getElementById('ct-github');
    if (el) el.textContent = `@${ghUser} · ${g.repos} repos`;
  });
}

function sendMessage() {
  const name  = document.getElementById('msg-name')?.value.trim();
  const email = document.getElementById('msg-email')?.value.trim();
  const body  = document.getElementById('msg-body')?.value.trim();
  const btn   = document.getElementById('msg-btn');
  const fb    = document.getElementById('form-feedback');

  // Validate
  if (!name || !email || !body) {
    showDialog('SYSTEM', 'Please fill in your name, email and message before sending!');
    return;
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    showDialog('SYSTEM', 'Please enter a valid email address!');
    return;
  }

  // Read formspree URL from config
  const formUrl = PORTFOLIO_CONFIG.contact.formspreeUrl;
  if (!formUrl) {
    showDialog('SYSTEM', 'The contact form is not set up yet. Please reach out via the links above!');
    return;
  }

  // Disable button & show sending state
  btn.textContent    = '⏳ SENDING...';
  btn.style.opacity  = '0.6';
  btn.disabled       = true;

  fetch(formUrl, {
    method:  'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, message: body })
  })
  .then(res => {
    if (res.ok) {
      // Success
      document.getElementById('msg-name').value  = '';
      document.getElementById('msg-email').value = '';
      document.getElementById('msg-body').value  = '';
      btn.textContent   = '✅ SENT!';
      btn.style.borderColor = 'var(--green)';
      showDialog('SYSTEM', 'Message delivered! The hero will respond to your email shortly. +50 XP awarded for making contact!');
      setTimeout(() => {
        btn.textContent   = '▶ SEND MESSAGE';
        btn.style.opacity = '1';
        btn.disabled      = false;
      }, 3000);
    } else {
      return res.json().then(data => { throw new Error(data?.errors?.[0]?.message || 'Send failed'); });
    }
  })
  .catch(err => {
    btn.textContent   = '▶ SEND MESSAGE';
    btn.style.opacity = '1';
    btn.disabled      = false;
    showDialog('SYSTEM', '⚠️ Message failed to send. Please use the links above to reach out directly!');
    console.error('Formspree error:', err);
  });
}

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
bootFromConfig();