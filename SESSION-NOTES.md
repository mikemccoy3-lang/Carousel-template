# Session Notes

Working notes from building this project, kept for whoever (human or Claude)
picks it up next — especially before adding new templates.

## What this project is

A vertical (9:16) "prize wheel" photo carousel for YouTube Shorts / Reels /
TikTok, with two front ends:

- **`studio.html`** — drag-and-drop photos, click a thumbnail to pick the
  winner, hit Run, get a downloadable video. This is the primary tool.
- **`index.html` + `config.js`** — the original hand-edit-a-config version.
  Still works, kept for git-tracked/versioned use cases.

Both share the same sound synthesis (`audio.js`) and spin physics/easing
concept, but render completely differently under the hood:
`index.html`/`app.js` animates real DOM elements with CSS transforms;
`studio.html` draws to a `<canvas>` via `templates.js` so it can be captured
to video with `MediaRecorder`.

## Architecture: the template registry

`templates.js` exports `window.TEMPLATES`, keyed by template id. Right now
there's one: `"prize-wheel"`. Everything in `studio.js` (upload, thumbnail
picker, settings UI, recording/export) is generic and works with *any*
template that implements the contract documented at the top of
`templates.js`:

```
run({ ctx, width, height, images, winnerIndex, options, audio, onDone })
```

**To add a new template**: add another entry to `TEMPLATES` with its own
`defaultOptions` and `run()`. Nothing else needs to change — the dropdown in
`studio.html` populates itself from the registry. This is the intended
extension point for "additional template themes" later.

## Two real bugs found and fixed this session

Both were diagnosed by directly analyzing actual exported files (screenshots,
frame-timing extraction via `requestVideoFrameCallback`, and — for one —
extracting and FFT-analyzing the audio track), not by guessing. Worth reading
before assuming something is "unfixable" or reaching for a rewrite.

### 1. Choppy exported video

**Symptom**: playback smooth live in the browser, choppy in the exported file.

**Cause**: the render loop was recreating gradients and doing shadow-blur
work for the background/vignette/pointer-arrows on *every single animation
frame*, even though none of that ever changes — only the photo reel moves.
That periodically stalled the main thread, and since `studio.js` records by
sampling the canvas on a timer (`captureStream`), those stalls got baked
straight into the output.

**Fix** (`templates.js`): pre-render the static background and the
vignette/pointer overlay once onto offscreen canvases at the start of
`run()`, then just `drawImage()`-blit those every frame instead of
redrawing from scratch. Two layers (not one) because the overlay must stay
stacked *above* the moving reel while the background must stay *below* it.

**Dead end tried first**: switched `canvas.captureStream(30)` to manual
mode (`captureStream(0)` + `track.requestFrame()` once per drawn frame) on
the theory that the browser's automatic timer was desyncing from the draw
loop. Measured (via the same frame-timing extraction) that this made things
*worse* — manual mode bakes every draw-loop hitch directly into the
recording instead of the automatic timer smoothing over it. Reverted.

**Also tried and reverted**: bumping capture to 60fps. Never verified as
helpful (this sandbox has no GPU acceleration, so it can't reliably judge
smoothness), and it very likely caused the audio desync bug below by
doubling the video encoder's real-time workload. Back to 30fps.

### 2. Audio/video desync in exported recordings

**Symptom**: user-reported "sound is off and not timed correctly." A real
exported file, analyzed directly, showed the video playing back correctly
(confirmed via sequential-frame screenshots: different photos visibly
passing at t=1s, 5s, 10s, landing correctly around t=10s for a 12s spin) —
but *all* tick/boom sounds were compressed into the first ~1.5 seconds of
an 11+ second file, then dead silence.

**Root-caused with direct instrumentation**, not guessing: monkey-patched
`tick()`/`boom()` (from the test script, not the shipped files) to log
their actual call time against a shared clock. This proved the JS
scheduling was correct the whole time — sounds fire at properly increasing
real-time intervals across the full spin, decelerating exactly as designed.
The bug was downstream, in how `MediaRecorder` encodes the audio track.

**Theory, confirmed by the fix working**: this project's sound design is
unusually sparse — short ~20-50ms clicks separated by long true-silence
gaps (over a second, near the end of a slow spin). Something in the
muxing pipeline was mishandling those long silence gaps in the live
`MediaStreamAudioDestinationNode` audio track, effectively collapsing them
when writing the container.

**Fix** (`audio.js`): keep a continuous, effectively inaudible noise floor
(a looped low-amplitude noise buffer, gain ~0.0008) flowing into the
recording-only audio destination for the entire render, so the track is
never truly silent and has no gap to collapse.

**Verification method** (reusable for future audio work): extract the
recorded file's audio track (via a `<video>` element + `MediaElementSource`
+ `ScriptProcessorNode`, capturing real-time playback into a Float32Array —
`decodeAudioData` unreliably reports `NaN`/wrong duration for
freshly-generated MediaRecorder blobs), compute an RMS envelope, peak-pick
onset times, and check they land where the visual event actually happens.

**Dead end tried first**: adding a `recorder.start(250)` timeslice, on the
theory it was a buffering/muxer-flush issue. Did not fix it — ruled out
simple buffering as the cause and pointed at silence-handling specifically.

## Sound design, matched to a reference

The user's target sound was a CapCut export in a QuickTime container
(HEVC video — undecodable by this sandbox's Chromium). Installed **PyAV**
(`pip install av`) to demux just the AAC *audio* stream directly, sidestepping
the video codec entirely — a generally useful trick when you need to analyze
audio from a video file whose video codec you can't play. Extracted to WAV,
then did RMS-envelope onset detection + FFT on isolated hits to characterize
the target sound before rebuilding `tick()`/`boom()` to match:

- **Tick**: reference is a bright ~2.7-3.4kHz click decaying in ~18ms, fired
  as a fast **double-click** ("ta-tick", ~30ms apart) — not a single hit.
  Rebuilt as two `playClick()` calls 30ms apart, dropped the low-pitched
  "pluck" oscillator layer that a first attempt had (no real energy there
  in the reference).
- **Boom**: reference is a deep, punchy ~80-100Hz hit near full volume,
  decaying in ~250ms (not a long rumble). Retuned the sweep/envelope to match.

## Current defaults (as of this session)

- `spinDurationMs`: 12000 (started at 5200, went through 9000, settled here
  after user feedback that faster felt unreadable)
- `loops`: 3
- Video: `captureStream(30)`, `videoBitsPerSecond: 8_000_000`, WebM output
  (browsers don't natively export `.mp4` via `MediaRecorder`; WebM uploads
  fine to YouTube/Shorts/TikTok)
- 16 real photos committed in `/photos` (SEMA show pics, pulled from the
  user's Google Drive, deduplicated from ~55 files down to 16 unique,
  resized to a 1600px max dimension)

## Known constraints / things to remember

- This sandbox's Chromium is headless with **no GPU acceleration**. It's
  reliable for correctness/timing analysis (frame-gap extraction, audio
  onset extraction) but NOT a trustworthy judge of subjective "smoothness"
  — a change that measures worse here may still be better on real hardware,
  and vice versa. Say so explicitly rather than overclaiming a fix based on
  sandbox measurements alone.
- GitHub Pages was never successfully enabled for this repo (no API access
  to repo settings from this session) — delivery has been via zip files
  sent directly to the user instead.
- Large binary downloads (e.g. pulling photos from Google Drive) must not
  be pulled through the model's context directly — base64-encoding a few
  MB explodes into millions of tokens. Route through the harness's
  automatic oversized-tool-result-to-disk mechanism and process with a
  local script (this repo's photos were imported that way).

## Next planned work

User plans to add additional template themes on a future day. The registry
pattern in `templates.js` is built for this — a second template is just a
new object in `TEMPLATES` with its own `run()`.
