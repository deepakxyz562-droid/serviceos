// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
vi.mock('./db', () => ({ outreachDb: {}, locked: vi.fn() }));
vi.mock('./ses', () => ({}));
vi.mock('./copy', () => ({}));
import { eligibleSql } from './automation';
describe('outreach PostgreSQL schema', () => {
  it('enforces persistent email/company uniqueness and the 500 cap', async () => {
    const pg = new PGlite();
    try {
      await pg.exec('CREATE TABLE "EmailCommunication" (category TEXT, "sentAt" TIMESTAMP, "recipientEmail" TEXT); CREATE TABLE "EmailSuppression" (email TEXT, "resolvedAt" TIMESTAMP);');
      await pg.exec(readFileSync('prisma/migrations/20261009120000_outreach_automation/migration.sql', 'utf8'));
      await pg.exec(`INSERT INTO "OutreachAutomation" (id) VALUES ('default')`);
      await expect(pg.exec(`UPDATE "OutreachAutomation" SET "dailyLimit"=501`)).rejects.toThrow();
      const insert = (id: string, tenant: string, email: string) => pg.query(`INSERT INTO "OutreachQueue" (id,"tenantId",email,"companyName","createdBy","unsubscribeToken",status) VALUES ($1,$2,$3,'Example','admin',$1,'sent')`, [id, tenant, email]);
      await insert('q1', 't1', 'owner@example.com');
      await expect(insert('q2', 't2', 'owner@example.com')).rejects.toThrow();
      await expect(insert('q3', 't1', 'other@example.com')).rejects.toThrow();
    } finally { await pg.close(); }
  });
  it('excludes historical contacts and address-wide suppression in the actual selection SQL', async () => {
    const pg = new PGlite();
    try {
      await pg.exec(`CREATE TABLE "Tenant" (id TEXT,name TEXT,email TEXT,industry TEXT,"outreachDisabled" BOOLEAN);
        CREATE TABLE "OutreachQueue" ("tenantId" TEXT,email TEXT);
        CREATE TABLE "EmailCommunication" ("tenantId" TEXT,"recipientEmail" TEXT,category TEXT,"sentAt" TIMESTAMP,status TEXT);
        CREATE TABLE "EmailSuppression" (email TEXT,"resolvedAt" TIMESTAMP);
        INSERT INTO "Tenant" VALUES ('new','New','NEW@example.com','Cleaning',false),('old','Old',' old@example.com ','Cleaning',false),
          ('duplicate','Duplicate','OLD@example.com','Cleaning',false),('optout','Optout','opt@example.com','Cleaning',true),
          ('blocked','Blocked','block@example.com','Cleaning',false),('queued','Queued','queue@example.com','Cleaning',false);
        INSERT INTO "EmailCommunication" VALUES ('old','old@example.com','outreach',CURRENT_TIMESTAMP,'delivered');
        INSERT INTO "EmailSuppression" VALUES ('BLOCK@example.com',NULL);
        INSERT INTO "OutreachQueue" VALUES ('queued','queue@example.com');`);
      const query = Prisma.sql`SELECT id FROM "Tenant" t WHERE ${eligibleSql('', 'Cleaning')}`;
      const result = await pg.query(query.text, query.values);
      expect(result.rows).toEqual([{ id: 'new' }]);
    } finally { await pg.close(); }
  });
});
