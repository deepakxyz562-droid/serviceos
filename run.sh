#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting ServiceOS..."
  bun run dev 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
