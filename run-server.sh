#!/bin/bash
cd /home/z/my-project
ulimit -n 65536 2>/dev/null
export NODE_OPTIONS="--max-old-space-size=1024"

while true; do
    echo "[$(date -Iseconds)] Starting Next.js server..." >> /home/z/my-project/server-restarts.log
    node ./node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 2>&1 | tee /home/z/my-project/dev.log
    EXIT=$?
    echo "[$(date -Iseconds)] Server exited ($EXIT). Restarting in 2s..." >> /home/z/my-project/server-restarts.log
    sleep 2
done
