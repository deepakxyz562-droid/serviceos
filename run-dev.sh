#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
export NODE_OPTIONS="--max-old-space-size=2048"
trap "" SIGHUP SIGPIPE
exec node node_modules/.bin/next dev -p 3000 -H 0.0.0.0
