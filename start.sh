#!/bin/bash
# Start Next.js dev server with correct DATABASE_URL
# This script ensures the server stays running

export DATABASE_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

cd /home/z/my-project

while true; do
  echo "Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=512" node node_modules/.bin/next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE. Restarting in 3 seconds..."
  sleep 3
done
