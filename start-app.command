#!/bin/bash
# Double-click this to serve Sound Wheel Studio locally and open it.
# Serving from http://localhost lets the browser pick up the real app
# icon when you create a shortcut — opening the .html file directly
# (file://) does not.
cd "$(dirname "$0")"
PORT=8765

PYTHON=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  echo "Python wasn't found on this Mac, so it can't start a local server."
  echo "macOS should offer to install it the first time you run a 'python3' command —"
  echo "try opening Terminal and typing: python3 --version"
  echo "Press Enter to close this window."
  read -r
  exit 1
fi

"$PYTHON" -m http.server "$PORT" &
SERVER_PID=$!
sleep 1
open "http://localhost:$PORT/studio.html"
echo "Sound Wheel Studio is running at http://localhost:$PORT/studio.html"
echo "Leave this window open while you use it. Close it (or press Ctrl+C) to stop the server."
wait $SERVER_PID
