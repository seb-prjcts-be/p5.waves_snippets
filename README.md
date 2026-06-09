# p5.waves Visual Vocabulary

This folder now contains a static visual-library prototype built from the curation brief, with 26 reusable wave-driven entries across motion, type, grid, color, texture, interface, state, and layout.

Open `index.html` in a browser to browse the library. Each entry includes:

- a live canvas preview
- a small reusable `p5.waves`-style code snippet
- a short note explaining the graphic job
- primitive/reuse badges, category tags, primitive filters, and search controls
- a pause/resume control and shared speed slider for the live previews

The site is intentionally lightweight: it loads `p5.waves` v3.3.0 directly and runs without a build step or package install. The snippets keep the brief's vocabulary visible through calls such as `Waves.wave()` and `sampler.sample()`.

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

The `Arc Value Label` card is the current model for this approach: the path stays fixed, but a shifting sampler changes how the marker travels between `< 0`, `0`, and `> 0`. The visible concept depends on the wave dialect, `waveName`, and `targetName`, not just on a label moving from left to right.
