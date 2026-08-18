# Photo Gallery Sound Wheel

A vertical (9:16) photo carousel built for YouTube Shorts / Reels / TikTok.
It spins fast through your photos with a ticking sound, decelerates like a
prize wheel, and lands — guaranteed — on whichever photo you pick, with a
boom/impact sound and a glowing "landed" pop.

No build step, no external dependencies, no audio files anywhere — all
sound is synthesized live with the Web Audio API.

There are two ways to use it:

- **`studio.html`** — the easy way. Drag and drop a folder of photos, click
  a thumbnail to pick the winner, hit **Run**, and it renders and downloads
  an actual video file (.webm) with the sound baked in. No file editing.
  This is the one to reach for day-to-day.
- **`index.html` + `config.js`** — the original, git-based version. You
  hand-edit a config file with your photo list and settings, then either
  view it live in a browser or screen-record it. Slightly more manual, but
  everything is committed to the repo and versioned.

Both use the same spin physics and the same synthesized sound effects
(`templates.js` / `audio.js`), so they look and sound identical.

## Quick start — studio.html (recommended)

1. Open `studio.html` in a browser (double-click it, or serve the folder —
   either works).
2. Drag a folder of photos onto the dropzone (or click **Choose Folder** /
   **Choose Files**).
3. Click the thumbnail you want the wheel to land on.
4. Optionally set a result caption (e.g. "Day 3 Favorite"), and adjust spin
   duration / loops.
5. Click **Run**. A preview plays on the canvas; when it finishes you get a
   downloadable video and an inline player.

The exported video is always exactly 1080×1920 (true 9:16), regardless of
your browser window size — no screen-recording setup needed.

**Note on file format**: browsers record video as `.webm` by default
(Chrome doesn't natively export `.mp4` via this API). `.webm` uploads fine
to YouTube, Shorts, Instagram, and TikTok — it's a real, playable video
file, just not literally named `.mp4`. If a specific downstream tool
insists on `.mp4`, run the file through any video converter or ffmpeg
(`ffmpeg -i input.webm output.mp4`) — no re-recording needed.

## Quick start — index.html (manual/config-based)

1. Open `index.html` directly in a browser (double-click it). The demo runs
   immediately with 8 placeholder tiles.
2. Click **TAP TO SPIN**.
3. Screen-record the frame (see "Recording for Shorts" below).

## Making your own video

All customization lives in **`config.js`**:

```js
window.WHEEL_CONFIG = {
  photos: [
    { src: "photos/1.jpg", label: "Beach Day" },
    { src: "photos/2.jpg", label: "Mountain Trip" },
    // ...
  ],
  winnerIndex: 2,        // which photo (0-based) the wheel lands on
  spinDurationMs: 9000,  // how long the spin takes, in milliseconds
  loops: 3,                // how many full passes before it lands
  title: "",
  spinButtonText: "TAP TO SPIN",
  spinAgainButtonText: "SPIN AGAIN"
};
```

- **Add your photos**: drop image files into the `photos/` folder and
  reference them as `src: "photos/yourfile.jpg"` (a full URL works too).
- **Pick the winner**: set `winnerIndex` to the position of the photo you
  want to land on. It always wins — nothing is random. Decide which photo
  should be the "feature image," find its position in the `photos` array
  (counting from 0), and set that number.
- **Caption**: each photo's `label` appears under it once it lands. Leave
  it `""` for no caption.
- **Pacing**: increase `spinDurationMs` for a longer, more suspenseful
  build-up; decrease `loops` if it still feels too fast — fewer loops means
  less total distance to cover, so each photo lingers longer even at the
  same duration.
- **Button text**: `spinButtonText` is shown before the first spin;
  `spinAgainButtonText` replaces it after landing — handy for an event,
  e.g. set it to `"Day 3 Favorite"`.

## How it works

- The reel is a plain vertical strip of your photos. Spinning is a
  physics-style deceleration (fast start, easing out) computed in
  JavaScript — not a fixed CSS animation — so it always lands exactly
  centered on the winner.
- The ticking sound and the boom/impact sound are both synthesized live
  with the Web Audio API. There are no audio files to manage, license, or
  swap — the sound is generated in-browser every time.
- Because browsers block audio before a user gesture, sound starts on the
  "TAP TO SPIN" click (this is standard browser behavior, not a bug).

## Recording for Shorts

This page renders the wheel at a true 9:16 frame in the center of the
window. To capture it:

- **Screen recording**: use OS-native screen recording (QuickTime on
  macOS, Xbox Game Bar on Windows) or a browser extension, framed to just
  the card. Resize your browser window to roughly a 9:16 shape first so
  the frame fills it edge-to-edge.
- **Higher fidelity**: open dev tools → device toolbar, set a custom
  device size like 1080×1920, then record that viewport.

## Adding new templates

`studio.html`'s template dropdown reads from `window.TEMPLATES` in
`templates.js`. Right now there's one: `"prize-wheel"`. Each entry is a
self-contained object with a `name`, `defaultOptions` (whatever settings its
UI should expose), and a `run()` function that draws itself onto a canvas
frame-by-frame and calls `audio.tick()` / `audio.boom()` at the right
moments. Everything else — upload, thumbnails, winner picking, recording,
download — is generic and shared automatically by any template you add.

To build a second template style: add a new entry to `TEMPLATES` in
`templates.js` (or a new file included alongside it) implementing that same
shape. No changes needed anywhere else.

## Files

| File            | Purpose                                                      |
|------------------|---------------------------------------------------------------|
| `studio.html`    | **The easy tool** — drag/drop photos, pick winner, render video |
| `studio.css`     | Styling for the studio UI                                     |
| `studio.js`      | Studio logic — file loading, thumbnails, recording/export     |
| `templates.js`   | Template registry — the canvas render logic for each style    |
| `audio.js`       | Shared sound synthesis, used by both studio and index.html    |
| `index.html`     | The original manual/config-based page                         |
| `style.css`      | Visual styling for `index.html`'s 9:16 frame, glow/landing FX |
| `config.js`      | Edit this to customize `index.html` — photos, winner, timing  |
| `app.js`         | `index.html`'s spin logic (DOM/CSS based, not canvas)          |
| `photos/`        | Optional home for image files used by `index.html`            |
