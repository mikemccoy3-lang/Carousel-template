# Photo Gallery Sound Wheel

A reusable, vertical (9:16) photo carousel built for YouTube Shorts / Reels /
TikTok. It spins fast through your photos with a ticking sound, decelerates
like a prize wheel, and lands — guaranteed — on whichever photo you pick,
with a boom/impact sound and a glowing "landed" pop.

No build step, no dependencies, no external sound files. Open it, spin it,
record it.

## Quick start

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

## Files

| File          | Purpose                                          |
|---------------|---------------------------------------------------|
| `index.html`  | Page structure                                    |
| `style.css`   | Visual styling, the 9:16 frame, glow/landing FX   |
| `config.js`   | **Edit this** — your photos, winner, timing       |
| `app.js`      | Spin physics, sound synthesis, rendering logic    |
| `photos/`     | Optional home for your image files                |
