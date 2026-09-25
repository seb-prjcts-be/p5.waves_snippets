/* p5.waves social studio
 * Turns one specimen from script.js (`modules`) into a post: a framed canvas
 * (PNG or recorded video loop) plus captions for Instagram, LinkedIn and X.
 * The pick is deterministic per calendar day, so the page always has
 * "today's post" ready without any input. */

const SITE_URL = "https://seb-prjcts-be.github.io/p5.waves_snippets/";
const LIB_URL = "https://github.com/seb-prjcts-be/p5.waves";
const SPEC_W = 620;               // specimens are drawn for a 31:16 card
const SPEC_H = 320;
const RECORD_SECONDS = 10;
const EPOCH = new Date(2026, 0, 1);

const FORMATS = {
  instagram: { label: "Instagram 4:5", w: 1080, h: 1350, layout: "stack" },
  // Reels/Stories overlay UI on the top and bottom strip, so keep content inside
  reel:      { label: "Reel / Story 9:16", w: 1080, h: 1920, layout: "stack", safeTop: 200, safeBottom: 320 },
  linkedin:  { label: "LinkedIn 1:1", w: 1200, h: 1200, layout: "stack" },
  x:         { label: "X 16:9", w: 1600, h: 900, layout: "split" }
};

/* ---------- seeded randomness ---------- */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }

function shuffled(rand, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------- schedule ---------- */

const ORDER = shuffled(mulberry32(hashString("p5.waves social order")), modules.map((_, i) => i));

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function moduleIndexForDay(date) {
  const days = Math.round((parseDay(dayKey(date)) - EPOCH) / 86400000);
  const n = ORDER.length;
  return ORDER[((days % n) + n) % n];
}

/* ---------- caption material ---------- */

// plain text on purpose: backticks do not render on any of the three platforms
const FEATURES = [
  { tags: ["ghost"], long: "group: 'ghost' picks six closing waves that stay readable when a delayed copy overlaps itself.", short: "group: 'ghost' for delayed echoes" },
  { tags: ["closing", "period", "seam", "ring", "tile"], long: "group: 'closing' plus sampler.period keeps loops seamless, even while the formula keeps shifting.", short: "seamless loops via group: 'closing'" },
  { tags: ["mix", "morph", "transition"], long: "wave: [a, b] with mix blends two formulas, so the transition itself becomes material.", short: "blend two formulas with mix" },
  { tags: ["waveName", "name", "list", "index"], long: "sampler.waveName exposes the formula's name, so the wave becomes readable design state.", short: "the wave's name as design state" },
  { tags: ["shift"], long: "shift: true lets one sampler hop between wave formulas with a smooth morph, so the design changes character on its own.", short: "shift: true swaps formulas by itself" },
  { tags: ["wild"], long: "mode: 'wild' with unpredictability adds controlled wobble on top of any formula.", short: "mode: 'wild' for controlled wobble" },
  { tags: ["group", "gentle", "compare"], long: "group chooses the pool the wave is drawn from: gentle, harsh, closing or ghost.", short: "pick a wave family with group" },
  { tags: ["seed"], long: "One seed gives one consistent wave; many seeds give many behaviours from the same call.", short: "one seed, one behaviour" },
  { tags: ["sampler"], long: "Waves.createSampler() resolves the options once, so sample() stays cheap in big loops.", short: "createSampler() for big loops" }
];

const FALLBACK_FEATURE = {
  long: "Waves.wave() takes a number and always returns a number. Everything else is a design decision.",
  short: "one number in, one number out"
};

const HOOKS = [
  "One wave call. One graphic job: {reuse}.",
  "What if your {reuse} had a pulse?",
  "Specimen {n}/{total}: {name}.",
  "Not an animation. A decision: {name}.",
  "Stop hand-tweening {reuse}. Let a wave decide.",
  "A number goes in. {reuse} comes out.",
  "{name}: a tiny, copy-paste p5.js pattern for {reuse}.",
  "Same function, new job: {reuse}."
];

const CLASSROOM = [
  "Classroom idea: give students this sketch and ask them to change only the group option. Then ask what changed in the meaning, not just the motion.",
  "Classroom idea: let students predict the next waveName before it appears. Guessing a formula by its motion is a great eye-training exercise.",
  "Classroom idea: have students swap one wave name for another and describe the difference in one word. Vocabulary first, code second."
];

const CATEGORY_TAGS = {
  motion: ["#motiondesign", "#motiongraphics"],
  type: ["#typography", "#kinetictype"],
  grid: ["#gridsystem", "#patterndesign"],
  color: ["#colortheory", "#colorpalette"],
  texture: ["#texture", "#printdesign"],
  interface: ["#uidesign", "#microinteractions"],
  state: ["#uxdesign", "#microinteractions"],
  layout: ["#layoutdesign", "#graphicdesign"]
};

const IG_TAGS = ["#creativecoding", "#generativeart", "#codeart", "#javascript", "#processing", "#newmediaart",
  "#creativecode", "#genart", "#opensource", "#algorithmicart", "#interactiondesign", "#webdesign", "#designtools"];

function reuseShort(module) {
  return module.reuse.split(",")[0].trim();
}

function featuresFor(module) {
  const found = FEATURES.filter(f => f.tags.some(tag => module.tags.includes(tag)));
  return found.length ? found : [FALLBACK_FEATURE];
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key]);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function specimenUrl(module) {
  return `${SITE_URL}#${module.id}`;
}

function buildCaptions(module, index, key) {
  const rand = mulberry32(hashString(`${key}:${module.id}`));
  const vars = { name: module.name, reuse: reuseShort(module), n: index + 1, total: modules.length };
  const hook = capitalize(fill(pick(rand, HOOKS), vars));
  const features = featuresFor(module);
  const catTags = CATEGORY_TAGS[module.category] || [];

  const igTags = ["#p5js", "#p5waves", ...catTags, ...shuffled(rand, IG_TAGS).slice(0, 10)];
  const instagram = [
    hook,
    module.role,
    module.notes,
    `What makes it p5.waves: ${features[0].long}`,
    "The full runnable sketch is in the p5.waves snippets library (link in bio). Paste it into editor.p5js.org and it runs.",
    "p5.waves: 35 wave shapes for p5.js. One function call, one number back. Free and open source.",
    igTags.join(" ")
  ].join("\n\n");

  const featureLines = features.slice(0, 2).map(f => `• ${f.long}`).join("\n");
  const linkedinParts = [
    hook,
    module.role,
    `Reusable for: ${module.reuse}. ${module.notes}`,
    `The p5.waves part:\n${featureLines}`
  ];
  if (rand() < 0.4) linkedinParts.push(pick(rand, CLASSROOM));
  linkedinParts.push(
    "Every specimen is a small, runnable p5.js sketch: no build step, CSP-safe, MIT-licensed.",
    `Specimen: ${specimenUrl(module)}\nLibrary: ${LIB_URL}`,
    ["#creativecoding", "#p5js", "#javascript", ...catTags.slice(0, 1), "#opensource"].join(" ")
  );
  const linkedin = linkedinParts.join("\n\n");

  const xTags = "#p5js #creativecoding";
  const xCandidates = [
    `${hook}\n\n${capitalize(features[0].short)}. Runnable sketch:\n${specimenUrl(module)}\n\n${xTags}`,
    `${hook}\n\nRunnable sketch:\n${specimenUrl(module)}\n\n${xTags}`,
    `${module.name}, made with p5.waves.\n${specimenUrl(module)}\n${xTags}`
  ];
  const x = xCandidates.find(text => xLength(text) <= 280) || xCandidates[xCandidates.length - 1];

  return { instagram, linkedin, x };
}

// X counts every URL as 23 characters, whatever its real length
function xLength(text) {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

const LIMITS = { instagram: 2200, linkedin: 3000, x: 280 };

/* ---------- post renderer ---------- */

const post = document.querySelector("#post");
const ctx = post.getContext("2d");

const current = {
  index: 0,
  day: dayKey(new Date()),
  format: "instagram",
  state: {},
  start: performance.now()
};

function accentFor(index) {
  return ACCENT[index % ACCENT.length];
}

function keyCodeLine(module) {
  const lines = module.sketch.split("\n").map(l => l.trim());
  const line = lines.find(l => /Waves\.(createSampler|wave)\(/.test(l)) || "Waves.wave(x, { t: millis() / 1000 })";
  // keep only the statement around the call: drop a wrapping function head and trailing braces
  const call = line.match(/([\w.[\]]+\s*=\s*)?[^;{]*Waves\.(createSampler|wave)\(.*/);
  return (call ? call[0] : line)
    .replace(/^(let|const|var)\s+/, "")
    .replace(/;\s*}?\s*$/, "")
    .trim();
}

function wrapText(text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

// break long code at ", " so an options object reads one clause per line
function wrapCode(code, maxWidth) {
  const parts = code.split(/(?<=,)\s+/);
  const lines = [];
  let line = "";
  parts.forEach(part => {
    const test = line ? `${line} ${part}` : part;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = "  " + part;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function fitTitle(text, maxWidth, startSize, maxLines) {
  let size = startSize;
  let lines;
  do {
    ctx.font = `700 ${size}px Oswald, Inter, sans-serif`;
    lines = wrapText(text.toUpperCase(), maxWidth);
    size -= 4;
  } while (lines.length > maxLines && size > 24);
  return { size: size + 4, lines };
}

function drawHeader(module, x, y, width, unit) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = palette.ink;
  ctx.font = `600 ${unit * 1.5}px Oswald, Inter, sans-serif`;
  ctx.fillText("p5.", x, y);
  const pw = ctx.measureText("p5.").width;
  ctx.fillStyle = palette.muted;
  ctx.fillText("waves", x + pw, y);

  const chip = module.category.toUpperCase();
  ctx.font = `500 ${unit * 0.95}px Oswald, Inter, sans-serif`;
  const cw = ctx.measureText(chip).width + unit * 1.6;
  const ch = unit * 1.9;
  ctx.fillStyle = accentFor(current.index);
  ctx.fillRect(x + width - cw, y - ch * 0.78, cw, ch);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + width - cw, y - ch * 0.78, cw, ch);
  ctx.fillStyle = palette.ink;
  ctx.fillText(chip, x + width - cw + unit * 0.8, y);

  const num = `SPECIMEN ${String(current.index + 1).padStart(2, "0")}/${modules.length}`;
  const nw = ctx.measureText(num).width;
  ctx.fillStyle = palette.muted;
  ctx.fillText(num, x + width - cw - nw - unit, y);
}

function drawSpecimen(module, x, y, width, t) {
  const k = width / SPEC_W;
  const height = SPEC_H * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.rect(0, 0, SPEC_W, SPEC_H);
  ctx.clip();
  try {
    module.draw(ctx, SPEC_W, SPEC_H, t, current.state);
  } catch (err) {
    console.error(err);
  }
  ctx.restore();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  return height;
}

function drawCode(module, x, y, width, unit) {
  ctx.font = `400 ${unit * 1.05}px "JetBrains Mono", monospace`;
  const lines = wrapCode(keyCodeLine(module), width - unit * 2.4).slice(0, 4);
  const lh = unit * 1.55;
  const h = lines.length * lh + unit * 1.6;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(x, y, width, h);
  ctx.fillStyle = accentFor(current.index);
  ctx.fillRect(x, y, unit * 0.45, h);
  ctx.fillStyle = palette.paper;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, x + unit * 1.3, y + unit * 0.8 + lh * (i + 0.5)));
  ctx.textBaseline = "alphabetic";
  return h;
}

function codeHeight(module, width, unit) {
  ctx.font = `400 ${unit * 1.05}px "JetBrains Mono", monospace`;
  const n = Math.min(4, wrapCode(keyCodeLine(module), width - unit * 2.4).length);
  return n * unit * 1.55 + unit * 1.6;
}

function drawFooter(x, y, width, unit) {
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 ${unit * 0.95}px Oswald, Inter, sans-serif`;
  ctx.fillStyle = palette.ink;
  ctx.fillText("35 WAVES · ONE CALL · ONE NUMBER BACK", x, y);
  ctx.font = `400 ${unit * 0.85}px "JetBrains Mono", monospace`;
  ctx.fillStyle = palette.muted;
  const url = "github.com/seb-prjcts-be/p5.waves";
  ctx.fillText(url, x + width - ctx.measureText(url).width, y);
}

function drawRole(module, x, y, width, unit, maxLines) {
  ctx.font = `400 ${unit * 1.2}px Inter, sans-serif`;
  ctx.fillStyle = palette.inkSoft;
  const lines = wrapText(module.role, width).slice(0, maxLines);
  const lh = unit * 1.65;
  lines.forEach((line, i) => ctx.fillText(line, x, y + lh * (i + 0.8)));
  return lines.length * lh;
}

function layoutStack(module, W, H, t, format) {
  const pad = Math.round(W * 0.06);
  const unit = W / 45;
  const inner = W - pad * 2;
  const top = format.safeTop || 0;
  const bottom = format.safeBottom || 0;
  let y = top + pad + unit * 1.4;
  drawHeader(module, pad, y, inner, unit);
  y += unit * 2.2;

  const title = fitTitle(module.name, inner, Math.round(W * 0.085), 2);
  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "alphabetic";
  title.lines.forEach(line => {
    y += title.size * 1.02;
    ctx.fillText(line, pad, y);
  });
  y += unit * 1.6;

  const footerY = H - bottom - pad;
  const codeH = codeHeight(module, inner, unit);
  const codeY = footerY - unit * 2.2 - codeH;
  ctx.font = `400 ${unit * 1.2}px Inter, sans-serif`;
  const roleLines = Math.min(3, wrapText(module.role, inner).length);
  const roleH = roleLines * unit * 1.65 + unit * 1.2;

  // the specimen gets whatever room is left; the role text only if it still fits
  const room = codeY - unit * 1.6 - y;
  const withRole = room - roleH >= inner * SPEC_H / SPEC_W;
  const specRoom = withRole ? room - roleH : room;
  const specW = Math.min(inner, specRoom * SPEC_W / SPEC_H);
  const blockH = specW * SPEC_H / SPEC_W + (withRole ? roleH : 0);
  const specY = y + Math.max(0, (room - blockH) / 2);
  const specH = drawSpecimen(module, pad + (inner - specW) / 2, specY, specW, t);
  if (withRole) drawRole(module, pad, specY + specH + unit * 0.6, inner, unit, 3);

  drawCode(module, pad, codeY, inner, unit);
  drawFooter(pad, footerY, inner, unit);
}

function layoutSplit(module, W, H, t) {
  const pad = Math.round(H * 0.08);
  const unit = H / 36;
  const inner = W - pad * 2;
  const colW = inner * 0.36;
  let y = pad + unit * 1.4;
  drawHeader(module, pad, y, inner, unit);
  y += unit * 2.4;

  const title = fitTitle(module.name, colW, Math.round(H * 0.1), 3);
  ctx.fillStyle = palette.ink;
  title.lines.forEach(line => {
    y += title.size * 1.02;
    ctx.fillText(line, pad, y);
  });
  y += unit * 1.2;
  drawRole(module, pad, y, colW, unit, 4);

  const footerY = H - pad;
  const specX = pad + colW + unit * 2;
  const specMaxW = inner - colW - unit * 2;
  const top = pad + unit * 3.4;
  const codeH = codeHeight(module, specMaxW, unit);
  const room = footerY - unit * 2.2 - codeH - unit * 1.4 - top;
  const specW = Math.min(specMaxW, room * SPEC_W / SPEC_H);
  const specH = drawSpecimen(module, specX + specMaxW - specW, top, specW, t);
  drawCode(module, specX, top + specH + unit * 1.4, specMaxW, unit);
  drawFooter(pad, footerY, inner, unit);
}

function render(now) {
  const format = FORMATS[current.format];
  const module = modules[current.index];
  if (post.width !== format.w || post.height !== format.h) {
    post.width = format.w;
    post.height = format.h;
    fitPreview();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, format.w, format.h);
  // same clock as the library page: ms / 600
  const t = (now - current.start) / 600;
  if (format.layout === "split") layoutSplit(module, format.w, format.h, t);
  else layoutStack(module, format.w, format.h, t, format);
}

// scale the preview by hand: max-width + max-height on a canvas distorts its ratio
function fitPreview() {
  const frame = post.parentElement.getBoundingClientRect();
  const k = Math.min(1, frame.width / post.width, (window.innerHeight * 0.72) / post.height);
  post.style.width = `${Math.floor(post.width * k)}px`;
  post.style.height = `${Math.floor(post.height * k)}px`;
}

window.addEventListener("resize", fitPreview);

function loop(now) {
  render(now);
  requestAnimationFrame(loop);
}

/* ---------- UI ---------- */

const daySelect = document.querySelector("#daySelect");
const specimenSelect = document.querySelector("#specimenSelect");
const formatButtons = document.querySelector("#formatButtons");
const calendarList = document.querySelector("#calendar");
const videoButton = document.querySelector("#videoButton");
const videoStatus = document.querySelector("#videoStatus");
const captionCards = [...document.querySelectorAll(".caption-card")];

function selectSpecimen(index) {
  current.index = index;
  current.state = modules[index].state ? { ...modules[index].state } : {};
  current.start = performance.now();
  specimenSelect.value = String(index);
  updateCaptions();
  updateCalendar();
}

function updateCaptions() {
  const module = modules[current.index];
  const captions = buildCaptions(module, current.index, current.day);
  captionCards.forEach(card => {
    const platform = card.dataset.platform;
    const area = card.querySelector("textarea");
    area.value = captions[platform];
    updateCount(card);
  });
}

function updateCount(card) {
  const platform = card.dataset.platform;
  const text = card.querySelector("textarea").value;
  const length = platform === "x" ? xLength(text) : text.length;
  const count = card.querySelector(".count");
  count.textContent = `${length}/${LIMITS[platform]}`;
  count.classList.toggle("is-over", length > LIMITS[platform]);
}

function updateCalendar() {
  calendarList.innerHTML = "";
  const start = parseDay(dayKey(new Date()));
  for (let i = 0; i < 14; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dayKey(date);
    const index = moduleIndexForDay(date);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("is-active", key === current.day);
    const when = document.createElement("span");
    when.className = "date";
    when.textContent = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    const name = document.createElement("span");
    name.textContent = modules[index].name;
    button.append(when, name);
    button.addEventListener("click", () => setDay(key));
    li.appendChild(button);
    calendarList.appendChild(li);
  }
}

function setDay(key) {
  current.day = key;
  daySelect.value = key;
  selectSpecimen(moduleIndexForDay(parseDay(key)));
}

function setFormat(key) {
  current.format = key;
  [...formatButtons.children].forEach(b => b.classList.toggle("is-active", b.dataset.format === key));
}

function fileBase() {
  return `p5waves-${current.day}-${modules[current.index].id}-${current.format}`;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function recorderType() {
  const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return types.find(type => window.MediaRecorder && MediaRecorder.isTypeSupported(type));
}

function recordVideo() {
  const type = recorderType();
  if (!type || !post.captureStream) {
    videoStatus.textContent = "This browser cannot record canvas video. Try Chrome or Edge.";
    return;
  }
  const stream = post.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    download(new Blob(chunks, { type }), `${fileBase()}.${ext}`);
    videoButton.disabled = false;
    videoButton.classList.remove("is-recording");
    videoButton.textContent = "RECORD VIDEO LOOP";
    videoStatus.textContent = ext === "webm"
      ? "Saved as WebM. Instagram wants MP4: convert it, or record in a recent Chrome/Safari."
      : "Saved as MP4.";
  };
  // restart the specimen so every video opens on a clean first frame
  selectSpecimen(current.index);
  videoButton.disabled = true;
  videoButton.classList.add("is-recording");
  recorder.start(250);
  let left = RECORD_SECONDS;
  videoButton.textContent = `RECORDING ${left}s`;
  const tick = setInterval(() => {
    left -= 1;
    if (left > 0) {
      videoButton.textContent = `RECORDING ${left}s`;
    } else {
      clearInterval(tick);
      recorder.stop();
    }
  }, 1000);
}

function bindUi() {
  modules.forEach((module, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${String(i + 1).padStart(2, "0")} · ${module.name}`;
    specimenSelect.appendChild(option);
  });
  Object.entries(FORMATS).forEach(([key, format]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter";
    button.dataset.format = key;
    button.textContent = format.label;
    button.addEventListener("click", () => setFormat(key));
    formatButtons.appendChild(button);
  });

  daySelect.addEventListener("change", () => { if (daySelect.value) setDay(daySelect.value); });
  specimenSelect.addEventListener("change", () => selectSpecimen(Number(specimenSelect.value)));
  document.querySelector("#shuffleButton").addEventListener("click", () => {
    let next = current.index;
    while (next === current.index && modules.length > 1) next = Math.floor(Math.random() * modules.length);
    selectSpecimen(next);
  });
  document.querySelector("#pngButton").addEventListener("click", () => {
    post.toBlob(blob => download(blob, `${fileBase()}.png`), "image/png");
  });
  videoButton.addEventListener("click", recordVideo);

  captionCards.forEach(card => {
    const area = card.querySelector("textarea");
    area.addEventListener("input", () => updateCount(card));
    const button = card.querySelector(".copy-button");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(area.value);
      } catch (err) {
        area.select();
        document.execCommand("copy");
      }
      button.textContent = "COPIED";
      button.classList.add("is-copied");
      setTimeout(() => {
        button.textContent = "COPY";
        button.classList.remove("is-copied");
      }, 1400);
    });
  });
}

async function bootStudio() {
  try {
    await Promise.all([
      document.fonts.load('700 40px Oswald'),
      document.fonts.load('500 20px Oswald'),
      document.fonts.load('400 20px Inter'),
      document.fonts.load('400 20px "JetBrains Mono"')
    ]);
  } catch (err) {
    // fall back to system fonts; the post still renders
  }
  bindUi();
  const params = new URLSearchParams(location.search);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.get("day") || "") ? params.get("day") : dayKey(new Date());
  setFormat(FORMATS[params.get("format")] ? params.get("format") : "instagram");
  setDay(day);
  const byId = modules.findIndex(m => m.id === params.get("id"));
  if (byId >= 0) selectSpecimen(byId);
  requestAnimationFrame(loop);
}

bootStudio();
