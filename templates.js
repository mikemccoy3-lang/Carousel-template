/*
  ============================================================
  TEMPLATE REGISTRY — studio.html
  ============================================================
  Each entry in TEMPLATES describes one render style. studio.js handles
  everything generic (photo upload, thumbnail picker, controls, recording,
  download) — a template only needs to know how to draw itself.

  Shape every template must implement:

    id, name,
    defaultOptions: { ...whatever fields this template's UI exposes },
    run({ ctx, width, height, images, winnerIndex, options, audio, onDone })
      - Drives its own requestAnimationFrame loop, drawing into `ctx`
        (a 2D context on a `width` x `height` canvas) every frame.
      - `images` is an array of { bitmap: ImageBitmap } in upload order.
      - `audio.tick()` / `audio.boom()` play the synthesized sound effects
        (see audio.js) — call them at whatever moments make sense.
      - Call `onDone()` exactly once when the animation is finished;
        studio.js stops recording shortly after.
      - Performance note: studio.js records by sampling this canvas on a
        steady timer (captureStream), not by pulling each drawn frame
        directly — so any per-frame work here that's slow or jittery
        (recreating gradients, shadow blur, big allocations) shows up as
        choppiness in the exported video even if the live canvas looks
        smooth. Precompute anything that doesn't change frame-to-frame
        (see bgLayer/overlayLayer below) rather than redrawing it every tick.

  To add a new template later: write its run() function below (or in a new
  file included alongside this one) and add an entry to TEMPLATES. Nothing
  else needs to change.
  ============================================================
*/

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws `bitmap` into the x/y/w/h rect, cropping (not stretching) so the
// image covers the rect — equivalent to CSS `object-fit: cover`.
function drawImageCover(ctx, bitmap, x, y, w, h) {
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = w / h;
  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = bitmap.height;
    sw = sh * dstRatio;
    sy = 0;
    sx = (bitmap.width - sw) / 2;
  } else {
    sw = bitmap.width;
    sh = sw / dstRatio;
    sx = 0;
    sy = (bitmap.height - sh) / 2;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, x, y, w, h);
}

function easeOutQuad(t) {
  return 1 - Math.pow(1 - t, 2);
}

window.TEMPLATES = {

  "prize-wheel": {
    id: "prize-wheel",
    name: "Prize Wheel",
    defaultOptions: {
      spinDurationMs: 12000,
      loops: 3,
      resultText: ""
    },

    run(params) {
      const { ctx, width, height, images, winnerIndex, options, audio, onDone } = params;

      const n = images.length;
      const winner = Math.max(0, Math.min(winnerIndex, n - 1));
      const loops = Math.max(1, options.loops || 3);
      const duration = options.spinDurationMs || 9000;
      const holdAfterLandMs = 1600; // keep recording briefly after landing so the result reads clearly

      // Layout, scaled to the actual canvas size (authored against 1080x1920).
      const scale = width / 1080;
      const tileSize = 842 * scale;
      const gap = 35 * scale;
      const step = tileSize + gap;
      const tileX = (width - tileSize) / 2;
      const cornerRadius = 28 * scale;
      const centerY = height / 2;
      const baseOffset = tileSize / 2;

      const sequence = [];
      for (let l = 0; l < loops; l++) {
        for (let i = 0; i < n; i++) sequence.push(i);
      }
      for (let i = 0; i <= winner; i++) sequence.push(i);
      const targetDistance = (sequence.length - 1) * step;

      // The background, vignettes, and pointer arrows never change frame to
      // frame — only the photo reel moves. Recreating gradients and doing
      // shadow-blur work for them on every single animation frame was the
      // actual cause of choppy playback (it periodically stalls the main
      // thread, which the recorder bakes straight into the output). Draw
      // each of them once onto an offscreen canvas and blit those each
      // frame instead of redrawing from scratch. Two layers because the
      // vignette/pointers must stay stacked *above* the moving reel while
      // the plain background must stay *below* it.
      const bgLayer = document.createElement("canvas");
      bgLayer.width = width;
      bgLayer.height = height;
      const bgCtx = bgLayer.getContext("2d");

      const overlayLayer = document.createElement("canvas");
      overlayLayer.width = width;
      overlayLayer.height = height;
      const overlayCtx = overlayLayer.getContext("2d");

      (function drawBackgroundLayerOnce() {
        const grad = bgCtx.createRadialGradient(
          width / 2, height * 0.3, 0,
          width / 2, height * 0.3, height * 0.7
        );
        grad.addColorStop(0, "#1b1b2b");
        grad.addColorStop(1, "#0a0a12");
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, width, height);
      })();

      (function drawOverlayLayerOnce() {
        // overlayLayer starts transparent, so only the gradient/arrow
        // shapes themselves paint — everything else lets the reel show through.
        const topGrad = overlayCtx.createLinearGradient(0, 0, 0, height * 0.22);
        topGrad.addColorStop(0, "#0a0a12");
        topGrad.addColorStop(1, "rgba(10,10,18,0)");
        overlayCtx.fillStyle = topGrad;
        overlayCtx.fillRect(0, 0, width, height * 0.22);

        const botGrad = overlayCtx.createLinearGradient(0, height * 0.78, 0, height);
        botGrad.addColorStop(0, "rgba(10,10,18,0)");
        botGrad.addColorStop(1, "#0a0a12");
        overlayCtx.fillStyle = botGrad;
        overlayCtx.fillRect(0, height * 0.78, width, height * 0.22);

        const armY = centerY;
        const armHalf = 26 * scale;
        const armW = 34 * scale;
        overlayCtx.fillStyle = "#ffcc00";
        overlayCtx.shadowColor = "rgba(255,204,0,0.6)";
        overlayCtx.shadowBlur = 10 * scale;

        overlayCtx.beginPath();
        overlayCtx.moveTo(32 * scale, armY - armHalf);
        overlayCtx.lineTo(32 * scale + armW, armY);
        overlayCtx.lineTo(32 * scale, armY + armHalf);
        overlayCtx.closePath();
        overlayCtx.fill();

        overlayCtx.beginPath();
        overlayCtx.moveTo(width - 32 * scale, armY - armHalf);
        overlayCtx.lineTo(width - 32 * scale - armW, armY);
        overlayCtx.lineTo(width - 32 * scale, armY + armHalf);
        overlayCtx.closePath();
        overlayCtx.fill();
        overlayCtx.shadowBlur = 0;
      })();

      function drawBackground() {
        ctx.drawImage(bgLayer, 0, 0);
      }

      function drawOverlay() {
        ctx.drawImage(overlayLayer, 0, 0);
      }

      function drawReel(currentDistance, landed) {
        const topOfReel = centerY - baseOffset - currentDistance;
        for (let i = 0; i < sequence.length; i++) {
          const y = topOfReel + i * step;
          if (y + tileSize < 0 || y > height) continue; // offscreen, skip

          const isCenter = Math.abs((y + tileSize / 2) - centerY) < step / 2;
          const bitmap = images[sequence[i]].bitmap;

          ctx.save();
          roundRectPath(ctx, tileX, y, tileSize, tileSize, cornerRadius);
          ctx.clip();
          drawImageCover(ctx, bitmap, tileX, y, tileSize, tileSize);
          if (!isCenter) {
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(tileX, y, tileSize, tileSize);
          }
          ctx.restore();

          if (landed && isCenter) {
            ctx.save();
            ctx.strokeStyle = "#ffcc00";
            ctx.lineWidth = 6 * scale;
            ctx.shadowColor = "rgba(255,204,0,0.6)";
            ctx.shadowBlur = 40 * scale;
            roundRectPath(ctx, tileX, y, tileSize, tileSize, cornerRadius);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      function drawResultText(alpha) {
        if (!options.resultText || alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff";
        ctx.font = `900 ${58 * scale}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 18 * scale;
        ctx.fillText(options.resultText, width / 2, height * 0.86);
        ctx.restore();
      }

      function drawFlash(alpha) {
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const startTime = performance.now();
      let lastFiredIndex = 0;
      let landedAt = null;

      function frame(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutQuad(t);
        const currentDistance = targetDistance * eased;
        const landed = t >= 1;

        if (landed && landedAt === null) {
          landedAt = now;
          audio.boom();
        }

        const currentIndex = Math.min(sequence.length - 1, Math.round(currentDistance / step));
        if (!landed && currentIndex > lastFiredIndex) {
          for (let i = lastFiredIndex + 1; i <= currentIndex; i++) audio.tick();
          lastFiredIndex = currentIndex;
        }

        drawBackground();
        drawReel(landed ? targetDistance : currentDistance, landed);
        drawOverlay();

        if (landed) {
          const sinceLand = now - landedAt;
          drawFlash(Math.max(0, 0.85 * (1 - sinceLand / 350)));
          drawResultText(Math.min(1, Math.max(0, (sinceLand - 250) / 400)));
        }

        if (!landed || (now - landedAt) < holdAfterLandMs) {
          requestAnimationFrame(frame);
        } else {
          onDone();
        }
      }
      requestAnimationFrame(frame);
    }
  }

};
