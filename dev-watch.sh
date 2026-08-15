#!/bin/bash
# Auto-restart wrapper for dev server — handles sandbox OOM crashes
cd /home/z/my-project
while true; do
  echo "[$(date +%T)] Starting dev server..."
  bun run dev > dev.log 2>&1
  EXIT=$?
  echo "[$(date +%T)] Dev server exited with code $EXIT — restarting in 3s..."
  sleep 3
done
