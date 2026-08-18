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
  ============================================================
*/

window.WHEEL_CONFIG = {

  // --- Your photos (SEMA show pics, pulled from Drive) ---
  photos: [
    { src: "photos/DSC01513.jpg", label: "" },
    { src: "photos/IMG_1436.jpg", label: "" },
    { src: "photos/IMG_4113.jpg", label: "" },
    { src: "photos/IMG_4155.jpg", label: "" },
    { src: "photos/IMG_4160.jpg", label: "" },
    { src: "photos/IMG_4165.jpg", label: "" },
    { src: "photos/IMG_4166.jpg", label: "" },
    { src: "photos/IMG_4171.jpg", label: "" },
    { src: "photos/IMG_4184.jpg", label: "" },
    { src: "photos/IMG_4188.jpg", label: "" },
    { src: "photos/IMG_4191.jpg", label: "" },
    { src: "photos/IMG_4192.jpg", label: "" },
    { src: "photos/IMG_4193.jpg", label: "" },
    { src: "photos/IMG_4194.jpg", label: "" },
    { src: "photos/IMG_4195.jpg", label: "" },
    { src: "photos/IMG_7060.jpg", label: "" }
  ],

  // --- Which photo wins (0 = first photo in the list above) ---
  // photos[8] = IMG_4184.jpg
  winnerIndex: 8,

  // --- Timing / feel ---
  spinDurationMs: 5200,   // total spin time, start to landing
  loops: 5,                // how many full passes through the photo set before landing

  // --- Optional on-screen title shown above the button before spinning ---
  title: ""
};
