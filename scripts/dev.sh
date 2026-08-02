#!/bin/bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fieseros"
cd /home/z/my-project
exec bun run dev
