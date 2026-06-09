/* p5.waves visual vocabulary: uses real Waves.wave / createSampler (v3.3.0) */

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
    const dt = (time - lastFrameTime) / 600;
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
    role: "Real sampler exposes waveName, targetName, mix: readable as a tool state.",
    tags: ["sampler", "shift"],
    primitive: PRIMITIVES.sampler,
    reuse: "tool readouts",
    notes: "These getters are live: drop them into any UI to show which wave is active and where it's heading.",
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
        state.sampler = syncedSampler({
          wave: ["classic sine", "batman"],
          amplitude: 1
        });
      }
      const mix = (Math.sin(t * 1.0) + 1) / 2;
      const amp = h * 0.32;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = state.sampler.sample(x * 0.02, t * 1.0, mix) * amp;
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
  const t = millis() / 600;
  const mix = (sin(t * 1.0) + 1) / 2;
  const amp = height * 0.32;
  stroke(0); strokeWeight(2);
  beginShape();
  for (let x = 0; x <= width; x += 3) {
    vertex(x, height / 2 + s.sample(x * 0.02, t * 1.0, mix) * amp);
  }
  endShape();
  noStroke(); fill(0); textSize(12);
  text('mix ' + nf(mix, 1, 2) + '  sine → batman', 14, height - 14);
}`)
  },

  {
    id: "layout-squid",
    name: "Layout Squid",
    category: "layout",
    role: "Four arms, four seeded waves: each column picks its own formula and tugs the layout independently.",
    tags: ["seed", "columns", "polyrhythm"],
    primitive: PRIMITIVES.wave,
    reuse: "self-tuning grids",
    notes: "Waves.wave(0, { seed: i }) hashes a different formula per arm. Four seeds = four kinds of motion in one composition. Plain sin() can only sing one tune at a time.",
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const seeds = [3, 11, 19, 27];
      const cols = [palette.ink, palette.peach, palette.sky, palette.mint];
      const tt = t * 1.0;
      const widths = seeds.map(s => {
        const v = norm(Waves.wave(0, { seed: s, t: tt, amplitude: 1 }));
        return 0.6 + v * 1.2;
      });
      const total = widths.reduce((a, b) => a + b, 0);
      let x = w * 0.06;
      const top = h * 0.18;
      const colH = h * 0.64;
      seeds.forEach((s, i) => {
        const cw = (w * 0.88) * (widths[i] / total) - 8;
        ctx.fillStyle = cols[i];
        ctx.fillRect(x, top, cw, colH);
        ctx.fillStyle = palette.panel;
        ctx.font = "600 11px Oswald, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(`SEED ${s}`, x + 8, top + 8);
        x += cw + 8;
      });
    },
    sketch: sketchTemplate(`
const SEEDS = [3, 11, 19, 27];
const COLS = ['#111', '#f6a796', '#b8d2ff', '#c7e89c'];
function setup() { createCanvas(620, 320); textFont('Oswald'); }
function draw() {
  background(255);
  const t = millis() / 600;
  const widths = SEEDS.map(s => 0.6 + ((Waves.wave(0, { seed: s, t: t * 1.0, amplitude: 1 }) + 1) / 2) * 1.2);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = width * 0.06;
  const top = height * 0.18, colH = height * 0.64;
  noStroke();
  for (let i = 0; i < SEEDS.length; i++) {
    const cw = (width * 0.88) * (widths[i] / total) - 8;
    fill(COLS[i]); rect(x, top, cw, colH);
    fill(255); textSize(11); text('SEED ' + SEEDS[i], x + 8, top + 18);
    x += cw + 8;
  }
}`)
  },

  {
    id: "word-gate",
    name: "Word Gate Shift",
    category: "type",
    role: "A shifting sampler turns words on or off; the gate rhythm itself changes formula family, so the copy keeps resequencing.",
    tags: ["gate", "shift", "group", "waveName"],
    primitive: PRIMITIVES.sampler,
    reuse: "typography",
    notes: "sin() > 0 gives one fixed rhythm forever. A sampler shifting across a pulse-family group pool rotates the gate formula, so the same five words find new sequencer patterns; waveName names the current rhythm.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2.4, shiftDuration: 0.8, group: ["pulse", "up down pulse", "fuzzy pulse", "square"], range: [-1, 1] });
      }
      const s = state.sampler;
      s.sample(0, t);
      const words = ["READ", "PARSE", "BEND", "SHOW", "REPEAT"];
      const fontSize = Math.min(38, w * 0.075);
      ctx.font = `600 ${fontSize}px Oswald, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = words.map(word => ctx.measureText(word).width);
      const gap = 26;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      words.forEach((word, i) => {
        const on = s.sample(i * 0.4, t * 1.2) > 0;
        ctx.fillStyle = on ? palette.ink : palette.line;
        ctx.fillText(word, x, y);
        if (on) {
          ctx.fillStyle = palette.peach;
          ctx.fillRect(x, y + fontSize * 0.55, widths[i], 4);
        }
        x += widths[i] + gap;
      });
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, w * 0.5 - 70, h * 0.86, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
const words = ['READ', 'PARSE', 'BEND', 'SHOW', 'REPEAT'];
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.4, shiftDuration: 0.8, group: ['pulse', 'up down pulse', 'fuzzy pulse', 'square'], range: [-1, 1] });
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
    const on = s.sample(i * 0.4, t * 1.2) > 0;
    fill(on ? 0 : 220); text(words[i], x, height / 2);
    if (on) { fill(246, 167, 150); rect(x, height / 2 + 20, widths[i], 4); }
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
    role: "Twelve segments, twelve seeds: every tile picks its own wave and beats its own tempo. Nothing ever syncs.",
    tags: ["seed", "polyrhythm", "alpha"],
    primitive: PRIMITIVES.wave,
    reuse: "live data rows, status grids",
    notes: "Per-tile seed hashes a different formula per segment. Twelve genuinely different rhythms from one call. Without the 34-wave catalogue you'd need twelve hand-tuned oscillators.",
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
      label(ctx, "12 SEEDS · 12 FORMULAS · 0 SYNC", w * 0.07, h * 0.92, palette.muted, 10);
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
    name: "Alert Rhythm Dial",
    category: "interface",
    role: "A shifting sampler changes alert cadence: the UI shows when the rhythm is held and when it is morphing.",
    tags: ["shift", "pulse", "notification"],
    primitive: PRIMITIVES.sampler,
    reuse: "alerts",
    notes: "Alert states become more useful when the cadence can change families. The card reads waveName, targetName, shifting and mix directly from the sampler.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.4,
          shiftDuration: 0.7,
          group: "all",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      const v = norm(s.sample(0, t * 1.2));
      const cx = w * 0.32;
      const cy = h * 0.5;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 34 + i * 18 + v * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = s.shifting ? palette.lemon : palette.peach;
      ctx.globalAlpha = 0.35 + v * 0.45;
      ctx.beginPath(); ctx.arc(cx, cy, 32 + v * 24, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.shifting ? palette.ink : palette.peach;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.panel;
      ctx.font = "600 14px Oswald, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("12", cx, cy);
      ctx.textAlign = "left";
      label(ctx, s.shifting ? "CADENCE SHIFT" : "HELD ALERT", w * 0.46, cy - 24, palette.ink, 14);
      label(ctx, s.waveName.toUpperCase(), w * 0.46, cy + 2, palette.muted, 12);
      if (s.shifting) {
        label(ctx, "TO " + s.targetName.toUpperCase(), w * 0.46, cy + 24, palette.muted, 12);
        ctx.fillStyle = palette.line;
        ctx.fillRect(w * 0.46, cy + 38, w * 0.34, 4);
        ctx.fillStyle = palette.ink;
        ctx.fillRect(w * 0.46, cy + 38, w * 0.34 * s.mix, 4);
      }
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald');
  s = Waves.createSampler({ shift: true, shiftInterval: 2.4, shiftDuration: 0.7, group: 'all', range: [-1, 1] });
}
function draw() {
  background(255);
  const v = (s.sample(0, millis() / 600 * 1.2) + 1) / 2;
  const cx = width * 0.32, cy = height / 2;
  noFill(); stroke(220); for (let i = 0; i < 4; i++) circle(cx, cy, 68 + i * 36 + v * 28);
  noStroke(); fill(s.shifting ? '#111213' : '#f6a796'); circle(cx, cy, 48);
  fill(255); textSize(14); textAlign(CENTER, CENTER); text('12', cx, cy);
  textAlign(LEFT, BASELINE); fill(0); text(s.shifting ? 'CADENCE SHIFT' : 'HELD ALERT', width * 0.46, cy - 20);
  fill(120); text(s.waveName.toUpperCase(), width * 0.46, cy + 4);
}`)
  },

  {
    id: "transition-meter",
    name: "Formula Mix Section",
    category: "state",
    role: "sampler.mix becomes a section cut through current and target formulas, not just a progress ring.",
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
        const a = Waves.wave(x * 0.02, { wave: s.waveName, t: t * 0.9, amplitude: 1 });
        const b = Waves.wave(x * 0.02, { wave: s.targetName, t: t * 0.9, amplitude: 1 });
        const v = lerp(a, b, mix);
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
    const a = Waves.wave(x * 0.02, { wave: s.waveName, t: t * 0.9, amplitude: 1 });
    const b = Waves.wave(x * 0.02, { wave: s.targetName, t: t * 0.9, amplitude: 1 });
    vertex(x, height * 0.52 + lerp(a, b, mix) * height * 0.12);
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
    name: "Divider Family Shift",
    category: "layout",
    role: "A divider whose dash behaviour changes formula family while preserving the same mark system.",
    tags: ["divider", "shift", "dashes"],
    primitive: PRIMITIVES.sampler,
    reuse: "section breaks",
    notes: "The divider is a small proof of reusable behaviour: only the sampler shifts, while the marks keep their layout contract.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({ shift: true, shiftInterval: 2.2, shiftDuration: 0.8, group: "all", amplitude: 1, frequency: 1 });
      }
      const s = state.sampler;
      s.sample(0, t);
      const dashes = 24;
      const dx = w * 0.88 / dashes;
      const startX = w * 0.06;
      const y = h * 0.5;
      for (let i = 0; i < dashes; i++) {
        const v = s.sample(i * 0.4, t * 1.0);
        const lift = v * 18;
        const thick = lerp(2, 12, norm(v));
        ctx.fillStyle = s.shifting && i % 3 === 0 ? palette.peach : palette.ink;
        ctx.fillRect(startX + i * dx, y + lift - thick / 2, dx * 0.68, thick);
      }
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 20, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); textFont('Oswald'); noStroke();
  s = Waves.createSampler({ shift: true, shiftInterval: 2.2, shiftDuration: 0.8, group: 'all', amplitude: 1, frequency: 1 });
}
function draw() {
  background(255);
  const t = millis() / 600, n = 24;
  s.sample(0, t);
  const dx = width * 0.88 / n, sx = width * 0.06, y = height / 2;
  for (let i = 0; i < n; i++) {
    const v = s.sample(i * 0.4, t * 1.0);
    const thick = lerp(2, 12, (v + 1) / 2);
    fill(s.shifting && i % 3 === 0 ? '#f6a796' : 0);
    rect(sx + i * dx, y + v * 18 - thick / 2, dx * 0.68, thick);
  }
  fill(120); textSize(11); text(s.shifting ? s.waveName + ' -> ' + s.targetName : s.waveName, 14, 22);
}`)
  },

  {
    id: "cursor-echo",
    name: "Pointer Phase Echo",
    category: "motion",
    role: "A trail keeps its spacing, but the sampler shifts the motion formula underneath each echo.",
    tags: ["shift", "trail", "echo"],
    primitive: PRIMITIVES.sampler,
    reuse: "pointer feedback",
    notes: "The point path is not stored keyframes. A single shifting sampler draws phase echoes, then changes gait without changing the trail code.",
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
      s.sample(0, t);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = w * 0.1; x <= w * 0.9; x += 8) {
        const y = h * 0.5 + s.sample(x * 0.025, t * 0.8) * h * 0.22;
        if (x === w * 0.1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const trails = 9;
      for (let i = 0; i < trails; i++) {
        const phase = i * 0.42;
        const tx = s.sample(phase, t * 1.0);
        const ty = s.sample(phase + 12, t * 0.8);
        const x = w * 0.5 + tx * w * 0.32;
        const y = h * 0.5 + ty * h * 0.28;
        const p = i / (trails - 1);
        const r = lerp(3, 15, p);
        ctx.fillStyle = i === trails - 1 && s.shifting ? palette.peach : palette.ink;
        ctx.globalAlpha = lerp(0.14, 1, p);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 18, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320); noStroke();
  s = Waves.createSampler({ shift: true, shiftInterval: 2.6, shiftDuration: 0.9, group: 'all', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600, n = 9;
  s.sample(0, t);
  noFill(); stroke(220);
  beginShape();
  for (let x = width * 0.1; x <= width * 0.9; x += 8) vertex(x, height / 2 + s.sample(x * 0.025, t * 0.8) * height * 0.22);
  endShape();
  noStroke();
  for (let i = 0; i < n; i++) {
    const x = width / 2 + s.sample(i * 0.42, t * 1.0) * width * 0.32;
    const y = height / 2 + s.sample(i * 0.42 + 12, t * 0.8) * height * 0.28;
    fill(17, 18, 19, lerp(60, 255, i / (n - 1)));
    circle(x, y, lerp(8, 32, i / (n - 1)));
  }
  fill(120); textSize(11); text(s.waveName, 14, 22);
}`)
  },

  {
    id: "strobe-newt",
    name: "Strobe Newt",
    category: "color",
    role: "An electric little creature: panel flicks between lemon and ink on unpredictable beats.",
    tags: ["wild", "flicker", "up down pulse"],
    primitive: PRIMITIVES.wave,
    reuse: "warning chips, attention states",
    notes: "mode: 'wild' + unpredictability bends the underlying pulse so it never lands on the same beat twice. Plain sin() can't break its own pattern: this newt only exists with p5.waves.",
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
      ctx.fillStyle = on ? palette.lemon : palette.ink;
      ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6);
      // newt eye: pupil shifts side to side as it blinks
      ctx.fillStyle = on ? palette.ink : palette.lemon;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? palette.lemon : palette.ink;
      ctx.beginPath();
      ctx.arc(w * 0.5 + (on ? 5 : -5), h * 0.5, 8, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, on ? "SPARK" : "DARK", w * 0.1, h * 0.93, palette.muted, 11);
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
  noStroke();
  fill(on ? '#f3e679' : 0);
  rect(width * 0.1, height * 0.2, width * 0.8, height * 0.6);
  fill(on ? 0 : '#f3e679');
  circle(width / 2, height / 2, 44);
  fill(on ? '#f3e679' : 0);
  circle(width / 2 + (on ? 5 : -5), height / 2, 16);
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
    name: "Aperture Sampler",
    category: "interface",
    role: "One shifting sampler opens several apertures with different phase offsets, so the reveal pattern changes families.",
    tags: ["shift", "mask", "reveal"],
    primitive: PRIMITIVES.sampler,
    reuse: "previews",
    notes: "A plain sine can open one iris. The sampler turns a set of apertures into a coordinated, shifting reveal system.",
    state: { sampler: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
          shift: true,
          shiftInterval: 2.8,
          shiftDuration: 1,
          group: "gentle",
          range: [-1, 1]
        });
      }
      const s = state.sampler;
      s.sample(0, t);
      const cols = 11;
      const rows = 6;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (c + r) % 2 ? palette.ink : palette.line;
          ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
      }
      ctx.save();
      ctx.fillStyle = palette.panel;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "destination-out";
      const points = [
        [0.24, 0.35, 0.0],
        [0.48, 0.58, 0.7],
        [0.7, 0.32, 1.4],
        [0.78, 0.72, 2.1]
      ];
      points.forEach(([px, py, phase]) => {
        const v = norm(s.sample(phase, t * 0.8));
        const rad = lerp(8, Math.min(w, h) * 0.28, v);
        ctx.beginPath();
        ctx.arc(w * px, h * py, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.strokeStyle = s.shifting ? palette.peach : palette.ink;
      ctx.lineWidth = 1.5;
      points.forEach(([px, py, phase]) => {
        const rad = lerp(8, Math.min(w, h) * 0.28, norm(s.sample(phase, t * 0.8)));
        ctx.beginPath(); ctx.arc(w * px, h * py, rad, 0, Math.PI * 2); ctx.stroke();
      });
      label(ctx, s.shifting ? `${s.waveName} -> ${s.targetName}` : s.waveName, 14, 18, palette.muted, 11);
    },
    sketch: sketchTemplate(`
let s;
function setup() {
  createCanvas(620, 320);
  s = Waves.createSampler({ shift: true, shiftInterval: 2.8, shiftDuration: 1, group: 'gentle', range: [-1, 1] });
}
function draw() {
  background(255);
  const t = millis() / 600;
  s.sample(0, t);
  const cols = 11, rows = 6, cw = width / cols, ch = height / rows;
  noStroke();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    fill((c + r) % 2 ? 17 : 217); rect(c * cw, r * ch, cw + 0.5, ch + 0.5);
  }
  drawingContext.save();
  fill(255); rect(0, 0, width, height);
  drawingContext.globalCompositeOperation = 'destination-out';
  const pts = [[.24,.35,0], [.48,.58,.7], [.7,.32,1.4], [.78,.72,2.1]];
  for (const p of pts) {
    const rad = lerp(8, min(width, height) * 0.28, (s.sample(p[2], t * 0.8) + 1) / 2);
    circle(width * p[0], height * p[1], rad * 2);
  }
  drawingContext.restore();
  noFill(); stroke(s.shifting ? '#f6a796' : 0); strokeWeight(1.5);
  for (const p of pts) {
    const rad = lerp(8, min(width, height) * 0.28, (s.sample(p[2], t * 0.8) + 1) / 2);
    circle(width * p[0], height * p[1], rad * 2);
  }
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
    notes: "createSampler with shift: true keeps the marker but rotates the formula behind its motion. You can SEE the gait change. Faking this by hand means scheduling four animations to crossfade. Here it's one call.",
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
    notes: "group: 'gentle' = 28 sines and curves; group: 'harsh' = 6 tan/noise/random formulas.",
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
    role: "mode: 'wild' + unpredictability warps any wave: terrain-like irregular skyline.",
    tags: ["wild", "terrain"],
    primitive: PRIMITIVES.sampler,
    reuse: "skylines",
    notes: "Wild mode is ~5× slower than stable: keep it off for 10k-point loops.",
    state: { sampler: null, ys: null },
    draw(ctx, w, h, t, state) {
      clear(ctx, w, h, palette.panel);
      if (!state.sampler) {
        state.sampler = syncedSampler({
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
        state.ys[i] = baseY + state.sampler.sample(x, t * 0.4);
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
  const t = millis() / 600;
  const baseY = height * 0.6;
  for (let i = 0; i < ys.length; i++) ys[i] = baseY + s.sample(i * STEP, t * 0.4);
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
  }
];

/* ---------- runnable sketch template ---------- */
function sketchTemplate(body) {
  return `// p5.js 2.x + p5.waves v3.3.0
// CDN:
// <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.min.js"></script>
// <script src="https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.3.0/p5.waves.min.js"></script>
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
