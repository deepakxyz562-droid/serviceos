#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
LOG="/home/z/my-project/dev.log"

while true; do
    echo "[$(date -Iseconds)] Starting Next.js server..." >> "$LOG"
    node ./node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 >> "$LOG" 2>&1
    EXIT_CODE=$?
    echo "[$(date -Iseconds)] Server exited with code $EXIT_CODE" >> "$LOG"
    sleep 2
done
