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

  function routeGain(gainNode) {
    gainNode.connect(audioCtx.destination);
    if (recordDest) gainNode.connect(recordDest);
  }

  function resume() {
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function tick() {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(900 + Math.random() * 300, t0);
    gainNode.gain.setValueAtTime(0.0001, t0);
    gainNode.gain.exponentialRampToValueAtTime(0.25, t0 + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    osc.connect(gainNode);
    routeGain(gainNode);
    osc.start(t0);
    osc.stop(t0 + 0.06);
  }

  function boom() {
    const t0 = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.35);
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    osc.connect(oscGain);
    routeGain(oscGain);
    osc.start(t0);
    osc.stop(t0 + 0.65);

    const bufferSize = Math.floor(audioCtx.sampleRate * 0.4);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1200, t0);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    noise.connect(noiseFilter).connect(noiseGain);
    routeGain(noiseGain);
    noise.start(t0);
  }

  return { audioCtx, recordDest, resume, tick, boom };
}
