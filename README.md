# p5.waves Visual Vocabulary

This folder now contains a static visual-library prototype built from the curation brief, with 34 reusable wave-driven entries across motion, type, grid, color, texture, interface, state, and layout.

Open `index.html` in a browser to browse the library. Each entry includes:

- a live canvas preview
- a small reusable `p5.waves`-style code snippet
- a short note explaining the graphic job
- primitive/reuse badges, category tags, primitive filters, and search controls
- a pause/resume control and shared speed slider for the live previews

The site is intentionally lightweight: it loads `p5.waves` v3.6.0 directly (CSP-safe, eval-free build) and runs without a build step or package install. The snippets keep the brief's vocabulary visible through calls such as `Waves.wave()` and `sampler.sample()`.

Preview canvases are only animated while their cards are visible in the viewport, which keeps the larger catalogue responsive as more modules are added.

## Curation Standard

Each snippet should stay a small reusable code specimen, not a poster composition for the whole page. The visual standard comes from treating every preview as a strong individual graphic concept: high contrast, clear behaviour, readable state, and enough energy to invite reuse.

The strict USP rule is that a specimen should depend on `p5.waves`, not merely on a moving value. A preview is weak when it can be replaced by `sin()`, `noise()`, `lerp()`, CSS keyframes, or a simple timer without losing its core idea.

Strong specimens should make at least one `p5.waves`-specific feature visible or structurally necessary:

- `waveName` and `targetName` as readable design state
- `shift` as a behaviour, layout, or mode trigger
- `mix` as visible transition material between formulas
- `group` selection such as `gentle`, `harsh`, or `all`
- `mode: "wild"` and `unpredictability`
- `seed` for many distinct behaviours from one call pattern
- sampler reuse for related samples that share state
- comparison between wave formulas or wave families
- `group: 'closing'` + `sampler.period` for seamless loops and repeatable tiles
- `group: 'ghost'` for delayed-echo copies that stay readable when they overlap
- `Waves.list()` / `Waves.count` for runtime self-documentation

The `Arc Value Label` card is the current model for this approach: the path stays fixed, but a shifting sampler changes how the marker travels between `< 0`, `0`, and `> 0`. The visible concept depends on the wave dialect, `waveName`, and `targetName`, not just on a label moving from left to right.

## Social Studio

`studio.html` turns the specimen library into ready-to-post social content, with no input needed:

- **One specimen per day.** A fixed shuffle of all specimens, keyed to the calendar date, so each one gets a turn before any repeats. `studio.html?day=2026-10-01` opens a specific day; `?id=word-gate&format=x` opens a specific specimen and format.
- **Four formats:** Instagram 4:5 (1080×1350), Reel/Story 9:16 (1080×1920, keeps clear of the UI overlay strips), LinkedIn 1:1 (1200×1200) and X 16:9 (1600×900).
- **Image or video.** Download a PNG, or record a 10-second loop (MP4 where the browser supports it, otherwise WebM).
- **Three captions.** Instagram (long text plus hashtags), LinkedIn (the reason it's useful, the p5.waves feature, links, sometimes a classroom tip) and X (always 280 characters or fewer, with URLs counted as 23). The captions are built from the specimen's own `role`, `notes`, `reuse` and `tags`, so a new specimen in `script.js` shows up in the studio by itself.

The studio reuses the `modules` from `script.js` directly: the post canvas calls each specimen's own `draw()`.
