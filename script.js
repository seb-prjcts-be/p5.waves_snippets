/* p5.waves visual vocabulary: uses real Waves.wave / createSampler / createGrid (v3.2.6) */

const palette = {
  ink: "#111213",
  inkSoft: "#2a2c30",
  muted: "#6a6f78",
  line: "#d9dadc",
  paper: "#f4f4f3",
  panel: "#ffffff",
  pink: "#f9b7c4",
  peach: "#f6a796",
  sky: "#b8d2ff",
  mint: "#c7e89c",
  lemon: "#f3e679",
  lilac: "#c8c3f1"
};

const PRIMITIVES = {
  wave: "Waves.wave()",
  sampler: "Waves.createSampler()",
  grid: "Waves.createGrid()"
};

const ACCENT = [palette.pink, palette.peach, palette.sky, palette.mint, palette.lemon, palette.lilac];

/* ---------- canvas helpers ---------- */

function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function clear(ctx, w, h, color = palette.paper) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function gridGuide(ctx, w, h, step = 28, alpha = 0.06) {
  ctx.strokeStyle = `rgba(17, 18, 19, ${alpha})`;
  ctx.lineWidth = 1;
  for (let x = step; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function label(ctx, text, x, y, color = palette.ink, size = 12, weight = 600) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Oswald, Inter, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function norm(v) { return (v + 1) * 0.5; } // -1..1 -> 0..1

/* ---------- hero canvas: stacked pastel wave bands ---------- */

function bootHero() {
  const canvas = document.querySelector("#heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const bands = [
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 4, shiftDuration: 1.8, group: "gentle", range: [-1, 1] }), color: palette.peach, alpha: 0.55, freq: 0.0035, speed: 0.32, baseY: 0.32, amp: 0.18 },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 3, shiftDuration: 1.5, group: "gentle", range: [-1, 1] }), color: palette.pink,  alpha: 0.55, freq: 0.0045, speed: 0.38, baseY: 0.48, amp: 0.22 },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 5, shiftDuration: 2.0, group: "gentle", range: [-1, 1] }), color: palette.sky,   alpha: 0.6,  freq: 0.003,  speed: 0.28, baseY: 0.66, amp: 0.2  },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 6, shiftDuration: 2.2, group: "gentle", range: [-1, 1] }), color: palette.lemon, alpha: 0.5,  freq: 0.005,  speed: 0.42, baseY: 0.82, amp: 0.14 }
  ];

  function frame(time) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const t = time * 0.001;
    bands.forEach(band => {
      const baseY = rect.height * band.baseY;
      const amp = rect.height * band.amp;
      ctx.beginPath();
      ctx.moveTo(0, rect.height);
      for (let x = 0; x <= rect.width; x += 4) {
        const v = band.sampler.sample(x * band.freq, t * band.speed);
        ctx.lineTo(x, baseY + v * amp);
      }
      ctx.lineTo(rect.width, rect.height);
      ctx.closePath();
      ctx.fillStyle = band.color;
      ctx.globalAlpha = band.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- function-switcher render modes ----------
 * Four totally different graphic jobs: wave curve, typography, meter,
 * dot grid. The shift is the trigger; each completed shift advances to
 * the next mode. The wave name doesn't pick the mode, the schedule does.
 */

function modeCurve(ctx, w, h, t, s) {
  // Draws the live active wave from the sampler
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const v = s.sample(x * 0.02, t);
    const y = h * 0.5 + v * h * 0.32;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function modeType(ctx, w, h, t, s) {
  // Typographic display of the current wave name
  const fontSize = Math.min(54, w * 0.1);
  ctx.fillStyle = palette.ink;
  ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s.waveName.toUpperCase(), w * 0.5, h * 0.5);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.peach;
  ctx.fillRect(w * 0.2, h * 0.72, w * 0.6, 4);
}

function modeMeter(ctx, w, h, t, s) {
  // Radial reading driven by the wave value
  const cx = w * 0.5;
  const cy = h * 0.5;
  const r = Math.min(w, h) * 0.3;
  const v = (s.sample(0, t) + 1) * 0.5;
  ctx.lineWidth = 16;
  ctx.strokeStyle = palette.line;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = palette.mint;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.font = "600 30px Oswald, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(v * 100)}%`, cx, cy);
  ctx.textAlign = "left";
}

function modeGrid(ctx, w, h, t, s) {
  // Wave-driven dot grid: radius leaves visible whitespace
  const cols = 14;
  const rows = 6;
  const cw = w / cols;
  const ch = h / rows;
  const maxR = Math.min(cw, ch) * 0.32;
  ctx.fillStyle = palette.ink;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = (s.sample(c * 0.4 + r * 0.6, t) + 1) * 0.5;
      const rad = Math.max(1.5, v * maxR);
      ctx.beginPath();
      ctx.arc(c * cw + cw / 2, r * ch + ch / 2, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const SWITCHER_MODES = [
  { label: "CURVE",  render: modeCurve },
  { label: "TYPE",   render: modeType },
  { label: "METER",  render: modeMeter },
  { label: "GRID",   render: modeGrid }
];

/* ---------- module definitions ----------
 * Each module declares:
 *  - id, name, category, role, tags, primitive, reuse, notes
 *  - state? : per-card mutable storage (samplers, grids cached here)
 *  - draw(ctx, w, h, t, state) : called every frame for visible cards
 *  - sketch : runnable p5 sketch string (copy-paste into editor.p5js.org)
 */

const modules = [
  {
    id: "drifting-label",
    name: "Drifting Label",
    category: "motion",
    role: "meta sine drifts the label unevenly: amplitude varies over time, so the offset never quite repeats.",
    tags: ["label", "position", "meta sine"],
    primitive: PRIMITIVES.wave,
    reuse: "captions",
    notes: "meta sine is a sine whose amplitude is itself modulated: the label drifts and breathes at the same time. Plain sin() would feel mechanical.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      gridGuide(ctx, w, h);
      const v = Waves.wave(0, { wave: "meta sine", t: t * 1.0, amplitude: 1 });
      const baseX = w * 0.5;
      const y = h * 0.55;
      const x = baseX + v * w * 0.2;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(baseX, y + 22); ctx.lineTo(x, y + 22); ctx.stroke();
      ctx.fillStyle = palette.peach;
      ctx.fillRect(baseX - 3, y - 32, 6, 64);
      ctx.fillStyle = palette.panel;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - 58, y - 18, 116, 36);
      ctx.strokeRect(x - 58, y - 18, 116, 36);
      label(ctx, "sample point", x - 46, y + 1, palette.ink, 13);
    },
    sketch: sketchTemplate(`
let baseX, y;
function setup() {
  createCanvas(620, 320);
  textFont('sans-serif');
  baseX = width / 2;
  y = height / 2;
}
function draw() {
  background(244);
  const t = millis() / 1000;
  const v = Waves.wave(0, { wave: 'meta sine', t: t * 1.0, amplitude: 1 });
  const x = baseX + v * width * 0.2;
  stroke(0); strokeWeight(1.5);
  line(baseX, y + 22, x, y + 22);
  noStroke(); fill(246, 167, 150);
  rect(baseX - 3, y - 32, 6, 64);
  fill(255); stroke(0);
  rect(x - 58, y - 18, 116, 36);
  noStroke(); fill(0);
  textSize(13); textAlign(LEFT, CENTER);
  text('sample point', x - 46, y);
}`)
  },

  {
    id: "breathing-title",
    name: "Breathing Title",
    category: "type",
    role: "The wave opens and closes letter spacing without changing the words.",
    tags: ["spacing", "headline"],
    primitive: PRIMITIVES.wave,
    reuse: "section titles",
    notes: "A compact way to animate hierarchy in titles, section markers, and display typography.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "bumpy sine", t: t * 0.8, amplitude: 1 }));
      const tracking = lerp(2, 22, v);
      const letters = "SIGNAL".split("");
      const fontSize = Math.min(64, w * 0.13);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = letters.map(l => ctx.measureText(l).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      letters.forEach((l, i) => {
        ctx.fillStyle = palette.ink;
        ctx.fillText(l, x, y);
        x += widths[i] + tracking;
      });
      ctx.fillStyle = palette.pink;
      ctx.fillRect(w * 0.16, y + fontSize * 0.65, w * 0.68 * v, 6);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'bumpy sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const tracking = map(v, 0, 1, 2, 22);
  const letters = 'SIGNAL'.split('');
  const fs = min(64, width * 0.13);
  textSize(fs); textAlign(LEFT, CENTER); fill(0);
  const widths = letters.map(l => textWidth(l));
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
  let x = (width - total) / 2;
  for (let i = 0; i < letters.length; i++) {
    text(letters[i], x, height / 2);
    x += widths[i] + tracking;
  }
  noStroke(); fill(249, 183, 196);
  rect(width * 0.16, height / 2 + fs * 0.65, width * 0.68 * v, 6);
}`)
  },

  {
    id: "interference-grid",
    name: "Interference Grid",
    category: "grid",
    role: "createGrid sums a row-wave and a col-wave: same frequency, different phase, interference.",
    tags: ["createGrid", "moire"],
    primitive: PRIMITIVES.grid,
    reuse: "matrix backgrounds",
    notes: "createGrid does the heavy lifting: one call fills a typed array of (waveRow + waveCol) values.",
    state: { grid: null, cols: 28, rows: 14, t: 0 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.grid) {
        state.grid = Waves.createGrid(state.cols, state.rows, {
          waveRow: "classic sine",
          waveCol: "classic sine",
          range: [0, 1],
          speed: 0.4
        });
      }
      const cells = state.grid.sample(t * 0.8);
      const cw = w / state.cols;
      const ch = h / state.rows;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const v = cells[r * state.cols + c];
          const a = Math.pow(v, 1.5);
          ctx.fillStyle = `rgba(17, 18, 19, ${a})`;
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
    },
    sketch: sketchTemplate(`
let g;
const COLS = 28, ROWS = 14;
function setup() {
  createCanvas(620, 320);
  noStroke();
  g = Waves.createGrid(COLS, ROWS, {
    waveRow: 'classic sine',
    waveCol: 'classic sine',
    range: [0, 1],
    speed: 0.4
  });
}
function draw() {
  background(244);
  const cells = g.sample(millis() / 1000 * 0.8);
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = pow(cells[r * COLS + c], 1.5);
      fill(17, 18, 19, v * 255);
      rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
    }
  }
}`)
  },

  {
    id: "threshold-field",
    name: "Threshold Field",
    category: "grid",
    role: "A binary grid: cells flip on when waveRow + waveCol crosses the threshold.",
    tags: ["createGrid", "threshold", "binary"],
    primitive: PRIMITIVES.grid,
    reuse: "matrix backgrounds",
    notes: "createGrid with threshold returns a Uint8Array of 0/1: perfect for monochrome patterns.",
    state: { grid: null, cols: 22, rows: 10, t: 0 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.grid) {
        state.grid = Waves.createGrid(state.cols, state.rows, {
          waveRow: "triangle",
          waveCol: "classic sine",
          threshold: 0,
          speed: 0.5
        });
      }
      const cells = state.grid.sample(t * 1.0);
      const gap = 4;
      const cw = (w - gap * (state.cols + 1)) / state.cols;
      const ch = (h - gap * (state.rows + 1)) / state.rows;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const v = cells[r * state.cols + c];
          ctx.fillStyle = v === 1 ? palette.ink : "#d2d6d9";
          ctx.fillRect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
        }
      }
    },
    sketch: sketchTemplate(`
let g;
const COLS = 22, ROWS = 10;
function setup() {
  createCanvas(620, 320);
  noStroke();
  g = Waves.createGrid(COLS, ROWS, {
    waveRow: 'triangle',
    waveCol: 'classic sine',
    threshold: 0,
    speed: 0.5
  });
}
function draw() {
  background(244);
  const cells = g.sample(millis() / 1000 * 1.0);
  const gap = 4;
  const cw = (width - gap * (COLS + 1)) / COLS;
  const ch = (height - gap * (ROWS + 1)) / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      fill(cells[r * COLS + c] === 1 ? 0 : 210);
      rect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
    }
  }
}`)
  },

  {
    id: "signal-palette",
    name: "Signal Palette",
    category: "color",
    role: "stepped sine snaps between swatches: the picker rests on each one before jumping.",
    tags: ["swatch", "emphasis", "stepped sine"],
    primitive: PRIMITIVES.wave,
    reuse: "emphasis swatches",
    notes: "stepped sine is a sine quantised into 8 steps: it hesitates on each value, ideal for picking from a list without floor() trickery.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const swatches = ACCENT;
      const v = norm(Waves.wave(0, { wave: "stepped sine", t: t * 0.8, amplitude: 1 }));
      const active = clamp(Math.floor(v * swatches.length), 0, swatches.length - 1);
      const sw = w / swatches.length;
      swatches.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = i === active ? 1 : 0.32;
        ctx.fillRect(i * sw, h * 0.18, sw, h * 0.6);
        ctx.globalAlpha = 1;
        if (i === active) {
          ctx.strokeStyle = palette.ink;
          ctx.lineWidth = 2;
          ctx.strokeRect(i * sw + 5, h * 0.18 + 5, sw - 10, h * 0.6 - 10);
        }
      });
      label(ctx, `value ${v.toFixed(2)}`, 14, h - 18, palette.ink, 12);
    },
    sketch: sketchTemplate(`
const swatches = ['#f9b7c4', '#f6a796', '#b8d2ff', '#c7e89c', '#f3e679', '#c8c3f1'];
function setup() { createCanvas(620, 320); noStroke(); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'stepped sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const active = constrain(floor(v * swatches.length), 0, swatches.length - 1);
  const sw = width / swatches.length;
  for (let i = 0; i < swatches.length; i++) {
    fill(swatches[i] + (i === active ? '' : '55'));
    rect(i * sw, height * 0.18, sw, height * 0.6);
    if (i === active) {
      noFill(); stroke(0); strokeWeight(2);
      rect(i * sw + 5, height * 0.18 + 5, sw - 10, height * 0.6 - 10);
      noStroke();
    }
  }
  fill(0); textSize(12); text('value ' + nf(v, 1, 2), 14, height - 14);
}`)
  },

  {
    id: "pressure-hatch",
    name: "Pressure Hatch",
    category: "texture",
    role: "Wave amplitude becomes spacing and bend in a reusable hatch texture.",
    tags: ["hatch", "print"],
    primitive: PRIMITIVES.wave,
    reuse: "print textures",
    notes: "A small texture module that can become a mask, poster field, or exportable tile.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.paper);
      const pressure = Waves.wave(0, { wave: "triangle", t: t * 0.8, amplitude: 1 });
      const gap = lerp(20, 7, norm(pressure));
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.3;
      for (let x = -w; x < w * 2; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.quadraticCurveTo(x + pressure * 30, h * 0.5, x - pressure * 22, h + 10);
        ctx.stroke();
      }
      ctx.fillStyle = palette.peach;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(w * 0.12, h * 0.2, w * 0.18, h * 0.6);
      ctx.globalAlpha = 1;
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(244);
  const t = millis() / 1000;
  const p = Waves.wave(0, { wave: 'triangle', t: t * 0.8, amplitude: 1 });
  const gap = map(p, -1, 1, 20, 7);
  stroke(0); strokeWeight(1.3); noFill();
  for (let x = -width; x < width * 2; x += gap) {
    bezier(x, -10, x + p * 30, height / 2, x + p * 30, height / 2, x - p * 22, height + 10);
  }
  noStroke(); fill(246, 167, 150, 230);
  rect(width * 0.12, height * 0.2, width * 0.18, height * 0.6);
}`)
  },

  {
    id: "live-loader",
    name: "Live Loader",
    category: "interface",
    role: "fuzzy peak sine reads as 'working, not stuck': a loader that hesitates the way real systems do.",
    tags: ["loading", "progress", "fuzzy peak sine"],
    primitive: PRIMITIVES.wave,
    reuse: "waiting states",
    notes: "fuzzy peak sine = sine with modulo-noise. The bar advances unevenly: far more honest than a clean ramp for indeterminate progress.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "fuzzy peak sine", t: t * 0.8, amplitude: 1 }));
      const x = w * 0.14;
      const y = h * 0.48;
      const trackW = w * 0.72;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, trackW, 18);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(x + 3, y + 3, Math.max(2, (trackW - 6) * v), 12);
      label(ctx, "syncing visual index", x, y - 22, palette.ink, 12);
      label(ctx, `${Math.round(v * 100)}%`, x + trackW - 38, y + 42, palette.muted, 11);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'fuzzy peak sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const x = width * 0.14, y = height * 0.48, trackW = width * 0.72;
  noFill(); stroke(0); strokeWeight(1.5);
  rect(x, y, trackW, 18);
  noStroke(); fill(0);
  rect(x + 3, y + 3, max(2, (trackW - 6) * v), 12);
  textSize(12); text('syncing visual index', x, y - 14);
  fill(120); text(round(v * 100) + '%', x + trackW - 38, y + 46);
}`)
  },

  {
    id: "wave-shift-readout",
    name: "Wave Shift Readout",
    category: "state",
    role: "Real sampler exposes waveName, targetName, mix: readable as a tool state.",
    tags: ["sampler", "shift"],
    primitive: PRIMITIVES.sampler,
    reuse: "tool readouts",
    notes: "These getters are live: drop them into any UI to show which wave is active and where it's heading.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({
          shift: true,
          shiftInterval: 3,
          shiftDuration: 1.2,
          group: "gentle",
          amplitude: 1
        });
      }
      state.sampler.sample(0, t);
      const s = state.sampler;
      ctx.fillStyle = palette.paper;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.08, h * 0.18, w * 0.84, h * 0.64);
      label(ctx, "ACTIVE", w * 0.12, h * 0.3, palette.muted, 11);
      label(ctx, s.waveName, w * 0.12, h * 0.43, palette.ink, 22, 600);
      label(ctx, "TARGET", w * 0.12, h * 0.6, palette.muted, 11);
      label(ctx, s.targetName, w * 0.12, h * 0.73, palette.ink, 18, 500);
      const barX = w * 0.5;
      const barW = w * 0.36;
      ctx.fillStyle = palette.line;
      ctx.fillRect(barX, h * 0.7, barW, 8);
      ctx.fillStyle = s.shifting ? palette.peach : palette.mint;
      ctx.fillRect(barX, h * 0.7, barW * (s.mix || 0), 8);
      label(ctx, `mix ${(s.mix || 0).toFixed(2)}`, barX, h * 0.62, palette.ink, 12);
      label(ctx, s.shifting ? "SHIFTING" : "HELD", w * 0.78, h * 0.3, s.shifting ? palette.ink : palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320);
  textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: 'gentle' });
}
function draw() {
  background(255);
  const t = millis() / 1000;
  s.sample(0, t);
  noFill(); stroke(0); rect(width * 0.08, height * 0.18, width * 0.84, height * 0.64);
  fill(120); noStroke(); textSize(11); text('ACTIVE', width * 0.12, height * 0.3);
  fill(0); textSize(22); text(s.waveName, width * 0.12, height * 0.43);
  fill(120); textSize(11); text('TARGET', width * 0.12, height * 0.6);
  fill(0); textSize(18); text(s.targetName, width * 0.12, height * 0.73);
  const bx = width * 0.5, bw = width * 0.36;
  fill(220); rect(bx, height * 0.7, bw, 8);
  fill(s.shifting ? '#f6a796' : '#c7e89c'); rect(bx, height * 0.7, bw * (s.mix || 0), 8);
  fill(0); textSize(12); text('mix ' + nf(s.mix || 0, 1, 2), bx, height * 0.62);
}`)
  },

  {
    id: "wave-roster",
    name: "Wave Roster",
    category: "state",
    role: "Display the active wave name in display type and let the shift speak for itself.",
    tags: ["sampler", "shift", "name"],
    primitive: PRIMITIVES.sampler,
    reuse: "live labels",
    notes: "Shift gives you a slow stream of changing wave names: a typographic showcase of the 34 formulas.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: "all" });
      }
      state.sampler.sample(0, t);
      const s = state.sampler;
      const fontSize = Math.min(46, w * 0.085);
      ctx.fillStyle = palette.ink;
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(s.waveName.toUpperCase(), w * 0.08, h * 0.45);
      const next = s.shifting ? `→ ${s.targetName}` : "held";
      ctx.font = `500 ${Math.round(fontSize * 0.32)}px Oswald, sans-serif`;
      ctx.fillStyle = palette.muted;
      ctx.fillText(next.toUpperCase(), w * 0.08, h * 0.7);
      ctx.fillStyle = s.shifting ? palette.peach : palette.mint;
      ctx.fillRect(w * 0.08, h * 0.82, w * 0.84 * (s.mix || (s.shifting ? 0 : 1)), 4);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320);
  textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8 });
}
function draw() {
  background(244);
  const t = millis() / 1000;
  s.sample(0, t);
  noStroke(); fill(0); textSize(46);
  text(s.waveName.toUpperCase(), width * 0.08, height * 0.5);
  fill(120); textSize(14);
  text(s.shifting ? '→ ' + s.targetName.toUpperCase() : 'HELD', width * 0.08, height * 0.72);
  fill(s.shifting ? '#f6a796' : '#c7e89c');
  rect(width * 0.08, height * 0.82, width * 0.84 * (s.mix || (s.shifting ? 0 : 1)), 4);
}`)
  },

  {
    id: "morph-crossfade",
    name: "Morph Crossfade",
    category: "motion",
    role: "wave: [a, b] + mix blends two formulas in one call. Here: sine ⟷ batman.",
    tags: ["morph", "mix"],
    primitive: PRIMITIVES.wave,
    reuse: "transitions",
    notes: "A mix oscillator gives you a smooth crossfade between two characters of motion.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({
          wave: ["classic sine", "batman"],
          amplitude: 1
        });
      }
      const mix = (Math.sin(t * 0.8) + 1) / 2;
      const amp = h * 0.32;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = state.sampler.sample(x * 0.02, t * 0.8, mix) * amp;
        if (x === 0) ctx.moveTo(x, h * 0.5 + y);
        else ctx.lineTo(x, h * 0.5 + y);
      }
      ctx.stroke();
      label(ctx, `mix ${mix.toFixed(2)}  sine → batman`, 14, h - 18, palette.ink, 12);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); noFill();
  s = Waves.createSampler({ wave: ['classic sine', 'batman'], amplitude: 1 });
}
function draw() {
  background(255);
  const t = millis() / 1000;
  const mix = (sin(t * 0.8) + 1) / 2;
  const amp = height * 0.32;
  stroke(0); strokeWeight(2);
  beginShape();
  for (let x = 0; x <= width; x += 3) {
    vertex(x, height / 2 + s.sample(x * 0.02, t * 0.8, mix) * amp);
  }
  endShape();
  noStroke(); fill(0); textSize(12);
  text('mix ' + nf(mix, 1, 2) + '  sine → batman', 14, height - 14);
}`)
  },

  {
    id: "adaptive-columns",
    name: "Adaptive Columns",
    category: "layout",
    role: "Column widths breathe with a single wave value, keeping rhythm without redesigning.",
    tags: ["columns", "spacing"],
    primitive: PRIMITIVES.wave,
    reuse: "page layouts",
    notes: "Use to give a static layout a small living quality without losing its structure.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "classic sine", t: t * 0.8, amplitude: 1 }));
      const ratios = [1 + v * 0.8, 1.4 - v * 0.5, 0.9 + v * 0.4, 1.2 - v * 0.3];
      const total = ratios.reduce((a, b) => a + b, 0);
      let x = w * 0.06;
      const top = h * 0.18;
      const colH = h * 0.64;
      ratios.forEach((r, i) => {
        const cw = (w * 0.88) * (r / total) - 8;
        ctx.fillStyle = i === 0 ? palette.ink : palette.paper;
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 1.2;
        ctx.fillRect(x, top, cw, colH);
        ctx.strokeRect(x, top, cw, colH);
        if (i === 0) {
          ctx.fillStyle = palette.paper;
          for (let k = 0; k < 4; k++) {
            ctx.fillRect(x + 12, top + 16 + k * 16, cw - 24, 4);
          }
        }
        x += cw + 8;
      });
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'classic sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const ratios = [1 + v * 0.8, 1.4 - v * 0.5, 0.9 + v * 0.4, 1.2 - v * 0.3];
  const total = ratios.reduce((a, b) => a + b, 0);
  let x = width * 0.06;
  const top = height * 0.18, colH = height * 0.64;
  for (let i = 0; i < ratios.length; i++) {
    const cw = (width * 0.88) * (ratios[i] / total) - 8;
    stroke(0); fill(i === 0 ? 0 : 244);
    rect(x, top, cw, colH);
    x += cw + 8;
  }
}`)
  },

  {
    id: "scanning-divider",
    name: "Scanning Divider",
    category: "layout",
    role: "mountain peaks lingers near the edges and races through the middle: the divider stutters on its way.",
    tags: ["divider", "scan", "mountain peaks"],
    primitive: PRIMITIVES.wave,
    reuse: "section breaks",
    notes: "mountain peaks has a non-linear ride: it dwells at peaks and drops fast between them. A linear saw would feel too automatic.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.5);
      ctx.lineTo(w * 0.92, h * 0.5);
      ctx.stroke();
      // peak markers: discrete anchors the tick visits
      for (let i = 0; i <= 4; i++) {
        const ax = w * 0.08 + w * 0.84 * (i / 4);
        ctx.fillStyle = palette.line;
        ctx.fillRect(ax - 1, h * 0.5 - 6, 2, 12);
      }
      const v = norm(Waves.wave(0, { wave: "mountain peaks", t: t * 0.8, amplitude: 1 }));
      const tickX = w * 0.08 + w * 0.84 * v;
      ctx.fillStyle = palette.peach;
      ctx.fillRect(tickX - 3, h * 0.5 - 16, 6, 32);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(tickX - 1, h * 0.5 - 24, 2, 48);
      label(ctx, "POSITION " + Math.round(v * 100), tickX + 12, h * 0.5 + 36, palette.muted, 11);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'mountain peaks', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  stroke(0); strokeWeight(1.5);
  line(width * 0.08, height / 2, width * 0.92, height / 2);
  const tx = width * 0.08 + width * 0.84 * v;
  noStroke(); fill(246, 167, 150); rect(tx - 3, height / 2 - 16, 6, 32);
  fill(0); rect(tx - 1, height / 2 - 24, 2, 48);
}`)
  },

  {
    id: "word-gate",
    name: "Word Gate",
    category: "type",
    role: "A pulse wave turns individual words on or off: copy becomes a sequencer.",
    tags: ["gate", "pulse"],
    primitive: PRIMITIVES.wave,
    reuse: "typography",
    notes: "Pulse + offset per word gives each word its own rhythm without animating every glyph.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const words = ["READ", "PARSE", "BEND", "SHOW", "REPEAT"];
      const fontSize = Math.min(38, w * 0.075);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = words.map(w => ctx.measureText(w).width);
      const gap = 26;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      words.forEach((word, i) => {
        const v = Waves.wave(i * 0.4, { wave: "pulse", t: t * 0.9, amplitude: 1 });
        const on = v > 0;
        ctx.fillStyle = on ? palette.ink : palette.line;
        ctx.fillText(word, x, y);
        if (on) {
          ctx.fillStyle = palette.peach;
          ctx.fillRect(x, y + fontSize * 0.55, widths[i], 4);
        }
        x += widths[i] + gap;
      });
    },
    sketch: sketchTemplate(`
const words = ['READ', 'PARSE', 'BEND', 'SHOW', 'REPEAT'];
function setup() { createCanvas(620, 320); textFont('Oswald'); textSize(38); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const widths = words.map(w => textWidth(w));
  const total = widths.reduce((a, b) => a + b, 0) + 26 * (words.length - 1);
  let x = (width - total) / 2;
  for (let i = 0; i < words.length; i++) {
    const v = Waves.wave(i * 0.4, { wave: 'pulse', t: t * 0.9, amplitude: 1 });
    const on = v > 0;
    fill(on ? 0 : 220); text(words[i], x, height / 2);
    if (on) { fill(246, 167, 150); rect(x, height / 2 + 20, widths[i], 4); }
    x += widths[i] + 26;
  }
}`)
  },

  {
    id: "row-pulse",
    name: "Row Pulse",
    category: "grid",
    role: "stepped sine settles on each row before moving: the highlight has a real dwell.",
    tags: ["scanner", "row", "stepped sine"],
    primitive: PRIMITIVES.wave,
    reuse: "data tables",
    notes: "stepped sine quantises into 8 steps; the scanner *holds* each row instead of sliding through. floor(t) would jump without the rest.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const rows = 7;
      const rh = h * 0.78 / rows;
      const top = h * 0.11;
      const v = norm(Waves.wave(0, { wave: "stepped sine", t: t * 1.0, amplitude: 1 }));
      const active = clamp(Math.floor(v * rows), 0, rows - 1);
      for (let r = 0; r < rows; r++) {
        const y = top + r * rh;
        ctx.fillStyle = r === active ? palette.lemon : palette.paper;
        ctx.fillRect(w * 0.08, y, w * 0.84, rh - 4);
        ctx.fillStyle = r === active ? palette.ink : palette.line;
        ctx.fillRect(w * 0.08, y, 4, rh - 4);
        ctx.fillStyle = r === active ? palette.ink : palette.muted;
        label(ctx, `row ${String(r).padStart(2, "0")}`, w * 0.11, y + (rh - 4) * 0.5, undefined, 12);
      }
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const rows = 7;
  const rh = height * 0.78 / rows, top = height * 0.11;
  const v = (Waves.wave(0, { wave: 'stepped sine', t: t * 1.0, amplitude: 1 }) + 1) / 2;
  const active = constrain(floor(v * rows), 0, rows - 1);
  for (let r = 0; r < rows; r++) {
    const y = top + r * rh;
    noStroke();
    fill(r === active ? '#f3e679' : 244);
    rect(width * 0.08, y, width * 0.84, rh - 4);
    fill(r === active ? 0 : 215);
    rect(width * 0.08, y, 4, rh - 4);
  }
}`)
  },

  {
    id: "halftone-field",
    name: "Halftone Field",
    category: "texture",
    role: "Dot radius is driven by a per-position wave: a print halftone that breathes.",
    tags: ["halftone", "dots"],
    primitive: PRIMITIVES.sampler,
    reuse: "print texture",
    notes: "createSampler reuses the resolved config, fast enough for thousands of dots.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ wave: "bumpy sine", range: [0, 1], frequency: 0.6 });
      }
      const cols = 28;
      const rows = 12;
      const cw = w / cols;
      const ch = h / rows;
      ctx.fillStyle = palette.ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = state.sampler.sample(c * 0.4 + r * 0.6, t * 0.8);
          const rad = Math.max(0.5, v * Math.min(cw, ch) * 0.55);
          ctx.beginPath();
          ctx.arc(c * cw + cw / 2, r * ch + ch / 2, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    sketch: sketchTemplate(`
let s;
const COLS = 28, ROWS = 12;
function setup() {
  createCanvas(620, 320); noStroke(); fill(0);
  s = Waves.createSampler({ wave: 'bumpy sine', range: [0, 1], frequency: 0.6 });
}
function draw() {
  background(244);
  const t = millis() / 1000;
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = s.sample(c * 0.4 + r * 0.6, t * 0.8);
      circle(c * cw + cw / 2, r * ch + ch / 2, max(1, v * min(cw, ch) * 1.1));
    }
  }
}`)
  },

  {
    id: "oscillating-marker",
    name: "Oscillating Marker",
    category: "motion",
    role: "batman draws a notched arc: the marker hesitates at landmarks, not just the endpoints.",
    tags: ["marker", "step", "batman"],
    primitive: PRIMITIVES.wave,
    reuse: "stepper indicators",
    notes: "batman is one of p5.waves' shaped waves: dips and notches built into the curve. Use when the journey itself should signal structure.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "batman", t: t * 0.8, amplitude: 1 }));
      const startX = w * 0.14;
      const endX = w * 0.86;
      const x = lerp(startX, endX, v);
      const y = h * 0.5;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
      for (let i = 0; i <= 4; i++) {
        const ax = lerp(startX, endX, i / 4);
        ctx.fillStyle = palette.ink;
        ctx.fillRect(ax - 1, y - 6, 2, 12);
      }
      ctx.fillStyle = palette.peach;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'batman', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const sx = width * 0.14, ex = width * 0.86, y = height / 2;
  stroke(220); strokeWeight(2); line(sx, y, ex, y);
  noStroke(); fill(0);
  for (let i = 0; i <= 4; i++) rect(lerp(sx, ex, i / 4) - 1, y - 6, 2, 12);
  fill(246, 167, 150); stroke(0); strokeWeight(1.5);
  circle(lerp(sx, ex, v), y, 28);
}`)
  },

  {
    id: "wave-word-picker",
    name: "Wave Word Picker",
    category: "type",
    role: "A wave value indexes into a small list: copy becomes a rotating dial.",
    tags: ["picker", "rotation"],
    primitive: PRIMITIVES.wave,
    reuse: "rotating copy",
    notes: "Replace the word list to use this for tag clouds, status labels, or feature switches.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const options = ["DRIFT", "GATE", "PULSE", "FOLD", "SCAN", "SHIFT"];
      const v = norm(Waves.wave(0, { wave: "stepped sine", t: t * 0.8, amplitude: 1 }));
      const i = clamp(Math.floor(v * options.length), 0, options.length - 1);
      const fontSize = Math.min(78, w * 0.16);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = palette.ink;
      ctx.fillText(options[i], w * 0.1, h * 0.5);
      ctx.font = `500 13px Oswald, sans-serif`;
      ctx.fillStyle = palette.muted;
      ctx.fillText(`INDEX ${i} / ${options.length - 1}`, w * 0.1, h * 0.86);
    },
    sketch: sketchTemplate(`
const opts = ['DRIFT', 'GATE', 'PULSE', 'FOLD', 'SCAN', 'SHIFT'];
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'stepped sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const i = constrain(floor(v * opts.length), 0, opts.length - 1);
  textSize(78); fill(0); text(opts[i], width * 0.1, height * 0.55);
  textSize(13); fill(120); text('INDEX ' + i + ' / ' + (opts.length - 1), width * 0.1, height * 0.86);
}`)
  },

  {
    id: "column-pulse",
    name: "Column Pulse",
    category: "grid",
    role: "steps marches the highlight column by column: a true staircase, not a slide.",
    tags: ["scanner", "column", "steps"],
    primitive: PRIMITIVES.wave,
    reuse: "focus indicators",
    notes: "steps is a pure staircase wave: equal-width plateaus, sharp edges. Pairs with Row Pulse's stepped sine for a crosshair that *commits*.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const cols = 14;
      const cw = w * 0.84 / cols;
      const startX = w * 0.08;
      const v = norm(Waves.wave(0, { wave: "steps", t: t * 1.0, amplitude: 1 }));
      const active = clamp(Math.floor(v * cols), 0, cols - 1);
      for (let c = 0; c < cols; c++) {
        const x = startX + c * cw;
        ctx.fillStyle = c === active ? palette.sky : palette.paper;
        ctx.fillRect(x, h * 0.12, cw - 3, h * 0.76);
        ctx.fillStyle = c === active ? palette.ink : palette.line;
        ctx.fillRect(x, h * 0.12, cw - 3, 4);
      }
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); noStroke(); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const cols = 14;
  const cw = width * 0.84 / cols, sx = width * 0.08;
  const v = (Waves.wave(0, { wave: 'steps', t: t * 1.0, amplitude: 1 }) + 1) / 2;
  const a = constrain(floor(v * cols), 0, cols - 1);
  for (let c = 0; c < cols; c++) {
    fill(c === a ? '#b8d2ff' : 244);
    rect(sx + c * cw, height * 0.12, cw - 3, height * 0.76);
    fill(c === a ? 0 : 215);
    rect(sx + c * cw, height * 0.12, cw - 3, 4);
  }
}`)
  },

  {
    id: "opacity-rhythm",
    name: "Opacity Rhythm",
    category: "color",
    role: "Per-element opacity is offset along x: a single sampler animates a whole row.",
    tags: ["alpha", "rhythm"],
    primitive: PRIMITIVES.sampler,
    reuse: "spacers",
    notes: "Reusing one sampler over many indices is the canonical p5.waves pattern.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ wave: "classic sine", range: [0.1, 1], frequency: 0.9 });
      }
      const count = 14;
      const gap = 6;
      const cw = (w * 0.86 - gap * (count - 1)) / count;
      const startX = w * 0.07;
      for (let i = 0; i < count; i++) {
        const a = state.sampler.sample(i * 0.5, t * 0.8);
        ctx.fillStyle = palette.ink;
        ctx.globalAlpha = a;
        ctx.fillRect(startX + i * (cw + gap), h * 0.22, cw, h * 0.56);
      }
      ctx.globalAlpha = 1;
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); noStroke();
  s = Waves.createSampler({ wave: 'classic sine', range: [0.1, 1], frequency: 0.9 });
}
function draw() {
  background(255);
  const t = millis() / 1000;
  const n = 14, gap = 6;
  const cw = (width * 0.86 - gap * (n - 1)) / n, sx = width * 0.07;
  for (let i = 0; i < n; i++) {
    fill(17, 18, 19, s.sample(i * 0.5, t * 0.8) * 255);
    rect(sx + i * (cw + gap), height * 0.22, cw, height * 0.56);
  }
}`)
  },

  {
    id: "notification-rhythm",
    name: "Notification Rhythm",
    category: "interface",
    role: "A pulse builds and decays: a heartbeat for unread counts, presence, or alerts.",
    tags: ["pulse", "notification"],
    primitive: PRIMITIVES.wave,
    reuse: "alerts",
    notes: "Combine wobble sine with a small dot to convey 'unread without urgency'.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "wobble sine", t: t * 0.8, amplitude: 1 }));
      const cx = w * 0.32;
      const cy = h * 0.5;
      ctx.fillStyle = palette.peach;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(cx, cy, 38 + v * 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.peach;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.panel;
      ctx.font = "600 14px Oswald, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("12", cx, cy);
      ctx.textAlign = "left";
      label(ctx, "NEW ACTIVITY", w * 0.46, cy - 8, palette.ink, 14);
      label(ctx, "12 unread, last seen 4m ago", w * 0.46, cy + 14, palette.muted, 12);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'wobble sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const cx = width * 0.32, cy = height / 2;
  noStroke(); fill(246, 167, 150, 100); circle(cx, cy, 76 + v * 44);
  fill(246, 167, 150); circle(cx, cy, 48);
  fill(255); textSize(14); textAlign(CENTER, CENTER); text('12', cx, cy);
  textAlign(LEFT, BASELINE); fill(0); text('NEW ACTIVITY', width * 0.46, cy);
}`)
  },

  {
    id: "transition-meter",
    name: "Transition Meter",
    category: "state",
    role: "Read sampler.mix as a progress meter during a wave morph.",
    tags: ["mix", "transition"],
    primitive: PRIMITIVES.sampler,
    reuse: "state transitions",
    notes: "When the sampler is shifting, mix climbs 0→1; otherwise it sits at 0 (held).",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: "gentle" });
      }
      state.sampler.sample(0, t);
      const s = state.sampler;
      const radius = Math.min(w, h) * 0.32;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const angle = (s.mix || 0) * Math.PI * 2;
      ctx.lineWidth = 14;
      ctx.strokeStyle = palette.line;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = s.shifting ? palette.peach : palette.mint;
      ctx.beginPath(); ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + angle); ctx.stroke();
      ctx.font = "600 30px Oswald, sans-serif";
      ctx.fillStyle = palette.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round((s.mix || 0) * 100)}%`, cx, cy - 6);
      ctx.font = "500 11px Oswald, sans-serif";
      ctx.fillStyle = palette.muted;
      ctx.fillText(s.shifting ? "MORPHING" : "HELD", cx, cy + 18);
      ctx.textAlign = "left";
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: 'gentle' });
}
function draw() {
  background(255);
  s.sample(0, millis() / 1000);
  const cx = width / 2, cy = height / 2, r = min(width, height) * 0.32;
  strokeWeight(14); noFill();
  stroke(220); circle(cx, cy, r * 2);
  stroke(s.shifting ? '#f6a796' : '#c7e89c');
  arc(cx, cy, r * 2, r * 2, -PI / 2, -PI / 2 + (s.mix || 0) * TWO_PI);
  noStroke(); fill(0); textAlign(CENTER, CENTER); textSize(30);
  text(round((s.mix || 0) * 100) + '%', cx, cy - 6);
}`)
  },

  {
    id: "function-switcher",
    name: "Function Switcher",
    category: "state",
    role: "Each completed shift advances a mode index: the schedule dispatches *which graphic job* runs.",
    tags: ["sampler", "shift", "dispatch", "switcher"],
    primitive: PRIMITIVES.sampler,
    reuse: "behaviour swaps",
    notes: "The four modes (curve, type, meter, grid) have nothing in common visually. The shift is the only trigger; sampler.shifting + mix crossfades the handover.",
    state: { sampler: null, prevMode: 0, nextMode: 1, wasShifting: false },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({
          shift: true,
          shiftInterval: 2.5,
          shiftDuration: 1,
          group: "gentle"
        });
      }
      const s = state.sampler;
      s.sample(0, t);

      // Detect rising edge of shifting: a new shift just started
      if (!state.wasShifting && s.shifting) {
        state.prevMode = state.nextMode;
        state.nextMode = (state.nextMode + 1) % SWITCHER_MODES.length;
      }
      state.wasShifting = s.shifting;

      const next = SWITCHER_MODES[state.nextMode];
      const prev = SWITCHER_MODES[state.prevMode];

      if (s.shifting) {
        ctx.globalAlpha = 1 - s.mix;
        prev.render(ctx, w, h, t, s);
        ctx.globalAlpha = s.mix;
        next.render(ctx, w, h, t, s);
        ctx.globalAlpha = 1;
      } else {
        next.render(ctx, w, h, t, s);
      }

      // Header strip. Held state shows the mode; shifting shows prev → next with a mix bar.
      if (s.shifting) {
        label(ctx, `${prev.label} ↗ ${next.label}`, 14, 18, palette.peach, 11);
        ctx.fillStyle = palette.line;
        ctx.fillRect(14, 28, 100, 3);
        ctx.fillStyle = palette.peach;
        ctx.fillRect(14, 28, 100 * s.mix, 3);
      } else {
        label(ctx, `MODE · ${next.label}`, 14, 18, palette.ink, 11);
      }
    },
    sketch: sketchTemplate(`
// Function Switcher: dispatch on shift, not on wave name.
// Each shift end advances the mode index.
let s;
let prevMode = 0, nextMode = 1, wasShifting = false;
const modes = [
  { label: 'CURVE',  render: drawCurve },
  { label: 'TYPE',   render: drawType  },
  { label: 'METER',  render: drawMeter },
  { label: 'GRID',   render: drawGrid  }
];

function setup() {
  createCanvas(620, 320);
  textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.5, shiftDuration: 1, group: 'gentle' });
}

function draw() {
  background(255);
  const t = millis() / 1000;
  s.sample(0, t);

  if (!wasShifting && s.shifting) {
    prevMode = nextMode;
    nextMode = (nextMode + 1) % modes.length;
  }
  wasShifting = s.shifting;

  if (s.shifting) {
    push(); drawingContext.globalAlpha = 1 - s.mix;
    modes[prevMode].render(t, s);
    drawingContext.globalAlpha = s.mix;
    modes[nextMode].render(t, s);
    pop();
  } else {
    modes[nextMode].render(t, s);
  }

  fill(0); noStroke(); textSize(11);
  text('MODE · ' + modes[nextMode].label, 14, 22);
}

function drawCurve(t, s) {
  noFill(); stroke(0); strokeWeight(2);
  beginShape();
  for (let x = 0; x <= width; x += 4) {
    vertex(x, height / 2 + s.sample(x * 0.02, t) * height * 0.32);
  }
  endShape();
}

function drawType(t, s) {
  fill(0); noStroke();
  textSize(54); textAlign(CENTER, CENTER);
  text(s.waveName.toUpperCase(), width / 2, height / 2);
  textAlign(LEFT, BASELINE);
  fill(246, 167, 150);
  rect(width * 0.2, height * 0.72, width * 0.6, 4);
}

function drawMeter(t, s) {
  const cx = width / 2, cy = height / 2;
  const r = min(width, height) * 0.3;
  const v = (s.sample(0, t) + 1) * 0.5;
  noFill(); strokeWeight(16);
  stroke(220); circle(cx, cy, r * 2);
  stroke('#c7e89c');
  arc(cx, cy, r * 2, r * 2, -PI / 2, -PI / 2 + v * TWO_PI);
  noStroke(); fill(0);
  textSize(30); textAlign(CENTER, CENTER);
  text(round(v * 100) + '%', cx, cy);
}

function drawGrid(t, s) {
  noStroke(); fill(0);
  const cols = 14, rows = 6;
  const cw = width / cols, ch = height / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = (s.sample(c * 0.4 + r * 0.6, t) + 1) * 0.5;
    circle(c * cw + cw / 2, r * ch + ch / 2, max(1, v * min(cw, ch) * 0.9));
  }
}`)
  },

  {
    id: "rhythmic-divider",
    name: "Rhythmic Divider",
    category: "layout",
    role: "A divider made of pulses: the same wave drives all dashes at once.",
    tags: ["divider", "dashes"],
    primitive: PRIMITIVES.sampler,
    reuse: "section breaks",
    notes: "createSampler + per-index offset is the cheap, idiomatic way to drive a strip of marks.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ wave: "pulse", amplitude: 1, frequency: 1 });
      }
      const dashes = 24;
      const dx = w * 0.88 / dashes;
      const startX = w * 0.06;
      const y = h * 0.5;
      for (let i = 0; i < dashes; i++) {
        const v = state.sampler.sample(i * 0.4, t * 0.8);
        const lift = v > 0 ? -10 : 10;
        ctx.fillStyle = v > 0 ? palette.ink : palette.muted;
        ctx.fillRect(startX + i * dx, y + lift - 2, dx * 0.7, 4);
      }
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); noStroke();
  s = Waves.createSampler({ wave: 'pulse', amplitude: 1, frequency: 1 });
}
function draw() {
  background(255);
  const t = millis() / 1000, n = 24;
  const dx = width * 0.88 / n, sx = width * 0.06, y = height / 2;
  for (let i = 0; i < n; i++) {
    const v = s.sample(i * 0.4, t * 0.8);
    fill(v > 0 ? 0 : 130);
    rect(sx + i * dx, y + (v > 0 ? -12 : 8), dx * 0.7, 4);
  }
}`)
  },

  {
    id: "pattern-tile",
    name: "Pattern Tile",
    category: "texture",
    role: "createGrid yields a tileable pattern field: drop it on a poster or a fill area.",
    tags: ["createGrid", "tile", "print"],
    primitive: PRIMITIVES.grid,
    reuse: "fill patterns",
    notes: "Two pulses at same frequency make a checker; sine + pulse makes bands; sine + sine makes ovals.",
    state: { grid: null, cols: 14, rows: 8 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.grid) {
        state.grid = Waves.createGrid(state.cols, state.rows, {
          waveRow: "pulse",
          waveCol: "classic sine",
          range: [0, 1],
          speed: 0.5
        });
      }
      const cells = state.grid.sample(t * 0.8);
      const cw = w / state.cols;
      const ch = h / state.rows;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const v = cells[r * state.cols + c];
          ctx.fillStyle = v > 0.55 ? palette.ink : (v > 0.3 ? palette.peach : palette.paper);
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
    },
    sketch: sketchTemplate(`
let g;
const COLS = 14, ROWS = 8;
function setup() {
  createCanvas(620, 320); noStroke();
  g = Waves.createGrid(COLS, ROWS, {
    waveRow: 'pulse', waveCol: 'classic sine',
    range: [0, 1], speed: 0.5
  });
}
function draw() {
  background(244);
  const cells = g.sample(millis() / 1000 * 0.8);
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = cells[r * COLS + c];
      fill(v > 0.55 ? 0 : (v > 0.3 ? '#f6a796' : 244));
      rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
    }
  }
}`)
  },

  {
    id: "cursor-echo",
    name: "Cursor Echo",
    category: "motion",
    role: "Multiple trailing dots: each one a single sampler call with a per-trail offset.",
    tags: ["trail", "echo"],
    primitive: PRIMITIVES.sampler,
    reuse: "pointer feedback",
    notes: "In production you'd offset by past pointer time; here the wave stands in for time.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ wave: "classic sine", range: [-1, 1] });
      }
      const trails = 7;
      for (let i = 0; i < trails; i++) {
        const tx = state.sampler.sample(i * 0.3, t * 0.8);
        const ty = state.sampler.sample(i * 0.3 + 12, t * 0.6);
        const x = w * 0.5 + tx * w * 0.32;
        const y = h * 0.5 + ty * h * 0.28;
        const r = lerp(4, 16, i / (trails - 1));
        ctx.fillStyle = palette.ink;
        ctx.globalAlpha = lerp(0.2, 1, i / (trails - 1));
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); noStroke();
  s = Waves.createSampler({ wave: 'classic sine', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 1000, n = 7;
  for (let i = 0; i < n; i++) {
    const x = width / 2 + s.sample(i * 0.3, t * 0.8) * width * 0.32;
    const y = height / 2 + s.sample(i * 0.3 + 12, t * 0.6) * height * 0.28;
    fill(17, 18, 19, lerp(60, 255, i / (n - 1)));
    circle(x, y, lerp(8, 32, i / (n - 1)));
  }
}`)
  },

  {
    id: "contrast-meter",
    name: "Contrast Meter",
    category: "color",
    role: "Wave value drives a black/white split: readable as a brightness oscillation.",
    tags: ["contrast", "split"],
    primitive: PRIMITIVES.wave,
    reuse: "preview chips",
    notes: "A simple, expressive way to show a value's polarity at a glance.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "fade out", t: t * 0.8, amplitude: 1 }));
      const splitX = w * 0.1 + w * 0.8 * v;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6);
      ctx.fillStyle = palette.lemon;
      ctx.fillRect(w * 0.1, h * 0.2, splitX - w * 0.1, h * 0.6);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(splitX - 1, h * 0.2, 2, h * 0.6);
      label(ctx, `BRIGHT ${Math.round(v * 100)}%`, w * 0.1, h * 0.93, palette.muted, 11);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'fade out', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const sx = width * 0.1 + width * 0.8 * v;
  noStroke(); fill(0); rect(width * 0.1, height * 0.2, width * 0.8, height * 0.6);
  fill('#f3e679'); rect(width * 0.1, height * 0.2, sx - width * 0.1, height * 0.6);
}`)
  },

  {
    id: "hover-pulse",
    name: "Hover Pulse",
    category: "interface",
    role: "wobble sine gives the halo an uneven breath: alive, not metronomic.",
    tags: ["button", "pulse", "wobble sine"],
    primitive: PRIMITIVES.wave,
    reuse: "cta buttons",
    notes: "wobble sine is amplitude-modulated: the pulse waxes and wanes irregularly. A plain sine would feel like a heartbeat monitor.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "wobble sine", t: t * 0.8, amplitude: 1 }));
      const bx = w * 0.22;
      const by = h * 0.38;
      const bw = w * 0.56;
      const bh = h * 0.24;
      ctx.fillStyle = palette.mint;
      ctx.globalAlpha = 0.3 + v * 0.5;
      ctx.fillRect(bx - 10, by - 10, bw + 20, bh + 20);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = palette.paper;
      ctx.font = "600 14px Oswald, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ACTIVATE", bx + bw / 2, by + bh / 2);
      ctx.textAlign = "left";
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'wobble sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const bx = width * 0.22, by = height * 0.38, bw = width * 0.56, bh = height * 0.24;
  noStroke(); fill(199, 232, 156, 75 + v * 128);
  rect(bx - 10, by - 10, bw + 20, bh + 20);
  fill(0); rect(bx, by, bw, bh);
  fill(244); textSize(14); textAlign(CENTER, CENTER);
  text('ACTIVATE', bx + bw / 2, by + bh / 2);
}`)
  },

  {
    id: "mode-switcher",
    name: "Mode Switcher",
    category: "state",
    role: "A stepped wave drops a selector between fixed slots: a wave-driven segmented control.",
    tags: ["segmented", "modes"],
    primitive: PRIMITIVES.wave,
    reuse: "view switchers",
    notes: "Stepped sine snaps to discrete values; great for switching modes without dragging.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const modes = ["LIVE", "DRAFT", "ARCHIVE"];
      const v = norm(Waves.wave(0, { wave: "stepped sine", t: t * 0.8, amplitude: 1 }));
      const active = clamp(Math.floor(v * modes.length), 0, modes.length - 1);
      const total = w * 0.84;
      const startX = w * 0.08;
      const segW = total / modes.length;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, h * 0.35, total, h * 0.3);
      modes.forEach((m, i) => {
        const sx = startX + i * segW;
        if (i === active) {
          ctx.fillStyle = palette.ink;
          ctx.fillRect(sx, h * 0.35, segW, h * 0.3);
        }
        ctx.fillStyle = i === active ? palette.paper : palette.ink;
        ctx.font = "600 14px Oswald, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m, sx + segW / 2, h * 0.5);
      });
      ctx.textAlign = "left";
    },
    sketch: sketchTemplate(`
const modes = ['LIVE', 'DRAFT', 'ARCHIVE'];
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'stepped sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const active = constrain(floor(v * modes.length), 0, modes.length - 1);
  const total = width * 0.84, sx = width * 0.08, sw = total / modes.length;
  noFill(); stroke(0); strokeWeight(1.5);
  rect(sx, height * 0.35, total, height * 0.3);
  noStroke(); textAlign(CENTER, CENTER); textSize(14);
  for (let i = 0; i < modes.length; i++) {
    const x = sx + i * sw;
    if (i === active) { fill(0); rect(x, height * 0.35, sw, height * 0.3); }
    fill(i === active ? 244 : 0); text(modes[i], x + sw / 2, height / 2);
  }
}`)
  },

  {
    id: "mask-aperture",
    name: "Mask Aperture",
    category: "interface",
    role: "A wave opens and closes a circular mask: reveal that breathes.",
    tags: ["mask", "reveal"],
    primitive: PRIMITIVES.wave,
    reuse: "previews",
    notes: "Round linked sine gives a soft, organic opening: drop straight on top of any image fill.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      // base "image"
      const bands = [palette.peach, palette.pink, palette.sky, palette.lemon];
      const bandH = h / bands.length;
      bands.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * bandH, w, bandH);
      });
      const v = norm(Waves.wave(0, { wave: "round linked sine", t: t * 0.5, amplitude: 1 }));
      const r = lerp(20, Math.min(w, h) * 0.55, v);
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
    },
    sketch: sketchTemplate(`
let layer;
function setup() {
  createCanvas(620, 320);
  layer = createGraphics(620, 320);
}
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'round linked sine', t: t * 0.5, amplitude: 1 }) + 1) / 2;
  const r = lerp(20, min(width, height) * 0.55, v);
  layer.clear();
  const bands = ['#f6a796', '#f9b7c4', '#b8d2ff', '#f3e679'];
  const bh = height / bands.length;
  for (let i = 0; i < bands.length; i++) { layer.noStroke(); layer.fill(bands[i]); layer.rect(0, i * bh, width, bh); }
  layer.erase(); layer.noStroke(); layer.rect(0, 0, width, height); layer.noErase();
  // p5 mask: draw clipped circle via blend
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(width / 2, height / 2, r, 0, Math.PI * 2);
  drawingContext.clip();
  image(layer, 0, 0);
  drawingContext.restore();
  noFill(); stroke(0); strokeWeight(1.5); circle(width / 2, height / 2, r * 2);
}`)
  },

  {
    id: "border-shift",
    name: "Border Shift",
    category: "layout",
    role: "An edge dashes left/right: a frame that quietly orients the eye.",
    tags: ["edge", "indicator"],
    primitive: PRIMITIVES.wave,
    reuse: "card edges",
    notes: "Use along the top edge of an active card to indicate freshness or focus.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, { wave: "zig-zag sine", t: t * 0.8, amplitude: 1 }));
      const x = w * 0.08 + w * 0.84 * v;
      const cardX = w * 0.1;
      const cardW = w * 0.8;
      ctx.fillStyle = palette.paper;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.fillRect(cardX, h * 0.2, cardW, h * 0.6);
      ctx.strokeRect(cardX, h * 0.2, cardW, h * 0.6);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(cardX, h * 0.2 - 4, cardW, 4);
      ctx.fillStyle = palette.peach;
      ctx.fillRect(x - 22, h * 0.2 - 6, 44, 8);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const t = millis() / 1000;
  const v = (Waves.wave(0, { wave: 'zig-zag sine', t: t * 0.8, amplitude: 1 }) + 1) / 2;
  const x = width * 0.08 + width * 0.84 * v;
  fill(244); stroke(0); strokeWeight(1.5);
  rect(width * 0.1, height * 0.2, width * 0.8, height * 0.6);
  noStroke(); fill(0); rect(width * 0.1, height * 0.2 - 4, width * 0.8, 4);
  fill(246, 167, 150); rect(x - 22, height * 0.2 - 6, 44, 8);
}`)
  },

  {
    id: "bending-caption",
    name: "Bending Caption",
    category: "type",
    role: "Per-letter offsets bend a caption: micro-motion that reads as breath.",
    tags: ["caption", "bend"],
    primitive: PRIMITIVES.sampler,
    reuse: "captions",
    notes: "createSampler reused per letter index keeps allocations to zero per frame.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({ wave: "classic sine", amplitude: 1 });
      }
      const text = "GENTLE   ⟶   HARSH";
      const fontSize = Math.min(46, w * 0.085);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const letters = text.split("");
      const widths = letters.map(l => ctx.measureText(l).width || fontSize * 0.3);
      const gap = 2;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
      let x = (w - total) * 0.5;
      const baseY = h * 0.55;
      letters.forEach((l, i) => {
        const v = state.sampler.sample(i * 0.25, t * 0.8);
        ctx.fillStyle = palette.ink;
        ctx.fillText(l, x, baseY + v * 14);
        x += widths[i] + gap;
      });
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ wave: 'classic sine', amplitude: 1 });
}
function draw() {
  background(255);
  const t = millis() / 1000;
  const txt = 'GENTLE   →   HARSH';
  textSize(46);
  const widths = txt.split('').map(l => textWidth(l));
  const total = widths.reduce((a, b) => a + b, 0) + 2 * (txt.length - 1);
  let x = (width - total) / 2;
  fill(0); textAlign(LEFT, CENTER);
  for (let i = 0; i < txt.length; i++) {
    text(txt[i], x, height * 0.55 + s.sample(i * 0.25, t * 0.8) * 14);
    x += widths[i] + 2;
  }
}`)
  },

  {
    id: "cell-permission",
    name: "Cell Permission",
    category: "grid",
    role: "A binary createGrid governs which cells are allowed to be on at all.",
    tags: ["createGrid", "permission"],
    primitive: PRIMITIVES.grid,
    reuse: "state grids",
    notes: "Practical for dashboards, seat maps, active permissions, and matrix editors.",
    state: { grid: null, cols: 16, rows: 7 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.grid) {
        state.grid = Waves.createGrid(state.cols, state.rows, {
          waveRow: "classic sine",
          waveCol: "triangle",
          threshold: 0.2,
          speed: 0.5
        });
      }
      const cells = state.grid.sample(t * 0.8);
      const gap = 4;
      const cw = (w * 0.86 - gap * (state.cols - 1)) / state.cols;
      const ch = (h * 0.7 - gap * (state.rows - 1)) / state.rows;
      const sx = w * 0.07;
      const sy = h * 0.15;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const v = cells[r * state.cols + c];
          const x = sx + c * (cw + gap);
          const y = sy + r * (ch + gap);
          ctx.fillStyle = v === 1 ? palette.ink : "#dadcde";
          ctx.fillRect(x, y, cw, ch);
          if (v === 1 && (c + r) % 5 === 0) {
            ctx.fillStyle = palette.lemon;
            ctx.fillRect(x + cw * 0.25, y + ch * 0.25, cw * 0.5, ch * 0.5);
          }
        }
      }
    },
    sketch: sketchTemplate(`
let g;
const COLS = 16, ROWS = 7;
function setup() {
  createCanvas(620, 320); noStroke();
  g = Waves.createGrid(COLS, ROWS, {
    waveRow: 'classic sine', waveCol: 'triangle',
    threshold: 0.2, speed: 0.5
  });
}
function draw() {
  background(255);
  const cells = g.sample(millis() / 1000 * 0.8);
  const gap = 4;
  const cw = (width * 0.86 - gap * (COLS - 1)) / COLS;
  const ch = (height * 0.7 - gap * (ROWS - 1)) / ROWS;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    fill(cells[r * COLS + c] === 1 ? 0 : 218);
    rect(width * 0.07 + c * (cw + gap), height * 0.15 + r * (ch + gap), cw, ch);
  }
}`)
  },

  {
    id: "gentle-harsh-pair",
    name: "Gentle vs Harsh",
    category: "texture",
    role: "Two samplers with the same shift, one in group 'gentle' and one in group 'harsh', show the wave families side by side.",
    tags: ["group", "compare"],
    primitive: PRIMITIVES.sampler,
    reuse: "wave selection",
    notes: "group: 'gentle' = 28 sines and curves; group: 'harsh' = 6 tan/noise/random formulas.",
    state: { gentle: null, harsh: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.gentle) {
        state.gentle = Waves.createSampler({ shift: true, group: "gentle", amplitude: 1 });
        state.harsh = Waves.createSampler({ shift: true, group: "harsh", amplitude: 1 });
      }
      const halfH = h * 0.42;
      const step = 4;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        const v = state.gentle.sample(x * 0.012, t * 0.8);
        const y = h * 0.28 + v * halfH * 0.35;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = palette.peach;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        const v = state.harsh.sample(x * 0.012, t * 0.8);
        const y = h * 0.72 + v * halfH * 0.35;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      label(ctx, "GENTLE  " + state.gentle.waveName.toUpperCase(), 14, 18, palette.ink, 11);
      label(ctx, "HARSH   " + state.harsh.waveName.toUpperCase(), 14, h * 0.5 + 18, palette.peach, 11);
    },
    sketch: sketchTemplate(`
let gentle, harsh;
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noFill();
  gentle = Waves.createSampler({ shift: true, group: 'gentle', amplitude: 1 });
  harsh  = Waves.createSampler({ shift: true, group: 'harsh',  amplitude: 1 });
}
function draw() {
  background(255);
  const t = millis() / 1000;
  strokeWeight(1.6); stroke(0);
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, height * 0.28 + gentle.sample(x * 0.012, t * 0.8) * height * 0.15);
  endShape();
  stroke('#f6a796');
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, height * 0.72 + harsh.sample(x * 0.012, t * 0.8) * height * 0.15);
  endShape();
}`)
  },

  {
    id: "wild-terrain",
    name: "Wild Terrain",
    category: "texture",
    role: "mode: 'wild' + unpredictability warps any wave: terrain-like irregular skyline.",
    tags: ["wild", "terrain"],
    primitive: PRIMITIVES.sampler,
    reuse: "skylines",
    notes: "Wild mode is ~5× slower than stable: keep it off for 10k-point loops.",
    state: { sampler: null, ys: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = Waves.createSampler({
          wave: "meta sine",
          mode: "wild",
          unpredictability: 0.5,
          amplitude: h * 0.35,
          frequency: 0.012
        });
      }
      const step = 4;
      const cols = Math.ceil(w / step) + 1;
      if (!state.ys || state.ys.length !== cols) state.ys = new Float32Array(cols);
      const baseY = h * 0.6;
      for (let i = 0; i < cols; i++) {
        const x = i * step;
        state.ys[i] = baseY + state.sampler.sample(x, t * 0.3);
      }
      ctx.fillStyle = palette.lilac;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < cols; i++) ctx.lineTo(i * step, state.ys[i]);
      ctx.lineTo((cols - 1) * step, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, state.ys[0]);
      for (let i = 1; i < cols; i++) ctx.lineTo(i * step, state.ys[i]);
      ctx.stroke();
    },
    sketch: sketchTemplate(`
let s, ys;
const STEP = 4;
function setup() {
  createCanvas(620, 320);
  s = Waves.createSampler({
    wave: 'meta sine',
    mode: 'wild',
    unpredictability: 0.5,
    amplitude: height * 0.35,
    frequency: 0.012
  });
  ys = new Float32Array(ceil(width / STEP) + 1);
}
function draw() {
  background(255);
  const t = millis() / 1000;
  const baseY = height * 0.6;
  for (let i = 0; i < ys.length; i++) ys[i] = baseY + s.sample(i * STEP, t * 0.3);
  noStroke(); fill('#c8c3f1');
  beginShape();
  vertex(0, height);
  for (let i = 0; i < ys.length; i++) vertex(i * STEP, ys[i]);
  vertex((ys.length - 1) * STEP, height);
  endShape(CLOSE);
  stroke(0); strokeWeight(1.5); noFill();
  beginShape();
  for (let i = 0; i < ys.length; i++) vertex(i * STEP, ys[i]);
  endShape();
}`)
  },

  {
    id: "color-field",
    name: "Color Field",
    category: "color",
    role: "Two samplers, one for hue and one for brightness, paint a slow color field.",
    tags: ["hsb", "field"],
    primitive: PRIMITIVES.sampler,
    reuse: "ambient backgrounds",
    notes: "Different seeds keep hue and brightness uncorrelated for richer fields.",
    state: { hue: null, bri: null },
    draw(ctx, w, h, t, state) {
      if (!state.hue) {
        state.hue = Waves.createSampler({ seed: 0, range: [180, 340] });
        state.bri = Waves.createSampler({ seed: 7, range: [62, 92] });
      }
      const cols = 24;
      const rows = 10;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Quantise to keep fillStyle strings from blowing the cache
          const hue = Math.round(state.hue.sample(c * 0.08 + r * 0.05, t * 0.3) / 4) * 4;
          const bri = Math.round(state.bri.sample(c * 0.05 - r * 0.07, t * 0.3) / 2) * 2;
          ctx.fillStyle = `hsl(${hue},60%,${bri}%)`;
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
    },
    sketch: sketchTemplate(`
let hueS, briS;
const COLS = 24, ROWS = 10;
function setup() {
  createCanvas(620, 320); noStroke();
  colorMode(HSB, 360, 100, 100);
  hueS = Waves.createSampler({ seed: 0, range: [180, 340] });
  briS = Waves.createSampler({ seed: 7, range: [62, 92] });
}
function draw() {
  const t = millis() / 1000;
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    fill(hueS.sample(c * 0.08 + r * 0.05, t * 0.3), 60, briS.sample(c * 0.05 - r * 0.07, t * 0.3));
    rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
  }
}`)
  }
];

/* ---------- runnable sketch template ---------- */
function sketchTemplate(body) {
  return `// p5.js 2.x + p5.waves v3.2.6
// CDN:
// <script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
// <script src="https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.2.6/p5.waves.min.js"></script>
${body.trim()}
`;
}

/* ---------- DOM wiring ---------- */

const library = document.querySelector("#library");
const template = document.querySelector("#cardTemplate");
const visibleCountEl = document.querySelector("#visibleCount");
const activePrimitiveEl = document.querySelector("#activePrimitive");
const focusLabelEl = document.querySelector("#focusLabel");
const searchInput = document.querySelector("#search");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const primitiveButtons = [...document.querySelectorAll("[data-primitive]")];
const motionToggle = document.querySelector("#motionToggle");

const cardRegistry = [];
const cardRecords = new WeakMap();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeFilter = "all";
let activePrimitiveFilter = "all";
let previewsPaused = prefersReducedMotion;
let noResultsNode = null;
let animationFrame = null;

const viewportObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      let drawStatic = false;
      entries.forEach(entry => {
        const record = cardRecords.get(entry.target);
        if (!record) return;
        record.inViewport = entry.isIntersecting;
        drawStatic ||= entry.isIntersecting;
      });
      if (drawStatic && previewsPaused) drawActivePreviews(performance.now());
    }, { rootMargin: "300px 0px" })
  : null;

function appendTag(row, text, className = "") {
  const tag = document.createElement("span");
  tag.className = ["tag", className].filter(Boolean).join(" ");
  tag.textContent = text;
  row.appendChild(tag);
}

function renderLibrary() {
  modules.forEach(module => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.id = module.id;
    node.dataset.id = module.id;
    node.dataset.category = module.category;
    node.dataset.primitive = module.primitive;
    node.dataset.search = `${module.name} ${module.category} ${module.role} ${module.primitive} ${module.reuse} ${module.notes} ${module.tags.join(" ")}`.toLowerCase();
    node.querySelector(".category").textContent = module.category.toUpperCase();
    node.querySelector("h2").textContent = module.name;
    node.querySelector(".role").textContent = module.role;
    node.querySelector(".notes").textContent = module.notes;
    node.querySelector("code").textContent = module.sketch;
    const metaRow = node.querySelector(".meta-row");
    appendTag(metaRow, module.primitive, "tag-primitive");
    appendTag(metaRow, `USE · ${module.reuse}`, "tag-reuse");
    module.tags.forEach(tag => appendTag(metaRow, tag));
    node.querySelector(".copy-button").addEventListener("click", evt => {
      copySnippet(evt.currentTarget, node.querySelector("code"), module.sketch);
    });
    const record = {
      node,
      module,
      canvas: node.querySelector("canvas"),
      state: module.state ? { ...module.state } : {},
      visible: true,
      inViewport: true
    };
    cardRegistry.push(record);
    cardRecords.set(node, record);
    library.appendChild(node);
    viewportObserver?.observe(node);
  });
}

async function copySnippet(button, codeNode, code) {
  const mark = label => {
    button.textContent = label;
    button.classList.add("is-copied");
    setTimeout(() => {
      button.textContent = "COPY";
      button.classList.remove("is-copied");
    }, 1100);
  };
  try {
    await navigator.clipboard.writeText(code);
    mark("COPIED");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(codeNode);
    selection.removeAllRanges();
    selection.addRange(range);
    mark("SELECTED");
  }
}

function filterLibrary() {
  const query = searchInput.value.trim().toLowerCase();
  let count = 0;
  const visiblePrimitives = new Set();
  cardRegistry.forEach(record => {
    const card = record.node;
    const categoryMatch = activeFilter === "all" || record.module.category === activeFilter;
    const primitiveMatch = activePrimitiveFilter === "all" || record.module.primitive === activePrimitiveFilter;
    const queryMatch = !query || card.dataset.search.includes(query);
    const visible = categoryMatch && primitiveMatch && queryMatch;
    record.visible = visible;
    card.classList.toggle("is-hidden", !visible);
    if (visible) {
      count += 1;
      visiblePrimitives.add(record.module.primitive);
    }
  });
  visibleCountEl.textContent = count;
  activePrimitiveEl.textContent = primitiveSummary(count, visiblePrimitives);
  focusLabelEl.textContent = focusSummary();
  if (!count) {
    if (!noResultsNode) {
      noResultsNode = document.createElement("div");
      noResultsNode.className = "no-results";
      noResultsNode.textContent = "No specimens match this filter.";
      library.appendChild(noResultsNode);
    }
  } else if (noResultsNode) {
    noResultsNode.remove();
    noResultsNode = null;
  }
  drawActivePreviews(performance.now());
}

function primitiveSummary(count, visible) {
  if (!count) return "no match";
  if (activePrimitiveFilter !== "all") return activePrimitiveFilter;
  if (visible.size === 1) return [...visible][0];
  return `${visible.size} primitives`;
}

function focusSummary() {
  const parts = [];
  if (activeFilter !== "all") parts.push(activeFilter);
  if (activePrimitiveFilter !== "all") parts.push(activePrimitiveFilter);
  return parts.length ? parts.join(" · ") : "micro-decisions";
}

function bindControls() {
  searchInput.addEventListener("input", filterLibrary);
  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach(item => item.classList.toggle("is-active", item === button));
      filterLibrary();
    });
  });
  primitiveButtons.forEach(button => {
    button.addEventListener("click", () => {
      activePrimitiveFilter = button.dataset.primitive;
      primitiveButtons.forEach(item => item.classList.toggle("is-active", item === button));
      filterLibrary();
    });
  });
  motionToggle.addEventListener("click", () => setPreviewsPaused(!previewsPaused));
  updateMotionToggle();
}

function updateMotionToggle() {
  motionToggle.textContent = previewsPaused ? "RESUME PREVIEWS" : "PAUSE PREVIEWS";
  motionToggle.setAttribute("aria-pressed", String(previewsPaused));
  motionToggle.classList.toggle("is-paused", previewsPaused);
}

function setPreviewsPaused(paused) {
  previewsPaused = paused;
  updateMotionToggle();
  if (previewsPaused && animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  drawActivePreviews(performance.now());
  requestPreviewFrame();
}

function drawActivePreviews(time) {
  const t = time * 0.001;
  cardRegistry.forEach(record => {
    if (!record.visible || !record.inViewport) return;
    const { ctx, w, h } = setupCanvas(record.canvas);
    record.module.draw(ctx, w, h, t, record.state);
  });
}

function requestPreviewFrame() {
  if (!previewsPaused && animationFrame === null) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function animate(time) {
  animationFrame = null;
  drawActivePreviews(time);
  requestPreviewFrame();
}

/* ---------- boot ---------- */

function boot() {
  if (typeof Waves === "undefined") {
    // p5.waves not loaded yet: wait
    setTimeout(boot, 30);
    return;
  }
  bootHero();
  renderLibrary();
  bindControls();
  filterLibrary();
  requestPreviewFrame();
}

boot();
