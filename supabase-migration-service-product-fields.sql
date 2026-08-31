-- Migration: Add marketplace visibility fields to Service and InventoryItem
-- Run this on your Supabase database (SQL Editor)

-- Add fields to "Service" table
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "markup" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isBookable" BOOLEAN DEFAULT false;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isOnlineBookable" BOOLEAN DEFAULT false;

-- Add field to "InventoryItem" table
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "isSellableOnline" BOOLEAN DEFAULT false;
