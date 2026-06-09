#!/bin/bash
# Ensure Next.js dev manifests exist to prevent 500 errors
# These manifests are sometimes not created due to Turbopack SST caching issues

NEXT_DIR="/home/z/my-project/.next/dev"
SERVER_DIR="$NEXT_DIR/server"

mkdir -p "$SERVER_DIR" 2>/dev/null

if [ ! -f "$SERVER_DIR/middleware-manifest.json" ]; then
  echo '{"version":3,"middleware":[],"sortedMiddleware":[],"functions":{}}' > "$SERVER_DIR/middleware-manifest.json"
  echo "Created middleware-manifest.json"
fi

if [ ! -f "$NEXT_DIR/routes-manifest.json" ]; then
  echo '{"version":3,"dynamicRoutes":[],"staticRoutes":[],"dataRoutes":[],"rsc":{"header":"RSC","vary":"RSC, Next-Router-State-Tree, Next-Router-Prefetch"}}' > "$NEXT_DIR/routes-manifest.json"
  echo "Created routes-manifest.json"
fi
