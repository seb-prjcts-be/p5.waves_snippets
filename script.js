/* p5.waves visual vocabulary: uses real Waves.wave / createSampler (v3.6.0) */

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
  sampler: "Waves.createSampler()"
};

const ACCENT = [palette.pink, palette.peach, palette.sky, palette.mint, palette.lemon, palette.lilac];

/* Global time speed multiplier.
 * 0 = frozen, 1 = normal, 2 = double speed. One slider stretches the t-value
 * fed to every sampler on the page, so visible specimens accelerate in lockstep:
 * proves "one wave, many jobs" by hand. */
let timeSpeed = 1.0;
let accumulatedT = 0;
let lastFrameTime = null;
function getEffectiveT(time) {
  if (lastFrameTime !== null) {
    // rAF timestamps can land a hair before an earlier performance.now() call;
    // clamp so accumulatedT never dips negative
    const dt = Math.max(0, time - lastFrameTime) / 600;
    accumulatedT += dt * timeSpeed;
  }
  lastFrameTime = time;
  return accumulatedT;
}

/* Global shift sync: every live specimen morphs on the same beat,
 * so the grid reads as one instrument instead of isolated demos.
 * Snippets keep their original timings (they are stand-alone examples).
 * The hero bands stay staggered on purpose. */
const SYNC_SHIFT = { interval: 3.0, duration: 1.0 };
function syncedSampler(opts) {
  if (opts && opts.shift) {
    return Waves.createSampler({
      ...opts,
      shiftInterval: SYNC_SHIFT.interval,
      shiftDuration: SYNC_SHIFT.duration
    });
  }
  return Waves.createSampler(opts);
}

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
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 4, shiftDuration: 1.8, group: "gentle", range: [-1, 1] }), color: palette.peach, alpha: 0.55, freq: 0.0035, speed: 0.45, baseY: 0.32, amp: 0.18 },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 3, shiftDuration: 1.5, group: "gentle", range: [-1, 1] }), color: palette.pink,  alpha: 0.55, freq: 0.0045, speed: 0.52, baseY: 0.48, amp: 0.22 },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 5, shiftDuration: 2.0, group: "gentle", range: [-1, 1] }), color: palette.sky,   alpha: 0.6,  freq: 0.003,  speed: 0.4,  baseY: 0.66, amp: 0.2  },
    { sampler: Waves.createSampler({ shift: true, shiftInterval: 6, shiftDuration: 2.2, group: "gentle", range: [-1, 1] }), color: palette.lemon, alpha: 0.5,  freq: 0.005,  speed: 0.58, baseY: 0.82, amp: 0.14 }
  ];

  function frame(time) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const t = accumulatedT;
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
    name: "Arc Value Label",
    category: "motion",
    role: "A shifting sampler maps wave values onto a U-shaped annotation path between negative and positive states.",
    tags: ["label", "arc", "shift"],
    primitive: PRIMITIVES.sampler,
    reuse: "captions",
    notes: "The path stays fixed, but the travel dialect changes with waveName and targetName. Different formulas hang, snap, or glide across the same U.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.6,
          shiftDuration: 0.9,
          group: "all",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      const v = s.sample(0, t * 1.2);
      const cx = w * 0.5;
      const cy = h * 0.22;
      const rx = w * 0.32;
      const ry = h * 0.46;
      const progress = norm(v);
      const angle = Math.PI - progress * Math.PI;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;

      ctx.fillStyle = palette.sky;
      ctx.fillRect(0, 0, cx, h);
      ctx.fillStyle = palette.lemon;
      ctx.fillRect(cx, 0, cx, h);
      ctx.fillStyle = palette.panel;
      ctx.fillRect(cx - 1, 0, 2, h);

      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = Math.PI - (i / 96) * Math.PI;
        const px = cx + Math.cos(a) * rx;
        const py = cy + Math.sin(a) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      [[-1, "< 0"], [0, "0"], [1, "> 0"]].forEach(([value, text]) => {
        const a = Math.PI - norm(value) * Math.PI;
        const px = cx + Math.cos(a) * rx;
        const py = cy + Math.sin(a) * ry;
        ctx.fillStyle = palette.ink;
        ctx.beginPath(); ctx.arc(px, py, value === 0 ? 4 : 6, 0, Math.PI * 2); ctx.fill();
        label(ctx, text, px - 10, py + 22, palette.ink, 11);
      });

      ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.panel;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      const labelX = clamp(x - 62, 8, w - 132);
      const labelY = clamp(y - 46, 8, h - 54);
      ctx.fillRect(labelX, labelY, 124, 34);
      ctx.strokeRect(labelX, labelY, 124, 34);
      label(ctx, "x " + v.toFixed(2), labelX + 14, labelY + 17, palette.ink, 14);
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, h - 18, palette.ink, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320);
  textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.9, group: 'all', range: [-1, 1] });
}
function draw() {
  const t = millis() / 600;
  const v = s.sample(0, t * 1.2);
  const cx = width / 2, cy = height * 0.22, rx = width * 0.32, ry = height * 0.46;
  const a = PI - ((v + 1) / 2) * PI;
  const x = cx + cos(a) * rx;
  const y = cy + sin(a) * ry;
  noStroke(); fill('#b8d2ff'); rect(0, 0, cx, height);
  fill('#f3e679'); rect(cx, 0, cx, height);
  stroke(0); strokeWeight(3); noFill();
  beginShape();
  for (let i = 0; i <= 96; i++) {
    const aa = PI - i / 96 * PI;
    vertex(cx + cos(aa) * rx, cy + sin(aa) * ry);
  }
  endShape();
  noStroke(); fill(0); textSize(11);
  text('< 0', cx - rx - 10, cy + 22);
  text('0', cx - 4, cy + ry + 22);
  text('> 0', cx + rx - 10, cy + 22);
  fill(s.shifting ? '#f6a796' : 0); circle(x, y, 20);
  const lx = constrain(x - 62, 8, width - 132);
  const ly = constrain(y - 46, 8, height - 54);
  fill(255); stroke(0); strokeWeight(2); rect(lx, ly, 124, 34);
  noStroke(); fill(0); textSize(14); text('x ' + nf(v, 1, 2), lx + 14, ly + 21);
  textSize(11); text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 14, height - 18);
}`)
  },

  {
    id: "breathing-title",
    name: "Title Shift Gate",
    category: "type",
    role: "A shifting sampler changes the title's spacing, bend, and active voice while exposing the current formula.",
    tags: ["shift", "spacing", "headline"],
    primitive: PRIMITIVES.sampler,
    reuse: "section titles",
    notes: "This is not a sine breathing title: the wave family rotates underneath it, so the same word keeps changing graphic behaviour.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.2,
          shiftDuration: 0.8,
          group: "gentle",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      s.sample(0, t);
      const tracking = lerp(3, 24, s.mix || norm(s.sample(0.7, t)));
      const letters = "SIGNAL".split("");
      const fontSize = Math.min(64, w * 0.13);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = letters.map(l => ctx.measureText(l).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      letters.forEach((l, i) => {
        const bend = s.sample(i * 0.33, t) * 20;
        ctx.fillStyle = palette.ink;
        ctx.fillText(l, x, y + bend);
        x += widths[i] + tracking;
      });
      ctx.fillStyle = s.shifting ? palette.peach : palette.pink;
      ctx.fillRect(w * 0.16, y + fontSize * 0.7, w * 0.68 * (s.shifting ? s.mix : 1), 6);
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, w * 0.08, h * 0.18, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.2, shiftDuration: 0.8, group: 'gentle', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const tracking = lerp(3, 24, s.mix || (s.sample(0.7, t) + 1) / 2);
  const letters = 'SIGNAL'.split('');
  const fs = min(64, width * 0.13);
  textSize(fs); textAlign(LEFT, CENTER); fill(0);
  const widths = letters.map(l => textWidth(l));
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
  let x = (width - total) / 2;
  for (let i = 0; i < letters.length; i++) {
    text(letters[i], x, height / 2 + s.sample(i * 0.33, t) * 20);
    x += widths[i] + tracking;
  }
  noStroke(); fill(s.shifting ? '#f6a796' : '#f9b7c4');
  rect(width * 0.16, height / 2 + fs * 0.7, width * 0.68 * (s.shifting ? s.mix : 1), 6);
  fill(120); textSize(11); textAlign(LEFT, BASELINE);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, width * 0.08, height * 0.18);
}`)
  },

  {
    id: "interference-grid",
    name: "Family Interference",
    category: "grid",
    role: "A gentle row sampler and harsh column sampler shift independently; the grid is the collision between two wave families.",
    tags: ["sampler", "group", "shift", "moire"],
    primitive: PRIMITIVES.sampler,
    reuse: "matrix backgrounds",
    notes: "This is not two sine waves. group selection and live waveName make the pattern a comparison between wave vocabularies.",
    state: { rowS: null, colS: null, cols: 28, rows: 14 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.rowS) {
        state.rowS = syncedSampler({ shift: true, shiftInterval: 3.2, shiftDuration: 1, group: "gentle", range: [-1, 1] });
        state.colS = syncedSampler({ shift: true, shiftInterval: 2.4, shiftDuration: 0.8, group: "harsh", range: [-1, 1] });
      }
      const tt = t * 0.4;
      const rowV = new Array(state.rows);
      const colV = new Array(state.cols);
      for (let r = 0; r < state.rows; r++) rowV[r] = state.rowS.sample(r, tt);
      for (let c = 0; c < state.cols; c++) colV[c] = state.colS.sample(c, tt);
      const cw = w / state.cols;
      const ch = h / state.rows;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const v = (rowV[r] + colV[c] + 2) / 4;
          const a = Math.pow(v, 1.5);
          ctx.fillStyle = `rgba(17, 18, 19, ${a})`;
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
      label(ctx, "ROW  " + state.rowS.waveName.toUpperCase(), 12, 16, palette.paper, 10);
      label(ctx, "COL  " + state.colS.waveName.toUpperCase(), 12, h - 16, palette.paper, 10);
    },
    sketch: sketchTemplate(`
let rowS, colS;
const COLS = 28, ROWS = 14;
function setup() {
  createCanvas(620, 320);
  noStroke();
  rowS = Waves.createSampler({ shift: true, shiftInterval: 3.2, shiftDuration: 1, group: 'gentle', range: [-1, 1] });
  colS = Waves.createSampler({ shift: true, shiftInterval: 2.4, shiftDuration: 0.8, group: 'harsh', range: [-1, 1] });
}
function draw() {
  background(244);
  const tt = millis() / 600 * 0.4;
  const rowV = []; for (let r = 0; r < ROWS; r++) rowV.push(rowS.sample(r, tt));
  const colV = []; for (let c = 0; c < COLS; c++) colV.push(colS.sample(c, tt));
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = pow((rowV[r] + colV[c] + 2) / 4, 1.5);
      fill(17, 18, 19, v * 255);
      rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
    }
  }
  fill(244); textSize(10);
  text('ROW ' + rowS.waveName.toUpperCase(), 12, 16);
  text('COL ' + colS.waveName.toUpperCase(), 12, height - 12);
}`)
  },

  {
    id: "threshold-field",
    name: "Threshold Field Shift",
    category: "grid",
    role: "A binary grid flips on where row-wave + col-wave crosses zero, while the row formula shifts family underneath.",
    tags: ["sampler", "shift", "threshold", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "matrix backgrounds",
    notes: "A fixed sin()/triangle field always breathes the same way. The row sampler shifts, so the whole pattern walks through wave families: waveName is the live screen name.",
    state: { rowS: null, colS: null, cols: 22, rows: 10 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.rowS) {
        state.rowS = syncedSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.9, group: "gentle", range: [-1, 1] });
        state.colS = syncedSampler({ wave: "classic sine", range: [-1, 1] });
      }
      const s = state.rowS;
      s.sample(0, t);
      const tt = t * 0.5;
      const rowV = new Array(state.rows);
      const colV = new Array(state.cols);
      for (let r = 0; r < state.rows; r++) rowV[r] = s.sample(r, tt);
      for (let c = 0; c < state.cols; c++) colV[c] = state.colS.sample(c, tt);
      const gap = 4;
      const cw = (w - gap * (state.cols + 1)) / state.cols;
      const ch = (h - gap * (state.rows + 1)) / state.rows;
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const on = (rowV[r] + colV[c]) >= 0;
          ctx.fillStyle = on ? palette.ink : "#d2d6d9";
          ctx.fillRect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
        }
      }
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, gap + 2, h - 10, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let rowS, colS;
const COLS = 22, ROWS = 10;
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noStroke();
  rowS = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.9, group: 'gentle', range: [-1, 1] });
  colS = Waves.createSampler({ wave: 'classic sine', range: [-1, 1] });
}
function draw() {
  background(244);
  const t = millis() / 600;
  rowS.sample(0, t);
  const tt = t * 0.5;
  const rowV = []; for (let r = 0; r < ROWS; r++) rowV.push(rowS.sample(r, tt));
  const colV = []; for (let c = 0; c < COLS; c++) colV.push(colS.sample(c, tt));
  const gap = 4;
  const cw = (width - gap * (COLS + 1)) / COLS;
  const ch = (height - gap * (ROWS + 1)) / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      fill(rowV[r] + colV[c] >= 0 ? 0 : 210);
      rect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
    }
  }
  fill(120); textSize(10);
  text(rowS.shifting ? rowS.waveName + ' -> ' + rowS.targetName : rowS.waveName, 6, height - 8);
}`)
  },

  {
    id: "pressure-hatch",
    name: "Hatch Gait Switch",
    category: "texture",
    role: "A shifting sampler changes the hatch gait itself: soft waves become stepped, jagged, or wild line families.",
    tags: ["hatch", "shift", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "print textures",
    notes: "The line field does not just animate spacing. The underlying formula rotates, so the texture changes species while the drawing code stays fixed.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.6,
          shiftDuration: 0.9,
          group: "all",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      s.sample(0, t);
      const gap = 11;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.2;
      for (let x = -w * 0.2; x < w * 1.2; x += gap) {
        ctx.beginPath();
        for (let y = -10; y <= h + 10; y += 8) {
          const v = s.sample(x * 0.05 + y * 0.03, t * 0.9);
          const xx = x + v * 24;
          if (y === -10) ctx.moveTo(xx, y);
          else ctx.lineTo(xx, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = palette.peach;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(w * 0.12, h * 0.2, w * 0.16 + (s.mix || 0) * w * 0.16, h * 0.6);
      ctx.globalAlpha = 1;
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 12, 18, palette.ink, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.9, group: 'all', range: [-1, 1] });
}
function draw() {
  background(244);
  const t = millis() / 600;
  s.sample(0, t);
  stroke(0); strokeWeight(1.2); noFill();
  for (let x = -width * 0.2; x < width * 1.2; x += 11) {
    beginShape();
    for (let y = -10; y <= height + 10; y += 8) {
      vertex(x + s.sample(x * 0.05 + y * 0.03, t * 0.9) * 24, y);
    }
    endShape();
  }
  noStroke(); fill(246, 167, 150, 230);
  rect(width * 0.12, height * 0.2, width * (0.16 + (s.mix || 0) * 0.16), height * 0.6);
  fill(0); textSize(11); text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 12, 20);
}`)
  },

  {
    id: "live-loader",
    name: "Live Loader",
    category: "interface",
    role: "An indeterminate bar whose stall character keeps changing formula family: a loader that never fakes the same hesitation twice.",
    tags: ["loading", "shift", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "waiting states",
    notes: "A clean ramp or a single sin() always stalls identically. A shifting sampler rotates the formula behind the bar, so the wait reads as a live system; waveName is the honest status line.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.8, group: "all", range: [-1, 1] });
      }
      const s = state.sampler;
      const v = norm(s.sample(0, t * 1.2));
      const x = w * 0.14;
      const y = h * 0.48;
      const trackW = w * 0.72;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, trackW, 18);
      ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
      ctx.fillRect(x + 3, y + 3, Math.max(2, (trackW - 6) * v), 12);
      label(ctx, s.shifting ? `syncing · ${s.waveName} -> ${s.targetName}` : `syncing · ${s.waveName}`, x, y - 22, palette.ink, 12);
      label(ctx, `${Math.round(v * 100)}%`, x + trackW - 38, y + 42, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.8, group: 'all', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  const v = (s.sample(0, t * 1.2) + 1) / 2;
  const x = width * 0.14, y = height * 0.48, trackW = width * 0.72;
  noFill(); stroke(0); strokeWeight(1.5);
  rect(x, y, trackW, 18);
  noStroke(); fill(s.shifting ? '#f6a796' : 0);
  rect(x + 3, y + 3, max(2, (trackW - 6) * v), 12);
  fill(0); textSize(12);
  text(s.shifting ? 'syncing · ' + s.waveName + ' -> ' + s.targetName : 'syncing · ' + s.waveName, x, y - 14);
  fill(120); text(round(v * 100) + '%', x + trackW - 38, y + 46);
}`)
  },

  {
    id: "wave-shift-readout",
    name: "Wave Shift Readout",
    category: "state",
    role: "Real sampler exposes waveName, targetName, mix, period and targetPeriod: readable as a tool state.",
    tags: ["sampler", "shift", "period"],
    primitive: PRIMITIVES.sampler,
    reuse: "tool readouts",
    notes: "These getters are live: drop them into any UI to show which wave is active and where it's heading. period reads the measured period of the current formula; non-periodic waves report null, shown here as an honest dash.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
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
      const fmtPeriod = p => (p == null ? "—" : p.toFixed(2));
      label(ctx, "PERIOD", barX, h * 0.3, palette.muted, 11);
      label(
        ctx,
        s.shifting ? `${fmtPeriod(s.period)} -> ${fmtPeriod(s.targetPeriod)}` : fmtPeriod(s.period),
        barX, h * 0.43, palette.ink, 14
      );
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
  const t = millis() / 600;
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
  const fmt = p => (p == null ? '—' : nf(p, 1, 2));
  fill(120); textSize(11); text('PERIOD', bx, height * 0.3);
  fill(0); textSize(14);
  text(s.shifting ? fmt(s.period) + ' -> ' + fmt(s.targetPeriod) : fmt(s.period), bx, height * 0.43);
}`)
  },

  {
    id: "morph-crossfade",
    name: "Motion Audition",
    category: "motion",
    role: "An easing picker over the whole catalogue: Waves.list() supplies the candidates, mix auditions the blend, and the spec line is the deliverable.",
    tags: ["morph", "mix", "easing", "list", "picker"],
    primitive: PRIMITIVES.sampler,
    reuse: "easing choice, motion reviews, design tooling",
    notes: "The pair comes from Waves.list() at runtime — the preview walks new pairings every reel, the sketch picks them with arrow keys. Lane A and B are the pure formulas, the middle lane is the blend, and the chip rides it: the blend applied to a real element. The reel ends on a verdict — SHIP IT — and the spec line below is a complete, paste-ready options object.",
    state: { sampler: null, pairKey: "" },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      const CHOSEN = 0.5;      // the blend the reel approves
      const HOLD = 1.5;        // t-units per reel step
      const LANE_FREQ = 0.02;  // wave cycles across a lane
      const LANE_AMP = 0.1;    // lane wave height (fraction of h)
      const CHIP_FREQ = 2.2;   // how fast the chip reads its lane
      const CHIP_AMP = 0.16;   // chip travel (fraction of h)
      const REEL = [0, 0.25, 0.5, 0.75, 1, "verdict"];
      // candidates come from the runtime catalogue: a new pairing every reel
      const list = Waves.list();
      const cycle = Math.max(0, Math.floor(t / (HOLD * REEL.length)));
      const ia = ((cycle * 5 + 1) % list.length + list.length) % list.length;
      const ib = (ia + 9) % list.length;
      const key = `${ia}-${ib}`;
      if (state.pairKey !== key) {
        state.pairKey = key;
        state.sampler = syncedSampler({ wave: [ia, ib], amplitude: 1 });  // pick by index
      }
      const s = state.sampler;
      const A = list[ia].name, B = list[ib].name;
      // audition reel: hold each mix step, glide to the next, end on a verdict
      const cy = t / HOLD;
      const idx = ((Math.floor(cy) % REEL.length) + REEL.length) % REEL.length;
      const frac = cy - Math.floor(cy);
      const verdict = REEL[idx] === "verdict";
      let mix;
      if (verdict) {
        mix = CHOSEN;
      } else {
        const next = REEL[(idx + 1) % REEL.length];
        const to = next === "verdict" ? CHOSEN : next;
        const g = clamp((frac - 0.7) / 0.3, 0, 1);
        mix = lerp(REEL[idx], to, g * g * (3 - 2 * g));
      }
      const lanes = [
        { y: h * 0.22, mix: 0, lbl: A, wgt: 1.2, col: palette.muted },
        { y: h * 0.5, mix, lbl: `mix ${mix.toFixed(2)}`, wgt: 2.4, col: palette.ink },
        { y: h * 0.78, mix: 1, lbl: B, wgt: 1.2, col: palette.muted }
      ];
      lanes.forEach(lane => {
        ctx.strokeStyle = lane.col;
        ctx.lineWidth = lane.wgt;
        ctx.beginPath();
        for (let x = 0; x <= w * 0.8; x += 3) {
          const y = lane.y + s.sample(x * LANE_FREQ, t, lane.mix) * h * LANE_AMP;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        label(ctx, lane.lbl, 14, lane.y - h * 0.12, lane.col, 10);
      });
      // the blend applied to a real element: a chip riding the middle lane's motion.
      // On approval it snaps to rest and checks off — the audition pays out.
      const chipY = h * 0.5 + s.sample(t * CHIP_FREQ, t, mix) * h * CHIP_AMP * (verdict ? 0 : 1);
      ctx.fillStyle = verdict ? palette.mint : palette.lemon;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.fillRect(w * 0.86, chipY - 9, 34, 18);
      ctx.strokeRect(w * 0.86, chipY - 9, 34, 18);
      label(ctx, verdict ? "✓" : "UI", w * 0.885, chipY, palette.ink, verdict ? 13 : 10);
      // verdict stamp: the audition has an outcome
      if (verdict) {
        ctx.save();
        ctx.translate(w * 0.4, h * 0.5);
        ctx.rotate(-0.12);
        ctx.strokeStyle = palette.peach;
        ctx.lineWidth = 3;
        ctx.strokeRect(-74, -20, 148, 40);
        ctx.fillStyle = palette.peach;
        ctx.font = "700 20px Oswald, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SHIP IT", 0, 0);
        ctx.restore();
        ctx.textAlign = "left";
      }
      // two deliverables: the p5.waves options AND a portable CSS linear() easing
      // (linear() allows non-monotonic stops, so a wobble/bounce blend is valid CSS)
      const css = "linear(" + Array.from({ length: 7 }, (_, k) =>
        norm(s.sample((k / 6) * 40, t, mix)).toFixed(2)).join(", ") + ")";
      ctx.fillStyle = verdict ? palette.mint : palette.lemon;
      ctx.fillRect(0, h - 32, w, 32);
      ctx.fillStyle = palette.ink;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textBaseline = "middle";
      ctx.fillText(`{ wave: ['${A}', '${B}'], mix: ${mix.toFixed(2)} }${verdict ? "  // approved" : ""}`, 12, h - 22);
      ctx.fillText(`transition-timing-function: ${css};`, 12, h - 9);
    },
    sketch: sketchTemplate(`
let s, list, ia, ib;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  list = Waves.list();          // the whole catalogue is the casting pool
  ia = 0; ib = 18;              // starting pair: classic sine x triangle
  rebuild();
}
function rebuild() { s = Waves.createSampler({ wave: [ia, ib], amplitude: 1 }); }
function keyPressed() {
  // arrows recast the audition from Waves.list()
  if (keyCode === LEFT_ARROW)  { ia = (ia + list.length - 1) % list.length; rebuild(); }
  if (keyCode === RIGHT_ARROW) { ia = (ia + 1) % list.length; rebuild(); }
  if (keyCode === DOWN_ARROW)  { ib = (ib + list.length - 1) % list.length; rebuild(); }
  if (keyCode === UP_ARROW)    { ib = (ib + 1) % list.length; rebuild(); }
}
function draw() {
  background(255);
  const mix = constrain(mouseX / width, 0, 1);   // drag horizontally to audition
  const approved = mouseIsPressed;               // hold mouse to approve this blend
  const A = list[ia].name, B = list[ib].name;
  drawLane(height * 0.22, 0, A + '  (\\u2190/\\u2192)', color(150), 1.2);
  drawLane(height * 0.5, mix, 'mix ' + nf(mix, 1, 2), color(0), 2.4);
  drawLane(height * 0.78, 1, B + '  (\\u2193/\\u2191)', color(150), 1.2);
  // the blend applied to a real element; on approval it snaps to rest and checks off
  const chipY = height * 0.5 + s.sample(millis() / 600 * 2.2, millis() / 600, mix) * height * 0.16 * (approved ? 0 : 1);
  fill(approved ? '#c7e89c' : '#f3e679'); stroke(0); strokeWeight(1.5);
  rect(width * 0.86, chipY - 12, 48, 24);
  noStroke(); fill(0); textSize(approved ? 15 : 11); text(approved ? '\\u2713' : 'UI', width * 0.878 + 14, chipY + 5);
  if (approved) {                                // the audition has an outcome
    push(); translate(width * 0.4, height * 0.5); rotate(-0.12);
    noFill(); stroke('#f6a796'); strokeWeight(4); rect(-90, -26, 180, 52);
    noStroke(); fill('#f6a796'); textSize(26); textAlign(CENTER, CENTER); text('SHIP IT', 0, 0);
    pop(); textAlign(LEFT, BASELINE);
  }
  // two copy-ready deliverables: p5.waves options AND a portable CSS linear() easing
  // (linear() allows non-monotonic stops, so a wobble/bounce blend exports cleanly)
  let css = 'linear(';
  for (let k = 0; k <= 6; k++) css += ((s.sample(k / 6 * 40, millis() / 600, mix) + 1) / 2).toFixed(2) + (k < 6 ? ', ' : '');
  css += ')';
  noStroke(); fill(approved ? '#c7e89c' : '#f3e679'); rect(0, height - 34, width, 34);
  fill(0); textSize(11);
  text("{ wave: ['" + A + "', '" + B + "'], mix: " + nf(mix, 1, 2) + ' }' + (approved ? '  // approved' : ''), 12, height - 21);
  text('transition-timing-function: ' + css + ';', 12, height - 8);
}
function drawLane(y, mix, lbl, col, wgt) {
  stroke(col); strokeWeight(wgt); noFill();
  beginShape();
  for (let x = 0; x <= width * 0.8; x += 3) {
    vertex(x, y + s.sample(x * 0.02, millis() / 600, mix) * height * 0.1);
  }
  endShape();
  noStroke(); fill(col); textSize(10); text(lbl, 14, y - height * 0.12 + 6);
}`)
  },

  {
    id: "layout-squid",
    name: "Layout Squid",
    category: "layout",
    role: "Four columns, four smooth formulas from the gentle pool: each arm eases its own width so the layout breathes — never flickers.",
    tags: ["gentle", "columns", "layout", "smooth"],
    primitive: PRIMITIVES.wave,
    reuse: "self-tuning grids, responsive panels",
    notes: "A layout must not jitter, so the arms are drawn only from the gentle (sine-family) pool — each a different smooth formula, decorrelated by a time offset, so the columns drift independently but continuously. Seed-hashing the whole catalogue would deal in harsh noise/tan/random formulas and make widths snap: exactly the flicker you never want in a layout. Slow tempo and a narrow width band keep it calm enough to sit behind real content.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      // gentle pool only: smooth sine-family formulas, one per arm
      const ARMS = [
        { wave: "classic sine",      col: palette.ink },
        { wave: "smooth solid sine", col: palette.peach },
        { wave: "meta sine",         col: palette.sky },
        { wave: "bumpy sine",        col: palette.mint }
      ];
      const SLOW = 0.1;        // layout tempo — low = slow drift, a usable settled layout
      const SPREAD = 3.0;      // time offset between arms, so they never move in lockstep
      const BAND = [0.8, 0.6]; // width factor = 0.8 .. 1.4 — breathes, never collapses
      const tt = t * SLOW;
      const widths = ARMS.map((a, i) => {
        const v = norm(Waves.wave(0, { wave: a.wave, t: tt + i * SPREAD, amplitude: 1 }));
        return BAND[0] + v * BAND[1];
      });
      const total = widths.reduce((a, b) => a + b, 0);
      let x = w * 0.06;
      const top = h * 0.18, colH = h * 0.64;
      ARMS.forEach((a, i) => {
        const cw = (w * 0.88) * (widths[i] / total) - 8;
        ctx.fillStyle = a.col;
        ctx.fillRect(x, top, cw, colH);
        ctx.fillStyle = palette.panel;
        ctx.font = "600 9px Oswald, sans-serif";
        ctx.textBaseline = "top";
        if (ctx.measureText(a.wave).width < cw - 12) ctx.fillText(a.wave, x + 8, top + 8);
        x += cw + 8;
      });
      label(ctx, "arms: gentle pool · smooth, no flicker", 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
// gentle pool only: smooth sine-family formulas, one per column
const ARMS = ['classic sine', 'smooth solid sine', 'meta sine', 'bumpy sine'];
const COLS = ['#111', '#f6a796', '#b8d2ff', '#c7e89c'];
const SLOW = 0.1;         // layout tempo — low = slow drift, a usable settled layout
const SPREAD = 3.0;       // time offset between arms, so they never move in lockstep
const BAND = [0.8, 0.6];  // width factor 0.8..1.4 — breathes, never collapses
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 600 * SLOW;
  // each arm a different smooth formula, decorrelated by a time offset -> no flicker
  const widths = ARMS.map((wave, i) =>
    BAND[0] + ((Waves.wave(0, { wave, t: t + i * SPREAD, amplitude: 1 }) + 1) / 2) * BAND[1]);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = width * 0.06;
  const top = height * 0.18, colH = height * 0.64;
  noStroke();
  for (let i = 0; i < ARMS.length; i++) {
    const cw = (width * 0.88) * (widths[i] / total) - 8;
    fill(COLS[i]); rect(x, top, cw, colH);
    fill(255); textSize(11); text(ARMS[i], x + 8, top + 18);
    x += cw + 8;
  }
  fill(120); textSize(10); text('arms: gentle pool · smooth, no flicker', 14, height - 12);
}`)
  },

  {
    id: "word-gate",
    name: "Word Gate Shift",
    category: "type",
    role: "A gentle shifting wave gates the words on and off, but each transition is eased — a readable emphasis sequencer that fades, never strobes.",
    tags: ["gate", "gentle", "shift", "smooth"],
    primitive: PRIMITIVES.sampler,
    reuse: "typography, emphasis rhythm",
    notes: "The signal is a gentle (sine-family) formula, thresholded to a per-word on/off, then eased into a stored lit value so each word crossfades between dim and bold instead of blinking. A pulse-family gate would snap the words on and off and strobe — unreadable. Shift still rotates the underlying rhythm (waveName), so the same copy keeps finding new emphasis patterns; the slow tempo keeps it calm enough to read behind real content.",
    state: { sampler: null, lit: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      const words = ["READ", "PARSE", "BEND", "SHOW", "REPEAT"];
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "gentle", range: [-1, 1] });
        state.lit = words.map(() => 0);
      }
      const s = state.sampler;
      s.sample(0, t);
      const SLOW = 0.35;    // calm reading tempo
      const THRESH = 0.15;  // gate opens above this signal level
      const EASE = 0.08;    // per-word crossfade speed (low = softer)
      const fontSize = Math.min(38, w * 0.075);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = words.map(word => ctx.measureText(word).width);
      const gap = 26;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      words.forEach((word, i) => {
        // gentle signal, spaced per word, thresholded to a gate — then eased so it never strobes
        const target = s.sample(i * 0.7, t * SLOW) > THRESH ? 1 : 0;
        state.lit[i] += (target - state.lit[i]) * EASE;
        const lit = state.lit[i];
        ctx.globalAlpha = 0.2 + lit * 0.8;
        ctx.fillStyle = palette.ink;
        ctx.fillText(word, x, y);
        ctx.globalAlpha = lit;
        ctx.fillStyle = palette.peach;
        ctx.fillRect(x, y + fontSize * 0.55, widths[i], 4);
        ctx.globalAlpha = 1;
        x += widths[i] + gap;
      });
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, w * 0.5 - 70, h * 0.86, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s, lit;
const words = ['READ', 'PARSE', 'BEND', 'SHOW', 'REPEAT'];
const SLOW = 0.35;    // calm reading tempo
const THRESH = 0.15;  // gate opens above this signal level
const EASE = 0.08;    // per-word crossfade speed (low = softer)
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'gentle', range: [-1, 1] });
  lit = words.map(() => 0);
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  textSize(38);
  const widths = words.map(w => textWidth(w));
  const total = widths.reduce((a, b) => a + b, 0) + 26 * (words.length - 1);
  let x = (width - total) / 2;
  for (let i = 0; i < words.length; i++) {
    // gentle signal -> gate -> eased so the word fades in and out, never strobes
    const target = s.sample(i * 0.7, t * SLOW) > THRESH ? 1 : 0;
    lit[i] += (target - lit[i]) * EASE;
    fill(17, 17, 17, (0.2 + lit[i] * 0.8) * 255);
    text(words[i], x, height / 2);
    fill(246, 167, 150, lit[i] * 255);
    rect(x, height / 2 + 20, widths[i], 4);
    x += widths[i] + 26;
  }
  fill(120); textSize(11);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, width * 0.5 - 70, height * 0.86);
}`)
  },

  {
    id: "halftone-field",
    name: "Halftone Species Shift",
    category: "texture",
    role: "Dot radius is driven by a shifting sampler: the halftone keeps changing species while the dot grid stays put.",
    tags: ["halftone", "shift", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "print texture",
    notes: "A sin()- or noise()-driven halftone always prints the same screen. A shifting sampler rotates the formula behind the radius, so the same grid prints dots, ridges, then grain; waveName is the active screen.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2.8, shiftDuration: 1, group: "all", range: [0, 1], frequency: 0.6 });
      }
      const s = state.sampler;
      s.sample(0, t);
      const cols = 28;
      const rows = 12;
      const cw = w / cols;
      const ch = h / rows;
      ctx.fillStyle = palette.ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = s.sample(c * 0.4 + r * 0.6, t * 1.0);
          const rad = Math.max(0.5, v * Math.min(cw, ch) * 0.55);
          ctx.beginPath();
          ctx.arc(c * cw + cw / 2, r * ch + ch / 2, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 12, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s;
const COLS = 28, ROWS = 12;
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noStroke();
  s = Waves.createSampler({ shift: true, shiftInterval: 2.8, shiftDuration: 1, group: 'all', range: [0, 1], frequency: 0.6 });
}
function draw() {
  background(244);
  const t = millis() / 600;
  s.sample(0, t);
  const cw = width / COLS, ch = height / ROWS;
  fill(0);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = s.sample(c * 0.4 + r * 0.6, t * 1.0);
      circle(c * cw + cw / 2, r * ch + ch / 2, max(1, v * min(cw, ch) * 1.1));
    }
  }
  fill(120); textSize(10);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 12, height - 10);
}`)
  },

  {
    id: "wave-word-picker",
    name: "Shift Word Roster",
    category: "type",
    role: "The sampler's live waveName becomes the displayed word, while targetName previews the next typographic voice.",
    tags: ["shift", "name", "rotation"],
    primitive: PRIMITIVES.sampler,
    reuse: "rotating copy",
    notes: "This is the library talking about itself: no lookup table is required because p5.waves exposes the active and target formulas.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.2,
          shiftDuration: 0.9,
          group: "all",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      s.sample(0, t);
      const name = s.waveName.toUpperCase();
      const target = s.targetName.toUpperCase();
      const fontSize = Math.min(60, w * 0.13);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = palette.ink;
      ctx.fillText(name, w * 0.08, h * 0.42);
      ctx.font = `500 13px Oswald, sans-serif`;
      ctx.fillStyle = palette.muted;
      ctx.fillText(s.shifting ? `TARGET ${target}` : "HELD FORMULA", w * 0.08, h * 0.66);
      ctx.fillStyle = palette.line;
      ctx.fillRect(w * 0.08, h * 0.76, w * 0.84, 5);
      ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
      ctx.fillRect(w * 0.08, h * 0.76, w * 0.84 * (s.shifting ? s.mix : 1), 5);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.2, shiftDuration: 0.9, group: 'all', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  textSize(60); fill(0); text(s.waveName.toUpperCase(), width * 0.08, height * 0.45);
  textSize(13); fill(120); text(s.shifting ? 'TARGET ' + s.targetName.toUpperCase() : 'HELD FORMULA', width * 0.08, height * 0.66);
  noStroke(); fill(220); rect(width * 0.08, height * 0.76, width * 0.84, 5);
  fill(s.shifting ? '#f6a796' : 0); rect(width * 0.08, height * 0.76, width * 0.84 * (s.shifting ? s.mix : 1), 5);
}`)
  },

  {
    id: "drum-caterpillar",
    name: "Drum Caterpillar",
    category: "color",
    role: "Twelve segments, twelve seeds: every tile hashes its own wave from the catalogue and beats its own tempo.",
    tags: ["seed", "polyrhythm", "alpha"],
    primitive: PRIMITIVES.wave,
    reuse: "live data rows, status grids",
    notes: "Per-tile seed hashes into the 35-wave catalogue, so the segments decorrelate without hand-tuning. Without seed hashing you'd schedule twelve oscillators by hand.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const count = 12;
      const gap = 6;
      const cw = (w * 0.86 - gap * (count - 1)) / count;
      const startX = w * 0.07;
      const tt = t * 1.2;
      for (let i = 0; i < count; i++) {
        const a = (Waves.wave(0, { seed: i + 1, t: tt, amplitude: 1 }) + 1) / 2;
        ctx.fillStyle = palette.ink;
        ctx.globalAlpha = 0.15 + a * 0.85;
        ctx.fillRect(startX + i * (cw + gap), h * 0.22, cw, h * 0.56);
      }
      ctx.globalAlpha = 1;
      label(ctx, "12 SEEDS · ONE CALL · NO SYNC", w * 0.07, h * 0.92, palette.muted, 10);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); noStroke(); }
function draw() {
  background(255);
  const t = millis() / 600 * 1.2;
  const n = 12, gap = 6;
  const cw = (width * 0.86 - gap * (n - 1)) / n, sx = width * 0.07;
  for (let i = 0; i < n; i++) {
    const a = (Waves.wave(0, { seed: i + 1, t, amplitude: 1 }) + 1) / 2;
    fill(17, 18, 19, (0.15 + a * 0.85) * 255);
    rect(sx + i * (cw + gap), height * 0.22, cw, height * 0.56);
  }
}`)
  },

  {
    id: "notification-rhythm",
    name: "Alert Forecast",
    category: "interface",
    role: "The one thing a timer cannot do: SHOW the schedule. Because the wave is deterministic, the strip renders alerts before they fire — you watch them approach NOW and can scrub ahead.",
    tags: ["shift", "forecast", "lookahead", "onCue"],
    primitive: PRIMITIVES.sampler,
    reuse: "alert previews, timeline scrubbing, ambient status",
    notes: "A setTimeout fires blind; this makes the schedule visible. sample(0, t + lookahead) reads the future in one call, so the next crossings are drawn as pings marching toward NOW — the whole value is seeing and scrubbing what is coming, which no timer offers. Each crossing that reaches NOW calls onCue(), wired to a toast here; swap your own handler in one line. A shift retunes the cadence, rewriting the visible future in place.",
    state: { sampler: null, toasts: null, wasFiring: false, cueCount: 0 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "all", range: [0, 1] });
        state.toasts = [];
      }
      const s = state.sampler;
      const TH = 0.74;              // cue threshold
      const HORIZON = 6;            // t-units of visible future
      const SPEED = 1.1;            // schedule tempo
      const NOW_X = w * 0.2;        // where the future arrives
      const yOf = v => h * 0.84 - v * h * 0.46;
      // pass 1: sample the future, collect cue positions
      const curve = [];
      const cues = [];
      let prev = s.sample(0, t * SPEED);
      for (let x = NOW_X; x <= w; x += 2) {
        const ahead = ((x - NOW_X) / (w - NOW_X)) * HORIZON;
        const v = s.sample(0, (t + ahead) * SPEED);
        curve.push([x, yOf(v)]);
        if (prev < TH && v >= TH) cues.push(x);
        prev = v;
      }
      // pass 2: draw curve, threshold, cues
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      curve.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = palette.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(NOW_X, yOf(TH)); ctx.lineTo(w, yOf(TH)); ctx.stroke();
      ctx.setLineDash([]);
      cues.forEach(x => {
        ctx.fillStyle = palette.peach;
        ctx.beginPath(); ctx.arc(x, yOf(TH) - 8, 5, 0, Math.PI * 2); ctx.fill();
      });
      // NOW line; a cue reaching NOW fires onCue -> the toast consumer
      const TOAST = { w: 116, h: 18, life: 2.4, max: 3 };   // toast cosmetics
      const firing = s.sample(0, t * SPEED) >= TH;
      if (firing && !state.wasFiring) state.toasts.push({ t0: t, name: s.waveName });   // onCue()
      state.wasFiring = firing;
      state.toasts = state.toasts.filter(toast => t - toast.t0 < TOAST.life).slice(-TOAST.max);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(NOW_X, h * 0.1); ctx.lineTo(NOW_X, h * 0.9); ctx.stroke();
      // bell badge at NOW, swells when a cue is firing
      ctx.fillStyle = firing ? palette.peach : palette.line;
      ctx.beginPath(); ctx.arc(NOW_X, h * 0.2, firing ? 13 : 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.ink;
      ctx.font = "600 12px Oswald, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("!", NOW_X, h * 0.2);
      ctx.textAlign = "left";
      state.toasts.forEach((toast, i) => {
        const age = t - toast.t0;
        const slide = Math.min(1, age * 4);
        const alpha = age > TOAST.life - 0.6 ? Math.max(0, (TOAST.life - age) / 0.6) : 1;
        const tx = w * 0.03 + (slide - 1) * 40;
        const ty = h * 0.34 + i * (TOAST.h + 5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = palette.peach;
        ctx.fillRect(tx, ty, TOAST.w, TOAST.h);
        ctx.fillStyle = palette.ink;
        ctx.font = "600 9px Oswald, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(`● ${toast.name}`, tx + 6, ty + TOAST.h / 2);
        ctx.globalAlpha = 1;
      });
      label(ctx, "NOW", NOW_X - 13, h * 0.96, palette.ink, 10);
      label(ctx, `TH ${TH}`, w - 44, yOf(TH) - 8, palette.muted, 9);
      label(ctx, `temperament: ${s.waveName}`, w * 0.42, 18, palette.muted, 11);
      if (s.shifting) label(ctx, `forecast rewriting -> ${s.targetName}`, w * 0.42, h - 12, palette.peach, 10);
      else label(ctx, `${cues.length} alerts on the horizon`, w * 0.42, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s, toasts = [], wasFiring = false;
const TH = 0.74;       // alert threshold
const HORIZON = 6;     // t-units of visible future
const SPEED = 1.1;     // schedule tempo
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'all', range: [0, 1] });
}
const nowX = () => width * 0.2;
const yOf = v => height * 0.84 - v * height * 0.46;
// the integration point: swap this for your own handler (autosave, sound, badge…)
function onCue(name, t) { toasts.push({ t0: t, name }); }
// the wave IS the schedule: read the next HORIZON t-units, collect crossings
function forecast(t) {
  const curve = [], cues = [];
  let prev = s.sample(0, t * SPEED);
  for (let x = nowX(); x <= width; x += 2) {
    const v = s.sample(0, (t + (x - nowX()) / (width - nowX()) * HORIZON) * SPEED);
    curve.push([x, yOf(v)]);
    if (prev < TH && v >= TH) cues.push(x);   // an alert will fire here
    prev = v;
  }
  return { curve, cues };
}
function drawToasts(t) {
  toasts = toasts.filter(o => t - o.t0 < 2.4).slice(-3);
  noStroke();
  toasts.forEach((o, i) => {
    const age = t - o.t0, x = width * 0.03 + (min(1, age * 4) - 1) * 60, y = height * 0.34 + i * 30;
    fill(246, 167, 150, age > 1.8 ? map(age, 1.8, 2.4, 255, 0) : 255);
    rect(x, y, 150, 24);
    fill(0); textSize(11); text('● ' + o.name, x + 8, y + 16);
  });
}
function draw() {
  background(255);
  const scrub = mouseIsPressed ? map(mouseX, 0, width, 0, HORIZON) : 0;   // drag to scrub
  const t = millis() / 600 + scrub;
  const { curve, cues } = forecast(t);
  // the forecast curve, threshold and upcoming alert markers
  noFill(); stroke(0); strokeWeight(1.6);
  beginShape(); for (const [x, y] of curve) vertex(x, y); endShape();
  stroke(150); line(nowX(), yOf(TH), width, yOf(TH));
  noStroke(); fill('#f6a796');
  for (const x of cues) circle(x, yOf(TH) - 8, 10);
  stroke(0); line(nowX(), height * 0.1, nowX(), height * 0.9);   // NOW
  const firing = s.sample(0, t * SPEED) >= TH;
  if (firing && !wasFiring) onCue(s.waveName, t);   // a crossing reaches NOW
  wasFiring = firing;
  noStroke(); fill(firing ? '#f6a796' : 220); circle(nowX(), height * 0.2, firing ? 28 : 22);
  fill(0); textSize(13); textAlign(CENTER, CENTER); text('!', nowX(), height * 0.2);
  textAlign(LEFT, BASELINE);
  drawToasts(t);
  fill(120); textSize(11);
  text('temperament: ' + s.waveName, width * 0.42, 20);
  text(s.shifting ? 'forecast rewriting -> ' + s.targetName : cues.length + ' alerts on the horizon', width * 0.42, height - 10);
  if (mouseIsPressed) text('scrubbing +' + nf(scrub, 1, 1) + 't', width * 0.42, height - 26);
}`)
  },

  {
    id: "transition-meter",
    name: "Formula Mix Section",
    category: "state",
    role: "Sampler.mix becomes a section cut through current and target formulas, not just a progress ring.",
    tags: ["mix", "transition", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "state transitions",
    notes: "The useful part is the relationship between waveName, targetName and mix: the transition itself becomes inspectable material.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: "all" });
      }
      state.sampler.sample(0, t);
      const s = state.sampler;
      const mix = s.mix || 0;
      const top = h * 0.26;
      const mid = h * 0.52;
      const bot = h * 0.78;
      const amp = h * 0.12;
      function drawFormula(name, y, color, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const v = Waves.wave(x * 0.02, { wave: name, t: t * 0.9, amplitude: 1 });
          if (x === 0) ctx.moveTo(x, y + v * amp);
          else ctx.lineTo(x, y + v * amp);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      drawFormula(s.waveName, top, palette.ink, 0.7);
      drawFormula(s.targetName, bot, palette.peach, 0.7);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        // Native morph: wave [a, b] + mix blends the formulas inside the library
        const v = Waves.wave(x * 0.02, { wave: [s.waveName, s.targetName], mix, t: t * 0.9, amplitude: 1 });
        if (x === 0) ctx.moveTo(x, mid + v * amp);
        else ctx.lineTo(x, mid + v * amp);
      }
      ctx.stroke();
      ctx.fillStyle = palette.line;
      ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, 5);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(w * 0.08, h * 0.08, w * 0.84 * mix, 5);
      label(ctx, s.waveName.toUpperCase(), 12, top - amp - 8, palette.ink, 10);
      label(ctx, "MIX " + mix.toFixed(2), 12, mid - amp - 8, palette.ink, 10);
      label(ctx, s.targetName.toUpperCase(), 12, bot - amp - 8, palette.peach, 10);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2, shiftDuration: 0.8, group: 'all' });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const mix = s.mix || 0;
  drawFormula(s.waveName, height * 0.26, 0, 120);
  drawFormula(s.targetName, height * 0.78, '#f6a796', 180);
  noFill(); stroke(0); strokeWeight(3); beginShape();
  for (let x = 0; x <= width; x += 4) {
    // Native morph: wave [a, b] + mix blends the formulas inside the library
    const v = Waves.wave(x * 0.02, { wave: [s.waveName, s.targetName], mix, t: t * 0.9, amplitude: 1 });
    vertex(x, height * 0.52 + v * height * 0.12);
  }
  endShape();
}
function drawFormula(name, y, color, alpha) {
  noFill(); stroke(color); drawingContext.globalAlpha = alpha / 255; strokeWeight(2); beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, y + Waves.wave(x * 0.02, { wave: name, t: millis() / 600 * 0.9, amplitude: 1 }) * height * 0.12);
  endShape(); drawingContext.globalAlpha = 1;
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
    notes: "Unrelated modes share no visuals. The shift is the only trigger; sampler.shifting + mix crossfades the handover. (Preview cycles four modes; the snippet keeps two so the dispatch pattern stays readable.)",
    state: { sampler: null, prevMode: 0, nextMode: 1, wasShifting: false },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
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
// Function Switcher: the SHIFT is the dispatch trigger.
// Each completed shift advances which graphic job runs;
// sampler.mix crossfades the handover.
let s, prev = 0, next = 1, wasShifting = false;
const modes = [drawCurve, drawType];

function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.5, shiftDuration: 1, group: 'gentle' });
}

function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  if (!wasShifting && s.shifting) { prev = next; next = (next + 1) % modes.length; }
  wasShifting = s.shifting;
  if (s.shifting) {
    push(); drawingContext.globalAlpha = 1 - s.mix; modes[prev](t, s);
    drawingContext.globalAlpha = s.mix; modes[next](t, s); pop();
  } else modes[next](t, s);
  fill(0); noStroke(); textSize(11);
  text(s.shifting ? 'SWITCHING…' : 'MODE ' + next, 14, 22);
}

function drawCurve(t, s) {
  noFill(); stroke(0); strokeWeight(2);
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, height / 2 + s.sample(x * 0.02, t) * height * 0.32);
  endShape();
}

function drawType(t, s) {
  fill(0); noStroke(); textSize(54); textAlign(CENTER, CENTER);
  text(s.waveName.toUpperCase(), width / 2, height / 2);
  textAlign(LEFT, BASELINE);
}`)
  },

  {
    id: "rhythmic-divider",
    name: "Self-Naming Divider",
    category: "layout",
    role: "DrawDivider(y, caption, periods): a reusable section rule that stays perfectly level at any density because it sweeps whole sampler.period cycles — the ends are twins by construction.",
    tags: ["divider", "closing", "period", "waveName", "system"],
    primitive: PRIMITIVES.sampler,
    reuse: "section breaks, chapter ornaments, print rules",
    notes: "The value is the self-leveling rule: whole periods make the first and last dash identical, so one drawDivider() call drops a balanced ornament at any width or density — three stacked here, print-ready under noLoop(). The flourish: leave caption null and the rule signs itself with waveName, and each letter rides the very formula it names, so the caption surfs its own wave while a shift changes the name over on s.mix.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "closing", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      const MARKS = 30;              // dashes per rule
      const GAP = [0.36, 0.64];      // caption window (fractions of span)
      const THICK = [2, 12];         // dash thickness range in px
      const span = w * 0.86, sx = w * 0.07;
      let delta = 0;
      // the reusable unit: one rule, one caption, one density
      const drawDivider = (y, caption, periods) => {
        let first = 0, last = 0;
        for (let i = 0; i < MARKS; i++) {
          const u = i / (MARKS - 1);
          const v = s.sample(u * P * periods, t * 0.6);
          if (i === 0) first = v;
          if (i === MARKS - 1) last = v;
          if (u > GAP[0] && u < GAP[1]) continue;   // hold room for the caption
          const thick = lerp(THICK[0], THICK[1], norm(v));
          ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
          ctx.fillRect(sx + u * span, y - thick / 2, 3, thick);
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx + GAP[0] * span, y - 11, (GAP[1] - GAP[0]) * span, 22);
        ctx.clip();
        ctx.font = "600 11px Oswald, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // caption surfs its own rule: each letter lifts by the wave sampled at its x
        const STEP = 7;   // px per letter
        const surf = (text, baseY, col) => {
          const str = `· ${text} ·`;
          const startX = w / 2 - (str.length - 1) * STEP / 2;
          ctx.fillStyle = col;
          for (let k = 0; k < str.length; k++) {
            const lx = startX + k * STEP;
            const lift = s.sample((lx - sx) / span * P * periods, t * 0.6) * 6;
            ctx.fillText(str[k], lx, baseY + lift);
          }
        };
        const cap = caption || s.waveName;
        if (s.shifting && !caption) {
          const slide = s.mix * 22;   // changeover rides the live morph
          surf(cap, y + slide, palette.ink);
          surf(s.targetName, y - 22 + slide, palette.peach);
        } else {
          surf(cap, y, palette.ink);
        }
        ctx.restore();
        ctx.textAlign = "left";
        return Math.abs(first - last) * THICK[1];
      };
      // paragraphs part while the naming rule changes over
      const part = s.shifting ? Math.sin(s.mix * Math.PI) * h * 0.035 : 0;
      ctx.fillStyle = palette.line;
      ctx.fillRect(w * 0.07, h * 0.1, w * 0.8, 4);
      ctx.fillRect(w * 0.07, h * 0.38 - part, w * 0.86, 4);
      ctx.fillRect(w * 0.07, h * 0.62 + part, w * 0.7, 4);
      ctx.fillRect(w * 0.07, h * 0.9, w * 0.75, 4);
      drawDivider(h * 0.24, "interlude", 1);   // custom caption, sparse
      delta = drawDivider(h * 0.5, null, 2);   // signs itself
      drawDivider(h * 0.76, "coda", 3);        // custom caption, dense
      label(ctx, `ends Δ ${delta.toFixed(2)}px`, 14, h - 8, palette.muted, 9);
    },
    sketch: sketchTemplate(`
let s;
const MARKS = 30;            // dashes per rule
const GAP = [0.36, 0.64];    // caption window (fractions of span)
const THICK = [2, 12];       // dash thickness range in px
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noStroke();
  s = Waves.createSampler({ shift: true, group: 'closing', range: [-1, 1] });
  // static print: call noLoop() and draw once with a fixed t
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  // paragraphs part while the naming rule changes over
  const part = s.shifting ? sin(s.mix * PI) * height * 0.035 : 0;
  fill(220);
  rect(width * 0.07, height * 0.1, width * 0.8, 4);
  rect(width * 0.07, height * 0.38 - part, width * 0.86, 4);
  rect(width * 0.07, height * 0.62 + part, width * 0.7, 4);
  rect(width * 0.07, height * 0.9, width * 0.75, 4);
  drawDivider(height * 0.24, 'interlude', 1);   // custom caption, sparse
  drawDivider(height * 0.5, null, 2);           // null -> signs itself with waveName
  drawDivider(height * 0.76, 'coda', 3);        // custom caption, dense
}
// the reusable unit: one rule, one caption, one density
function drawDivider(y, caption, periods) {
  const t = millis() / 600;
  const P = s.period || TWO_PI;
  const span = width * 0.86, sx = width * 0.07;
  for (let i = 0; i < MARKS; i++) {
    const u = i / (MARKS - 1);
    const v = s.sample(u * P * periods, t * 0.6);   // whole periods -> level ends
    if (u > GAP[0] && u < GAP[1]) continue;
    const thick = lerp(THICK[0], THICK[1], (v + 1) / 2);
    fill(s.shifting ? '#f6a796' : 0);
    rect(sx + u * span, y - thick / 2, 3, thick);
  }
  const cap = caption || s.waveName;
  textSize(12); textAlign(CENTER, CENTER);
  // caption surfs its own rule: each letter lifts by the wave sampled at its x
  const surf = (txt, baseY, col) => {
    const str = '· ' + txt + ' ·', STEP = 7;
    const startX = width / 2 - (str.length - 1) * STEP / 2;
    fill(col);
    for (let k = 0; k < str.length; k++) {
      const lx = startX + k * STEP;
      const lift = s.sample((lx - sx) / span * P * periods, t * 0.6) * 6;
      text(str[k], lx, baseY + lift);
    }
  };
  if (s.shifting && !caption) {
    const slide = s.mix * 22;      // changeover rides the live morph
    surf(cap, y + slide, 0);
    surf(s.targetName, y - 22 + slide, color('#f6a796'));
  } else {
    surf(cap, y, 0);
  }
  textAlign(LEFT, BASELINE);
}`)
  },

  {
    id: "cursor-echo",
    name: "Live Connector",
    category: "motion",
    role: "DrawConnector(a, b, calm) draws a validated node-graph edge: drag speed is the connection's tension, and a reckless drop is rejected as invalid — the wave carries the feedback.",
    tags: ["mix", "gentle", "harsh", "connector", "validation"],
    primitive: PRIMITIVES.sampler,
    reuse: "node editors, flow builders, link validation",
    notes: "The reusable job: one drawConnector() wires a whole graph, and the edge's calm-vs-agitated look tells you the link is settling (valid) or being flung too fast (rejected). Drag speed drives mix between a gentle and a harsh pool — a fixed wave:[a,b] cannot blend two live formulas, which is exactly why two shifting samplers are used, each re-dealing its formula and announcing it via targetName. All wave math lives in one documented helper.",
    state: { calm: null, rush: null, px: 0, py: 0, mix: 0, snapT: -10 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      const NODES = [[0.12, 0.2], [0.09, 0.5], [0.13, 0.82]];  // sources (fractions of w,h)
      const SPEED_REF = 14;   // px/frame that counts as full rush
      const SMOOTH = 0.07;    // temper inertia (lower = slower mood swings)
      const WOBBLE = 9;       // wave cycles along an edge
      const SNAP_AT = 0.85;   // mix level where the edges snap
      const SNAP_HOLD = 1.2;  // t-units the snap lasts
      if (!state.calm) {
        state.calm = syncedSampler({ shift: true, group: "gentle", range: [-1, 1] });
        state.rush = syncedSampler({ shift: true, group: "harsh", range: [-1, 1] });
        state.px = w * 0.7; state.py = h * 0.4;
      }
      // autopilot pointer: cruises, then darts — its speed is what we measure
      const px = w * (0.62 + 0.26 * Math.cos(t * 0.7 + Math.sin(t * 0.37) * 2.2));
      const py = h * (0.45 + 0.3 * Math.sin(t * 1.15 + Math.cos(t * 0.5)));
      const speed = Math.hypot(px - state.px, py - state.py);
      state.px = px; state.py = py;
      state.mix += (clamp(speed / SPEED_REF, 0, 1) - state.mix) * SMOOTH;
      const mix = state.mix;
      const rejected = t - state.snapT < SNAP_HOLD;   // link flung too fast -> invalid
      if (mix > SNAP_AT && !rejected) { state.snapT = t; state.mix = 0.4; }
      // AMP = wobble height; along a strand u runs 0..1, env pins the ends to the nodes.
      const AMP = h * 0.11;
      const wobbleAt = (u, phase) => lerp(
        state.calm.sample(u * WOBBLE + t * 3 + phase, t),   // valid: gentle pool
        state.rush.sample(u * WOBBLE + t * 3 + phase, t),   // agitated: harsh pool
        mix
      ) * AMP;
      // the reusable unit: one edge between two points, phase decorrelates edges
      const drawConnector = (ax, ay, bx, by, phase) => {
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const nx = -(by - ay) / len, ny = (bx - ax) / len;   // unit normal to the edge
        const strand = (u0, u1, pinEnd) => {
          ctx.beginPath();
          for (let i = 0; i <= 36; i++) {
            const u = lerp(u0, u1, i / 36);
            // full edge: pinned both ends. Rejected stub: pinned at the node, loose at the tear.
            const env = pinEnd ? Math.sin((u - u0) / (u1 - u0) * Math.PI / 2) : Math.sin(u * Math.PI);
            const off = wobbleAt(u, phase) * env;
            ctx[i === 0 ? "moveTo" : "lineTo"](lerp(ax, bx, u) + nx * off, lerp(ay, by, u) + ny * off);
          }
          ctx.stroke();
        };
        if (rejected) { strand(0, 0.42, true); strand(1, 0.58, true); }  // torn in two
        else strand(0, 1, false);
      };
      ctx.strokeStyle = rejected || mix > 0.5 ? palette.peach : palette.ink;
      ctx.lineWidth = 1.8;
      NODES.forEach(([fx, fy], i) => drawConnector(w * fx, h * fy, px, py, i * 7));
      // node cards
      const node = (x, y, tag) => {
        ctx.fillStyle = palette.panel;
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x - 14, y - 9, 28, 18);
        ctx.strokeRect(x - 14, y - 9, 28, 18);
        label(ctx, tag, x - 4, y, palette.ink, 9);
      };
      NODES.forEach(([fx, fy], i) => node(w * fx, h * fy, String(i + 1)));
      node(px, py, "B");
      // the pair re-deals itself: announce it
      const deal = state.calm.shifting ? `re-deal calm -> ${state.calm.targetName}`
        : state.rush.shifting ? `re-deal rush -> ${state.rush.targetName}` : null;
      label(ctx, `calm: ${state.calm.waveName} · rush: ${state.rush.waveName}`, 14, 18, palette.muted, 10);
      label(
        ctx,
        rejected ? "link rejected — dropped too fast" : deal || (mix > 0.5 ? `tension ${mix.toFixed(2)} — hold steady` : `valid · tension ${mix.toFixed(2)}`),
        14, h - 12,
        rejected || mix > 0.5 ? palette.peach : palette.muted, 10
      );
    },
    sketch: sketchTemplate(`
let calm, rush, mix = 0, snapT = -10;
const NODES = [[0.12, 0.2], [0.09, 0.5], [0.13, 0.82]];  // sources (fractions of w,h)
const SPEED_REF = 14;   // px/frame that counts as full rush
const SMOOTH = 0.07;    // temper inertia (lower = slower mood swings)
const WOBBLE = 9;       // wave cycles along an edge
const SNAP_AT = 0.85;   // mix level where the edges snap
const SNAP_HOLD = 1.2;  // t-units the snap lasts
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noFill();
  // two shifting pools: the temperament pair re-deals itself over time
  calm = Waves.createSampler({ shift: true, group: 'gentle', range: [-1, 1] });
  rush = Waves.createSampler({ shift: true, group: 'harsh', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  // drag speed = link tension: fling it too fast and the edge is rejected as invalid
  mix += (constrain(dist(mouseX, mouseY, pmouseX, pmouseY) / SPEED_REF, 0, 1) - mix) * SMOOTH;
  const rejected = t - snapT < SNAP_HOLD;
  if (mix > SNAP_AT && !rejected) { snapT = t; mix = 0.4; }
  stroke(rejected || mix > 0.5 ? '#f6a796' : 0); strokeWeight(1.8);
  NODES.forEach((n, i) => drawConnector(width * n[0], height * n[1], mouseX, mouseY, i * 7, rejected));
  NODES.forEach((n, i) => drawNode(width * n[0], height * n[1], str(i + 1)));
  drawNode(mouseX, mouseY, 'B');
  const deal = calm.shifting ? 're-deal calm -> ' + calm.targetName
    : rush.shifting ? 're-deal rush -> ' + rush.targetName : null;
  noStroke(); fill(rejected || mix > 0.5 ? '#f6a796' : 120); textSize(11);
  text(rejected ? 'link rejected — dropped too fast' : deal || 'valid · tension ' + nf(mix, 1, 2), 14, height - 10);
  fill(120); textSize(10);
  text('calm: ' + calm.waveName + ' · rush: ' + rush.waveName, 14, 20);
}
// the reusable unit: one edge between two points, phase decorrelates edges
function drawConnector(ax, ay, bx, by, phase, rejected) {
  if (rejected) { strand(ax, ay, bx, by, phase, 0, 0.42); strand(ax, ay, bx, by, phase, 1, 0.58); }
  else strand(ax, ay, bx, by, phase, 0, 1);
}
// one wobbling strand from u0 to u1; env pins the ends, mix blends the two pools
function strand(ax, ay, bx, by, phase, u0, u1) {
  const t = millis() / 600;
  const len = max(1, dist(ax, ay, bx, by));
  const nx = -(by - ay) / len, ny = (bx - ax) / len;   // unit normal to the edge
  beginShape();
  for (let i = 0; i <= 36; i++) {
    const u = lerp(u0, u1, i / 36);
    const env = (u0 === 0 && u1 === 1) ? sin(u * PI) : sin(abs(u - u0) / abs(u1 - u0) * HALF_PI);
    const off = lerp(calm.sample(u * WOBBLE + t * 3 + phase, t), rush.sample(u * WOBBLE + t * 3 + phase, t), mix) * env * height * 0.11;
    vertex(lerp(ax, bx, u) + nx * off, lerp(ay, by, u) + ny * off);
  }
  endShape();
}
function drawNode(x, y, tag) {
  fill(255); stroke(0); strokeWeight(1.5); rect(x - 17, y - 11, 34, 22);
  noStroke(); fill(0); textSize(10); text(tag, x - 3, y + 4);
  noFill(); stroke(0);
}`)
  },

  {
    id: "strobe-newt",
    name: "Strobe Newt",
    category: "color",
    role: "An electric little creature that flicks between lemon and ink on unpredictable beats, on a calm panel.",
    tags: ["wild", "flicker", "up down pulse"],
    primitive: PRIMITIVES.wave,
    reuse: "warning chips, attention states",
    notes: "Mode: 'wild' + unpredictability bends the underlying pulse so it never lands on the same beat twice. Plain sin() can't break its own pattern: this newt only exists with p5.waves.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(Waves.wave(0, {
        wave: "up down pulse",
        mode: "wild",
        unpredictability: 0.75,
        t: t * 1.6,
        amplitude: 1
      }));
      const on = v > 0.5;
      // only the central creature reacts; the panel stays calm like the other cards
      const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.26;
      ctx.fillStyle = on ? palette.lemon : palette.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      // newt eye: pupil shifts side to side as it blinks
      ctx.fillStyle = on ? palette.ink : palette.lemon;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? palette.lemon : palette.ink;
      ctx.beginPath();
      ctx.arc(cx + (on ? 6 : -6), cy, R * 0.2, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, on ? "SPARK" : "DARK", 14, h * 0.93, palette.muted, 11);
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); }
function draw() {
  background(255);
  const v = (Waves.wave(0, {
    wave: 'up down pulse',
    mode: 'wild',
    unpredictability: 0.75,
    t: millis() / 600 * 1.6,
    amplitude: 1
  }) + 1) / 2;
  const on = v > 0.5;
  // only the central creature reacts; the background stays calm
  const cx = width / 2, cy = height / 2, R = min(width, height) * 0.26;
  noStroke();
  fill(on ? '#f3e679' : 0);
  circle(cx, cy, R * 2);
  fill(on ? 0 : '#f3e679');
  circle(cx, cy, R);
  fill(on ? '#f3e679' : 0);
  circle(cx + (on ? 6 : -6), cy, R * 0.4);
}`)
  },

  {
    id: "hover-pulse",
    name: "CTA Pulse Compare",
    category: "interface",
    role: "Stable and wild versions of the same pulse show why the button's attention pattern is a wave choice.",
    tags: ["button", "wild", "compare"],
    primitive: PRIMITIVES.wave,
    reuse: "cta buttons",
    notes: "Same wave, two modes: stable is polite, wild adds unpredictability for urgent states without writing a second animation.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const stable = norm(Waves.wave(0, { wave: "wobble sine", t: t * 1.0, amplitude: 1 }));
      const wild = norm(Waves.wave(0, { wave: "wobble sine", mode: "wild", unpredictability: 0.7, t: t * 1.0, amplitude: 1 }));
      const items = [
        { label: "STABLE", value: stable, x: w * 0.08, color: palette.mint },
        { label: "WILD", value: wild, x: w * 0.53, color: palette.lemon }
      ];
      items.forEach(item => {
        const bx = item.x;
        const by = h * 0.38;
        const bw = w * 0.39;
        const bh = h * 0.24;
        ctx.fillStyle = item.color;
        ctx.globalAlpha = 0.22 + item.value * 0.62;
        ctx.fillRect(bx - 8 - item.value * 10, by - 8 - item.value * 10, bw + 16 + item.value * 20, bh + 16 + item.value * 20);
        ctx.globalAlpha = 1;
        ctx.fillStyle = palette.ink;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = palette.paper;
        ctx.font = "600 13px Oswald, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, bx + bw / 2, by + bh / 2);
        label(ctx, item.label, bx, by - 22, palette.muted, 11);
      });
      ctx.textAlign = "left";
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 600;
  const stable = (Waves.wave(0, { wave: 'wobble sine', t, amplitude: 1 }) + 1) / 2;
  const wild = (Waves.wave(0, { wave: 'wobble sine', mode: 'wild', unpredictability: 0.7, t, amplitude: 1 }) + 1) / 2;
  drawButton(width * 0.08, 'STABLE', stable, '#c7e89c');
  drawButton(width * 0.53, 'WILD', wild, '#f3e679');
}
function drawButton(x, label, v, color) {
  const by = height * 0.38, bw = width * 0.39, bh = height * 0.24;
  noStroke(); fill(color); drawingContext.globalAlpha = 0.22 + v * 0.62;
  rect(x - 8 - v * 10, by - 8 - v * 10, bw + 16 + v * 20, bh + 16 + v * 20);
  drawingContext.globalAlpha = 1; fill(0); rect(x, by, bw, bh);
  fill(244); textSize(13); textAlign(CENTER, CENTER); text(label, x + bw / 2, by + bh / 2);
}`)
  },

  {
    id: "mode-switcher",
    name: "Mode Switcher",
    category: "state",
    role: "A wave-driven segmented control whose snap law keeps changing: the quantizer behind the selector shifts formula family.",
    tags: ["segmented", "shift", "group", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "view switchers",
    notes: "A single floor(sin()) gives one snap feel forever. A sampler shifting across a quantizer pool (stepped sine, steps, square, steps down) changes how the selector lands; waveName names the active snap law.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.7, group: ["stepped sine", "steps", "square", "steps down"], range: [-1, 1] });
      }
      const s = state.sampler;
      const modes = ["LIVE", "DRAFT", "ARCHIVE"];
      const v = norm(s.sample(0, t * 1.0));
      const active = clamp(Math.floor(v * modes.length), 0, modes.length - 1);
      const total = w * 0.84;
      const startX = w * 0.08;
      const segW = total / modes.length;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, h * 0.32, total, h * 0.3);
      modes.forEach((m, i) => {
        const sx = startX + i * segW;
        if (i === active) {
          ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
          ctx.fillRect(sx, h * 0.32, segW, h * 0.3);
        }
        ctx.fillStyle = i === active ? palette.paper : palette.ink;
        ctx.font = "600 14px Oswald, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m, sx + segW / 2, h * 0.47);
      });
      ctx.textAlign = "left";
      label(ctx, s.shifting ? `SNAP ${s.waveName} -> ${s.targetName}` : `SNAP ${s.waveName}`, startX, h * 0.76, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
const modes = ['LIVE', 'DRAFT', 'ARCHIVE'];
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.7, group: ['stepped sine', 'steps', 'square', 'steps down'], range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  const v = (s.sample(0, t * 1.0) + 1) / 2;
  const active = constrain(floor(v * modes.length), 0, modes.length - 1);
  const total = width * 0.84, sx = width * 0.08, sw = total / modes.length;
  noFill(); stroke(0); strokeWeight(1.5);
  rect(sx, height * 0.32, total, height * 0.3);
  noStroke(); textAlign(CENTER, CENTER); textSize(14);
  for (let i = 0; i < modes.length; i++) {
    const x = sx + i * sw;
    if (i === active) { fill(s.shifting ? '#f6a796' : 0); rect(x, height * 0.32, sw, height * 0.3); }
    fill(i === active ? 244 : 0); text(modes[i], x + sw / 2, height * 0.47);
  }
  textAlign(LEFT, BASELINE); fill(120); textSize(11);
  text(s.shifting ? 'SNAP ' + s.waveName + ' -> ' + s.targetName : 'SNAP ' + s.waveName, sx, height * 0.76);
}`)
  },

  {
    id: "mask-aperture",
    name: "Formula Keyhole",
    category: "interface",
    role: "An organic image-reveal mask whose contour IS the wave: a closing-pool formula wrapped polar via sampler.period seals with no seam. Two apertures share one sampler and morph in place.",
    tags: ["closing", "period", "mask", "reveal"],
    primitive: PRIMITIVES.sampler,
    reuse: "image reveals, hero sections, hover peeks",
    notes: "The job is a seamless soft mask: r = R + sample(u) with u sweeping whole periods, so the outline closes by construction and destination-out (which erases the cover wherever the path fills) never leaks a seam — swap the checkerboard for image(img,...) and it is production-ready. Both apertures run the same sampler a phase apart, fixed in place so the eye follows the transformation, not a moving hole; give the second one the pointer for a hover peek. The memorable hook: while a shift morphs, the formula is literally cut into a key whose teeth are one period of the wave, and the reveal springs UNLOCKED when the key is done.",
    state: { sampler: null, wasShifting: false, unlockT: -10, open: 0.62 },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      const LOBES = 6;        // whole periods around the contour
      const N = 120;          // contour resolution
      const CUT_OPEN = 0.45;  // aperture while a new key is being cut
      const OPEN_HOLD = 2.2;  // t-units the unlock stays wide
      const RELOCK = 0.08;    // relock speed per t-unit after the hold
      const FLASH = 1.5;      // t-units the UNLOCKED label shows
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "closing", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      // lock state machine: shift = cutting a key; shift end = unlock; then relock
      if (state.wasShifting && !s.shifting) state.unlockT = t;
      state.wasShifting = s.shifting;
      const since = t - state.unlockT;
      const target = s.shifting ? CUT_OPEN : since < OPEN_HOLD ? 1 : Math.max(0.62, 1 - (since - OPEN_HOLD) * RELOCK);
      state.open += (target - state.open) * 0.1;
      // stand-in artwork behind the cover
      const cols = 11, rows = 6, cw = w / cols, chh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (c + r) % 2 ? palette.ink : palette.sky;
          ctx.fillRect(c * cw, r * chh, cw + 0.5, chh + 0.5);
        }
      }
      // two apertures share one sampler at different phases, both fixed in place —
      // so the eye follows the seamless morphing of the contour, not a moving hole
      const HOLES = [
        { cx: w * 0.34, cy: h * 0.5, R: Math.min(w, h) * 0.26, A: Math.min(w, h) * 0.09, dt: 0, open: state.open },
        { cx: w * 0.72, cy: h * 0.6, R: Math.min(w, h) * 0.13, A: Math.min(w, h) * 0.05, dt: 1.3, open: 1 }
      ];
      const keyholePath = hole => {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2;
          const u = (i / N) * P * LOBES;              // whole periods -> seals clean
          const r = (hole.R + s.sample(u, (t - hole.dt) * 0.7) * hole.A) * hole.open;
          const x = hole.cx + Math.cos(a) * r;
          const y = hole.cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      // cover panel with the keyholes cut out
      ctx.save();
      ctx.fillStyle = palette.panel;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "destination-out";
      HOLES.forEach(hole => { keyholePath(hole); ctx.fill(); });
      ctx.restore();
      ctx.strokeStyle = s.shifting ? palette.peach : palette.ink;
      ctx.lineWidth = 1.5;
      HOLES.forEach(hole => { keyholePath(hole); ctx.stroke(); });
      // the literal key, on its own opaque card so the moving artwork never shows
      // through it: the teeth are exactly one period of the current formula
      const card = { x: w * 0.6, y: 3, w: w * 0.38, h: 40 };
      ctx.fillStyle = palette.panel;
      ctx.fillRect(card.x, card.y, card.w, card.h);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
      label(ctx, "KEY · 1 PERIOD", card.x + 7, card.y + 9, palette.muted, 8);
      const KEY = { x0: card.x + 8, x1: card.x + card.w - 8, y: card.y + 20, base: 2.5, teeth: 11, n: 24 };
      ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
      ctx.beginPath();
      ctx.moveTo(KEY.x0, KEY.y);
      ctx.lineTo(KEY.x1, KEY.y);                          // shaft
      for (let i = KEY.n; i >= 0; i--) {
        const u = (i / KEY.n) * P;                        // exactly one period of teeth
        const tooth = KEY.base + norm(s.sample(u, t * 0.7)) * KEY.teeth;
        ctx.lineTo(KEY.x0 + (i / KEY.n) * (KEY.x1 - KEY.x0), KEY.y + tooth);
      }
      ctx.closePath();
      ctx.fill();
      if (s.shifting) {
        label(ctx, `cutting new key -> ${s.targetName}`, 14, 18, palette.peach, 11);
      } else if (since < FLASH) {
        label(ctx, `unlocked · ${s.waveName}`, 14, 18, palette.peach, 12);
      } else {
        label(ctx, `locked · key: ${s.waveName}`, 14, 18, palette.muted, 11);
      }
      label(ctx, `period ${P.toFixed(2)} × ${LOBES} · seals by construction`, 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s, wasShifting = false, unlockT = -10, open = 0.62;
const LOBES = 6;        // whole periods around the contour
const N = 120;          // contour resolution
const CUT_OPEN = 0.45;  // aperture while a new key is being cut
const OPEN_HOLD = 2.2;  // t-units the unlock stays wide
const RELOCK = 0.08;    // relock speed per t-unit after the hold
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'closing', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const P = s.period || TWO_PI;
  // lock state machine: shift = cutting a key; shift end = unlock; then relock
  if (wasShifting && !s.shifting) unlockT = t;
  wasShifting = s.shifting;
  const since = t - unlockT;
  const target = s.shifting ? CUT_OPEN : since < OPEN_HOLD ? 1 : max(0.62, 1 - (since - OPEN_HOLD) * RELOCK);
  open += (target - open) * 0.1;
  // stand-in artwork — swap for image(img, 0, 0, width, height)
  const cols = 11, rows = 6, cw = width / cols, ch = height / rows;
  noStroke();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    fill((c + r) % 2 ? 17 : '#b8d2ff'); rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
  }
  // two apertures, one sampler, a phase apart — both fixed so the morph reads.
  // swap the second cx/cy for mouseX/mouseY to make it a hover peek instead.
  const HOLES = [
    { cx: width * 0.34, cy: height * 0.5, R: height * 0.26, A: height * 0.09, dt: 0, open: open },
    { cx: width * 0.72, cy: height * 0.6, R: height * 0.13, A: height * 0.05, dt: 1.3, open: 1 }
  ];
  // cover panel; destination-out erases it wherever the keyhole path fills
  drawingContext.save();
  fill(255); rect(0, 0, width, height);
  drawingContext.globalCompositeOperation = 'destination-out';
  for (const hole of HOLES) keyhole(t, P, hole, true);
  drawingContext.restore();
  noFill(); stroke(s.shifting ? '#f6a796' : 0); strokeWeight(1.5);
  for (const hole of HOLES) keyhole(t, P, hole, false);
  // the literal key, on its own opaque card so the moving artwork never shows through it
  const cardX = width * 0.6, cardY = 4, cardW = width * 0.38, cardH = 44;
  noStroke(); fill(255); rect(cardX, cardY, cardW, cardH);
  stroke(220); strokeWeight(1); noFill(); rect(cardX, cardY, cardW, cardH);
  noStroke(); fill(120); textSize(9); text('KEY · 1 PERIOD', cardX + 8, cardY + 13);
  const kx0 = cardX + 10, kx1 = cardX + cardW - 10, ky = cardY + 22;
  fill(s.shifting ? '#f6a796' : 0);
  beginShape();
  vertex(kx0, ky); vertex(kx1, ky);               // shaft
  for (let i = 24; i >= 0; i--) {
    const u = (i / 24) * P;                        // exactly one period of teeth
    vertex(kx0 + (i / 24) * (kx1 - kx0), ky + 2.5 + ((s.sample(u, t * 0.7) + 1) / 2) * 12);
  }
  endShape(CLOSE);
  noStroke(); textSize(11);
  if (s.shifting) { fill('#f6a796'); text('cutting new key -> ' + s.targetName, 14, 20); }
  else if (since < 1.5) { fill('#f6a796'); text('unlocked · ' + s.waveName, 14, 20); }
  else { fill(120); text('locked · key: ' + s.waveName, 14, 20); }
  fill(120); text('period ' + nf(P, 1, 2) + ' × ' + LOBES + ' · seals by construction', 14, height - 10);
}
function keyhole(t, P, hole, filled) {
  if (filled) { noStroke(); fill(255); }
  beginShape();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TWO_PI;
    const u = (i / N) * P * LOBES;        // whole periods -> seals clean
    const r = (hole.R + s.sample(u, (t - hole.dt) * 0.7) * hole.A) * hole.open;
    vertex(hole.cx + cos(a) * r, hole.cy + sin(a) * r);
  }
  endShape(CLOSE);
}`)
  },

  {
    id: "gait-beetle",
    name: "Gait Beetle",
    category: "layout",
    role: "A patrolling beetle whose gait switches mid-walk: shift rotates the underlying wave so it scurries, then crawls, then zig-zags.",
    tags: ["shift", "edge", "gait"],
    primitive: PRIMITIVES.sampler,
    reuse: "active-card edges, focus indicators",
    notes: "CreateSampler with shift: true keeps the marker but rotates the formula behind its motion. You can SEE the gait change. Faking this by hand means scheduling four animations to crossfade. Here it's one call.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.5,
          shiftDuration: 1,
          group: "all",
          amplitude: 1
        });
      }
      const s = state.sampler;
      const v = (s.sample(0, t * 1.0) + 1) / 2;
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
      // beetle body
      ctx.fillStyle = palette.peach;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.2 - 2, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // legs
      ctx.fillStyle = palette.ink;
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(x + i * 8 - 1, h * 0.2 - 12, 2, 4);
      }
      // antennae
      ctx.fillRect(x - 8, h * 0.2 - 16, 2, 6);
      ctx.fillRect(x + 6, h * 0.2 - 16, 2, 6);
      label(ctx, "GAIT · " + s.waveName.toUpperCase(), 14, 18, s.shifting ? palette.peach : palette.ink, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.5, shiftDuration: 1, group: 'all', amplitude: 1 });
}
function draw() {
  background(255);
  const v = (s.sample(0, millis() / 600 * 1.0) + 1) / 2;
  const x = width * 0.08 + width * 0.84 * v;
  fill(244); stroke(0); strokeWeight(1.5);
  rect(width * 0.1, height * 0.2, width * 0.8, height * 0.6);
  noStroke(); fill(0); rect(width * 0.1, height * 0.2 - 4, width * 0.8, 4);
  fill(246, 167, 150); ellipse(x, height * 0.2 - 2, 44, 16);
  fill(0);
  for (let i = -2; i <= 2; i++) rect(x + i * 8 - 1, height * 0.2 - 12, 2, 4);
  rect(x - 8, height * 0.2 - 16, 2, 6); rect(x + 6, height * 0.2 - 16, 2, 6);
  fill(s.shifting ? '#f6a796' : 0); textSize(11);
  text('GAIT · ' + s.waveName.toUpperCase(), 14, 22);
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
    notes: "Group: 'gentle' pools the sines and curves; group: 'harsh' pools the tan/noise/random formulas. The pools are curated inside the library, so the comparison stays honest across versions.",
    state: { gentle: null, harsh: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.gentle) {
        state.gentle = syncedSampler({ shift: true, group: "gentle", amplitude: 1 });
        state.harsh = syncedSampler({ shift: true, group: "harsh", amplitude: 1 });
      }
      const halfH = h * 0.42;
      const step = 4;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        const v = state.gentle.sample(x * 0.012, t * 1.0);
        const y = h * 0.28 + v * halfH * 0.35;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = palette.peach;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        const v = state.harsh.sample(x * 0.012, t * 1.0);
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
  const t = millis() / 600;
  strokeWeight(1.6); stroke(0);
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, height * 0.28 + gentle.sample(x * 0.012, t * 1.0) * height * 0.15);
  endShape();
  stroke('#f6a796');
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, height * 0.72 + harsh.sample(x * 0.012, t * 1.0) * height * 0.15);
  endShape();
}`)
  },

  {
    id: "wild-terrain",
    name: "Wild Terrain",
    category: "texture",
    role: "Mode: 'wild' + a gentle-pool formula generate a frozen irregular skyline; the window slides along it like a terrain run.",
    tags: ["wild", "terrain", "scroll", "group"],
    primitive: PRIMITIVES.sampler,
    reuse: "skylines, side-scrollers",
    notes: "Group: 'gentle' keeps tan/noise/random formulas out of the landscape, so the skyline stays bounded. The terrain itself is frozen (t stays 0): each reload picks a new gentle formula, then the window slides along it. Wild mode is ~5× slower than stable: keep it off for 10k-point loops.",
    state: { sampler: null, ys: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          group: "gentle",     // no tan/noise formulas in the terrain pool
          shift: true,         // pool pick at creation; frozen t holds it
          mode: "wild",
          unpredictability: 0.4,
          amplitude: h * 0.35,
          frequency: 0.05
        });
      }
      const step = 4;
      const cols = Math.ceil(w / step) + 1;
      if (!state.ys || state.ys.length !== cols) state.ys = new Float32Array(cols);
      const baseY = h * 0.6;
      const scroll = t * 60;   // terrain run: slide the window, keep the terrain frozen
      for (let i = 0; i < cols; i++) {
        state.ys[i] = baseY + state.sampler.sample(i * step + scroll, 0);
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
      label(ctx, "GENTLE · " + state.sampler.waveName.toUpperCase(), 14, 18, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s, ys;
const STEP = 4;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({
    group: 'gentle',     // no tan/noise formulas in the terrain pool
    shift: true,         // pool pick at creation; frozen t holds it
    mode: 'wild',
    unpredictability: 0.4,
    amplitude: height * 0.35,
    frequency: 0.05
  });
  ys = new Float32Array(ceil(width / STEP) + 1);
}
function draw() {
  background(255);
  // terrain run: the terrain is frozen (t = 0), only the window slides
  const scroll = millis() / 10;
  const baseY = height * 0.6;
  for (let i = 0; i < ys.length; i++) ys[i] = baseY + s.sample(i * STEP + scroll, 0);
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
  noStroke(); fill(120); textSize(11);
  text('GENTLE · ' + s.waveName.toUpperCase(), 14, 22);
}`)
  },

  {
    id: "color-field",
    name: "Color Field Shift",
    category: "color",
    role: "Two samplers paint a slow HSB field; the hue formula keeps shifting family, so the palette never settles into one noise signature.",
    tags: ["hsb", "shift", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "ambient backgrounds",
    notes: "A noise() colour field has one texture forever. Here the hue sampler shifts through the gentle pool, so the field re-organises into each new formula's rhythm; waveName names the active palette engine.",
    state: { hue: null, bri: null },
    draw(ctx, w, h, t, state) {
      if (!state.hue) {
        state.hue = syncedSampler({ shift: true, shiftInterval: 3.2, shiftDuration: 1.4, group: "gentle", range: [180, 340] });
        state.bri = syncedSampler({ seed: 7, range: [62, 92] });
      }
      const s = state.hue;
      s.sample(0, t);
      const cols = 24;
      const rows = 10;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Quantise to keep fillStyle strings from blowing the cache
          const hue = Math.round(s.sample(c * 0.08 + r * 0.05, t * 0.4) / 4) * 4;
          const bri = Math.round(state.bri.sample(c * 0.05 - r * 0.07, t * 0.4) / 2) * 2;
          ctx.fillStyle = `hsl(${hue},60%,${bri}%)`;
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 12, h - 12, palette.panel, 10);
    },
    sketch: sketchTemplate(`
let hueS, briS;
const COLS = 24, ROWS = 10;
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noStroke();
  colorMode(HSB, 360, 100, 100);
  hueS = Waves.createSampler({ shift: true, shiftInterval: 3.2, shiftDuration: 1.4, group: 'gentle', range: [180, 340] });
  briS = Waves.createSampler({ seed: 7, range: [62, 92] });
}
function draw() {
  const t = millis() / 600;
  hueS.sample(0, t);
  const cw = width / COLS, ch = height / ROWS;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    fill(hueS.sample(c * 0.08 + r * 0.05, t * 0.4), 60, briS.sample(c * 0.05 - r * 0.07, t * 0.4));
    rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
  }
  fill(0, 0, 100); textSize(10);
  text(hueS.shifting ? hueS.waveName + ' -> ' + hueS.targetName : hueS.waveName, 12, height - 10);
}`)
  },

  {
    id: "closing-ring",
    name: "Closing Ring",
    category: "motion",
    role: "Group: 'closing' + sampler.period sweep an exact number of periods around a loop: the ring stays seamless while the formula shifts.",
    tags: ["closing", "period", "shift", "ring"],
    primitive: PRIMITIVES.sampler,
    reuse: "badges, dials, loop masks",
    notes: "Only the closing pool keeps its periods aligned, so shift can morph the formula without tearing the seam. sampler.period is what locks the sweep to an integer number of lobes; the dot marks where start and end meet.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "closing", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      const LOBES = 5;
      const N = 180;
      const cx = w * 0.5;
      const cy = h * 0.52;
      const R0 = Math.min(w, h) * 0.3;
      const A = Math.min(w, h) * 0.13;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.fillStyle = palette.mint;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        const u = (i / N) * P * LOBES;
        const r = R0 + s.sample(u, t * 0.8) * A;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      const r0 = R0 + s.sample(0, t * 0.8) * A;
      ctx.fillStyle = s.shifting ? palette.peach : palette.ink;
      ctx.beginPath(); ctx.arc(cx, cy - r0, 5, 0, Math.PI * 2); ctx.fill();
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 18, palette.muted, 11);
      label(ctx, `period ${P.toFixed(2)} × ${LOBES}`, 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s;
const N = 180, LOBES = 5;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'closing', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const P = s.period || TWO_PI;          // measured period of active wave
  const R0 = height * 0.3, A = height * 0.13;
  noFill(); stroke(0); strokeWeight(2);
  push(); translate(width / 2, height * 0.52);
  beginShape();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TWO_PI - HALF_PI;
    const u = (i / N) * P * LOBES;       // integer # of periods -> closes seamlessly
    const r = R0 + s.sample(u, t * 0.8) * A;
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
  pop();
  noStroke(); fill(0); textSize(11);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 14, 22);
  text('period ' + nf(P, 1, 2) + ' × ' + LOBES, 14, height - 12);
}`)
  },

  {
    id: "seam-compare",
    name: "Seam Compare",
    category: "state",
    role: "Same shifting sampler, two sweep laws: a fixed sweep tears at the seam, a period-locked sweep closes clean.",
    tags: ["closing", "period", "compare", "seam"],
    primitive: PRIMITIVES.sampler,
    reuse: "explaining loops, QA of closed shapes",
    notes: "Left sweeps a fixed span of wave-x, so the loop ends mid-formula and jumps. Right sweeps sampler.period × 4, an exact number of periods, so start and end meet. The Δ readout measures each seam live.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "closing", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      const N = 140;
      const R0 = Math.min(w, h) * 0.26;
      const A = Math.min(w, h) * 0.1;
      const rings = [
        { cx: w * 0.27, span: 10, lbl: "FIXED SWEEP", col: palette.peach },
        { cx: w * 0.73, span: P * 4, lbl: "PERIOD × 4", col: palette.mint }
      ];
      rings.forEach(ring => {
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const r = R0 + s.sample((i / N) * ring.span, t * 0.8) * A;
          const x = ring.cx + Math.cos(a) * r;
          const y = h * 0.52 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        const seam = Math.abs(s.sample(0, t * 0.8) - s.sample(ring.span, t * 0.8)) * A;
        ctx.fillStyle = ring.col;
        ctx.beginPath(); ctx.arc(ring.cx, h * 0.52 - (R0 + s.sample(0, t * 0.8) * A), 5, 0, Math.PI * 2); ctx.fill();
        label(ctx, `${ring.lbl} · Δ ${seam.toFixed(1)}px`, ring.cx - 52, h * 0.95, palette.ink, 10);
      });
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 18, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
const N = 140, R0 = 80, A = 32;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'closing', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const P = s.period || TWO_PI;
  drawRing(width * 0.27, 10, 'FIXED SWEEP');       // arbitrary span -> visible seam
  drawRing(width * 0.73, P * 4, 'PERIOD × 4');     // integer periods -> seamless
  noStroke(); fill(120); textSize(11);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 14, 22);
}
function drawRing(cx, span, lbl) {
  const t = millis() / 600;
  noFill(); stroke(0); strokeWeight(2);
  beginShape();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TWO_PI - HALF_PI;
    const r = R0 + s.sample((i / N) * span, t * 0.8) * A;
    vertex(cx + cos(a) * r, height * 0.52 + sin(a) * r);
  }
  endShape(CLOSE);
  const seam = abs(s.sample(0, t * 0.8) - s.sample(span, t * 0.8)) * A;
  noStroke(); fill(0); textSize(10);
  text(lbl + ' · Δ ' + nf(seam, 1, 1) + 'px', cx - 48, height * 0.95);
}`)
  },

  {
    id: "period-tile",
    name: "Period-Locked Tile",
    category: "texture",
    role: "Sampler.period fits an exact number of periods into one tile, so the band repeats seamlessly — even while the formula shifts.",
    tags: ["closing", "period", "tile", "pattern"],
    primitive: PRIMITIVES.sampler,
    reuse: "repeating borders, exportable patterns",
    notes: "Each tile samples the same u-range of two whole periods, so tile edges meet by construction. The closing pool keeps periods commensurate, so shift swaps the motif without breaking tileability; the seam Δ readout stays at zero.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.paper);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "closing", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      const PERIODS = 2, TILES = 3, N = 64;
      const tileW = w / TILES;
      const baseY = h * 0.55;
      const A = h * 0.22;
      ctx.fillStyle = palette.sky;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let tile = 0; tile < TILES; tile++) {
        for (let i = 0; i <= N; i++) {
          const u = (i / N) * P * PERIODS;     // same u-range per tile
          const x = tile * tileW + (i / N) * tileW;
          ctx.lineTo(x, baseY + s.sample(u, t * 0.7) * A);
        }
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let tile = 1; tile < TILES; tile++) {
        ctx.beginPath(); ctx.moveTo(tile * tileW, 0); ctx.lineTo(tile * tileW, h); ctx.stroke();
      }
      ctx.setLineDash([]);
      const seam = Math.abs(s.sample(0, t * 0.7) - s.sample(P * PERIODS, t * 0.7)) * A;
      label(ctx, `TILE × ${TILES} · seam Δ ${seam.toFixed(2)}px`, 12, 18, palette.ink, 11);
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 12, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s;
const PERIODS = 2, TILES = 3, N = 64;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'closing', range: [-1, 1] });
}
function draw() {
  background(244);
  const t = millis() / 600;
  s.sample(0, t);
  const P = s.period || TWO_PI;
  const tileW = width / TILES, baseY = height * 0.55, A = height * 0.22;
  noStroke(); fill('#b8d2ff');
  beginShape();
  vertex(0, height);
  for (let tile = 0; tile < TILES; tile++) {
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * P * PERIODS;       // same u-range per tile -> seamless repeat
      vertex(tile * tileW + (i / N) * tileW, baseY + s.sample(u, t * 0.7) * A);
    }
  }
  vertex(width, height);
  endShape(CLOSE);
  stroke(0); strokeWeight(1);
  for (let tile = 1; tile < TILES; tile++) line(tile * tileW, 0, tile * tileW, height);
  const seam = abs(s.sample(0, t * 0.7) - s.sample(P * PERIODS, t * 0.7)) * A;
  noStroke(); fill(0); textSize(11);
  text('TILE × ' + TILES + ' · seam Δ ' + nf(seam, 1, 2) + 'px', 12, 20);
  fill(120); textSize(10);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 12, height - 10);
}`)
  },

  {
    id: "ghost-ring",
    name: "Ghost Ring",
    category: "motion",
    role: "Group: 'ghost' pools the closing waves that stay readable as delayed echoes: one sampler, four moments of t, one trailing ring.",
    tags: ["ghost", "closing", "echo", "delay"],
    primitive: PRIMITIVES.sampler,
    reuse: "loaders, trails, afterimage accents",
    notes: "Each echo re-samples the same ring at t minus a delay, so the ghosts are the same formula a beat ago — no history buffer. The ghost pool (v3.5.0) curates the closing waves whose shape survives overlapping copies; during a shift the oldest echo still shows the previous formula.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, group: "ghost", range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const P = s.period || Math.PI * 2;
      const LOBES = 4;
      const N = 140;
      const cx = w * 0.5;
      const cy = h * 0.52;
      const R0 = Math.min(w, h) * 0.28;
      const A = Math.min(w, h) * 0.14;
      const echoes = [
        { dt: 0.9, alpha: 0.16, col: palette.sky },
        { dt: 0.6, alpha: 0.3, col: palette.sky },
        { dt: 0.3, alpha: 0.5, col: palette.sky },
        { dt: 0, alpha: 1, col: palette.ink }
      ];
      echoes.forEach(echo => {
        ctx.strokeStyle = echo.col;
        ctx.globalAlpha = echo.alpha;
        ctx.lineWidth = echo.dt === 0 ? 2 : 1.6;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const u = (i / N) * P * LOBES;
          const r = R0 + s.sample(u, (t - echo.dt) * 0.8) * A;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      s.sample(0, t);
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 18, palette.muted, 11);
      label(ctx, "ghost pool · echoes at t − 0.3 · 0.6 · 0.9", 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
let s;
const N = 140, LOBES = 4;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, group: 'ghost', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const P = s.period || TWO_PI;          // ghost pool is period-locked (closing)
  const R0 = height * 0.28, A = height * 0.14;
  push(); translate(width / 2, height * 0.52);
  for (const dt of [0.9, 0.6, 0.3, 0]) { // oldest echo first, live ring last
    stroke(dt ? color(184, 210, 255, 255 * (1 - dt * 0.8)) : 0);
    strokeWeight(dt ? 1.6 : 2); noFill();
    beginShape();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TWO_PI - HALF_PI;
      const r = R0 + s.sample((i / N) * P * LOBES, (t - dt) * 0.8) * A;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
  }
  pop();
  s.sample(0, t);
  noStroke(); fill(0); textSize(11);
  text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 14, 22);
  fill(120); textSize(10);
  text('ghost pool · echoes at t - 0.3 / 0.6 / 0.9', 14, height - 12);
}`)
  },

  {
    id: "shake-out-nudge",
    name: "Shake Out Nudge",
    category: "interface",
    role: "Wave: 'shake out' (v3.6.0) is a mirrored log-chirp: a burst of shake that calms down and comes back every period — a built-in attention nudge.",
    tags: ["shake out", "chirp", "nudge", "notification"],
    primitive: PRIMITIVES.wave,
    reuse: "attention nudges, error shakes, reminder badges",
    notes: "Shake out replaced fade out at index 22 in v3.6.0: the old chirp died out once, this one repeats on an exact period (62.83 in wave-x), so the nudge re-fires on schedule with no timer code. The playhead below shows where the badge sits inside one period.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const PERIOD = 62.8319;
      const u = t * 6;
      const v = Waves.wave(u, { wave: "shake out", amplitude: 1 });
      const bw = 150, bh = 42;
      const bx = w / 2 + v * 14 - bw / 2;
      const by = h * 0.24;
      ctx.fillStyle = Math.abs(v) > 0.3 ? palette.peach : palette.lemon;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      label(ctx, "1 REMINDER", bx + 30, by + bh / 2, palette.ink, 13);
      const baseY = h * 0.72;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const wv = Waves.wave((x / w) * PERIOD, { wave: "shake out", amplitude: 1 });
        const y = baseY + wv * h * 0.14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const px = ((u % PERIOD) / PERIOD) * w;
      ctx.strokeStyle = palette.peach;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, baseY - h * 0.17); ctx.lineTo(px, baseY + h * 0.17); ctx.stroke();
      label(ctx, "wave 22 · shake out · period 62.83", 14, 18, palette.muted, 11);
      label(ctx, "the shake returns every cycle — fade out died once", 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
const PERIOD = 62.8319;              // shake out's exact period (2π / 0.1)
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 600;
  const u = t * 6;
  const v = Waves.wave(u, { wave: 'shake out', amplitude: 1 });
  // shaking badge: offset comes straight from the wave, no timer code
  const bx = width / 2 + v * 14;
  fill(abs(v) > 0.3 ? '#f6a796' : '#f3e679');
  stroke(0); strokeWeight(2); rect(bx - 75, height * 0.24, 150, 42);
  noStroke(); fill(0); textSize(13); text('1 REMINDER', bx - 44, height * 0.24 + 26);
  // one full period as a portrait, with a playhead
  const baseY = height * 0.72;
  stroke(0); strokeWeight(1.5); noFill();
  beginShape();
  for (let x = 0; x <= width; x += 2) {
    vertex(x, baseY + Waves.wave(x / width * PERIOD, { wave: 'shake out', amplitude: 1 }) * height * 0.14);
  }
  endShape();
  stroke('#f6a796'); strokeWeight(2);
  const px = (u % PERIOD) / PERIOD * width;
  line(px, baseY - height * 0.17, px, baseY + height * 0.17);
  noStroke(); fill(120); textSize(11);
  text('wave 22 · shake out · period 62.83 — returns every cycle', 14, 20);
}`)
  },

  {
    id: "spike-pop",
    name: "Spike Pop",
    category: "type",
    role: "Wave: ['classic sine', 'spike sine'] morphs an emphasis ripple from always-moving to one-letter-pops: spike sine (v3.5.0) rests flat, then peaks.",
    tags: ["spike sine", "morph", "emphasis", "lettering"],
    primitive: PRIMITIVES.wave,
    reuse: "emphasis ripples, menu hovers, karaoke text",
    notes: "Spike sine is sin⁵: long flat valleys with one narrow smooth peak, so most letters sit still while one pops — plain sine keeps everything moving at once. The mix is the design decision: how sharp should emphasis be? It is gentle and period-locked, so the ripple loops clean.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const WORD = "EMPHASIS";
      const PERIOD = 62.8319;
      const mix = (Math.sin(t * 0.5) + 1) / 2;
      const step = PERIOD / WORD.length;   // one wave period across the word
      const cw = (w * 0.8) / WORD.length;
      ctx.font = "700 40px Oswald, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      for (let i = 0; i < WORD.length; i++) {
        const v = Waves.wave(i * step, { wave: ["classic sine", "spike sine"], mix, t: t * 4, amplitude: 1 });
        ctx.fillStyle = v > 0.55 ? palette.peach : palette.ink;
        ctx.fillText(WORD[i], w * 0.1 + (i + 0.5) * cw, h * 0.56 - Math.max(0, v) * h * 0.12);
      }
      ctx.textAlign = "left";
      label(ctx, `mix ${mix.toFixed(2)} · 0 = classic sine · 1 = spike sine`, 14, 18, palette.muted, 11);
      label(ctx, "sin⁵ rests flat, then peaks — one letter at a time", 14, h - 12, palette.muted, 10);
    },
    sketch: sketchTemplate(`
const WORD = 'EMPHASIS';
const PERIOD = 62.8319;              // spike sine's period: one ripple per word
function setup() {
  createCanvas(620, 320); textFont('Oswald'); textAlign(CENTER, BASELINE);
}
function draw() {
  background(255);
  const t = millis() / 600;
  const mix = (sin(t * 0.5) + 1) / 2;  // 0 = classic sine, 1 = spike sine
  const step = PERIOD / WORD.length;
  const cw = width * 0.8 / WORD.length;
  textSize(40); textStyle(BOLD);
  for (let i = 0; i < WORD.length; i++) {
    const v = Waves.wave(i * step, { wave: ['classic sine', 'spike sine'], mix, t: t * 4, amplitude: 1 });
    fill(v > 0.55 ? '#f6a796' : 17);
    text(WORD[i], width * 0.1 + (i + 0.5) * cw, height * 0.56 - max(0, v) * height * 0.12);
  }
  textSize(11); textStyle(NORMAL); textAlign(LEFT, BASELINE); fill(120);
  text('mix ' + nf(mix, 1, 2) + ' · 0 = classic sine · 1 = spike sine', 14, 20);
  textAlign(CENTER, BASELINE);
}`)
  },

  {
    id: "seed-vs-index",
    name: "Seed vs Index",
    category: "state",
    role: "The same number, two meanings: seed: 3 hashes into the catalogue, wave: 3 picks formula #3 exactly.",
    tags: ["seed", "index", "teaching"],
    primitive: PRIMITIVES.wave,
    reuse: "API teaching, debugging",
    notes: "Waves.wave(x, { seed: 3 }) and Waves.wave(x, { wave: 3 }) are different questions: seed wants consistent variety, index wants one exact formula. The index name is read from Waves.list() at runtime, so the card never lies about the catalogue.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const rows = [
        { y: h * 0.32, opts: { seed: 3 }, lbl: "{ seed: 3 } → hashed pick", col: palette.ink },
        { y: h * 0.74, opts: { wave: 3 }, lbl: `{ wave: 3 } → ${Waves.list()[3].name}`, col: palette.peach }
      ];
      rows.forEach(row => {
        ctx.strokeStyle = row.col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          // x * 0.2 sweeps ~2 base periods, so square's flanks are visible
          const v = Waves.wave(x * 0.2, { ...row.opts, t: t * 0.9, amplitude: 1 });
          const y = row.y + v * h * 0.14;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        label(ctx, row.lbl, 14, row.y - h * 0.18, palette.muted, 11);
      });
    },
    sketch: sketchTemplate(`
function setup() { createCanvas(620, 320); textFont('Oswald'); noFill(); }
function draw() {
  background(255);
  const t = millis() / 600;
  drawRow(height * 0.32, { seed: 3 }, '{ seed: 3 } -> hashed pick', 0);
  drawRow(height * 0.74, { wave: 3 }, '{ wave: 3 } -> ' + Waves.list()[3].name, '#f6a796');
}
function drawRow(y, opts, lbl, col) {
  stroke(col); strokeWeight(2); noFill();
  beginShape();
  for (let x = 0; x <= width; x += 2) {
    // x * 0.2 sweeps ~2 base periods, so square's flanks are visible
    vertex(x, y + Waves.wave(x * 0.2, { ...opts, t: millis() / 600 * 0.9, amplitude: 1 }) * height * 0.14);
  }
  endShape();
  noStroke(); fill(120); textSize(11); text(lbl, 14, y - height * 0.18 + 8);
}`)
  },

  {
    id: "wave-atlas",
    name: "Wave Atlas",
    category: "grid",
    role: "Waves.list() draws the whole catalogue as live thumbnails; the spotlight walks every formula by name.",
    tags: ["list", "catalogue", "atlas"],
    primitive: PRIMITIVES.wave,
    reuse: "pickers, documentation",
    notes: "The roster comes from Waves.list() and Waves.count at runtime: when the library grows, this card grows with it. Only the spotlighted cell animates, the rest stay frozen — the catalogue as a browsable grid.",
    state: { list: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.list) state.list = Waves.list();
      const list = state.list;
      const cols = 9;
      const rows = Math.ceil(list.length / cols);
      const cw = w / cols;
      const ch = (h - 26) / rows;
      // positive modulo: JS % returns negatives for negative t
      const hot = ((Math.floor(t / 1.5) % list.length) + list.length) % list.length;
      list.forEach((entry, i) => {
        const cx = (i % cols) * cw;
        const cy = Math.floor(i / cols) * ch;
        if (i === hot) {
          ctx.fillStyle = palette.lemon;
          ctx.fillRect(cx, cy, cw, ch);
        }
        ctx.strokeStyle = i === hot ? palette.ink : palette.muted;
        ctx.lineWidth = i === hot ? 1.6 : 1;
        ctx.beginPath();
        const N = 48;
        for (let k = 0; k <= N; k++) {
          // frequency: 10 squeezes ~a full base period into each thumbnail
          const v = Waves.wave((k / N) * 6, { wave: entry.index, frequency: 10, t: i === hot ? t : 0, amplitude: 1 });
          const x = cx + 3 + (k / N) * (cw - 6);
          const y = cy + ch / 2 + v * ch * 0.32;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      label(ctx, `${Waves.count} WAVES · #${list[hot].index} ${list[hot].name.toUpperCase()}`, 12, h - 10, palette.ink, 11);
    },
    sketch: sketchTemplate(`
let list;
const COLS = 9;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  list = Waves.list();          // runtime roster: grows with the library
}
function draw() {
  background(255);
  const t = millis() / 600;
  const rows = ceil(list.length / COLS);
  const cw = width / COLS, ch = (height - 26) / rows;
  const hot = floor(t / 1.5) % list.length;
  for (let i = 0; i < list.length; i++) {
    const cx = (i % COLS) * cw, cy = floor(i / COLS) * ch;
    if (i === hot) { noStroke(); fill('#f3e679'); rect(cx, cy, cw, ch); }
    stroke(i === hot ? 0 : 150); strokeWeight(i === hot ? 1.6 : 1); noFill();
    beginShape();
    for (let k = 0; k <= 48; k++) {
      // frequency: 10 squeezes ~a full base period into each thumbnail
      const v = Waves.wave(k / 48 * 6, { wave: list[i].index, frequency: 10, t: i === hot ? t : 0, amplitude: 1 });
      vertex(cx + 3 + k / 48 * (cw - 6), cy + ch / 2 + v * ch * 0.32);
    }
    endShape();
  }
  noStroke(); fill(0); textSize(11);
  text(Waves.count + ' WAVES · #' + list[hot].index + ' ' + list[hot].name.toUpperCase(), 12, height - 8);
}`)
  }
];

/* ---------- runnable sketch template ---------- */
function sketchTemplate(body) {
  return `// p5.js 2.x + p5.waves v3.6.0
// CDN:
// <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.min.js"></script>
// <script src="https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.6.0/p5.waves.min.js"></script>
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
const timeOffsetInput = document.querySelector("#timeOffset");
const timeOffsetReadout = document.querySelector("#timeOffsetReadout");
const timeResetButton = document.querySelector("#timeReset");
const timeControl = document.querySelector(".time-control");

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
  const tag = document.createElement("button");
  tag.type = "button";
  tag.className = ["tag", className].filter(Boolean).join(" ");
  tag.textContent = text;
  row.appendChild(tag);
  return tag;
}

/* Tag chips act as shortcuts into the existing controls:
 * a term tag fills the search box, the primitive chip flips the primitive
 * filter. Scroll back to the controls so the effect is visible. */
function searchFor(term) {
  searchInput.value = term;
  filterLibrary();
  document.querySelector(".control-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function activatePrimitive(value) {
  activePrimitiveFilter = value;
  primitiveButtons.forEach(item => item.classList.toggle("is-active", item.dataset.primitive === value));
  filterLibrary();
  document.querySelector(".control-panel").scrollIntoView({ behavior: "smooth", block: "start" });
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
    appendTag(metaRow, module.primitive, "tag-primitive")
      .addEventListener("click", () => activatePrimitive(module.primitive));
    appendTag(metaRow, `USE · ${module.reuse}`, "tag-reuse")
      .addEventListener("click", () => searchFor(module.reuse));
    module.tags.forEach(tag => {
      appendTag(metaRow, tag).addEventListener("click", () => searchFor(tag));
    });
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
  bindTimeControl();
}

function formatTimeSpeed(speed) {
  if (Math.abs(speed - 1) < 0.05) return "1.0×";
  if (speed < 0.05) return "frozen";
  return `${speed.toFixed(1)}×`;
}

function applyTimeSpeed(next, { scrubbing } = {}) {
  timeSpeed = next;
  timeOffsetReadout.textContent = formatTimeSpeed(next);
  const idle = Math.abs(next - 1) < 0.05;
  timeResetButton.disabled = idle;
  timeControl.classList.toggle("is-scrubbing", !!scrubbing);
  timeControl.classList.toggle("is-shifted", !idle && !scrubbing);
  if (previewsPaused) drawActivePreviews(performance.now());
}

function bindTimeControl() {
  timeOffsetInput.addEventListener("input", () => {
    applyTimeSpeed(parseFloat(timeOffsetInput.value), { scrubbing: true });
  });
  const release = () => applyTimeSpeed(parseFloat(timeOffsetInput.value), { scrubbing: false });
  timeOffsetInput.addEventListener("change", release);
  timeOffsetInput.addEventListener("pointerup", release);
  timeOffsetInput.addEventListener("blur", release);
  timeResetButton.addEventListener("click", () => {
    timeOffsetInput.value = 1;
    applyTimeSpeed(1, { scrubbing: false });
  });
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
  const t = getEffectiveT(time);
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
