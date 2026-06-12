#!/bin/bash
cd /home/z/my-project
while true; do
  DATABASE_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  DIRECT_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  npx next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
