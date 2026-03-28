# Touch Grass — Planning

Satirical, calming microsite for AI builders who need a break. Concept ties to cognitive overload and “always-on” tooling described in [Pablo Stanley’s “Fried”](https://www.linkedin.com/pulse/fried-pablo-stanley-h4uvf/) (AI brain fry, air-traffic-control mode, FOMO around agents). The joke: the cure for being too online is a little more online—but make it nature.

**Production URL:** `https://go-touchgrass.vercel.app`  
**Vercel project name:** `touchgrass` (dashboard name; the `.vercel.app` hostname is **`go-touchgrass`** because `touchgrass.vercel.app` was unavailable)

---

## Where things stand (Efecto vs this repo)

The **first implementation** here (`index.html`, `styles.css`, `grass.js`) was built **entirely in the repo**, with **no Efecto session and no MCP calls**. That matched “get something live quickly” and the choice to defer Efecto’s GitHub/Vercel publish path—not an Efecto-powered build.

**What “using Efecto MCP” actually requires:** someone runs **`create_session`** in Cursor, **you open the URL** Efecto returns so the browser pairs with the session, then **`wait_for_connection`** so the agent can safely call tools like **`get_document`**, **`add_section`**, **`add_node`**, etc. Until those steps happen, the MCP is idle.

**Ways to involve Efecto from here** (choose what fits your story to Pablo):

1. **Primary surface in Efecto** — Recreate the page shell (full viewport, headline, subline, footer, sound control) via MCP + canvas; keep the grass as custom code inside Efecto if the product allows it, or one embedded script block sourced from this repo.
2. **Hybrid** — Ship this repo to Vercel for now; use Efecto + MCP for visual iteration, then copy or publish into the repo when you wire Efecto → GitHub.
3. **Honest DM wording** — Only claim “built in Efecto” once the design/deploy path actually goes through Efecto; until then, describe what is true (e.g. “microsite for builders…” + link) or “building the Efecto version next.”

**Chosen path:** **Option 2 — Efecto FX → assets → Efecto Design** (see [Efecto FX](https://efecto.app/docs/fx)). FX treats the retro/grass **look**; Design treats **layout, type, and publish**. Details in the section below.

---

## Efecto Design + Efecto FX (architecture — locked)

These are **two products**, not one editor. **FX work is driven by the [FX MCP](https://efecto.app/docs/fx/mcp)** in Cursor; the raw [FX API](https://efecto.app/docs/fx/api) (`POST https://efecto.app/api/v1/render`, etc.) stays available as an **optional fallback** if you ever need a script without the agent.

| Piece | Role in touchgrass |
|--------|---------------------|
| **[Efecto FX](https://efecto.app/docs/fx)** + **[`@efectoapp/mcp-fx`](https://efecto.app/docs/fx/mcp)** | **Primary:** Agent uses FX MCP tools to build a **poster** (canvas, background, layers, effect, optional post-process) and **`render_image`** for output. You (or the agent) save the result into **`public/meadow-fx.png`** (or equivalent) in this repo. |
| **[Efecto Design](https://efecto.app/docs)** + **Design MCP** (`user-efecto`) | **Shipped UI:** artboard, Tailwind, headline/subline/footer, sound control, **background** from the **FX image** (URL after deploy or upload in app). **Publish** from the Design app when you use that path. |
| **This repo** | **`public/`** holds **committed FX renders** so Vercel serves a **stable URL**; optional **`grass.js`** for audio / future motion. |

### Install FX MCP in Cursor

This repo’s MCP listing may only show **Design** until you add FX:

1. Run: `npx @efectoapp/mcp-fx install` (per [FX MCP docs](https://efecto.app/docs/fx/mcp)) — this mainly configures **Claude Code** (`~/.claude.json`); **Cursor** still needs its own MCP entry (see below).
2. **Restart Cursor** after adding the server.
3. Confirm **two** Efecto-related MCPs: **Design** (`@efectoapp/mcp`) and **FX** (`@efectoapp/mcp-fx`).

### FX MCP in Cursor: red error / “Connection closed”

If the log shows `npx -y @efectoapp/mcp-fx` then **`MCP error -32000: Connection closed`** a few seconds later, Cursor often lost the **stdio** connection while **`npx`** was still extracting or wrapping the real server. The `node-domexception` line is an npm deprecation **warning**; the stray `undefined` line is usually noise from the toolchain—not the root cause.

**Fix (most reliable): run the server without `npx`**

1. **Global install** (Node **≥ 18**):  
   `npm install -g @efectoapp/mcp-fx`
2. In Terminal, run **`which efecto-fx`** and copy the **absolute path** (e.g. `/opt/homebrew/bin/efecto-fx` or a path under `nvm`).
3. In **Cursor → MCP → efecto-fx**, set **Command** to that **full path** and leave **Args** empty (or use **Command** `node` with one arg: the path to `…/node_modules/@efectoapp/mcp-fx/dist/index.js` from a local install if you prefer not to use `-g`).

**Alternative:** Create a folder (e.g. `~/mcp/efecto-fx`), run `npm install @efectoapp/mcp-fx`, then point Cursor at:

- **Command:** `node`  
- **Args:** `/Users/YOU/mcp/efecto-fx/node_modules/@efectoapp/mcp-fx/dist/index.js`

Restart Cursor and check that **efecto-fx** shows green. If it still fails, open **Show Output** again—look for **Node version**, **permission**, or **EACCES** on the binary path.

### FX MCP workflow (from official docs)

Typical poster pipeline ([FX Poster Skill](https://efecto.app/docs/fx/mcp)):

1. **`create_poster`** — e.g. `aspectRatio: "16:9"` (or `1:1` / `full` if supported).
2. **`set_page_layout`** — e.g. `justifyContent: "center"` for a field-focused frame.
3. **`set_background`** — solid / gradient / **image** / video for the top-down grass base (or `search_images` + image if you use stock for a first pass).
4. **`add_group` / `add_layer`** — optional decorative layers (paths, tree band); **omit** on-poster headline/subline if those stay **only in Efecto Design**.
5. **`apply_effect`** — e.g. **`dither-atkinson`** with **`paletteId: "gameboy"`** and **`pixelation`** for a GBA-adjacent read (see [Effect selection](https://efecto.app/docs/fx/mcp)).
6. **`add_postprocess`** — **only for non-dither effects**; **dither (WebGL) uses built-in palette/bloom—do not stack `add_postprocess` on dither** (same doc).
7. **`render_image`** — preview/export; persist whatever the tool returns (e.g. image bytes / data URL) to **`public/meadow-fx.png`**.

For touchgrass, treat the FX poster as a **background plate**; typography stays in **Design** unless you want type baked into the PNG.

### End-to-end flow

1. **Base art** — Top-down grass read: **gradient / shapes / image / video** layer via FX MCP (`set_background`, optional `add_layer`), original art only.
2. **Grade in FX** — **`apply_effect`** (+ post-process only when the chosen effect allows it).
3. **Render to repo** — **`render_image`** via MCP → save as **`public/meadow-fx.png`**; commit when happy.
4. **Design** — Design MCP + app: full-bleed **`<img>` / `bg-cover`** → `https://go-touchgrass.vercel.app/meadow-fx.png` (or current test asset `…/pipeline-test-fx.png`) or upload until deployed.
5. **Ship** — Design **Publish** and/or this repo on Vercel; document the real path in *Implementation decisions*.

### What to implement next (engineering order)

1. **Install FX MCP** and run one **touchgrass background** pass through the tool chain above (iterate `apply_effect` / background until it reads right).
2. **Save** MCP `render_image` output into **`public/meadow-fx.png`**.
3. **Design MCP** — Point artboard background at that asset (URL or upload).
4. **Repo `index.html`** — Match background path for parity if you keep a static twin.

### DM wording (accurate)

You can say you used **Efecto Design** and **Efecto FX** (via the **FX MCP** in Cursor). The underlying engine is the same FX stack as the public API; you’re choosing **MCP** as the control surface, not “no API,” just **not hand-writing `curl`**.

---

## Goals

| Goal | Notes |
|------|--------|
| One perfect moment | Single full-viewport scene (golden-hour meadow). No multiple environments or “app” flows. |
| Shareable & sincere | Beautiful enough to screenshot; minimal copy so the idea lands without explanation. |
| Respect attention | No autoplay audio; no noisy UI chrome. |
| Attribution only | Footer links to maker; no pitch in the page or in the Pablo DM. |

---

## Copy (locked)

- **Headline:** `touch grass`
- **Subline:** `for people who build AI for a living`
- **Footer:** `made by [Andrés Arbelaez](https://andresma.com)` — name + link only.

No extra marketing copy, no “mindfulness tool” framing.

---

## Experience spec

1. **Visual (v2 — with FX):** **Top-down** field read (tile-like / GBA-inspired **style**, original art only). **FX MCP** (`apply_effect`, optional `add_postprocess` per effect rules) delivers dither / pixel / grain / scanlines etc.; grass **field** is **simple** and **asset-driven** (FX `render_image` → `public/`), not the old procedural canvas meadow—unless we add a light motion pass later in the repo.
2. **Visual (v1 reference):** Warm greens and golden light still work as **mood** inside the FX grade; the **angle** shifts to orthographic top-down, not horizon + sun disk.
3. **Interaction:** Optional v2: subtle parallax or none (static hero is OK). Prior **mouse-reactive sway** (`grass.js`) is **de-prioritized** until the FX base is done; can revisit as a separate layer.
4. **Sound:** Opt-in only (small unmute control). Wind / birds unchanged in intent.
5. **Layout:** Type and footer over the **FX background**; minimal chrome.

---

## Using Efecto (MCP + web app) — maximize real usage

Your DM says you built it in Efecto; the most credible version of that story is: **most of the page structure, styling, and iteration happened in Efecto**, and **the live site is tied to Efecto’s output** (e.g. published from the app to GitHub, then Vercel)—not “designed elsewhere and pasted in once.”

Official orientation: [Efecto docs (incl. MCP)](https://efecto.app/docs) and their [overview of design + agents](https://efecto.app/blog/efecto-design) (canvas as real components/Tailwind; GitHub/Vercel workflows are part of the product story).

### Efecto MCP in Cursor (what it actually does)

The MCP connects **this editor** to a **live Efecto session in your browser**. Cursor can read and edit the document programmatically; you see changes on the canvas.

Typical loop:

1. **Start a session** — The agent calls `create_session` (optional `label`, e.g. `touchgrass`). Efecto returns a **URL**; you open it so the browser pairs with Cursor.
2. **Wait for pairing** — The agent calls `wait_for_connection` so it doesn’t race ahead before your tab is ready.
3. **Design from here** — Tools such as `get_document`, `create_artboard`, `add_section`, `add_node`, `update_node`, `replace_section`, `set_theme`, shaders, etc. change the real file on the canvas. Treat `get_document` as the source of truth before big edits.
4. **Check connection** — `session_status` if something seems out of sync.
5. **End** — `close_session` when you’re done for the day.

What the MCP **does not** appear to expose (in this server’s tool list): a **“deploy to Vercel”** or **“push to GitHub”** button as an MCP call. Those flows are almost certainly in the **Efecto web app UI** after you’ve built the page. So: **MCP = co-editing the design with the agent; web app = publish/deploy.**

### Efecto web app (where “show Pablo” really lands)

Use the app for anything that’s product-native:

- **Layout, type, colors, Tailwind** for the full viewport frame (headline, subline, footer, unmute control).
- **Shaders / effects** for sky, light, grain, or background layers Efecto handles well.
- **Publish** — Per Efecto’s positioning, you can connect **GitHub** and **Vercel** from the design surface so the shipped site is literally the design output. That’s the strongest “I used Efecto” proof: the deployment path goes through their tool.
- **Grass + mouse** — If the canvas supports **custom code** (script/component) inside a node, prefer implementing the interactive grass **inside that Efecto-owned page** so one artifact stays “from Efecto.” If not, a thin wrapper repo that only adds one script is still honest if the **visible structure and iteration** were in Efecto; say “layout and scene in Efecto, grass interaction in a small custom layer” if asked.

### Practical strategy for your intention

| Priority | Action |
|----------|--------|
| 1 | **Primary build surface:** Efecto (web) + MCP from Cursor for iterations—so Pablo’s tool is where the page lives day to day. |
| 2 | **Primary deploy path:** Use Efecto’s **GitHub → Vercel** (or equivalent) flow so **`go-touchgrass.vercel.app`** traces back to that pipeline. Vercel project name: `touchgrass`. |
| 3 | **Field look:** **FX MCP** → `public/meadow-fx.png`; optional motion later in repo or Design. |
| 4 | **Receipts (optional):** Screenshot or short screen recording of the Efecto canvas / MCP session if you ever want to show process—not required for the DM, but it backs up the story. |

Fill the **Efecto → repo** row in *Implementation decisions* once you’ve clicked through publish in the app once (exact menu names change; the docs/changelog are the authority).

---

## Efecto MCP vs this repo

**What the Efecto MCPs are good for**

- **Design MCP** (`user-efecto`): session-based design in the browser (paired with Cursor); Tailwind/JSX (`add_section`, `add_node`, artboards); publish path still in the app.
- **FX MCP** (`@efectoapp/mcp-fx`): poster composition + effects + **`render_image`** for the **meadow plate** ([workflow](https://efecto.app/docs/fx/mcp)); install separately from Design.

**What the MCPs alone may not replace**

- **Deploy/publish (Design)** — Still **Design web app** for GitHub/Vercel in most setups; Design MCP does not replace Publish.
- **Committed files** — FX MCP’s **`render_image`** gives you pixels; **you still save** them into **`public/meadow-fx.png`** in git (or upload in Design)—the MCP does not replace your repo/deploy discipline.
- **Procedural mouse grass** — FX plate is **static** unless you add a motion layer in the repo (`grass.js`) or inside Design if supported.

**Recommended workflow**

1. **Prefer** Efecto as the **authoring and publish** path (GitHub + Vercel from the product when possible).
2. Use **this repo** if you need a **parallel** git home (e.g. you sync from Efecto’s GitHub export into here, or you maintain only the grass script here). Document the actual sync in *Implementation decisions*.
3. Use **MCP** whenever you’re in Cursor and want the agent to **read/edit the live document**—that *is* “using Efecto” in a way that’s visible and true.

---

## Implementation decisions (fill in before build)

| Decision | Options | Choice (TBD) |
|----------|---------|----------------|
| Page tech | Vanilla `index.html` + JS, or minimal Vite/static tooling | |
| Grass / scene | **FX MCP** → `render_image` → static file in `public/`; top-down plate + dither/pixel grade | **Locked:** Option 2 |
| Efecto → repo | Design **Publish** to GitHub/Vercel **and/or** repo holds `public/meadow-fx.png` + static shell; document actual sync after first publish | |
| FX invocation | **Primary: [FX MCP](https://efecto.app/docs/fx/mcp)** (`npx @efectoapp/mcp-fx install`). **Fallback:** [FX API](https://efecto.app/docs/fx/quickstart) `POST …/render` if you need automation without MCP | **Locked:** MCP |
| Audio | Self-hosted files in repo vs CDN; format(s) | |
| Fonts | System stack vs one or two webfonts (license) | |
| a11y | Reduced motion, unmute focus states, contrast for text on scene | |

---

## Repository layout (planned)

Proposed once build starts (adjust to match stack choice):

```text
touchgrass/
├── PLANNING.md
├── index.html           # shell: type, footer, sound; bg from FX asset
├── styles.css
├── grass.js             # optional: audio + future motion; or slim to audio-only
├── public/
│   ├── meadow-fx.png    # output of FX MCP render_image (name TBD)
│   └── audio/           # optional later
├── scripts/             # optional: only if you add API fallback (curl/Node)
└── .gitignore
```

*(FX output must be **reachable by URL** for Efecto Design `<img>`—e.g. `https://go-touchgrass.vercel.app/pipeline-test-fx.png` or `…/meadow-fx.png` after deploy.)*

---

## Phases (after planning)

1. **FX base (MCP)** — `create_poster` → `set_background` / layers → `apply_effect` (e.g. `dither-atkinson` + `gameboy` palette) per [FX MCP](https://efecto.app/docs/fx/mcp); iterate until the GBA-adjacent read lands.
2. **FX → file** — **`render_image`** via FX MCP → save to **`public/meadow-fx.png`**; commit when happy.
3. **Design** — Paired Design session: full-bleed background from **deployed or uploaded** image URL; type, footer, sound control (Design MCP).
4. **Repo parity** — Point `index.html` / CSS at the same asset; trim or keep `grass.js` (audio only vs full meadow).
5. **Audio** — Opt-in wind; unchanged rules.
6. **Polish** — OG image, favicon, contrast on pixel bg.
7. **Deploy** — Vercel project `touchgrass`; production URL **`https://go-touchgrass.vercel.app`**; Design publish if used.
8. **Outreach** — Pablo DM; accurate line about **Design + FX (MCP)**.

---

## Open questions (from brief + follow-up)

- **FX:** Exact `effectId` / post-process stack for “Game Boy–ish but original”—iterate against [Effects](https://efecto.app/docs/fx/effects) and [Post-processing](https://efecto.app/docs/fx/postprocess).
- **Image URL in Design:** Use **`https://go-touchgrass.vercel.app/…`** for deployed assets (`pipeline-test-fx.png`, later `meadow-fx.png`); upload only if you iterate before push.
- Ambient audio: CC0 / licensed loops vs procedural wind; licensing unchanged.
- **Day/night:** still out of scope unless it stays one static FX frame.

---

## Success vs failure (reminder)

**Works:** Readable **top-down** field + credible **FX** grade; minimal copy; opt-in sound; **both** Design MCP and **FX MCP** in the story; deploy path clear.

**Fails:** Generic gradient with no tile read; FX overcooked to mud; too much copy; autoplay audio; scope creep.

---

## Pablo DM (after launch)

> Hey Pablo — made something for AI builders who need a break from their IDE. Built the layout in Efecto Design, built the scene with Efecto FX (MCP), deployed on Vercel: https://go-touchgrass.vercel.app/

*(Adjust wording to match what you actually shipped—keep claims aligned with *Efecto Design + Efecto FX* section above.)*

---

*Last updated: production URL **go-touchgrass.vercel.app**; FX MCP primary; FX HTTP API optional fallback.*
