(function () {
  "use strict";

  const reel = document.getElementById("reel");
  const spinBtn = document.getElementById("spinBtn");
  const caption = document.getElementById("caption");
  const flash = document.getElementById("flash");

  let itemHeight = 0, step = 0, baseOffset = 0;
  let engine = null;
  let spinning = false;

  // Sound synthesis lives in audio.js (shared with studio.html).
  function ensureAudio() {
    if (!engine) engine = createAudioEngine();
    engine.resume();
  }
  function tick() { if (engine) engine.tick(); }
  function boom() { if (engine) engine.boom(); }

  // ---------- reel building / layout ----------

  function buildReelDOM(sequence, photos) {
    reel.innerHTML = "";
    const frag = document.createDocumentFragment();
    sequence.forEach((idx) => {
      const photo = photos[idx];
      const item = document.createElement("div");
      item.className = "reel-item";
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.label || "";
      item.appendChild(img);
      frag.appendChild(item);
    });
    reel.appendChild(frag);
  }

  function layoutMetrics() {
    const items = reel.children;
    const firstRect = items[0].getBoundingClientRect();
    itemHeight = firstRect.height;
    if (items.length > 1) {
      // Measure actual rendered spacing between two items directly, rather
      // than parsing CSS `gap` (percentage gap values don't reliably
      // resolve via getComputedStyle across browsers).
      const secondRect = items[1].getBoundingClientRect();
      step = secondRect.top - firstRect.top;
    } else {
      step = itemHeight;
    }
    baseOffset = itemHeight / 2;
  }

  function highlightCenter(index) {
    reel.querySelectorAll(".reel-item.is-center").forEach((el) => el.classList.remove("is-center"));
    const el = reel.children[index];
    if (el) el.classList.add("is-center");
  }

  // Gentler than easeOutQuint — a wheel that decelerates this hard from the
  // very first frame blurs past every image before it's readable. Quad
  // ramps down more gradually, so images stay legible even early in the spin.
  function easeOutQuad(t) {
    return 1 - Math.pow(1 - t, 2);
  }

  // ---------- preview (idle) state ----------

  function initPreview() {
    const cfg = window.WHEEL_CONFIG;
    const winnerIndex = Math.max(0, Math.min(cfg.winnerIndex, cfg.photos.length - 1));
    buildReelDOM([winnerIndex], cfg.photos);
    layoutMetrics();
    reel.style.transform = `translateY(-${baseOffset}px)`;
    highlightCenter(0);
    caption.classList.remove("visible");
    spinBtn.querySelector("span").textContent = cfg.spinButtonText || "TAP TO SPIN";
  }

  // ---------- spin ----------

  function spin() {
    if (spinning) return;
    spinning = true;
    ensureAudio();
    spinBtn.classList.add("hidden");
    caption.classList.remove("visible");

    const cfg = window.WHEEL_CONFIG;
    const photos = cfg.photos;
    const n = photos.length;
    const winnerIndex = Math.max(0, Math.min(cfg.winnerIndex, n - 1));
    const loops = Math.max(1, cfg.loops || 4);

    const sequence = [];
    for (let l = 0; l < loops; l++) {
      for (let i = 0; i < n; i++) sequence.push(i);
    }
    for (let i = 0; i <= winnerIndex; i++) sequence.push(i);

    buildReelDOM(sequence, photos);
    layoutMetrics();

    const duration = cfg.spinDurationMs || 5000;
    const targetDistance = (sequence.length - 1) * step;

    let lastFiredIndex = 0;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutQuad(t);
      const currentDistance = targetDistance * eased;

      reel.style.transform = `translateY(-${baseOffset + currentDistance}px)`;

      const currentIndex = Math.min(sequence.length - 1, Math.round(currentDistance / step));
      if (currentIndex > lastFiredIndex) {
        for (let i = lastFiredIndex + 1; i <= currentIndex; i++) tick();
        lastFiredIndex = currentIndex;
        highlightCenter(currentIndex);
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        land(sequence.length - 1, winnerIndex);
      }
    }
    requestAnimationFrame(frame);
  }

  function land(index, winnerIndex) {
    highlightCenter(index);
    const el = reel.children[index];
    if (el) el.classList.add("is-landed");
    boom();
    flash.classList.remove("pulse");
    void flash.offsetWidth; // restart animation
    flash.classList.add("pulse");

    const cfg = window.WHEEL_CONFIG;
    const label = cfg.photos[winnerIndex] && cfg.photos[winnerIndex].label;
    if (label) {
      caption.textContent = label;
      caption.classList.add("visible");
    }

    spinBtn.querySelector("span").textContent = cfg.spinAgainButtonText || "SPIN AGAIN";
    setTimeout(() => {
      spinBtn.classList.remove("hidden");
      spinning = false;
    }, 1400);
  }

  // ---------- wire up ----------

  spinBtn.addEventListener("click", spin);
  window.addEventListener("resize", () => {
    if (!spinning) initPreview();
  });

  document.addEventListener("DOMContentLoaded", initPreview);
  if (document.readyState !== "loading") initPreview();
})();
