(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const folderInput = document.getElementById("folderInput");
  const filesInput = document.getElementById("filesInput");
  const chooseFolderBtn = document.getElementById("chooseFolderBtn");
  const chooseFilesBtn = document.getElementById("chooseFilesBtn");
  const photoCount = document.getElementById("photoCount");
  const thumbGrid = document.getElementById("thumbGrid");
  const templateSelect = document.getElementById("templateSelect");
  const resultTextInput = document.getElementById("resultTextInput");
  const durationInput = document.getElementById("durationInput");
  const durationValue = document.getElementById("durationValue");
  const loopsInput = document.getElementById("loopsInput");
  const loopsValue = document.getElementById("loopsValue");
  const runBtn = document.getElementById("runBtn");
  const statusText = document.getElementById("statusText");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const output = document.getElementById("output");

  // { file, url, bitmap }
  let photos = [];
  let winnerIndex = -1;
  let rendering = false;

  // ---------- template dropdown ----------

  Object.values(window.TEMPLATES).forEach((tpl) => {
    const opt = document.createElement("option");
    opt.value = tpl.id;
    opt.textContent = tpl.name;
    templateSelect.appendChild(opt);
  });

  function currentTemplate() {
    return window.TEMPLATES[templateSelect.value];
  }

  // ---------- settings UI ----------

  function applyTemplateDefaults() {
    const tpl = currentTemplate();
    durationInput.value = tpl.defaultOptions.spinDurationMs;
    loopsInput.value = tpl.defaultOptions.loops;
    updateRangeLabels();
  }

  function updateRangeLabels() {
    durationValue.textContent = (durationInput.value / 1000).toFixed(1) + "s";
    loopsValue.textContent = loopsInput.value;
  }
  durationInput.addEventListener("input", updateRangeLabels);
  loopsInput.addEventListener("input", updateRangeLabels);
  templateSelect.addEventListener("change", applyTemplateDefaults);
  applyTemplateDefaults();

  // ---------- photo loading (drag-and-drop with folder support + file pickers) ----------

  function isImageFile(file) {
    return /^image\//.test(file.type);
  }

  function collectEntry(entry, out) {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          out.push(file);
          resolve();
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (!entries.length) {
              resolve();
              return;
            }
            for (const e of entries) await collectEntry(e, out);
            readBatch(); // directory readers may need multiple calls
          });
        };
        readBatch();
      } else {
        resolve();
      }
    });
  }

  async function filesFromDataTransfer(dataTransfer) {
    const out = [];
    const items = dataTransfer.items;
    if (items && items.length && items[0].webkitGetAsEntry) {
      const entries = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      for (const entry of entries) await collectEntry(entry, out);
    } else {
      for (const f of dataTransfer.files) out.push(f);
    }
    return out.filter(isImageFile);
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter(isImageFile);
    if (!files.length) return;
    statusText.textContent = `Loading ${files.length} photo(s)...`;

    for (const file of files) {
      try {
        const bitmap = await createImageBitmap(file);
        const url = URL.createObjectURL(file);
        photos.push({ file, url, bitmap });
      } catch (e) {
        console.warn("Could not decode image:", file.name, e);
      }
    }

    statusText.textContent = "";
    renderThumbs();
  }

  function renderThumbs() {
    photoCount.textContent = photos.length
      ? `${photos.length} photo${photos.length === 1 ? "" : "s"} loaded — click one to set the winner.`
      : "No photos loaded yet.";

    thumbGrid.innerHTML = "";
    photos.forEach((photo, i) => {
      const div = document.createElement("div");
      div.className = "thumb" + (i === winnerIndex ? " selected" : "");
      div.innerHTML = `<img src="${photo.url}" alt=""><span class="badge">WINNER</span>`;
      div.addEventListener("click", () => {
        winnerIndex = i;
        renderThumbs();
        updateRunEnabled();
      });
      thumbGrid.appendChild(div);
    });

    updateRunEnabled();
  }

  function updateRunEnabled() {
    runBtn.disabled = rendering || photos.length < 2 || winnerIndex < 0;
  }

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const files = await filesFromDataTransfer(e.dataTransfer);
    addFiles(files);
  });

  chooseFolderBtn.addEventListener("click", () => folderInput.click());
  chooseFilesBtn.addEventListener("click", () => filesInput.click());
  folderInput.addEventListener("change", (e) => addFiles(e.target.files));
  filesInput.addEventListener("change", (e) => addFiles(e.target.files));

  // ---------- run / export ----------

  function pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"
    ];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  }

  async function run() {
    if (rendering || photos.length < 2 || winnerIndex < 0) return;
    rendering = true;
    updateRunEnabled();
    statusText.textContent = "Rendering...";
    output.innerHTML = "";

    const tpl = currentTemplate();
    const options = Object.assign({}, tpl.defaultOptions, {
      spinDurationMs: parseInt(durationInput.value, 10),
      loops: parseInt(loopsInput.value, 10),
      resultText: resultTextInput.value.trim()
    });

    const engine = createAudioEngine({ record: true });
    engine.resume();

    // captureStream(30) samples the canvas on its own steady 30fps timer,
    // which is actually what we want: it re-shows the last drawn frame if
    // a new one isn't ready yet, smoothing over any momentary jitter in the
    // draw loop. (Manual frame-pumping was tried and made things worse — it
    // bakes every draw-loop hitch directly into the recording. See
    // templates.js for the real fix: the draw loop no longer redoes
    // expensive work — gradients, shadow blur — on every single frame.)
    const canvasStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...engine.recordDest.stream.getAudioTracks()
    ]);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(combined, Object.assign(
      { videoBitsPerSecond: 8_000_000 },
      mimeType ? { mimeType } : {}
    ));
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    const finished = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    tpl.run({
      ctx,
      width: canvas.width,
      height: canvas.height,
      images: photos,
      winnerIndex,
      options,
      audio: engine,
      onDone: () => {
        recorder.stop();
      }
    });

    await finished;

    const blob = new Blob(chunks, { type: mimeType || "video/webm" });
    const url = URL.createObjectURL(blob);
    const ext = (mimeType || "").includes("mp4") ? "mp4" : "webm";

    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.playsInline = true;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${tpl.id}-${Date.now()}.${ext}`;
    link.className = "download-link";
    link.textContent = `Download .${ext}`;

    output.innerHTML = "";
    output.appendChild(video);
    output.appendChild(link);

    statusText.textContent = "Done.";
    rendering = false;
    updateRunEnabled();
  }

  runBtn.addEventListener("click", run);
})();
