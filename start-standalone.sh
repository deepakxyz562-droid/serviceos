#!/bin/bash
# Auto-restart wrapper for standalone server
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting ServiceOS standalone server..."
  NODE_OPTIONS="--max-old-space-size=768" node standalone/server.js
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
