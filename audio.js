/*
  Shared sound synthesis — used by both index.html (live template) and
  studio.html (render/export tool). All sound is generated live with the
  Web Audio API; there are no audio files anywhere in this project.

  createAudioEngine({ record: true }) additionally routes every sound to a
  MediaStreamAudioDestinationNode so it can be merged into a MediaRecorder
  capture (used by studio.html to bake sound into the exported video).
*/
function createAudioEngine(options) {
  options = options || {};
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const recordDest = options.record ? audioCtx.createMediaStreamDestination() : null;

  if (recordDest) {
    // Our sound design is sparse — short clicks separated by long silent
    // gaps (over a second, near the end of a slow spin). Confirmed by
    // direct instrumentation that tick()/boom() are scheduled correctly in
    // real time, yet the exported recording plays them all back compressed
    // into roughly the first second: some browsers mishandle long true-
    // silence gaps when muxing a live MediaStreamAudioDestinationNode
    // track into WebM, effectively collapsing the gaps. Keep a continuous,
    // effectively inaudible noise floor flowing into the recording-only
    // destination so the track is never truly silent and has no gaps to collapse.
    const floorBufferSize = audioCtx.sampleRate * 2;
    const floorBuffer = audioCtx.createBuffer(1, floorBufferSize, audioCtx.sampleRate);
    const floorData = floorBuffer.getChannelData(0);
    for (let i = 0; i < floorBufferSize; i++) floorData[i] = Math.random() * 2 - 1;
    const floorSource = audioCtx.createBufferSource();
    floorSource.buffer = floorBuffer;
    floorSource.loop = true;
    const floorGain = audioCtx.createGain();
    floorGain.gain.value = 0.0008; // effectively inaudible, just non-zero
    floorSource.connect(floorGain).connect(recordDest);
    floorSource.start();
  }

  function routeGain(gainNode) {
    gainNode.connect(audioCtx.destination);
    if (recordDest) gainNode.connect(recordDest);
  }

  function resume() {
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  // Ticks can fire many times per second during the fast part of a spin.
  // The underlying noise sample doesn't need to be unique per tick — only
  // the filter frequency varies — so build it once and reuse it, instead
  // of allocating a new buffer on every single tick (which was adding GC
  // pressure right when the spin is busiest, contributing to choppiness).
  //
  // Tuned by directly analyzing a reference wheel-spin sound: dominant
  // tick energy sits around 2.7-3.4kHz (much brighter/sharper than a
  // first attempt at a "wooden knock" lower down), decaying almost
  // entirely within ~18ms — a snappy click, not a knock.
  let tickNoiseBuffer = null;
  function getTickNoiseBuffer() {
    if (tickNoiseBuffer) return tickNoiseBuffer;
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.02);
    tickNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = tickNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    return tickNoiseBuffer;
  }

  function playClick(t0) {
    const noise = audioCtx.createBufferSource();
    noise.buffer = getTickNoiseBuffer();
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2800 + Math.random() * 600, t0);
    bandpass.Q.value = 6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.6, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.018);
    noise.connect(bandpass).connect(gain);
    routeGain(gain);
    noise.start(t0);
  }

  // The reference sound isn't a single click per peg — it's a quick
  // double-click ("ta-tick", ~30ms apart). Reproduce that pairing rather
  // than a single hit.
  function tick() {
    const t0 = audioCtx.currentTime;
    playClick(t0);
    playClick(t0 + 0.03);
  }

  // Reference boom is a deep, punchy hit — dominant energy around
  // 80-100Hz (not the higher ~160Hz sweep tried first), near full volume,
  // decaying faster overall (~250ms) than a long rumble.
  function boom() {
    const t0 = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.15);
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.95, t0 + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(oscGain);
    routeGain(oscGain);
    osc.start(t0);
    osc.stop(t0 + 0.3);

    const bufferSize = Math.floor(audioCtx.sampleRate * 0.2);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1000, t0);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    noise.connect(noiseFilter).connect(noiseGain);
    routeGain(noiseGain);
    noise.start(t0);
  }

  return { audioCtx, recordDest, resume, tick, boom };
}
