import { readFileSync, writeFileSync } from 'fs';

const inFile = 'supabase-migration-full-schema.sql';
const outFile = 'supabase-migration-full-schema.sql';
let sql = readFileSync(inFile, 'utf8');
const lines = sql.split('\n');
const out = [];
let wrappedCount = 0, tableCount = 0, indexCount = 0;

for (const line of lines) {
  // CREATE TABLE "X" → CREATE TABLE IF NOT EXISTS "X"
  if (/^CREATE TABLE(?! IF NOT EXISTS) /.test(line)) {
    out.push(line.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS '));
    tableCount++;
    continue;
  }
  // CREATE [UNIQUE] INDEX "X" → CREATE [UNIQUE] INDEX IF NOT EXISTS "X"
  if (/^CREATE (UNIQUE )?INDEX(?! IF NOT EXISTS) /.test(line)) {
    out.push(line.replace(/^(CREATE (?:UNIQUE )?INDEX) /, '$1 IF NOT EXISTS '));
    indexCount++;
    continue;
  }
  // ALTER TABLE "X" ADD CONSTRAINT "Y" ...;  →  wrap in DO block
  if (/^ALTER TABLE .* ADD CONSTRAINT .*;$/.test(line)) {
    out.push('DO $$ BEGIN');
    out.push('  ' + line);
    out.push('EXCEPTION WHEN duplicate_object THEN NULL;');
    out.push('END $$;');
    wrappedCount++;
    continue;
  }
  out.push(line);
}

writeFileSync(outFile, out.join('\n'));
console.log(`Transformed: ${tableCount} CREATE TABLE, ${indexCount} CREATE INDEX, ${wrappedCount} ALTER TABLE wrapped`);
console.log(`Output: ${outFile} (${out.length} lines)`);
