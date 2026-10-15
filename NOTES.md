# LogoCraft – development notes

How LogoCraft is built and what to keep in mind when changing it. For what it does and how to use it, see [README.md](README.md).

## How it is built

- **Started as a copy of PressCraft** and changed into a logo tool. It is its own app now: changes are not copied between the Craft apps (except features asked for "in all the apps", which are built into each app separately).
- **No build step.** `index.html` loads `css/logocraft.css`, `fonts/fonts.css` and the scripts in order: `lib/fabric.min.js` (Fabric.js 5.3.1), `js/craft-titlebar.js`, `js/art.js`, `js/core.js`, `js/export.js`, `js/ui.js`.
- **Fonts:** `fetch_fonts.py` downloads the Google fonts (Latin and Latin Extended) into `fonts/` and writes `fonts/fonts.css`.

## Files

| File | What is in it |
| --- | --- |
| `js/art.js` (`window.PressArt`) | Clip art, borders and Screen Magic patterns (shared ideas with PressCraft, own copy). |
| `js/core.js` (`window.PC`) | Units, the logo model, object builders (title, clip, border, magic, shape with 3-D and three lines, curved text…), the retro renderer (keeps see-through areas), history and autosave (`logocraft-doc-v1`), rendering the artboard to pixels or SVG. Some PressCraft builders (calendar, newspaper frames, tables) are still here but not offered in the menus. |
| `js/export.js` | The Export dialog and the file writers: PNG/JPG via canvas, **BMP** (24-bit, written by hand), **ICO** (PNG entries 16–256), **PDF** (JPEG with a grey soft mask for see-through), **SVG** (Fabric `toSVG` with a viewBox cut to the logo), **ZIP** (stored). `PC.openPrintLogo` prints at real size through a hidden iframe. |
| `js/ui.js` | Canvas, inserting, Layers panel, properties (built from short field lists), start screen and logo templates (`PC.templates`), files, help, menus, ribbon, title bar, keyboard. |

## Model

- **Units:** the canvas works in pixels at **150 DPI** (`PC.px(mm)`); the artboard has a print size in mm. Export picks a render DPI so the cut-out area comes out at the asked pixel width (capped at 16000 px for the whole artboard), then shrinks in halves for small sizes so icons stay smooth.
- **Logo** (`PC.doc`): `{ app: 'LogoCraft', version, kind: 'logo', board, name, retro, retroMode, retroDot, panels: [{ name: 'Artboard', w, h, bg, json }] }`. `bg: null` means see-through (the canvas shows a checkerboard behind it).
- **Artboards** (`PC.ARTBOARDS`, `[name, w mm, h mm, pixels?]`): `px1024`, `px512`, `px256` are exactly that many canvas pixels (`n / 150 × 25.4` mm), the default for new square logos; then square 160 × 160, wide 240 × 120, tall 120 × 240, long banner 300 × 100, app icon 128 × 128 mm. Changing the artboard keeps objects centred.
- **Layers:** every Fabric object. Extra saved props (`PROPS`): `name` (layer name) and `lockAll` (not selectable or evented). `visible` and `globalCompositeOperation` (blend mode) are saved by Fabric itself. Groups made with Group have `kind: 'group'`.
- **Export area:** with Trim, the union of visible objects' bounding boxes plus a padding percentage; ICO makes it square.

## Testing

Headless Chrome over the DevTools protocol: each template is created from the start screen, then every export format is produced with `PC.exportFile(fmt, width, options)` and checked for size and type.

## Sliders you can type into

`js/range-type.js` (loaded last) adds a number box beside every `input[type=range]`, including ones built later (a MutationObserver watches the page). Typing fires the same `input` and `change` events as dragging, so panels need no changes. Wrap a slider in `[data-rt-skip]` to leave it alone. Each app has its own copy.

## Date and time

Dates: `DATE_FORMATS`, `dateText`, `stampText` and `dateDialog` live in `js/core.js` (as `PC.*`). A text with a `stamp` model `{ fmt, before, after }` is a dynamic date: `PC.refreshStamps(canvas)` rewrites its text on loading a panel, in the off-screen render for printing and export, and every 30 seconds. Stamps are not editable as text; the side panel and a double-click change them.

## Zoom slider

`zoomBar({ get, set, fit, min, max })` (own copy in this app) builds the status-bar zoom: slider positions 0–1000 map to min–100% on the left half and 100%–max on the right, so the middle is always 100% (it snaps there). + and − step through 10, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150… It is marked `data-rt-skip` so the slider-typing helper leaves it alone (it has its own percent box).
