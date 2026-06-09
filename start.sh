#!/bin/bash
cd /home/z/my-project

# Kill any existing processes
lsof -i :3000 -t 2>/dev/null | xargs -r kill -9
lsof -i :3003 -t 2>/dev/null | xargs -r kill -9
sleep 1

# Start the Next.js dev server
exec npx next dev -p 3000 2>&1
