---
name: Monitoreo Tecvol
description: A naval switchboard front — panel physics where relief comes only from bevels and brand orange means live signal.
colors:
  negro: "#0e1114"
  casco: "#16191d"
  acero: "#22262b"
  acero-alto: "#2b3036"
  borde: "#33373d"
  borde-vivo: "#454b52"
  filo-negro: "#0a0d0f"
  blanco: "#ffffff"
  serigrafia: "#c9cdd2"
  gris: "#9aa1a8"
  gris-hondo: "#727577"
  naranja: "#ff8929"
  naranja-hondo: "#db4d1b"
  naranja-tenue: "rgba(255, 137, 41, 0.14)"
  alarma: "#ff4734"
  ok: "#4ea86a"
  naranja-lente: "#ffc48f"
  naranja-alto: "#ffa053"
  alarma-lente: "#ff9d93"
  alarma-texto: "#ffd9d4"
  ok-lente: "#9fd6b1"
  ok-texto: "#d3f0dc"
  acero-marca: "#7b838b"
  acero-tornillo: "#545b63"
  acero-ranura: "#868e96"
typography:
  display:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.9rem)"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.012em"
  display-chapa:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 2.35vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.012em"
  headline-chapa:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 1.85vw, 1.8rem)"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  cifra:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontFeature: "tnum 1, lnum 1"
  label:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.16em"
  designacion:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.16em"
rounded:
  none: "0"
  hardware: "50%"
spacing:
  e1: "0.25rem"
  e2: "0.5rem"
  e3: "0.75rem"
  e4: "1rem"
  e5: "1.5rem"
  e6: "2rem"
  e7: "3rem"
  e8: "4.5rem"
  e9: "7rem"
components:
  interruptor:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.5rem"
    height: "auto"
  interruptor-hover:
    backgroundColor: "#2a2f35"
    textColor: "{colors.blanco}"
  interruptor-disabled:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.gris-hondo}"
  hueco:
    backgroundColor: "#101418"
    textColor: "{colors.serigrafia}"
    rounded: "{rounded.none}"
  campo-entrada:
    backgroundColor: "transparent"
    textColor: "{colors.blanco}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  chapa:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.serigrafia}"
    rounded: "{rounded.none}"
    padding: "1rem 1.5rem"
  lectura:
    backgroundColor: "#101418"
    textColor: "{colors.blanco}"
    typography: "{typography.cifra}"
    rounded: "{rounded.none}"
    padding: "1rem 1rem 0.75rem"
  riel:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.gris}"
    rounded: "{rounded.none}"
    height: "62px"
  riel-salida:
    backgroundColor: "{colors.acero-alto}"
    textColor: "{colors.gris}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1rem"
  riel-salida-hover:
    backgroundColor: "#343a41"
    textColor: "{colors.blanco}"
  regleta:
    backgroundColor: "{colors.casco}"
    textColor: "{colors.serigrafia}"
    rounded: "{rounded.none}"
  borne:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.serigrafia}"
    rounded: "{rounded.none}"
    padding: "1rem"
---

# Design System: Monitoreo Tecvol

## Overview

**Creative North Star: "The Remote Engine Room"**

The interface is the front of a naval switchboard, not a dashboard about one. Every surface is folded sheet steel: a light edge along the top, a dark edge along the bottom, and nothing else standing between the eye and the metal. Instruments do not float on cards; they are mounted into recessed housings cut into the panel. Depth is a physical fact of the material, never an atmospheric effect.

The world is dark because an engine room is dark and because the product is read on deck in direct sun and in an office at night with equal seriousness. The greys are steel greys, close together and low-chroma, which leaves brand orange with nowhere to hide: when orange appears, something is reporting. The typographic voice is engraved silkscreen — uppercase Sora at label size with wide tracking, riding as circuit designations, equipment legends and panel headers, exactly as a real board carries them.

The world now carries three routes — the landing, the access screen at `/login` and its provisional destination at `/tablero` — and the second surface was built by mounting parts that already existed (the pushbutton, the housing, the terminal strip, the plate) rather than re-authoring them locally. That is how a route joins this world.

The build's one authored motion is a four-plane camera that pulls back from the panel to the hull to the fleet to the office, while the same live readings continue to run at every scale. Confirmed rejections: no gradients, no glass, no soft drop shadows, no decorative blur, no rounded card language.

**Key Characteristics:**
- Bevel-only relief; every `box-shadow` in the build is inset
- Brand orange strictly reserved for live signal and focus
- Square corners everywhere except round hardware (lenses, screw heads, indicator lamps)
- Circuit designations (`−P1`, `−Q3`, `−X2:1`) as a real cross-surface system
- One live-data source feeding every instrument on the page
- One easing curve, one authored motion moment
- One named type ramp on a 1/16rem step (`--t1`…`--t11`) carrying every size on the panel face
- One rail in two variants (`landing`, `minimo`) serving all three routes

## Colors

A steel palette of eight closely spaced darks and greys, held nearly monochrome so that a single inherited brand orange can carry all the meaning.

### Primary
- **Señal Naranja** (`{colors.naranja}`): The brand orange, inherited unchanged from tecvol.com.ar. It appears only where there is live signal or live intent: gauge needles, in-port pilot lamps, the pushbutton lens, the brand bracket, the focus ring, the caret, text selection, scrollbar hover, and link underlines. It is never a background wash and never decorates a heading.
- **Naranja Hondo** (`{colors.naranja-hondo}`): The pressed state of the pushbutton lens only — the darker filament of a lamp under load.
- **Naranja Lente** (`{colors.naranja-lente}`): The bright rim of a lit lens — the 1px border of the pushbutton lens and the stroke of a live `Piloto`. A lamp that is on is brighter at its rim than at its body; this token is what makes it read as glass over a filament, and it is the only orange in the system lighter than the brand orange.
- **Naranja Alto** (`{colors.naranja-alto}`): The hover state of that lens. The lamp brightens; nothing moves.
- **Naranja Tenue** (`{colors.naranja-tenue}`): A 14% orange veil for the faintest live tint behind a signalling element. Use sparingly; it is a wash, not a surface color.

### Secondary
- **Alarma Roja** (`{colors.alarma}`): Out-of-range readings, alarm pilots, invalid form fields. It is a state color, never a brand color.
- **Verde Navegando** (`{colors.ok}`): The "under way" pilot lamp in fleet lists and tables. Nothing else.
- **Alarma Lente** (`{colors.alarma-lente}`) / **Verde Lente** (`{colors.ok-lente}`): The lit rims of the alarm and under-way lamps — the same lamp physics as `naranja-lente`, applied to the two state colors.
- **Alarma Texto** (`{colors.alarma-texto}`) / **Verde Texto** (`{colors.ok-texto}`): Text set *on* an error or success notice, where full-strength `alarma`/`ok` would not hold as prose. State chrome stays saturated; state prose lifts to the pale tint.

### Neutral
- **Negro de Sala** (`{colors.negro}`): The page ground and the camera viewport behind the planes.
- **Casco** (`{colors.casco}`): The cabinet body and section panels sitting one step above the ground.
- **Acero** (`{colors.acero}`): The standard proud plate — nav rail, engraved plates, bars, button legends.
- **Acero Alto** (`{colors.acero-alto}`): The most proud metal: hinges, button bezels, gauge spindles.
- **Filo Negro** (`{colors.filo-negro}`): The 1px cut line between every plate. It is the border color of the whole system.
- **Borde** (`{colors.borde}`) / **Borde Vivo** (`{colors.borde-vivo}`): Interior dividers in tables and lists; the scrollbar thumb.
- **Blanco** (`{colors.blanco}`): Headings and instrument values only.
- **Acero Marca** (`{colors.acero-marca}`) / **Acero Tornillo** (`{colors.acero-tornillo}`) / **Acero Ranura** (`{colors.acero-ranura}`): The three reused stroke greys of the technical drawing — minor tick marks on a dial, the body of a screw head, the slot cut across it. They exist inside SVG only and never paint a CSS surface. Stroke shades used by exactly one drawing stay literal in that drawing; three earned tokens because three parts share them.
- **Serigrafía** (`{colors.serigrafia}`): The default body ink — the color of silkscreen paint on grey steel.
- **Gris** (`{colors.gris}`): Secondary prose and label ink, and — since the access surface — the ink of a circuit designation printed on `acero` steel (`.borne__designacion`), where it holds ≈5.8:1.
- **Gris Hondo** (`{colors.gris-hondo}`): The deepest stamped grey. It belongs on the dark grounds — designations inside a `hueco`, demo-data disclaimers, the session line in the rail — where it still reads as silkscreen. It is not a designation ink on `acero`.

### Named Rules
**The Live-Signal Rule.** Orange means something is reporting right now, or the user is about to act. If a surface is not live and not interactive, it is steel. An element that would look "nicer" in orange without carrying signal is a defect.

**The Inherited Brand Rule.** Sora and `{colors.naranja}` come from tecvol.com.ar and are pinned as-is. They are constraints this system honors, not choices it made, and they are not open to retuning for contrast or taste on new surfaces.

**The Lit Rim Rule.** A lamp is a saturated body with a lighter rim of its own hue (`naranja-lente`, `alarma-lente`, `ok-lente`). One rim token per signal color, shared by every lamp of that color on every surface: the pushbutton lens and the pilot lamp take the same orange rim, not two rims three percent apart. Never light a rim with white, and never add a fourth signal hue in order to need a fourth rim.

**The Stamped Ink Rule.** A designation is quiet, never faint. On the dark ground of a `hueco` it may be `gris-hondo`; printed on `acero` it takes `gris`. Known inconsistency the build carries: the landing's `.interruptor__designacion` is still `gris-hondo` on `acero` (≈3.3:1, under the readability floor), and it is queued for the landing's next pass. That is a defect, not a precedent — never "harmonize" the access surface's `.borne__designacion` back down to match it.

**The Steel Ground Rule.** Backgrounds step only through the greys `negro → casco → acero → acero-alto`. Never interpolate a new grey between them, and never introduce a colored surface tint.

## Typography

**Display / Body / Label Font:** Sora (with `ui-sans-serif, system-ui, sans-serif`), loaded via `next/font` as `--fuente-sora`.

**Character:** One geometric grotesque doing all the work, as on the brand's existing site. Weight and case carry the hierarchy instead of a second family: 700–800 uppercase for headings, 400 for prose, 600 uppercase at 0.16em for silkscreen labels.

### The Ramp

Every fixed size on the panel face comes from one named ramp stepping by 1/16rem (`--t1` … `--t11`, 0.5rem → 1.2rem). The steps are deliberately fine because a switchboard front sets tiny silkscreen, labels, readings and a wordmark in a single typeface on a single plane: the hierarchy has to be built from close, exact increments rather than from a doubling scale.

- `--t1` 0.5rem — designation and label inside a readout, the smallest legible stamp.
- `--t2` 0.5625rem — the standard circuit designation and instrument caption. The most used step in the build.
- `--t3` 0.625rem — table column headers.
- `--t4` 0.6875rem — the standard silkscreen label (panel legends, equipment names, bar labels).
- `--t5` 0.75rem — field labels, reading units, the mobile nav row.
- `--t6` 0.8125rem — help lines and secondary status text.
- `--t7` 0.875rem — desktop nav links and detail cells.
- `--t8` 0.9375rem — dense table and list body text.
- `--t9` 1rem — page body; the ramp's anchor and the size `body` is set at.
- `--t10` 1.0625rem — hull names and other short emphatic identifiers set inline.
- `--t11` 1.2rem — the wordmark.

Fluid heading sizes stay as `clamp()` in the role tokens below rather than joining the ramp: they are viewport functions, not steps.

**Two display scales, not one.** Headings on the page ground use the `display` / `headline` clamps. Headings *silkscreened onto a mounted component* — the narrative plate's `h1` and `h2`, a hull name in a works row — use the smaller `display-chapa` / `headline-chapa` clamps and the `obra__buque` step (`clamp(1.15rem, 2.2vw, 1.7rem)`). A headline printed on a plate is physically smaller than one printed on the board, because the plate is smaller. This is a scale, not drift.

**Outside the ramp on purpose.** Four `font-size` values remain in `px` (`8px`, `12px`, `13px`, `15px`) inside SVG `viewBox` coordinate space — terminal-strip numbers, mimic-diagram labels, hull readings, bar values. Those are user units that scale with the drawing, not CSS pixels, and they are explicitly out of scope for the type ramp. File-scoped detector ignores are recorded for them in `.impeccable/config.json` under the documenter's name.

### Hierarchy
- **Display** (700, `clamp(2rem, 5vw, 3.6rem)`, 1.14, uppercase, -0.012em): The page's single `h1` on the narrative plate.
- **Headline** (700, `clamp(1.7rem, 3.4vw, 2.9rem)`, 1.14, uppercase): Section and narrative-plane headings.
- **Display / Headline on a plate** (`{typography.display-chapa}`, `{typography.headline-chapa}`): The same two levels when they are silkscreened onto the narrative plate rather than the page ground.
- **Title** (700, `clamp(1.1rem, 1.6vw, 1.35rem)`, 1.06, sentence case, -0.02em): Sub-headings inside sections; the only heading level that is not uppercase.
- **Body** (400, 1rem, 1.6): Prose, capped at a 68ch measure (`--medida`); section intros run to 60ch.
- **Cifra** (700, 1.5rem, 1.05, tabular + lining figures): Every instrument value.
- **Label / Serigrafía** (600, `--t4`, 0.16em, uppercase): Panel legends, equipment names, table headers, bar labels.
- **Designación** (600, `--t2`, 0.16em, uppercase; `gris` on steel, `gris-hondo` on a dark recess): Circuit tags mounted at the corner — or on the label row — of the thing they name.

### Named Rules
**The Engraved Caps Rule.** `h1` and `h2` are uppercase with a 1.14 line-height floor and only -0.012em tracking. In caps the letterforms need less negative tracking, and Spanish accents sit above cap height — closing the leading makes the Á of *ESTÁ* eat the line above it. Do not tighten either value.

**The Ramp Rule.** Every fixed `font-size` in CSS is a step of `--t1`…`--t11`. If a size feels wrong, move a step; do not write a literal between two steps. The only exemptions are the heading `clamp()` roles and `font-size` inside an SVG `viewBox`, where the value is a user unit.

**The Operate Heading Rule.** A page-ground heading on a utility route takes the *headline* clamp, not the *display* clamp: `/login`'s `h1` is `clamp(1.7rem, 3.4vw, 2.9rem)`. Display is the landing's single voice; a 57px title on a screen whose whole job is to be passed through fights the task. Landing keeps display; Operate routes start at headline.

**The Mounted Display Rule.** A heading set on a component — a plate, a row, a housing — drops to the plate-mounted display scale rather than the page display scale. The type shrinks because the surface it is printed on shrank.

**The Tabular Measurement Rule.** Any number that is a reading carries `.cifra` (tabular + lining numerals, -0.01em). A digit that changes width as it updates is a broken instrument.

**The Designation Rule.** Circuit tags (`−P1…−P8`, `−H1…H4`, `−Q0…−Q4`, `−W0`, `−W1`, `−X0:1`, `−X0:2`, `−X1`, `−X2:1…4`, `−S1`, `−S2`) are a single real numbering scheme shared by the panel, the single-line diagram and the form. New surfaces extend the scheme; they never invent a decorative code that looks like one.

## Layout

Three routes share one frame: `/` (landing), `/login` (access) and `/tablero` (the provisional destination). App routes are a single centered `marco` column, `min-height: calc(100vh - 62px)` under the sticky rail with `e8` block padding (`e7` and no min-height below 760px). They never repeat the landing's full-bleed cabinet: the cabinet is the landing's composition, not the world's.

A single spacing ramp, `e1` (0.25rem) through `e9` (7rem), governs everything; there are no ad-hoc gaps. Sections are separated by a 7rem block rhythm (`e9`) and headed by an `e8` gap. The page frame is `--marco: min(92vw, 1440px)`, centered; the monitor and narrative rails use their own tighter frames (`min(88vw, 1240px)`, `min(92vw, 1240px)`). Prose is bounded at 68ch by default and 60ch in section heads.

The switchboard face is a full-bleed two-column cabinet (`0.98fr / 1.15fr`: door left, instrument bay right) offset by the 62px sticky rail. Digital readouts pack into an `auto-fit minmax(124px, 1fr)` grid whose 1px gaps show the black cut line through, so the readouts read as separately mounted modules rather than a bordered table.

Three breakpoints, each doing one structural job: at **1180px** the cabinet collapses to a single column and the door — pure decoration once narrow — is dropped rather than shrunk, while the single-line diagram, demo and footer go one-up; at **860px** the works list re-flows its type/work cells; at **760px** the frame narrows to 90vw and the nav wraps to a second row under the rail with its own divider. Mobile is a re-mounted panel, not a scaled one.

**The Filled Rail Rule.** Where blocks are separated by 1px gaps over a `filo-negro` ground, every block fills the row's cross axis and the blocks consume the row along the main axis. Any leftover is black showing through as a *surface*, and the cut line stops reading as a line. In the access rail this is why the terminal-strip section runs `flex: 1 1 8rem; max-width: none` and centers its own content instead of stretching to its neighbours' height.

**The Two Scenes Rule.** Desktop and mobile are both first-class. Never solve a narrow viewport by scaling the panel down; drop the element that has stopped being legible and re-mount the rest. This extends to an instrument's part count: the access rail mounts a 14-terminal `Bornera` on desktop and a separate 6-terminal one below 760px, because fourteen terminals at phone width fall to 22px and the numbers stop reading. Two mounted instances, not one scaled.

## Elevation & Depth

This system has **no drop shadows and no gradients anywhere.** Every `box-shadow` in the build is an inset bevel or a 1px inset hairline. Depth is the physics of folded sheet metal: a plate that stands proud catches light on its top edge and casts a dark line at its bottom edge; a recess does the inverse, dark at the top and a thin bright line at the bottom. Nothing hovers, nothing glows, nothing blurs.

### Shadow Vocabulary
- **Proa — proud plate** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.66)`): Anything mounted on top of the panel — the nav rail, engraved plates, button bezels and legends, hinges, bar headers.
- **Rebaje — recess** (`box-shadow: inset 0 2px 0 rgba(0,0,0,0.72), inset 0 -1px 0 rgba(255,255,255,0.055)`): Anything cut into the panel — instrument housings, readouts, the monitor well, threaded rings, form fields.
- **Section seam** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)` over a `filo-negro` top border): The joint between two panel sections.
- **Hairline ring** (`box-shadow: 0 0 0 1px #0a0d0f`): The cut collar around a round pilot lamp so it reads as drilled through the plate.

### Named Rules
**The Bevel-Only Rule.** Relief comes from a light top edge and a dark bottom edge and from nothing else. No `box-shadow` in this system may have a blur radius or an offset outside the element. No `linear-gradient`, no `radial-gradient`, no `backdrop-filter`. Audit test: every `box-shadow` value in the stylesheet contains `inset` or is a zero-blur 1px ring.

**The Housing Rule.** Every instrument is mounted inside a `hueco` — a recessed housing with a `filo-negro` border and the `rebaje` bevel. Instruments never sit loose on a panel, and a proud plate is never used as a container for a reading.

**The Press Rule.** A control's pressed state is the bevel inverting (`proa` → `rebaje`), which is what a real button does. No lift, no translate, no scale.

## Shapes

Right angles are the default and near-universal: no radius token above zero exists for any plate, plate edge, field, table cell, bar or section. The only curve in the system is `50%` on genuine round hardware — the pushbutton lens and its threaded ring, screw heads, indicator lamps and status dots, gauge spindles. Circles mean the part is machined round in reality; a rounded rectangle would mean nothing, and there are none.

Separation is done with a 1px `filo-negro` line rather than a gap, so adjacent plates read as butt-jointed steel. Screws are real 11px SVGs pinned at 5px insets in the corners of any plate that would be bolted down. Instruments and diagrams are drawn as inline SVG with stroked steel fills, not as glyphs or images.

**The Cut-Line Rule.** Two surfaces meet on a 1px `filo-negro` border, optionally lit by a 1px inset highlight on the proud side. Never on a rounded corner, never on a gap of empty page.

## Components

### Interruptor (the primary button)
The page's one call to action, built at the size of a real panel pushbutton: an illuminated lens in a threaded bezel, hard-jointed to an engraved legend plate.
- **Shape:** Square plate (0), round lens and ring (50%). Bezel 58px wide, lens 26px, ring 38px.
- **Primary:** `acero-alto` bezel and `acero` legend plate, both `filo-negro` bordered with the `proa` bevel; lens in brand orange with a `naranja-lente` rim and a fixed white highlight crescent; legend in white 700 uppercase at 0.04em with its circuit designation stacked above in `gris-hondo`; padding `e3 e5`.
- **Hover:** Lens brightens to `naranja-alto`, plate to `#2a2f35`, over 0.14s on the house easing.
- **Active:** Both bezel and plate switch from `proa` to `rebaje` — the button physically sinks. Lens goes `naranja-hondo`.
- **Disabled:** Lens and legend drop to `gris-hondo` with a `borde-vivo` rim; the lamp is simply unlit.
- **Focus:** 2px orange outline at 3px offset (the global focus treatment).
- **Rail variant:** The same button at a 34px bezel, mounted at the end of the sticky rail.

### Chips (`riel__salida`, the utility chip)
A small steel chip for secondary and utility actions where the `Interruptor` — a lit pushbutton — would overstate the act. "Volver al sitio" in the access rail, "Salir" on the destination, "Volver al sitio" inside the destination plate.
- **Style:** `acero-alto` with a `filo-negro` border and the `proa` bevel; uppercase 700 at `--t6`, 0.06em, in `gris`; padding `e2 e4`; square corners; no lens and no designation.
- **States:** hover lifts the ink to white and the plate to `#343a41` over 0.16s on the house easing; active swaps `proa` for `rebaje` (The Press Rule); focus takes the global orange outline.
- **Element:** the same chip serves as `<a>` and `<button>` — the styling describes the plate, not the tag.
- **When not to use it:** if the action is the screen's one real act, it takes the `Interruptor`. The destination's "Ir al acceso" is a pushbutton for exactly that reason.

### Inputs / Fields (`campo`)
A terminal in the board, not a rounded text box.
- **Style:** A borderless transparent input mounted inside a `hueco` recess (`#101418`, `filo-negro` border, `rebaje` bevel), padding `e3 e4`, white 1rem text. Label above in 700 uppercase 0.75rem at 0.1em, with the field's circuit designation right-aligned on the same baseline.
- **Focus:** The input's own outline is suppressed and the *housing* responds: `:focus-within` turns the border orange and adds `inset 0 0 0 1px` orange on top of the recess bevel. The recess never disappears.
- **Error:** `aria-invalid` turns the housing border and inset ring `alarma`, the value text `alarma-texto`, and the help line `alarma`. Errors are also summarized in a bordered `aviso` block above the form.

### Cards / Containers (`chapa`, the engraved plate)
There are no cards. There is a bolted steel plate.
- **Corner Style:** Square (0).
- **Background:** `acero` with a `filo-negro` border and the `proa` bevel.
- **Border / hardware:** Four 11px screw SVGs pinned at 5px in the corners; the large narrative plate uses two recessed 9px bolt holes at its top corners instead.
- **Internal Padding:** `e4 e5` on the small plate, `e6 e5 e5` on the narrative plate, `e7 e6 e6` on the destination plate (`e7 e4 e4` below 760px).
- **Designation placement:** A plate's designation is absolutely positioned at its top-right, offset from the plate's own padding tokens (`top: var(--e5)`, `right: var(--e6)`; `var(--e4)` below 760px) so it clears the corner `Tornillo`. It is never stacked above the heading: a `serigrafia` label sitting over an `h1` is a kicker, and this system does not set kickers. The corner is where a real plate carries its tag anyway.
- **Disclosure line (`obra__nota`):** A limits or demo disclosure rides at the foot of the plate in `gris` at `--t6` above a 1px `borde` rule. It reads; it does not shout, and it is never dressed as an alarm.

### Navigation (`riel`)
One 62px sticky steel rail serves every route: `acero`, `filo-negro` bottom border, `proa` bevel. It has two variants, chosen by prop, not two rails.
- **`landing`:** Wordmark with a 4px orange bracket at left, `--t7` section-anchor links right-aligned, the `interruptor--riel` pushbutton at the far right. Links are `gris` on a transparent 1px bottom border; hover moves them to white with an orange underline over 0.18s. The links are anchors within one page, so there is no active/current styling to carry.
- **`minimo` (app routes):** The wordmark becomes the way home (links to `/`), the section nav is not rendered at all, and a `riel__derecha` flex slot (gap `e4`, `margin-left: auto`) takes whatever that route needs. `/login` puts a single utility chip there; `/tablero` puts the session line plus the exit chip. App routes still carry no active/current styling: the rail on an app route is chrome, not a route index.
- **Session line (`riel__sesion`):** `serigrafia` in `gris-hondo` with the user name in `.cifra` at `serigrafia`. Hidden below 760px (The Two Scenes Rule) — the exit control is what has to survive, not the identification.
- **Mobile (≤760px):** On `landing` the rail wraps and links move to a full-width second row at `--t5` above a `borde` divider, the button staying on the first row. On `minimo` the right slot tightens to `e3` and drops the session line; the rail stays one row.

### Regleta (signature composition — the access rail)
The access screen is a terminal strip, and it is the reference pattern for any future form that is more than two fields.
- **Panel:** `regleta` — `casco` ground, `filo-negro` border, `proa` bevel, square.
- **Legend strip:** `regleta__chapa` across the top — an `acero` band with the `proa` bevel, a `filo-negro` bottom border and a single `serigrafia` line carrying the strip's designation (`−X0 · Bornera de acceso`). The legend is a mounted strip of steel, not an eyebrow floating above a heading.
- **The rail:** `regleta__riel`, a wrapping flex row with `gap: 1px` over a `filo-negro` ground and an `e5` margin (`e4` below 760px), so its children read as separately mounted blocks butt-jointed on the system's cut line.
- **Children:** `borne` blocks (`acero` + `proa`, `e4` padding, `flex: 1 1 240px`, `max-width: 20rem`), each a `borne__cabeza` label row — label left, circuit designation right on the same baseline — over a `hueco` recess holding the input; one `borne--regleta` section housing the world's own `Bornera` inside a `hueco`; and one `borne--llave` holding the `Interruptor`, because enabling is a switch, not a terminal, and it sits at the end of the rail where the supply comes in.
- **Errors:** the `aviso aviso--error` block is mounted between the legend strip and the rail, inside the panel, with `e5` side margins.
- **Mobile (≤760px):** every block goes full width and re-mounts in rows, the switch block stretches its pushbutton, and the terminal-strip section reorders to the end with the short strip in place of the long one.
- **Inheritance:** the terminal strip in this composition is the system's `Bornera`, mounted — not a local re-drawing of one. A surface that needs a part this world already has mounts the part.

### Instruments (signature)
Eight parameterised panel parts, all inline SVG: `Medidor` (analog gauge, max 132px, orange needle that eases over 0.85s and turns `alarma` out of range), `Piloto` (28px indicator lamp), `Lectura` (digital readout in a recess, 1.5rem tabular value with a small grey unit), `Bornera` (terminal strip), `Persianas` (louvers), `Sinoptico` (mimic diagram), `Tornillo` (screw), `Chapa` (plate). All of them mount inside a `hueco` and all of them wear a `serigrafia` designation at the top-right of their housing.

**The Single Source Rule.** Every live number on the page — gauges, hull badges, fleet drawings, the monitor list, the `#flota` table — reads from the one `ProveedorVivo` context. A second live-data source would turn one camera into four unrelated illustrations. Never introduce one.

### Travelling (signature motion)
The page's only authored motion: a 460vh scroll track driving a sticky 100vh viewport in which four stacked planes (tablero → buque → flota → oficina) cross-fade and scale on shared `--o1…--o4` and `--z` custom properties, with the narrative plates riding above in a pointer-transparent layer.
- **Easing:** One curve for the whole system, `cubic-bezier(0.16, 1, 0.3, 1)`. Durations observed: 0.14s (lamp), 0.18s (link, skip-link), 0.85s (needle).
- **Reduced motion:** The camera stops at plane 1. Planes 2–4 are removed, the track collapses to auto height, the narrative becomes running text, and the live-value interval never starts. The full fleet remains readable in the real table below.

**The One Moment Rule.** The travelling is the page's single piece of motion. Everything else is a state change under 0.2s. Do not add scroll reveals, parallax layers or entrance animations.

## Do's and Don'ts

### Do:
- **Do** build relief from the two bevel tokens only — `--proa` for parts standing proud, `--rebaje` for parts cut in.
- **Do** mount every instrument, readout and input inside a `hueco` recess.
- **Do** reserve `#ff8929` for live signal, live intent and focus; leave everything else steel.
- **Do** set every reading in `.cifra` so digits keep their width as values update.
- **Do** separate surfaces with a 1px `#0a0d0f` cut line rather than a gap or a radius.
- **Do** give each new panel element a real circuit designation that extends the existing `−P/−Q/−W/−X/−S/−H` scheme.
- **Do** draw hardware and diagrams as inline SVG with stroked steel fills.
- **Do** take every fixed `font-size` from the `--t1`…`--t11` ramp, and give a lamp its rim from the matching `*-lente` token.
- **Do** shrink a heading to the plate-mounted display scale when it is silkscreened onto a component instead of the page ground.
- **Do** keep uppercase headings at 1.14 line-height so Spanish accents clear the line above.
- **Do** read live values from `ProveedorVivo` and label synthetic data with the demo tag.
- **Do** solve narrow viewports by dropping or re-mounting elements, not by scaling the panel — including an instrument's part count.
- **Do** mount the part this world already owns (`Bornera`, `Interruptor`, `hueco`, `chapa`, `Tornillo`) when a new surface needs it, instead of re-authoring a local copy.
- **Do** put a plate's designation at its top-right corner, derived from the plate's own padding and clearing the screw.
- **Do** take the headline clamp for a page-ground heading on an Operate route, and leave the display clamp to the landing.
- **Do** reach for the `riel__salida` chip for utility and secondary actions, and keep the `Interruptor` for the one real act of a screen.
- **Do** print a designation on `acero` in `gris`, and keep `gris-hondo` for the dark grounds.
- **Do** fill a cut-line rail completely — every block to the cross axis, the row consumed along the main axis — so `filo-negro` stays a line and never becomes a surface.
- **Do** carry a demo or limits disclosure as a bordered footnote line in `gris` at `--t6`, visible on every branch of the screen.
- **Do** leave `.unifilar__diagrama::before` alone: it is the single-line diagram's busbar — a conductor with branch lines, IEC breaker symbols, `−Q` designations and a feeder entering its head. The detector's `side-tab` rule flags it; both the finish review and this pass judged it a false positive, and a file-scoped ignore is recorded in `.impeccable/config.json` under the documenter's name.

### Don't:
- **Don't** use a `box-shadow` with a blur radius or an outside offset. Every shadow in this system is inset.
- **Don't** use a gradient of any kind — linear, radial, conic — or `backdrop-filter`, or glass.
- **Don't** round a plate, field, bar or cell. `50%` is for genuinely round hardware only.
- **Don't** paint orange on a surface that is neither live nor interactive, and don't use it as a heading color or a background fill.
- **Don't** introduce a second live-data source, a second easing curve, or a second type family.
- **Don't** invent a grey between the steel steps or tint a surface with a hue.
- **Don't** write a literal `font-size` or a literal signal color into a stylesheet when a ramp step or a tint token exists; and don't add a step between two ramp steps to split a 1/16rem difference.
- **Don't** treat a `font-size` inside an SVG `viewBox` as a type-ramp violation — it is a drawing unit, and the four in this build are recorded as out of scope.
- **Don't** lift, translate or scale a control on press; invert its bevel instead.
- **Don't** add scroll reveals or parallax beyond the four-plane camera.
- **Don't** present a synthetic reading without its demo label, or a stale reading as if it were live.
- **Don't** stack a `serigrafia` label above a heading as a kicker or eyebrow. Legends belong on their own mounted strip (`regleta__chapa`) or at a plate's top-right corner; the label-over-title stack is not a pattern in this system.
- **Don't** set a circuit designation in `gris-hondo` on `acero`, and don't cite the landing's `.interruptor__designacion` as precedent — it is a logged defect awaiting its pass.
- **Don't** let a section of a cut-line rail come up short on the cross axis; the black gap reads as a surface and breaks the joint.
- **Don't** treat the access screen's credential check as an authentication or security pattern. It is a demonstration gate that displays the credential it validates against, and every branch of the destination says so on screen.
- **Don't** rebuild the landing's full-bleed cabinet on an app route; app routes are a centered `marco` column under the same rail.
