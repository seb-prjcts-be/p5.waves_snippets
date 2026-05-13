const TAU = Math.PI * 2;
const palette = {
  ink: "#17191c",
  muted: "#626974",
  paper: "#f7f8f4",
  panel: "#ffffff",
  red: "#ef5a43",
  teal: "#1a9a96",
  blue: "#486de8",
  green: "#8bbf28",
  yellow: "#e7b436",
  violet: "#7b5ad7",
  line: "#d7dce2"
};

const waveFunctions = {
  sine: x => Math.sin(x * TAU),
  triangle: x => 1 - 4 * Math.abs(Math.round(x - 0.25) - (x - 0.25)),
  pulse: x => (Math.sin(x * TAU) > 0 ? 1 : -1),
  ramp: x => ((x % 1) * 2) - 1,
  bounce: x => Math.abs(Math.sin(x * TAU)) * 2 - 1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function norm(value) {
  return (value + 1) * 0.5;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function wave(name, phase, speed = 1, offset = 0) {
  const fn = waveFunctions[name] || waveFunctions.sine;
  return fn(phase * speed + offset);
}

function mixWave(a, b, phase, mix) {
  return lerp(wave(a, phase), wave(b, phase), mix);
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

function clear(ctx, w, h, color = "#f2f4f6") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function drawGuide(ctx, w, h) {
  ctx.strokeStyle = "rgba(23, 25, 28, 0.1)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawLabel(ctx, text, x, y, color = palette.ink, size = 12) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

const modules = [
  {
    id: "drifting-label",
    name: "Drifting Label",
    category: "motion",
    role: "A wave value becomes a precise horizontal offset for a small annotation.",
    tags: ["motion", "label", "position"],
    primitive: "Waves.wave()",
    reuse: "callouts and captions",
    notes: "Useful for captions, callouts, and editorial labels that should stay legible while feeling active.",
    code: `const v = Waves.wave(t, { wave: "sine", speed: 0.7 });
const x = baseX + v * 36;

text("sample point", x, y);
line(baseX, y + 16, x, y + 16);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h);
      drawGuide(ctx, w, h);
      const baseX = w * 0.5;
      const y = h * 0.52;
      const v = wave("sine", t, 0.7);
      const x = baseX + v * w * 0.18;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(baseX, y + 22);
      ctx.lineTo(x, y + 22);
      ctx.stroke();
      ctx.fillStyle = palette.red;
      ctx.fillRect(baseX - 3, y - 34, 6, 72);
      ctx.fillStyle = palette.panel;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.fillRect(x - 56, y - 18, 112, 36);
      ctx.strokeRect(x - 56, y - 18, 112, 36);
      drawLabel(ctx, "sample point", x - 42, y + 1, palette.ink, 13);
    }
  },
  {
    id: "breathing-title",
    name: "Breathing Title",
    category: "type",
    role: "The wave opens and closes letter spacing without changing the words.",
    tags: ["type", "spacing", "headline"],
    primitive: "Waves.wave()",
    reuse: "section titles",
    notes: "A compact way to animate hierarchy in titles, section markers, and display typography.",
    code: `const v = Waves.wave(t, { wave: "bounce", speed: 0.45 });
const tracking = map(v, -1, 1, 0, 14);

drawTrackedText("SIGNAL", x, y, tracking);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const v = norm(wave("bounce", t, 0.45));
      const tracking = lerp(0, 16, v);
      const letters = "SIGNAL".split("");
      ctx.font = `900 ${Math.min(52, w * 0.11)}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const widths = letters.map(letter => ctx.measureText(letter).width);
      const total = widths.reduce((sum, item) => sum + item, 0) + tracking * (letters.length - 1);
      let x = (w - total) * 0.5;
      const y = h * 0.5;
      letters.forEach((letter, index) => {
        ctx.fillStyle = index % 2 ? palette.teal : palette.ink;
        ctx.fillText(letter, x, y);
        x += widths[index] + tracking;
      });
      ctx.fillStyle = palette.yellow;
      ctx.fillRect(w * 0.16, y + 38, w * 0.68 * v, 8);
    }
  },
  {
    id: "threshold-field",
    name: "Threshold Field",
    category: "grid",
    role: "Sampled row and column values decide which cells are active.",
    tags: ["grid", "threshold", "pattern"],
    primitive: "sampler.sample()",
    reuse: "matrix backgrounds",
    notes: "Good for backgrounds, data placeholders, matrix states, and printable block patterns.",
    code: `for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const v = sampler.sample(x + y * 0.5, t);
    if (v > threshold) rect(x * cell, y * cell, cell, cell);
  }
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const cols = 14;
      const rows = 8;
      const gap = 5;
      const cell = Math.min((w - gap * (cols + 1)) / cols, (h - gap * (rows + 1)) / rows);
      const startX = (w - (cols * cell + (cols - 1) * gap)) * 0.5;
      const startY = (h - (rows * cell + (rows - 1) * gap)) * 0.5;
      const threshold = lerp(0.05, 0.72, norm(wave("sine", t, 0.38)));
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = norm(wave("triangle", t, 0.65, x * 0.08 + y * 0.11));
          ctx.fillStyle = v > threshold ? palette.ink : "#dce2e6";
          ctx.fillRect(startX + x * (cell + gap), startY + y * (cell + gap), cell, cell);
        }
      }
    }
  },
  {
    id: "signal-palette",
    name: "Signal Palette",
    category: "color",
    role: "A normalized wave value chooses intensity across a compact palette.",
    tags: ["color", "swatch", "contrast"],
    primitive: "Waves.wave()",
    reuse: "emphasis swatches",
    notes: "Use the same value to tune fills, borders, or emphasis without making random color choices.",
    code: `const v = (Waves.wave(t, { wave: "sine" }) + 1) / 2;
const active = floor(v * palette.length);

fill(palette[active]);
rect(x, y, w, h);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const colors = [palette.red, palette.yellow, palette.green, palette.teal, palette.blue, palette.violet];
      const v = norm(wave("sine", t, 0.34));
      const active = clamp(Math.floor(v * colors.length), 0, colors.length - 1);
      const swatchW = w / colors.length;
      colors.forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = index === active ? 1 : 0.34;
        ctx.fillRect(index * swatchW, h * 0.18, swatchW, h * 0.64);
        ctx.globalAlpha = 1;
        if (index === active) {
          ctx.strokeStyle = palette.ink;
          ctx.lineWidth = 4;
          ctx.strokeRect(index * swatchW + 5, h * 0.18 + 5, swatchW - 10, h * 0.64 - 10);
        }
      });
      drawLabel(ctx, `value ${v.toFixed(2)}`, 16, h - 20, palette.ink, 13);
    }
  },
  {
    id: "pressure-hatch",
    name: "Pressure Hatch",
    category: "texture",
    role: "Wave amplitude becomes spacing and bend in a reusable hatch texture.",
    tags: ["texture", "print", "hatch"],
    primitive: "Waves.wave()",
    reuse: "print textures",
    notes: "A small texture module that can become a mask, poster field, or exportable tile.",
    code: `const pressure = Waves.wave(t, { wave: "triangle" });
const gap = map(pressure, -1, 1, 18, 7);

for (let x = -w; x < w * 2; x += gap) {
  curve(x, 0, x + pressure * 18, h * 0.5, x, h);
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.paper);
      const pressure = wave("triangle", t, 0.42);
      const gap = lerp(18, 7, norm(pressure));
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.4;
      for (let x = -w; x < w * 2; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.quadraticCurveTo(x + pressure * 34, h * 0.5, x - pressure * 20, h + 10);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(239, 90, 67, 0.88)";
      ctx.fillRect(w * 0.12, h * 0.2, w * 0.18, h * 0.6);
    }
  },
  {
    id: "live-loader",
    name: "Live Loader",
    category: "interface",
    role: "A wave maps to progress so a waiting state has a readable rhythm.",
    tags: ["interface", "loading", "progress"],
    primitive: "Waves.wave()",
    reuse: "waiting states",
    notes: "The value never needs to be real progress; it can simply communicate that the system is alive.",
    code: `const v = (Waves.wave(t, { wave: "ramp" }) + 1) / 2;

rect(trackX, trackY, trackW, 8);
rect(trackX, trackY, trackW * v, 8);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const v = norm(wave("ramp", t, 0.27));
      const x = w * 0.14;
      const y = h * 0.48;
      const trackW = w * 0.72;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, trackW, 18);
      ctx.fillStyle = palette.teal;
      ctx.fillRect(x + 4, y + 4, Math.max(2, (trackW - 8) * v), 10);
      drawLabel(ctx, "syncing visual index", x, y - 24, palette.ink, 13);
      drawLabel(ctx, `${Math.round(v * 100)}%`, x + trackW - 36, y + 44, palette.muted, 12);
    }
  },
  {
    id: "wave-shift-readout",
    name: "Wave Shift Readout",
    category: "state",
    role: "The sampler exposes active wave, target wave, and mix as a compact state label.",
    tags: ["state", "mix", "label"],
    primitive: "sampler.mix",
    reuse: "tool readouts",
    notes: "A state module for tools where users need to know which behavior is active and where it is heading.",
    code: `text(sampler.waveName, x, y);
text(sampler.targetName, x, y + 18);

rect(x, y + 30, sampler.mix * 90, 4);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const mix = norm(wave("sine", t, 0.18));
      const activeValue = mixWave("sine", "pulse", t, mix);
      ctx.fillStyle = palette.panel;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.fillRect(w * 0.16, h * 0.2, w * 0.68, h * 0.6);
      ctx.strokeRect(w * 0.16, h * 0.2, w * 0.68, h * 0.6);
      drawLabel(ctx, "active: sine", w * 0.22, h * 0.38, palette.ink, 14);
      drawLabel(ctx, "target: pulse", w * 0.22, h * 0.5, palette.ink, 14);
      ctx.fillStyle = palette.line;
      ctx.fillRect(w * 0.22, h * 0.62, w * 0.42, 9);
      ctx.fillStyle = palette.blue;
      ctx.fillRect(w * 0.22, h * 0.62, w * 0.42 * mix, 9);
      ctx.fillStyle = activeValue > 0 ? palette.green : palette.red;
      ctx.fillRect(w * 0.68, h * 0.38, 28, 52);
    }
  },
  {
    id: "adaptive-columns",
    name: "Adaptive Columns",
    category: "layout",
    role: "One value opens spacing between columns while keeping the layout stable.",
    tags: ["layout", "spacing", "columns"],
    primitive: "Waves.wave()",
    reuse: "editorial grids",
    notes: "A layout rhythm for editorial blocks, dashboards, or any grid that needs subtle breathing room.",
    code: `const v = (Waves.wave(t, { wave: "sine" }) + 1) / 2;
const gap = lerp(8, 34, v);

drawColumns({ gap });`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const v = norm(wave("sine", t, 0.28));
      const gap = lerp(8, 36, v);
      const margin = w * 0.12;
      const available = w - margin * 2 - gap * 2;
      const colW = available / 3;
      for (let i = 0; i < 3; i++) {
        const x = margin + i * (colW + gap);
        ctx.fillStyle = [palette.red, palette.teal, palette.yellow][i];
        ctx.fillRect(x, h * 0.24, colW, h * 0.52);
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.fillRect(x + 10, h * 0.3, colW - 20, 8);
        ctx.fillRect(x + 10, h * 0.38, colW - 28, 8);
        ctx.fillRect(x + 10, h * 0.46, colW - 36, 8);
      }
    }
  },
  {
    id: "scanning-divider",
    name: "Scanning Divider",
    category: "motion",
    role: "A ramp wave moves a divider through a section and leaves a clear before/after read.",
    tags: ["motion", "divider", "scan"],
    primitive: "Waves.wave()",
    reuse: "inspection dividers",
    notes: "Use it as a section marker, comparison slider, inspection line, or live archive scanner.",
    code: `const scan = (Waves.wave(t, { wave: "ramp" }) + 1) / 2;
const x = scan * width;

line(x, 0, x, height);
rect(0, 0, x, height);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#f0f2f4");
      const scan = norm(wave("ramp", t, 0.2));
      const x = scan * w;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(0, 0, x, h);
      ctx.strokeStyle = palette.red;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = x > w * 0.52 ? palette.paper : palette.ink;
      ctx.font = "900 28px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("INDEX", w * 0.18, h * 0.5);
      ctx.fillStyle = x > w * 0.72 ? palette.paper : palette.ink;
      ctx.fillText("LIVE", w * 0.64, h * 0.5);
    }
  },
  {
    id: "word-gate",
    name: "Word Gate",
    category: "type",
    role: "A pulse wave gives permission for one word to appear while others stay quiet.",
    tags: ["type", "gate", "caption"],
    primitive: "Waves.wave()",
    reuse: "alerts and labels",
    notes: "A direct module for alerts, poetry fragments, changing labels, or interface microcopy.",
    code: `const gate = Waves.wave(t, { wave: "pulse", speed: 0.5 });
const word = gate > 0 ? "OPEN" : "HOLD";

text(word, x, y);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.ink);
      const gate = wave("pulse", t, 0.48);
      const word = gate > 0 ? "OPEN" : "HOLD";
      const color = gate > 0 ? palette.green : palette.red;
      ctx.fillStyle = color;
      ctx.fillRect(w * 0.18, h * 0.28, w * 0.64, h * 0.44);
      ctx.fillStyle = palette.ink;
      ctx.font = `900 ${Math.min(58, w * 0.15)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, w * 0.5, h * 0.5);
      ctx.textAlign = "left";
    }
  },
  {
    id: "row-pulse",
    name: "Row Pulse",
    category: "grid",
    role: "Offset wave samples turn rows on one after another.",
    tags: ["grid", "rows", "sequence"],
    primitive: "sampler.sample()",
    reuse: "tables and menus",
    notes: "A useful behavior for menus, tables, scoreboards, and any repeated UI that needs a sweep.",
    code: `rows.forEach((row, i) => {
  const v = sampler.sample(i, t);
  row.active = v > 0.35;
});`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const rows = 7;
      const rowH = h * 0.1;
      const gap = h * 0.026;
      const startY = (h - rows * rowH - (rows - 1) * gap) * 0.5;
      for (let i = 0; i < rows; i++) {
        const v = norm(wave("sine", t, 0.42, i * 0.12));
        const x = w * 0.14;
        const y = startY + i * (rowH + gap);
        ctx.fillStyle = v > 0.72 ? palette.blue : "#dce2e6";
        ctx.fillRect(x, y, w * 0.72, rowH);
        ctx.fillStyle = v > 0.72 ? palette.paper : palette.ink;
        ctx.fillRect(x + 12, y + rowH * 0.35, (w * 0.52) * v, rowH * 0.3);
      }
    }
  },
  {
    id: "halftone-field",
    name: "Halftone Field",
    category: "texture",
    role: "A wave sets dot radius across a field for a repeatable density texture.",
    tags: ["texture", "density", "pattern"],
    primitive: "sampler.sample()",
    reuse: "density masks",
    notes: "Works as a print texture, mask layer, thumbnail treatment, or background pattern.",
    code: `for (let i = 0; i < dots.length; i++) {
  const v = sampler.sample(i, t);
  circle(dots[i].x, dots[i].y, map(v, -1, 1, 2, 16));
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const cols = 13;
      const rows = 8;
      const stepX = w / (cols + 1);
      const stepY = h / (rows + 1);
      for (let y = 1; y <= rows; y++) {
        for (let x = 1; x <= cols; x++) {
          const v = norm(wave("sine", t, 0.38, x * 0.08 + y * 0.17));
          ctx.fillStyle = x % 3 === 0 ? palette.teal : palette.ink;
          ctx.beginPath();
          ctx.arc(x * stepX, y * stepY, lerp(2, 12, v), 0, TAU);
          ctx.fill();
        }
      }
    }
  },
  {
    id: "oscillating-marker",
    name: "Oscillating Marker",
    category: "motion",
    role: "A wave value moves one marker along a measured path while the scale stays fixed.",
    tags: ["motion", "marker", "measure"],
    primitive: "Waves.wave()",
    reuse: "meters and timelines",
    notes: "Useful for meters, timelines, and annotation systems where the moving part needs a stable reference.",
    code: `const v = Waves.wave(t, { wave: "sine", speed: 0.8 });
const x = map(v, -1, 1, left, right);

line(left, y, right, y);
circle(x, y, 16);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const left = w * 0.16;
      const right = w * 0.84;
      const y = h * 0.52;
      const v = wave("sine", t, 0.8);
      const x = lerp(left, right, norm(v));
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        const tickX = lerp(left, right, i / 8);
        ctx.beginPath();
        ctx.moveTo(tickX, y - 22);
        ctx.lineTo(tickX, y + 22);
        ctx.stroke();
      }
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = palette.yellow;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawLabel(ctx, v.toFixed(2), x - 15, y - 42, palette.ink, 12);
    }
  },
  {
    id: "wave-word-picker",
    name: "Wave Word Picker",
    category: "type",
    role: "A normalized wave chooses one word from a controlled vocabulary.",
    tags: ["type", "word", "selection"],
    primitive: "Waves.wave()",
    reuse: "mode labels",
    notes: "A compact label module for changing modes, generated captions, or poetic interface states.",
    code: `const words = ["soft", "sharp", "open", "dense"];
const v = (Waves.wave(t, { wave: "triangle" }) + 1) / 2;
const index = floor(v * words.length);

text(words[index], x, y);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.paper);
      const words = ["soft", "sharp", "open", "dense"];
      const v = norm(wave("triangle", t, 0.36));
      const active = clamp(Math.floor(v * words.length), 0, words.length - 1);
      const colW = w / words.length;
      ctx.font = `800 ${Math.min(28, w * 0.07)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      words.forEach((word, index) => {
        const x = colW * index + colW * 0.5;
        ctx.fillStyle = index === active ? palette.ink : "#d2d8dd";
        ctx.fillRect(colW * index + 8, h * 0.34, colW - 16, h * 0.32);
        ctx.fillStyle = index === active ? palette.paper : palette.ink;
        ctx.fillText(word, x, h * 0.5);
      });
      ctx.textAlign = "left";
      drawLabel(ctx, `choice ${active + 1}/${words.length}`, 16, h - 22, palette.muted, 12);
    }
  },
  {
    id: "column-pulse",
    name: "Column Pulse",
    category: "grid",
    role: "Offset samples brighten columns so a static grid gains a directional sweep.",
    tags: ["grid", "columns", "sequence"],
    primitive: "sampler.sample()",
    reuse: "calendar columns",
    notes: "A reusable behavior for calendars, schedules, rhythm charts, and any column-based interface.",
    code: `for (let x = 0; x < cols; x++) {
  const v = sampler.sample(x, t);
  const active = v > 0.45;
  drawColumn(x, active);
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const cols = 9;
      const rows = 5;
      const gap = 6;
      const cell = Math.min((w - gap * (cols + 1)) / cols, (h - gap * (rows + 1)) / rows);
      const startX = (w - (cols * cell + (cols - 1) * gap)) * 0.5;
      const startY = (h - (rows * cell + (rows - 1) * gap)) * 0.5;
      for (let x = 0; x < cols; x++) {
        const v = norm(wave("sine", t, 0.46, x * 0.1));
        for (let y = 0; y < rows; y++) {
          ctx.fillStyle = v > 0.68 ? palette.teal : "#cfd7dc";
          if (y === 2 && v > 0.68) ctx.fillStyle = palette.yellow;
          ctx.fillRect(startX + x * (cell + gap), startY + y * (cell + gap), cell, cell);
        }
      }
    }
  },
  {
    id: "opacity-rhythm",
    name: "Opacity Rhythm",
    category: "color",
    role: "One wave value fades a color layer in and out without changing the composition.",
    tags: ["color", "opacity", "layer"],
    primitive: "Waves.wave()",
    reuse: "layer emphasis",
    notes: "Useful when emphasis should breathe over a fixed image, map, diagram, or editorial block.",
    code: `const alpha = map(Waves.wave(t), -1, 1, 0.15, 0.85);

tint(accentColor, alpha);
rect(x, y, w, h);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      drawGuide(ctx, w, h);
      const alpha = lerp(0.15, 0.85, norm(wave("sine", t, 0.32)));
      ctx.fillStyle = palette.ink;
      ctx.fillRect(w * 0.14, h * 0.22, w * 0.72, h * 0.56);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette.red;
      ctx.fillRect(w * 0.14, h * 0.22, w * 0.72, h * 0.56);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.panel;
      ctx.fillRect(w * 0.2, h * 0.38, w * 0.3, 12);
      ctx.fillRect(w * 0.2, h * 0.48, w * 0.46, 12);
      ctx.fillRect(w * 0.2, h * 0.58, w * 0.22, 12);
      drawLabel(ctx, `alpha ${alpha.toFixed(2)}`, 16, h - 20, palette.ink, 12);
    }
  },
  {
    id: "notification-rhythm",
    name: "Notification Rhythm",
    category: "interface",
    role: "A pulse wave gates a badge between quiet and active states.",
    tags: ["interface", "badge", "status"],
    primitive: "Waves.wave()",
    reuse: "sync indicators",
    notes: "Use it for small alerts, sync indicators, recording states, or any status that should not look static.",
    code: `const active = Waves.wave(t, { wave: "pulse" }) > 0;

badge.fill(active ? alertColor : mutedColor);
badge.label(active ? "live" : "idle");`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const active = wave("pulse", t, 0.42) > 0;
      ctx.fillStyle = "#eef1f2";
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.fillRect(w * 0.18, h * 0.27, w * 0.64, h * 0.46);
      ctx.strokeRect(w * 0.18, h * 0.27, w * 0.64, h * 0.46);
      ctx.fillStyle = active ? palette.red : "#b9c2c9";
      ctx.beginPath();
      ctx.arc(w * 0.32, h * 0.5, 18, 0, TAU);
      ctx.fill();
      drawLabel(ctx, active ? "live signal" : "idle signal", w * 0.42, h * 0.5, palette.ink, 18);
      ctx.fillStyle = active ? palette.red : "#b9c2c9";
      ctx.fillRect(w * 0.18, h * 0.73, w * 0.64, 8);
    }
  },
  {
    id: "transition-meter",
    name: "Transition Meter",
    category: "state",
    role: "A mix value shows the visible progress between one wave voice and another.",
    tags: ["state", "transition", "mix"],
    primitive: "sampler.mix",
    reuse: "transition controls",
    notes: "A clear readout for tools that shift between behaviors and need to expose the change.",
    code: `const mix = sampler.mix;
const value = lerp(sineValue, triangleValue, mix);

drawMeter(mix);
drawSignal(value);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const mix = norm(wave("sine", t, 0.22));
      const y = h * 0.5;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 10) {
        const p = x / w;
        const value = mixWave("sine", "triangle", t + p, mix);
        const py = y + value * h * 0.22;
        if (x === 0) ctx.beginPath();
        ctx.lineTo(x, py);
      }
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = palette.line;
      ctx.fillRect(w * 0.16, h * 0.76, w * 0.68, 10);
      ctx.fillStyle = palette.blue;
      ctx.fillRect(w * 0.16, h * 0.76, w * 0.68 * mix, 10);
      drawLabel(ctx, "sine", w * 0.16, h * 0.24, palette.muted, 12);
      drawLabel(ctx, "triangle", w * 0.7, h * 0.24, palette.muted, 12);
    }
  },
  {
    id: "rhythmic-divider",
    name: "Rhythmic Divider",
    category: "layout",
    role: "A wave changes divider weight so two content zones keep a living boundary.",
    tags: ["layout", "divider", "section"],
    primitive: "Waves.wave()",
    reuse: "section rules",
    notes: "Works as a section separator, running header rule, or editorial rhythm inside a larger layout.",
    code: `const v = (Waves.wave(t, { wave: "bounce" }) + 1) / 2;
const weight = lerp(2, 18, v);

line(x, y, x + width, y, weight);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.paper);
      const v = norm(wave("bounce", t, 0.4));
      const weight = lerp(3, 20, v);
      ctx.fillStyle = palette.panel;
      ctx.fillRect(w * 0.13, h * 0.18, w * 0.74, h * 0.22);
      ctx.fillRect(w * 0.13, h * 0.6, w * 0.74, h * 0.22);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(w * 0.18, h * 0.26, w * 0.4, 8);
      ctx.fillRect(w * 0.18, h * 0.68, w * 0.52, 8);
      ctx.strokeStyle = palette.violet;
      ctx.lineWidth = weight;
      ctx.beginPath();
      ctx.moveTo(w * 0.13, h * 0.5);
      ctx.lineTo(w * 0.87, h * 0.5);
      ctx.stroke();
    }
  },
  {
    id: "pattern-tile",
    name: "Pattern Tile",
    category: "texture",
    role: "A repeated wave sample sets the direction of small marks inside a tile.",
    tags: ["texture", "tile", "export"],
    primitive: "sampler.sample()",
    reuse: "repeat pattern tiles",
    notes: "A copyable source for repeat textures, SVG exports, brushes, and background pattern systems.",
    code: `for (let i = 0; i < marks.length; i++) {
  const v = sampler.sample(i, t);
  rotate(v * HALF_PI);
  line(-6, 0, 6, 0);
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const cols = 10;
      const rows = 6;
      const stepX = w / cols;
      const stepY = h / rows;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 3;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x * stepX + stepX * 0.5;
          const cy = y * stepY + stepY * 0.5;
          const v = wave("sine", t, 0.34, x * 0.07 + y * 0.13);
          const angle = v * Math.PI * 0.5;
          const length = Math.min(stepX, stepY) * 0.32;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.strokeStyle = (x + y) % 4 === 0 ? palette.red : palette.ink;
          ctx.beginPath();
          ctx.moveTo(-length, 0);
          ctx.lineTo(length, 0);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  },
  {
    id: "cursor-echo",
    name: "Cursor Echo",
    category: "motion",
    role: "Offset wave samples place trailing marks behind a moving pointer.",
    tags: ["motion", "cursor", "trail"],
    primitive: "sampler.sample()",
    reuse: "guided pointers",
    notes: "A small path-following behavior for cursors, guided tours, drawing tools, and annotation trails.",
    code: `for (let i = 0; i < echoes; i++) {
  const v = sampler.sample(i, t);
  const x = pointer.x - i * 16;
  const y = baseline + v * 28;
  circle(x, y, 12 - i);
}`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const left = w * 0.12;
      const right = w * 0.88;
      const baseline = h * 0.52;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = left; x <= right; x += 8) {
        const p = (x - left) / (right - left);
        const y = baseline + wave("sine", t, 0.58, p * 0.52) * h * 0.16;
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const travel = norm(wave("ramp", t, 0.18));
      const pointerX = lerp(left, right, travel);
      const pointerY = baseline + wave("sine", t, 0.58, travel * 0.52) * h * 0.16;
      for (let i = 6; i >= 0; i--) {
        const echo = clamp(travel - i * 0.045, 0, 1);
        const x = lerp(left, right, echo);
        const y = baseline + wave("sine", t, 0.58, echo * 0.52) * h * 0.16;
        ctx.globalAlpha = lerp(0.16, 0.92, 1 - i / 7);
        ctx.fillStyle = i === 0 ? palette.red : palette.blue;
        ctx.beginPath();
        ctx.arc(x, y, lerp(4, 16, 1 - i / 7), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawLabel(ctx, "pointer trail", pointerX - 38, pointerY - 32, palette.ink, 12);
    }
  },
  {
    id: "contrast-meter",
    name: "Contrast Meter",
    category: "color",
    role: "A wave value raises and lowers contrast while keeping the palette fixed.",
    tags: ["color", "contrast", "meter"],
    primitive: "Waves.wave()",
    reuse: "contrast previews",
    notes: "Useful for previewing emphasis states, accessibility checks, and controlled color intensity changes.",
    code: `const v = (Waves.wave(t, { wave: "sine" }) + 1) / 2;
const ink = lerpColor(midInk, deepInk, v);
const field = lerpColor(lightField, paper, v);

drawContrastSample({ ink, field });`,
    draw(ctx, w, h, t) {
      const v = norm(wave("sine", t, 0.26));
      const field = Math.round(238 + v * 17);
      const ink = Math.round(100 - v * 82);
      clear(ctx, w, h, `rgb(${field}, ${field + 1}, ${field + 2})`);
      ctx.fillStyle = `rgb(${ink}, ${ink + 4}, ${ink + 8})`;
      ctx.fillRect(w * 0.14, h * 0.24, w * 0.72, h * 0.52);
      ctx.fillStyle = palette.panel;
      ctx.fillRect(w * 0.2, h * 0.36, w * 0.42, 14);
      ctx.fillRect(w * 0.2, h * 0.49, w * 0.58, 14);
      ctx.fillRect(w * 0.2, h * 0.62, w * 0.28, 14);
      ctx.fillStyle = v > 0.55 ? palette.green : palette.yellow;
      ctx.fillRect(w * 0.14, h * 0.8, w * 0.72 * v, 8);
      drawLabel(ctx, v > 0.55 ? "high contrast" : "soft contrast", 16, 24, palette.ink, 13);
    }
  },
  {
    id: "hover-pulse",
    name: "Hover Pulse",
    category: "interface",
    role: "A hover-ready control uses a wave as a focus ring and fill pulse.",
    tags: ["interface", "button", "hover"],
    primitive: "Waves.wave()",
    reuse: "active controls",
    notes: "A reusable button state for tools where active controls should feel responsive without jumping layout.",
    code: `const hover = button.isHovered;
const v = hover ? Waves.wave(t, { wave: "bounce" }) : -1;
const pulse = map(v, -1, 1, 0, 1);

drawButton({ pulse });`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.paper);
      const pulse = norm(wave("bounce", t, 0.48));
      const x = w * 0.2;
      const y = h * 0.34;
      const buttonW = w * 0.6;
      const buttonH = h * 0.28;
      ctx.strokeStyle = `rgba(72, 109, 232, ${lerp(0.2, 0.9, pulse)})`;
      ctx.lineWidth = lerp(3, 12, pulse);
      ctx.strokeRect(x - 10, y - 10, buttonW + 20, buttonH + 20);
      ctx.fillStyle = pulse > 0.5 ? palette.blue : palette.panel;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, buttonW, buttonH);
      ctx.strokeRect(x, y, buttonW, buttonH);
      ctx.fillStyle = pulse > 0.5 ? palette.panel : palette.ink;
      ctx.font = `800 ${Math.min(24, w * 0.06)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("APPLY", w * 0.5, y + buttonH * 0.5);
      ctx.textAlign = "left";
      drawLabel(ctx, "hover signal", x, y + buttonH + 42, palette.muted, 12);
    }
  },
  {
    id: "mode-switcher",
    name: "Mode Switcher",
    category: "state",
    role: "A normalized wave chooses the active mode in a compact segmented control.",
    tags: ["state", "mode", "control"],
    primitive: "Waves.wave()",
    reuse: "tool mode switches",
    notes: "A readable state module for switching between tools, wave voices, drawing modes, or preview layers.",
    code: `const modes = ["draw", "scan", "sort"];
const v = (Waves.wave(t, { wave: "triangle" }) + 1) / 2;
const active = floor(v * modes.length);

setMode(modes[active]);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const modes = ["draw", "scan", "sort"];
      const v = norm(wave("triangle", t, 0.3));
      const active = clamp(Math.floor(v * modes.length), 0, modes.length - 1);
      const x = w * 0.12;
      const y = h * 0.34;
      const totalW = w * 0.76;
      const cellW = totalW / modes.length;
      modes.forEach((mode, index) => {
        ctx.fillStyle = index === active ? palette.ink : "#eef1f2";
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 2;
        ctx.fillRect(x + index * cellW, y, cellW, h * 0.26);
        ctx.strokeRect(x + index * cellW, y, cellW, h * 0.26);
        ctx.fillStyle = index === active ? palette.paper : palette.ink;
        ctx.font = `800 ${Math.min(20, w * 0.052)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(mode, x + index * cellW + cellW * 0.5, y + h * 0.13);
      });
      ctx.textAlign = "left";
      ctx.fillStyle = palette.blue;
      ctx.fillRect(x, y + h * 0.38, totalW * v, 9);
      drawLabel(ctx, `active mode: ${modes[active]}`, x, y + h * 0.52, palette.ink, 13);
    }
  },
  {
    id: "mask-aperture",
    name: "Mask Aperture",
    category: "texture",
    role: "A wave opens a clipping window over a repeating stripe layer.",
    tags: ["texture", "mask", "reveal"],
    primitive: "Waves.wave()",
    reuse: "image reveals",
    notes: "A practical mask behavior for thumbnails, posters, reveal transitions, and exportable image treatments.",
    code: `const v = (Waves.wave(t, { wave: "sine" }) + 1) / 2;
const radius = lerp(28, 120, v);

clipCircle(cx, cy, radius);
drawStripeTexture();`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.ink);
      const v = norm(wave("sine", t, 0.24));
      const radius = lerp(Math.min(w, h) * 0.14, Math.min(w, h) * 0.42, v);
      const cx = w * 0.5 + wave("sine", t, 0.18, 0.2) * w * 0.12;
      const cy = h * 0.5;
      ctx.fillStyle = "#30353b";
      for (let x = -w; x < w * 2; x += 16) {
        ctx.fillRect(x, 0, 7, h);
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.clip();
      clear(ctx, w, h, palette.paper);
      for (let x = -w; x < w * 2; x += 18) {
        ctx.fillStyle = x % 36 === 0 ? palette.red : palette.teal;
        ctx.fillRect(x + wave("sine", t, 0.4, x * 0.002) * 12, 0, 9, h);
      }
      ctx.restore();
      ctx.strokeStyle = palette.yellow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.stroke();
    }
  },
  {
    id: "border-shift",
    name: "Border Shift",
    category: "layout",
    role: "A wave moves an edge rule inward and outward to reshape a stable frame.",
    tags: ["layout", "border", "frame"],
    primitive: "Waves.wave()",
    reuse: "selection frames",
    notes: "Use it for section markers, active panels, selection frames, and layout systems with a visible pulse.",
    code: `const v = (Waves.wave(t, { wave: "sine" }) + 1) / 2;
const inset = lerp(8, 36, v);

rect(inset, inset, width - inset * 2, height - inset * 2);`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#ffffff");
      const v = norm(wave("sine", t, 0.3));
      const inset = lerp(12, 42, v);
      ctx.fillStyle = "#eef1f2";
      ctx.fillRect(w * 0.18, h * 0.22, w * 0.64, h * 0.56);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(w * 0.25, h * 0.34, w * 0.32, 10);
      ctx.fillRect(w * 0.25, h * 0.46, w * 0.48, 10);
      ctx.fillRect(w * 0.25, h * 0.58, w * 0.24, 10);
      ctx.strokeStyle = palette.red;
      ctx.lineWidth = 5;
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      drawLabel(ctx, `inset ${Math.round(inset)}px`, 16, h - 22, palette.muted, 12);
    }
  },
  {
    id: "bending-caption",
    name: "Bending Caption",
    category: "type",
    role: "Offset wave samples lift each letter into a controlled baseline bend.",
    tags: ["type", "baseline", "caption"],
    primitive: "sampler.sample()",
    reuse: "caption baselines",
    notes: "A small typographic behavior for captions, logos, labels, or headings that need motion without changing copy.",
    code: `letters.forEach((letter, i) => {
  const lift = sampler.sample(i, t) * 18;
  text(letter, x + i * step, baseline + lift);
});`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, palette.panel);
      const letters = "CURVE NOTE".split("");
      const fontSize = Math.min(42, w * 0.092);
      ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const gap = fontSize * 0.16;
      const widths = letters.map(letter => ctx.measureText(letter).width || fontSize * 0.32);
      const total = widths.reduce((sum, item) => sum + item, 0) + gap * (letters.length - 1);
      let x = (w - total) * 0.5;
      const baseline = h * 0.52;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.14, baseline);
      ctx.lineTo(w * 0.86, baseline);
      ctx.stroke();
      letters.forEach((letter, index) => {
        const lift = wave("sine", t, 0.42, index * 0.09) * h * 0.12;
        ctx.fillStyle = letter === " " ? palette.ink : (index % 3 === 0 ? palette.teal : palette.ink);
        ctx.fillText(letter, x, baseline + lift);
        x += widths[index] + gap;
      });
    }
  },
  {
    id: "cell-permission",
    name: "Cell Permission",
    category: "grid",
    role: "A threshold wave decides which cells are allowed to become visible.",
    tags: ["grid", "permission", "threshold"],
    primitive: "Waves.wave()",
    reuse: "state grids",
    notes: "This is a practical rule for dashboards, matrix editors, active seats, or any repeated state grid.",
    code: `const permission = (Waves.wave(t, { wave: "sine" }) + 1) / 2;

cells.forEach(cell => {
  cell.visible = cell.signal > permission;
});`,
    draw(ctx, w, h, t) {
      clear(ctx, w, h, "#eef1f2");
      const cols = 12;
      const rows = 7;
      const gap = 6;
      const cell = Math.min((w * 0.76 - gap * (cols - 1)) / cols, (h * 0.62 - gap * (rows - 1)) / rows);
      const startX = (w - (cols * cell + (cols - 1) * gap)) * 0.5;
      const startY = h * 0.2;
      const permission = norm(wave("sine", t, 0.31));
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const signal = norm(wave("triangle", t, 0.46, x * 0.06 + y * 0.1));
          const active = signal > permission;
          const px = startX + x * (cell + gap);
          const py = startY + y * (cell + gap);
          ctx.fillStyle = active ? palette.ink : "#cfd7dc";
          ctx.fillRect(px, py, cell, cell);
          if (active && (x + y) % 4 === 0) {
            ctx.fillStyle = palette.yellow;
            ctx.fillRect(px + cell * 0.25, py + cell * 0.25, cell * 0.5, cell * 0.5);
          }
        }
      }
      drawLabel(ctx, `permission ${permission.toFixed(2)}`, w * 0.12, h * 0.9, palette.ink, 12);
    }
  }
];

const library = document.querySelector("#library");
const template = document.querySelector("#cardTemplate");
const visibleCount = document.querySelector("#visibleCount");
const activePrimitive = document.querySelector("#activePrimitive");
const focusLabel = document.querySelector("#focusLabel");
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
      let shouldDrawStaticFrame = false;
      entries.forEach(entry => {
        const record = cardRecords.get(entry.target);
        if (!record) return;
        record.inViewport = entry.isIntersecting;
        shouldDrawStaticFrame ||= entry.isIntersecting;
      });

      if (shouldDrawStaticFrame && previewsPaused) {
        drawActivePreviews(performance.now());
      }
    }, { rootMargin: "260px 0px" })
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
    node.dataset.id = module.id;
    node.dataset.category = module.category;
    node.dataset.primitive = module.primitive;
    node.dataset.search = `${module.name} ${module.category} ${module.role} ${module.primitive} ${module.reuse} ${module.notes} ${module.tags.join(" ")}`.toLowerCase();
    node.querySelector(".category").textContent = module.category;
    node.querySelector("h2").textContent = module.name;
    node.querySelector(".role").textContent = module.role;
    node.querySelector(".notes").textContent = module.notes;
    node.querySelector("code").textContent = module.code;
    const metaRow = node.querySelector(".meta-row");
    appendTag(metaRow, module.primitive, "tag-primitive");
    appendTag(metaRow, `Use: ${module.reuse}`, "tag-reuse");
    module.tags.forEach(tag => appendTag(metaRow, tag));
    node.querySelector(".copy-button").addEventListener("click", event => {
      copySnippet(event.currentTarget, node.querySelector("code"), module.code);
    });
    const record = {
      node,
      module,
      canvas: node.querySelector("canvas"),
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
  const markCopied = label => {
    button.textContent = label;
    button.classList.add("is-copied");
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("is-copied");
    }, 1100);
  };

  try {
    await navigator.clipboard.writeText(code);
    markCopied("Copied");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(codeNode);
    selection.removeAllRanges();
    selection.addRange(range);
    markCopied("Selected");
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

  visibleCount.textContent = count;
  activePrimitive.textContent = getPrimitiveSummary(count, visiblePrimitives);
  focusLabel.textContent = getFocusSummary();

  if (!count) {
    if (!noResultsNode) {
      noResultsNode = document.createElement("div");
      noResultsNode.className = "no-results";
      noResultsNode.textContent = "No modules match this filter.";
      library.appendChild(noResultsNode);
    }
  } else if (noResultsNode) {
    noResultsNode.remove();
    noResultsNode = null;
  }

  drawActivePreviews(performance.now());
}

function getPrimitiveSummary(count, visiblePrimitives) {
  if (!count) return "no match";
  if (activePrimitiveFilter !== "all") return activePrimitiveFilter;
  if (visiblePrimitives.size === 1) return [...visiblePrimitives][0];
  return `${visiblePrimitives.size} primitives`;
}

function getFocusSummary() {
  const focusParts = [];
  if (activeFilter !== "all") focusParts.push(activeFilter);
  if (activePrimitiveFilter !== "all") focusParts.push(activePrimitiveFilter);
  return focusParts.length ? focusParts.join(" / ") : "micro-decisions";
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
  motionToggle.addEventListener("click", () => {
    setPreviewsPaused(!previewsPaused);
  });
  updateMotionToggle();
}

function updateMotionToggle() {
  motionToggle.textContent = previewsPaused ? "Resume previews" : "Pause previews";
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
  const t = time * 0.00022;
  cardRegistry.forEach(record => {
    if (!record.visible || !record.inViewport) return;
    const { ctx, w, h } = setupCanvas(record.canvas);
    record.module.draw(ctx, w, h, t);
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

renderLibrary();
bindControls();
filterLibrary();
requestPreviewFrame();
