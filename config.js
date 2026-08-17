/*
  ============================================================
  PHOTO GALLERY SOUND WHEEL — CONFIG
  ============================================================
  This is the only file you need to edit to make a new video.

  1. Replace the "photos" list below with your own images.
     - src: a path like "photos/myphoto1.jpg" (drop the file in
       the /photos folder) or any image URL.
     - label: optional caption shown under the winning photo.

  2. Set "winnerIndex" to the position (starting at 0) of the
     photo you want the reel to land on. That photo is
     guaranteed to win every time — nothing is left to chance.

  3. Press play / open index.html, hit "TAP TO SPIN", and
     screen-record the frame for your Short.

  The demo ships with 8 placeholder tiles so you can see it
  work immediately with no images of your own.
  ============================================================
*/

function placeholderTile(number, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="600" height="600" fill="${color}"/>
      <text x="50%" y="54%" font-family="Helvetica, Arial, sans-serif"
            font-size="220" font-weight="900" fill="rgba(255,255,255,0.9)"
            text-anchor="middle" dominant-baseline="middle">${number}</text>
    </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const PLACEHOLDER_COLORS = [
  "#e63946", "#f4a261", "#2a9d8f", "#457b9d",
  "#8338ec", "#ff006e", "#3a86ff", "#06d6a0"
];

window.WHEEL_CONFIG = {

  // --- Your photos go here ---
  photos: PLACEHOLDER_COLORS.map((color, i) => ({
    src: placeholderTile(i + 1, color),
    label: `Sample Photo ${i + 1}`
  })),

  // --- Which photo wins (0 = first photo in the list above) ---
  winnerIndex: 4,

  // --- Timing / feel ---
  spinDurationMs: 5200,   // total spin time, start to landing
  loops: 5,                // how many full passes through the photo set before landing

  // --- Optional on-screen title shown above the button before spinning ---
  title: ""
};
