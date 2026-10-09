-- Idempotent SQL to import legacy sent history & suppressions on Supabase / PostgreSQL
BEGIN;

-- jodhawebpage@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3dde4524342c8c2ab89f243b2ff97090', 'jodhawebpage@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-04T20:45:32.491Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'jodhawebpage@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3dde4524342c8c2ab89f243b2ff97090', t."id", 'jodhawebpage@gmail.com', t."name", 'Get more customers from the Fieseros marketplace', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-04T20:45:32.491Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'jodhawebpage@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- deepakxyz159@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d5a035f793629765b5b3cd975a637bf4', 'deepakxyz159@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-04T21:18:07.582Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'deepakxyz159@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d5a035f793629765b5b3cd975a637bf4', t."id", 'deepakxyz159@gmail.com', t."name", 'Receive high-intent customer leads in Dallas on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-04T21:18:07.582Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'deepakxyz159@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- coastalmaidsandiego@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-2b935b75a4cfa008dc372acfb822656d', 'coastalmaidsandiego@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-04T21:20:52.077Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'coastalmaidsandiego@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-2b935b75a4cfa008dc372acfb822656d', t."id", 'coastalmaidsandiego@gmail.com', t."name", 'Receive high-intent customer leads in La Jolla on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-04T21:20:52.077Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'coastalmaidsandiego@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- greatcanadianlondon@outlook.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-da40b5a8f5d3250a41ee3edced585343', 'greatcanadianlondon@outlook.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:15.381Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'greatcanadianlondon@outlook.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-da40b5a8f5d3250a41ee3edced585343', t."id", 'greatcanadianlondon@outlook.com', t."name", 'Welcome to Fieseros — how is your setup going, Great Canadian Landscape Inc.?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:15.381Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'greatcanadianlondon@outlook.com'
ON CONFLICT ("id") DO NOTHING;

-- seo413sbcleaning@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-f3e86295580c9c49777737ed22bdb77d', 'seo413sbcleaning@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:19.869Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'seo413sbcleaning@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-f3e86295580c9c49777737ed22bdb77d', t."id", 'seo413sbcleaning@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, 13SB Cleaning Services Delta/Surrey/Vancouver?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:19.869Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'seo413sbcleaning@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- info@singhfab.com.au
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-65337bf3c346eed20d6369c97ed5329b', 'info@singhfab.com.au', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:25.007Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@singhfab.com.au' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-65337bf3c346eed20d6369c97ed5329b', t."id", 'info@singhfab.com.au', t."name", 'Welcome to Fieseros — how is your setup going, Singh Fabrication?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:25.007Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@singhfab.com.au'
ON CONFLICT ("id") DO NOTHING;

-- info@asterlandscaping.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-b9645d5bac02129e5694d96bd8177efa', 'info@asterlandscaping.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:44.643Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@asterlandscaping.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-b9645d5bac02129e5694d96bd8177efa', t."id", 'info@asterlandscaping.ca', t."name", 'Welcome to Fieseros — how is your setup going, ASTER LANDSCAPING LTD?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:44.643Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@asterlandscaping.ca'
ON CONFLICT ("id") DO NOTHING;

-- sketchdrivewaysuk@outlook.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9bd07062e6beb33443ba90e1d5ea058b', 'sketchdrivewaysuk@outlook.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:49.476Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'sketchdrivewaysuk@outlook.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9bd07062e6beb33443ba90e1d5ea058b', t."id", 'sketchdrivewaysuk@outlook.com', t."name", 'Welcome to Fieseros — how is your setup going, Sketch Driveways Ltd?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:49.476Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'sketchdrivewaysuk@outlook.com'
ON CONFLICT ("id") DO NOTHING;

-- jeremie@evergreenhomepro.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-54ed5b307a2becbbb8c01924dee00e91', 'jeremie@evergreenhomepro.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:58.977Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'jeremie@evergreenhomepro.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-54ed5b307a2becbbb8c01924dee00e91', t."id", 'jeremie@evergreenhomepro.com', t."name", 'Welcome to Fieseros — how is your setup going, Evergreen Home Pro?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:58.977Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'jeremie@evergreenhomepro.com'
ON CONFLICT ("id") DO NOTHING;

-- services@fieseros.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-250698bbf871ad9918df0e05e6626103', 'services@fieseros.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:30.657Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'services@fieseros.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-250698bbf871ad9918df0e05e6626103', t."id", 'services@fieseros.com', t."name", 'Welcome to Fieseros — how is your setup going, Fieseros Services?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:30.657Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'services@fieseros.com'
ON CONFLICT ("id") DO NOTHING;

-- liftsforlifesydney@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-07ac01b06632594e83f9343a5eec705b', 'liftsforlifesydney@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:35.521Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'liftsforlifesydney@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-07ac01b06632594e83f9343a5eec705b', t."id", 'liftsforlifesydney@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, Lifts for Life?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:35.521Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'liftsforlifesydney@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- outreach@hellamaid.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-b0e2c9e9f6abc3bf40d5b4aa645b52f9', 'outreach@hellamaid.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:39.996Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'outreach@hellamaid.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-b0e2c9e9f6abc3bf40d5b4aa645b52f9', t."id", 'outreach@hellamaid.com', t."name", 'Welcome to Fieseros — how is your setup going, Hellamaid Cleaning Services Brampton?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:39.996Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'outreach@hellamaid.com'
ON CONFLICT ("id") DO NOTHING;

-- customcomfortair6@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-416e9ed81884bf9f5f13f39db18d426e', 'customcomfortair6@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:22:53.971Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'customcomfortair6@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-416e9ed81884bf9f5f13f39db18d426e', t."id", 'customcomfortair6@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, Custom Comfort Air?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:22:53.971Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'customcomfortair6@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- gtapestsolutions.ca@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-2855eb58f478cf789bb1c3143441570f', 'gtapestsolutions.ca@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:04.291Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'gtapestsolutions.ca@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-2855eb58f478cf789bb1c3143441570f', t."id", 'gtapestsolutions.ca@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, GTA Pest Solutions?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:04.291Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'gtapestsolutions.ca@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- stephenmult7896@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9db909e87e969ec0ba271a6cbd7221a6', 'stephenmult7896@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:09.277Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'stephenmult7896@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9db909e87e969ec0ba271a6cbd7221a6', t."id", 'stephenmult7896@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, Multiform Roofing Ltd?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:09.277Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'stephenmult7896@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- apnapest83@gmail.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-208a1b8cafdf7d00a8a1ce792a02d37d', 'apnapest83@gmail.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:13.981Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'apnapest83@gmail.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-208a1b8cafdf7d00a8a1ce792a02d37d', t."id", 'apnapest83@gmail.com', t."name", 'Welcome to Fieseros — how is your setup going, Apna Pest Control Canada?', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:13.981Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'apnapest83@gmail.com'
ON CONFLICT ("id") DO NOTHING;

-- service@nicksplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-41c5e4b70305498ed71f15ec43981b59', 'service@nicksplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:19.533Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@nicksplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-41c5e4b70305498ed71f15ec43981b59', t."id", 'service@nicksplumbing.com', t."name", 'Nick''s Plumbing & Air Conditioning is featured in the Houston directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:19.533Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@nicksplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- info@metropolitangardendesign.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d0bf2c5beafb0d1a2abb25884e1ad3e4', 'info@metropolitangardendesign.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:54.822Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@metropolitangardendesign.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d0bf2c5beafb0d1a2abb25884e1ad3e4', t."id", 'info@metropolitangardendesign.com', t."name", 'Metropolitan Garden Design is featured in the New York directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:54.822Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@metropolitangardendesign.com'
ON CONFLICT ("id") DO NOTHING;

-- service@villageplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e05ee36ac46587a951982487766dadea', 'service@villageplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:24.993Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@villageplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e05ee36ac46587a951982487766dadea', t."id", 'service@villageplumbing.com', t."name", 'Village Plumbing, Air & Electric is featured in the Houston directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:24.993Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@villageplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- info@gcdnyc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-8ccb096e742f79d3afa7bf3dff8b34db', 'info@gcdnyc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:19.489Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@gcdnyc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-8ccb096e742f79d3afa7bf3dff8b34db', t."id", 'info@gcdnyc.com', t."name", 'GreenCity Design is featured in the Hoboken directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:19.489Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@gcdnyc.com'
ON CONFLICT ("id") DO NOTHING;

-- nancy@weedsbloom.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fd0a968ac241e794c8b516ad53c638c3', 'nancy@weedsbloom.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:05.588Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'nancy@weedsbloom.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fd0a968ac241e794c8b516ad53c638c3', t."id", 'nancy@weedsbloom.com', t."name", 'Stop managing Weeds Garden Design across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:05.588Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'nancy@weedsbloom.com'
ON CONFLICT ("id") DO NOTHING;

-- office@wedgeworthplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-456a5c9270aadf4aab643983d060d06f', 'office@wedgeworthplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:49.545Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@wedgeworthplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-456a5c9270aadf4aab643983d060d06f', t."id", 'office@wedgeworthplumbing.com', t."name", 'Wedgeworth Plumbing is featured in the Houston directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:49.545Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@wedgeworthplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- info@jcdesignscapes.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0bd473a513fb43c9661469e5214db71a', 'info@jcdesignscapes.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:04.521Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@jcdesignscapes.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0bd473a513fb43c9661469e5214db71a', t."id", 'info@jcdesignscapes.com', t."name", 'JC Landscaping & Design, Inc. is featured on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:04.521Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@jcdesignscapes.com'
ON CONFLICT ("id") DO NOTHING;

-- grow@nyhort.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d46d02832ff0553ffc728b2c0693f410', 'grow@nyhort.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:23:59.831Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'grow@nyhort.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d46d02832ff0553ffc728b2c0693f410', t."id", 'grow@nyhort.com', t."name", 'NY Horticulture Group: NYC Landscape Design is featured in the New York directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:23:59.831Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'grow@nyhort.com'
ON CONFLICT ("id") DO NOTHING;

-- todd@bigheartlandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fbcf6f9548c33ef47ccb3b483d66bfe7', 'todd@bigheartlandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:09.272Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'todd@bigheartlandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fbcf6f9548c33ef47ccb3b483d66bfe7', t."id", 'todd@bigheartlandscaping.com', t."name", 'Big Heart Landscaping is featured in the Livingston directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:09.272Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'todd@bigheartlandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- tim@gardenculturenyc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3214736c217d3eea918b0555d836eab7', 'tim@gardenculturenyc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:14.606Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'tim@gardenculturenyc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3214736c217d3eea918b0555d836eab7', t."id", 'tim@gardenculturenyc.com', t."name", 'Garden Culture NYC is featured in the Jersey City directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:14.606Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'tim@gardenculturenyc.com'
ON CONFLICT ("id") DO NOTHING;

-- dylan@alpineconstructioncorp.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-f0b55c53a75ab4b0540d74a55054447c', 'dylan@alpineconstructioncorp.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:24.608Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'dylan@alpineconstructioncorp.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-f0b55c53a75ab4b0540d74a55054447c', t."id", 'dylan@alpineconstructioncorp.com', t."name", 'Alpine Construction & Landscaping Corp. is featured in the New York directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:24.608Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'dylan@alpineconstructioncorp.com'
ON CONFLICT ("id") DO NOTHING;

-- hello@fieldform.nyc
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-7a13ca88943701550be9669ab4da5278', 'hello@fieldform.nyc', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:29.457Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'hello@fieldform.nyc' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-7a13ca88943701550be9669ab4da5278', t."id", 'hello@fieldform.nyc', t."name", 'Field Form is featured on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:29.457Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'hello@fieldform.nyc'
ON CONFLICT ("id") DO NOTHING;

-- info@newyorkplantings.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c656613a14bc7debcd7095188c7956fa', 'info@newyorkplantings.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:24:34.403Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@newyorkplantings.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c656613a14bc7debcd7095188c7956fa', t."id", 'info@newyorkplantings.com', t."name", 'New York Plantings is featured in the New York directory on Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:24:34.403Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@newyorkplantings.com'
ON CONFLICT ("id") DO NOTHING;

-- info@rooftopdrops.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-05674451a7b4c4cfe32801fe2700ded2', 'info@rooftopdrops.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:41:44.586Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@rooftopdrops.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-05674451a7b4c4cfe32801fe2700ded2', t."id", 'info@rooftopdrops.com', t."name", 'Stop managing Rooftop Drops Inc across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:41:44.586Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@rooftopdrops.com'
ON CONFLICT ("id") DO NOTHING;

-- info@socallg.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-919c802464ab0b18471ed9f9d9684642', 'info@socallg.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:41:49.421Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@socallg.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-919c802464ab0b18471ed9f9d9684642', t."id", 'info@socallg.com', t."name", 'Stop managing Socal Landscape & Gardening across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:41:49.421Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@socallg.com'
ON CONFLICT ("id") DO NOTHING;

-- raul@supergreenlandscape.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ca5767a8f17db196d6de6c68f889d927', 'raul@supergreenlandscape.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:41:54.705Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'raul@supergreenlandscape.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ca5767a8f17db196d6de6c68f889d927', t."id", 'raul@supergreenlandscape.com', t."name", 'Stop managing Supergreen Landscape across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:41:54.705Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'raul@supergreenlandscape.com'
ON CONFLICT ("id") DO NOTHING;

-- office@picturebuild.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-eb5daf2930b581c84ec07ca31df75736', 'office@picturebuild.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:00.110Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@picturebuild.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-eb5daf2930b581c84ec07ca31df75736', t."id", 'office@picturebuild.com', t."name", 'Stop managing Picture Build across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:00.110Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@picturebuild.com'
ON CONFLICT ("id") DO NOTHING;

-- studio@salt-la.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-7dcf1d9624ab33c69bae4d9c1e5837e8', 'studio@salt-la.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:15.634Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'studio@salt-la.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-7dcf1d9624ab33c69bae4d9c1e5837e8', t."id", 'studio@salt-la.com', t."name", 'Stop managing SALT Landscape Architects across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:15.634Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'studio@salt-la.com'
ON CONFLICT ("id") DO NOTHING;

-- info@iamgreenwise.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3b8dd6fd1ccb60e8fccf8a56f023d02b', 'info@iamgreenwise.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:08.391Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@iamgreenwise.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3b8dd6fd1ccb60e8fccf8a56f023d02b', t."id", 'info@iamgreenwise.com', t."name", 'Stop managing Greenwise Organic Lawn Care across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:08.391Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@iamgreenwise.com'
ON CONFLICT ("id") DO NOTHING;

-- info@urbanoasis-la.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9d6ad2037202db881ca6ae53e9ca54f8', 'info@urbanoasis-la.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:10.662Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@urbanoasis-la.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9d6ad2037202db881ca6ae53e9ca54f8', t."id", 'info@urbanoasis-la.com', t."name", 'Stop managing Urban Oasis Landscape Design across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:10.662Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@urbanoasis-la.com'
ON CONFLICT ("id") DO NOTHING;

-- info@artsmaintenance.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-7f42745ead8e36706df3ab6d5a00cfc5', 'info@artsmaintenance.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:21.164Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@artsmaintenance.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-7f42745ead8e36706df3ab6d5a00cfc5', t."id", 'info@artsmaintenance.com', t."name", 'Stop managing Arts Landscaping & Maintenance LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:21.164Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@artsmaintenance.com'
ON CONFLICT ("id") DO NOTHING;

-- info@dariogl.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fbe3982e21154c6d1a68769335740416', 'info@dariogl.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:52.877Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@dariogl.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fbe3982e21154c6d1a68769335740416', t."id", 'info@dariogl.com', t."name", 'Stop managing Dario Garcia Landscaping LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:52.877Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@dariogl.com'
ON CONFLICT ("id") DO NOTHING;

-- info@jrlandscapingservice.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-1ce3a4a11dc2f4766fbc5e22d1f12d6b', 'info@jrlandscapingservice.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:42:57.794Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@jrlandscapingservice.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-1ce3a4a11dc2f4766fbc5e22d1f12d6b', t."id", 'info@jrlandscapingservice.com', t."name", 'Stop managing JR Landscaping Services across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:42:57.794Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@jrlandscapingservice.com'
ON CONFLICT ("id") DO NOTHING;

-- info@revealdesignchicago.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-6b9639ee6ad31000519765d9bf70f86b', 'info@revealdesignchicago.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:02.796Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@revealdesignchicago.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-6b9639ee6ad31000519765d9bf70f86b', t."id", 'info@revealdesignchicago.com', t."name", 'Stop managing Reveal Design LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:02.796Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@revealdesignchicago.com'
ON CONFLICT ("id") DO NOTHING;

-- info@hoguels.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-5c9c4f7e674c491d40dd8c6f4507c423', 'info@hoguels.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:44.585Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@hoguels.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-5c9c4f7e674c491d40dd8c6f4507c423', t."id", 'info@hoguels.com', t."name", 'Stop managing Hogue Landscape Services across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:44.585Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@hoguels.com'
ON CONFLICT ("id") DO NOTHING;

-- info@mosslandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a3e34a5ad4c1750694db06b7d51d46c7', 'info@mosslandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:59.078Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@mosslandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a3e34a5ad4c1750694db06b7d51d46c7', t."id", 'info@mosslandscaping.com', t."name", 'Stop managing Moss Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:59.078Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@mosslandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- info@tommypollina.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-1e748ec89c251bf99d1c192f6a35202b', 'info@tommypollina.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:13.389Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@tommypollina.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-1e748ec89c251bf99d1c192f6a35202b', t."id", 'info@tommypollina.com', t."name", 'Stop managing Tommy Pollina Landscape Company across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:13.389Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@tommypollina.com'
ON CONFLICT ("id") DO NOTHING;

-- info@chicagogardens.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0b21d51336cb7bec3cab29f885a10801', 'info@chicagogardens.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:23.387Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@chicagogardens.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0b21d51336cb7bec3cab29f885a10801', t."id", 'info@chicagogardens.com', t."name", 'Stop managing Chicago Specialty Gardens, Inc. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:23.387Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@chicagogardens.com'
ON CONFLICT ("id") DO NOTHING;

-- danny@dannyslandscapingtx.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-54307332aa77896a78d1a653e65d7d6e', 'danny@dannyslandscapingtx.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:54.283Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'danny@dannyslandscapingtx.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-54307332aa77896a78d1a653e65d7d6e', t."id", 'danny@dannyslandscapingtx.com', t."name", 'Stop managing Danny''s Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:54.283Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'danny@dannyslandscapingtx.com'
ON CONFLICT ("id") DO NOTHING;

-- mail@patchlandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d27acc69a628bbc817b7c9fa06fe52a7', 'mail@patchlandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:18.380Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'mail@patchlandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d27acc69a628bbc817b7c9fa06fe52a7', t."id", 'mail@patchlandscaping.com', t."name", 'Stop managing Patch Landscaping & Snow Removal across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:18.380Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'mail@patchlandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- office@absolute-landscape.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-29cab814d367ca2ce62813a0a55de51f', 'office@absolute-landscape.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:34.523Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@absolute-landscape.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-29cab814d367ca2ce62813a0a55de51f', t."id", 'office@absolute-landscape.com', t."name", 'Stop managing Absolute Lawn Care and Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:34.523Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@absolute-landscape.com'
ON CONFLICT ("id") DO NOTHING;

-- alfredo@heavenonearthlandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-14f76bf185c6e991cf469c5df9a22cae', 'alfredo@heavenonearthlandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:39.545Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'alfredo@heavenonearthlandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-14f76bf185c6e991cf469c5df9a22cae', t."id", 'alfredo@heavenonearthlandscaping.com', t."name", 'Stop managing Heaven On Earth Landscaping Inc. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:39.545Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'alfredo@heavenonearthlandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- info@christywebber.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fe1763a6799f3d4f29c2afe9caf4f7f9', 'info@christywebber.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:28.671Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@christywebber.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fe1763a6799f3d4f29c2afe9caf4f7f9', t."id", 'info@christywebber.com', t."name", 'Stop managing Christy Webber Landscapes across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:28.671Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@christywebber.com'
ON CONFLICT ("id") DO NOTHING;

-- contact@fernandezlandscapes.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-69c22e9a310fda0c5cd1c5aea11a8640', 'contact@fernandezlandscapes.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:43:49.160Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@fernandezlandscapes.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-69c22e9a310fda0c5cd1c5aea11a8640', t."id", 'contact@fernandezlandscapes.com', t."name", 'Stop managing Fernandez Landscape Contractors Services across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:43:49.160Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@fernandezlandscapes.com'
ON CONFLICT ("id") DO NOTHING;

-- info@earthworkstexas.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-31dd66f36795b362a1d41e0dd165a15d', 'info@earthworkstexas.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:44:03.688Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@earthworkstexas.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-31dd66f36795b362a1d41e0dd165a15d', t."id", 'info@earthworkstexas.com', t."name", 'Stop managing Earthworks Landscape and Maintenance across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:44:03.688Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@earthworkstexas.com'
ON CONFLICT ("id") DO NOTHING;

-- info@allspeciallandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-367d436d241b8c6c3bb39b48de4f0639', 'info@allspeciallandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T02:44:09.402Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@allspeciallandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-367d436d241b8c6c3bb39b48de4f0639', t."id", 'info@allspeciallandscaping.com', t."name", 'Stop managing All Special Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T02:44:09.402Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@allspeciallandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- leadform@cityscapelandscape.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-24b263aa4c1c1f278235e6392f1f3d83', 'leadform@cityscapelandscape.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-06T08:14:10.000Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'leadform@cityscapelandscape.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-24b263aa4c1c1f278235e6392f1f3d83', t."id", 'leadform@cityscapelandscape.com', t."name", 'All-in-One Platform Pitch', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-06T08:14:10.000Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'leadform@cityscapelandscape.com'
ON CONFLICT ("id") DO NOTHING;

-- info@dssggogreen.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-8e2ec820cb49f3a0cc16f6c1b47812c5', 'info@dssggogreen.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:00.070Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@dssggogreen.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-8e2ec820cb49f3a0cc16f6c1b47812c5', t."id", 'info@dssggogreen.com', t."name", 'Stop managing Diamond Stone & Synthetic Grass across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:00.070Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@dssggogreen.com'
ON CONFLICT ("id") DO NOTHING;

-- office@nexgenlandscaping.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-1624c5509e35d248f855c55f6319aa45', 'office@nexgenlandscaping.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:04.829Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@nexgenlandscaping.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-1624c5509e35d248f855c55f6319aa45', t."id", 'office@nexgenlandscaping.com', t."name", 'Stop managing NexGen Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:04.829Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@nexgenlandscaping.com'
ON CONFLICT ("id") DO NOTHING;

-- design@lonestaraz.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-f9703cc8c4d29083a7b0488ba8540b31', 'design@lonestaraz.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:08.957Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'design@lonestaraz.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-f9703cc8c4d29083a7b0488ba8540b31', t."id", 'design@lonestaraz.com', t."name", 'Stop managing Lone Star Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:08.957Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'design@lonestaraz.com'
ON CONFLICT ("id") DO NOTHING;

-- info@koslawn.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c72bc5c3180c5835927afa220638eed2', 'info@koslawn.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:13.617Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@koslawn.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c72bc5c3180c5835927afa220638eed2', t."id", 'info@koslawn.com', t."name", 'Stop managing KO’s Landscaping LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:13.617Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@koslawn.com'
ON CONFLICT ("id") DO NOTHING;

-- naji@jnklandscapingandpools.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-84c68f6d9703ac541ba05f976afc0390', 'naji@jnklandscapingandpools.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:19.127Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'naji@jnklandscapingandpools.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-84c68f6d9703ac541ba05f976afc0390', t."id", 'naji@jnklandscapingandpools.com', t."name", 'Stop managing JNK LANDSCAPING AND POOLS across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:19.127Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'naji@jnklandscapingandpools.com'
ON CONFLICT ("id") DO NOTHING;

-- bkeal@udsphilly.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-b57bfeeb5218e1f270539a22e0e8fcc5', 'bkeal@udsphilly.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:24.348Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'bkeal@udsphilly.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-b57bfeeb5218e1f270539a22e0e8fcc5', t."id", 'bkeal@udsphilly.com', t."name", 'Stop managing UDS Philly Landscaping and Removal across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:24.348Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'bkeal@udsphilly.com'
ON CONFLICT ("id") DO NOTHING;

-- jack@jgtreesservice.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3a3e3f5375dc36a4a1c1d497f432c9fe', 'jack@jgtreesservice.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:33.329Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'jack@jgtreesservice.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3a3e3f5375dc36a4a1c1d497f432c9fe', t."id", 'jack@jgtreesservice.com', t."name", 'Stop managing JG Landscaping & Tree Service across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:33.329Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'jack@jgtreesservice.com'
ON CONFLICT ("id") DO NOTHING;

-- office@philadelphiagardens.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a7cf8fc59833a9d4dbeecd697cecfd0a', 'office@philadelphiagardens.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:08:44.724Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@philadelphiagardens.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a7cf8fc59833a9d4dbeecd697cecfd0a', t."id", 'office@philadelphiagardens.com', t."name", 'Stop managing Philadelphia Gardens, Inc. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:08:44.724Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@philadelphiagardens.com'
ON CONFLICT ("id") DO NOTHING;

-- mcfarland@mcfarlandtree.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-205a1f1b977c5bb698a33ede16e8e789', 'mcfarland@mcfarlandtree.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:13.494Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'mcfarland@mcfarlandtree.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-205a1f1b977c5bb698a33ede16e8e789', t."id", 'mcfarland@mcfarlandtree.com', t."name", 'Stop managing McFarland Landscape Services Inc across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:13.494Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'mcfarland@mcfarlandtree.com'
ON CONFLICT ("id") DO NOTHING;

-- office@fstl1992.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-7991a320b7b22aa439b34494c054d6c5', 'office@fstl1992.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:24.695Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@fstl1992.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-7991a320b7b22aa439b34494c054d6c5', t."id", 'office@fstl1992.com', t."name", 'Stop managing Four Seasons Total Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:24.695Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@fstl1992.com'
ON CONFLICT ("id") DO NOTHING;

-- reception@disabatinoinc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-18baa27d5810431a012793edf1f4e55a', 'reception@disabatinoinc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:29.307Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'reception@disabatinoinc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-18baa27d5810431a012793edf1f4e55a', t."id", 'reception@disabatinoinc.com', t."name", 'Stop managing DiSabatino Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:29.307Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'reception@disabatinoinc.com'
ON CONFLICT ("id") DO NOTHING;

-- hello@urbanjunglephilly.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9424b9219732871a16971ef5c6ea3af6', 'hello@urbanjunglephilly.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:34.774Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'hello@urbanjunglephilly.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9424b9219732871a16971ef5c6ea3af6', t."id", 'hello@urbanjunglephilly.com', t."name", 'Stop managing Urban Jungle across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:34.774Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'hello@urbanjunglephilly.com'
ON CONFLICT ("id") DO NOTHING;

-- info@lawndr.net
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-5744237a1b979da10d62eb53923a7ccc', 'info@lawndr.net', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:39.880Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@lawndr.net' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-5744237a1b979da10d62eb53923a7ccc', t."id", 'info@lawndr.net', t."name", 'Stop managing LAWN D.R LANDSCAPING AND IRRIGATION LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:39.880Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@lawndr.net'
ON CONFLICT ("id") DO NOTHING;

-- info@zionlandscapeco.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a607fd383f5d2997838e2ece5e2cae61', 'info@zionlandscapeco.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:45.144Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@zionlandscapeco.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a607fd383f5d2997838e2ece5e2cae61', t."id", 'info@zionlandscapeco.com', t."name", 'Stop managing Zion Landscape Co. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:45.144Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@zionlandscapeco.com'
ON CONFLICT ("id") DO NOTHING;

-- contact@torolawn.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e76aab58c03a48388035e8e0a42e5941', 'contact@torolawn.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:49.228Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@torolawn.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e76aab58c03a48388035e8e0a42e5941', t."id", 'contact@torolawn.com', t."name", 'Stop managing Toro Lawn Care & Landscaping, LLC across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:49.228Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@torolawn.com'
ON CONFLICT ("id") DO NOTHING;

-- info@visionlandscaping.org
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-b4c28b7ecc798b5fd40a6c4fb230b520', 'info@visionlandscaping.org', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:54.495Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@visionlandscaping.org' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-b4c28b7ecc798b5fd40a6c4fb230b520', t."id", 'info@visionlandscaping.org', t."name", 'Stop managing Vision Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:54.495Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@visionlandscaping.org'
ON CONFLICT ("id") DO NOTHING;

-- chris@pristinelandscapingsa.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d3560c8e6afb503b2f5c84bc77d2286d', 'chris@pristinelandscapingsa.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:09:59.114Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'chris@pristinelandscapingsa.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d3560c8e6afb503b2f5c84bc77d2286d', t."id", 'chris@pristinelandscapingsa.com', t."name", 'Stop managing Pristine Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:09:59.114Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'chris@pristinelandscapingsa.com'
ON CONFLICT ("id") DO NOTHING;

-- info@holeinonelawns.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-68dcbd69e60c8024e5e542a788701c29', 'info@holeinonelawns.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:03.843Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@holeinonelawns.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-68dcbd69e60c8024e5e542a788701c29', t."id", 'info@holeinonelawns.com', t."name", 'Stop managing Hole In One Lawns across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:03.843Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@holeinonelawns.com'
ON CONFLICT ("id") DO NOTHING;

-- hello@verdelandscapes.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-5ed581f3595c48347ab7d03dc4af562c', 'hello@verdelandscapes.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:08.551Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'hello@verdelandscapes.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-5ed581f3595c48347ab7d03dc4af562c', t."id", 'hello@verdelandscapes.com', t."name", 'Stop managing Verde Landscaping & Tree Trimming across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:08.551Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'hello@verdelandscapes.com'
ON CONFLICT ("id") DO NOTHING;

-- pg@yardbydesign.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-04ebf8b8f1091a52beb1ea988a707540', 'pg@yardbydesign.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:13.407Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'pg@yardbydesign.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-04ebf8b8f1091a52beb1ea988a707540', t."id", 'pg@yardbydesign.com', t."name", 'Stop managing Yard By Design across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:13.407Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'pg@yardbydesign.com'
ON CONFLICT ("id") DO NOTHING;

-- nadia@dnslandscaping.net
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-cfc2c64ec7b07357df41ba76e063609b', 'nadia@dnslandscaping.net', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:18.547Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'nadia@dnslandscaping.net' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-cfc2c64ec7b07357df41ba76e063609b', t."id", 'nadia@dnslandscaping.net', t."name", 'Stop managing DNS Landscaping across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:18.547Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'nadia@dnslandscaping.net'
ON CONFLICT ("id") DO NOTHING;

-- info@sayleegreer.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-00b0bdbb68257c5a08a2f48b66a461ac', 'info@sayleegreer.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:23.294Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@sayleegreer.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-00b0bdbb68257c5a08a2f48b66a461ac', t."id", 'info@sayleegreer.com', t."name", 'Stop managing Saylee Greer Landscape Architecture across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:23.294Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@sayleegreer.com'
ON CONFLICT ("id") DO NOTHING;

-- info@installitdirect.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-bf09dab66a445535a8155a45ca1d30c0', 'info@installitdirect.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:27.964Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@installitdirect.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-bf09dab66a445535a8155a45ca1d30c0', t."id", 'info@installitdirect.com', t."name", 'Stop managing INSTALL-IT-DIRECT Landscape Design & Build San Diego across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:27.964Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@installitdirect.com'
ON CONFLICT ("id") DO NOTHING;

-- am@landscapingam.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9aa1d75d9599f133e7863468ffdc4a5a', 'am@landscapingam.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:10:32.670Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'am@landscapingam.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9aa1d75d9599f133e7863468ffdc4a5a', t."id", 'am@landscapingam.com', t."name", 'Stop managing AM Landscape Construction Inc. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:10:32.670Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'am@landscapingam.com'
ON CONFLICT ("id") DO NOTHING;

-- perfectlandscapes@pottedperfectionllc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-82ef14599d9af0be89a104f0d41d1bb9', 'perfectlandscapes@pottedperfectionllc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-08T02:11:14.072Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'perfectlandscapes@pottedperfectionllc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-82ef14599d9af0be89a104f0d41d1bb9', t."id", 'perfectlandscapes@pottedperfectionllc.com', t."name", 'Stop managing Potted Perfection, LLC. across disconnected tools — Meet Fieseros', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-08T02:11:14.072Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'perfectlandscapes@pottedperfectionllc.com'
ON CONFLICT ("id") DO NOTHING;

-- service@downtowntorontohvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-bd183666e6c689f1d0a89bcaab8a8ce7', 'service@downtowntorontohvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:19.866Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@downtowntorontohvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-bd183666e6c689f1d0a89bcaab8a8ce7', t."id", 'service@downtowntorontohvac.ca', t."name", 'Quick question — Downtown Toronto HVAC', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:19.866Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@downtowntorontohvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@dupontheatingltd.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-01efff287db038a3d5b0663d7b8096bf', 'info@dupontheatingltd.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:25.224Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@dupontheatingltd.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-01efff287db038a3d5b0663d7b8096bf', t."id", 'info@dupontheatingltd.ca', t."name", 'Quick question — Dupont Heating & Air Conditioning Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:25.224Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@dupontheatingltd.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@sunnysidehvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-18a342d14e4fee1d36a917042222b74e', 'info@sunnysidehvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:29.852Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@sunnysidehvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-18a342d14e4fee1d36a917042222b74e', t."id", 'info@sunnysidehvac.ca', t."name", 'Quick question — SunnySide Heating and Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:29.852Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@sunnysidehvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@econoairhc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-1c764d69cae3ecd60c8fad1e25fa3a45', 'info@econoairhc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:35.102Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@econoairhc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-1c764d69cae3ecd60c8fad1e25fa3a45', t."id", 'info@econoairhc.com', t."name", 'Quick question — Econoair HVAC Services Toronto', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:35.102Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@econoairhc.com'
ON CONFLICT ("id") DO NOTHING;

-- service@hudsonhvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d279a40f71af5915d35c9844fd291112', 'service@hudsonhvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:39.888Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@hudsonhvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d279a40f71af5915d35c9844fd291112', t."id", 'service@hudsonhvac.ca', t."name", 'Quick question — Hudson Condominium Solutions Inc', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:39.888Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@hudsonhvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@climaxair.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fd2a56e35b7fd762b57f9ba7cb2fca61', 'info@climaxair.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:43.898Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@climaxair.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fd2a56e35b7fd762b57f9ba7cb2fca61', t."id", 'info@climaxair.ca', t."name", 'Quick question — Climax Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:43.898Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@climaxair.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@mckinnonheating.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-012aabba06161153b4330a7896241835', 'info@mckinnonheating.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:49.185Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@mckinnonheating.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-012aabba06161153b4330a7896241835', t."id", 'info@mckinnonheating.com', t."name", 'Quick question — Mckinnon Heating Cooling', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:49.185Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@mckinnonheating.com'
ON CONFLICT ("id") DO NOTHING;

-- sales@cozyworld.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-87550a2a3c520118f42efb26b194d3eb', 'sales@cozyworld.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:53.183Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'sales@cozyworld.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-87550a2a3c520118f42efb26b194d3eb', t."id", 'sales@cozyworld.ca', t."name", 'Quick question — Cozy World Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:53.183Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'sales@cozyworld.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@cityairtoronto.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-d6b1acd83387a343eb626e909f293881', 'info@cityairtoronto.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:40:58.604Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@cityairtoronto.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-d6b1acd83387a343eb626e909f293881', t."id", 'info@cityairtoronto.com', t."name", 'Quick question — City Air Toronto', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:40:58.604Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@cityairtoronto.com'
ON CONFLICT ("id") DO NOTHING;

-- info@harbourhvac.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-573d6b70d760a384700acb4d928d8640', 'info@harbourhvac.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:03.826Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@harbourhvac.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-573d6b70d760a384700acb4d928d8640', t."id", 'info@harbourhvac.com', t."name", 'Quick question — Harbour HVAC Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:03.826Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@harbourhvac.com'
ON CONFLICT ("id") DO NOTHING;

-- info@hvac-group.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0ccdabaa94148e879261bbe362402e7f', 'info@hvac-group.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:09.193Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@hvac-group.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0ccdabaa94148e879261bbe362402e7f', t."id", 'info@hvac-group.com', t."name", 'Quick question — HVAC-Group', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:09.193Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@hvac-group.com'
ON CONFLICT ("id") DO NOTHING;

-- sales@airgreen.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3b2a51ed233e37917724eceecf417952', 'sales@airgreen.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:14.008Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'sales@airgreen.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3b2a51ed233e37917724eceecf417952', t."id", 'sales@airgreen.ca', t."name", 'Quick question — AIRGREEN inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:14.008Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'sales@airgreen.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@polarbearcanada.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c92b13573c31449871ca5e62f30355dc', 'info@polarbearcanada.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:19.318Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@polarbearcanada.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c92b13573c31449871ca5e62f30355dc', t."id", 'info@polarbearcanada.com', t."name", 'Quick question — Les Services Polarbear', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:19.318Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@polarbearcanada.com'
ON CONFLICT ("id") DO NOTHING;

-- info@confortmh.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-60bef734a55b88156341ebdf724dbad9', 'info@confortmh.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:24.058Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@confortmh.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-60bef734a55b88156341ebdf724dbad9', t."id", 'info@confortmh.ca', t."name", 'Quick question — Confort MH Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:24.058Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@confortmh.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@allardemond.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-504a0ebe9460353b4b746738a9d26a7d', 'info@allardemond.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:28.736Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@allardemond.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-504a0ebe9460353b4b746738a9d26a7d', t."id", 'info@allardemond.com', t."name", 'Quick question — Allard & Emond Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:28.736Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@allardemond.com'
ON CONFLICT ("id") DO NOTHING;

-- contact@duraclim.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a4a0c3d9b785dea0605af9b954aa79ae', 'contact@duraclim.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:33.314Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@duraclim.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a4a0c3d9b785dea0605af9b954aa79ae', t."id", 'contact@duraclim.com', t."name", 'Quick question — DuraClim', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:33.314Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@duraclim.com'
ON CONFLICT ("id") DO NOTHING;

-- contact@celsiusrefrigeration.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-698bb43f9de7bdb5f2c42649c13461b8', 'contact@celsiusrefrigeration.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:38.008Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@celsiusrefrigeration.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-698bb43f9de7bdb5f2c42649c13461b8', t."id", 'contact@celsiusrefrigeration.com', t."name", 'Quick question — Celsius Refrigeration', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:38.008Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@celsiusrefrigeration.com'
ON CONFLICT ("id") DO NOTHING;

-- info@confortech.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3e99a70a25023e18e1cec8bc788a93db', 'info@confortech.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:42.485Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@confortech.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3e99a70a25023e18e1cec8bc788a93db', t."id", 'info@confortech.ca', t."name", 'Quick question — Confortech Climatisation Chauffage', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:42.485Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@confortech.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@keepcoolpro.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-21c524f1e8f7770c307ae4b895027dd4', 'info@keepcoolpro.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:47.604Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@keepcoolpro.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-21c524f1e8f7770c307ae4b895027dd4', t."id", 'info@keepcoolpro.com', t."name", 'Quick question — Rester Cool Pro', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:47.604Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@keepcoolpro.com'
ON CONFLICT ("id") DO NOTHING;

-- info@entrepriseslavalliere.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-2aeedd473da3eab1c6a2ce2afe12ac55', 'info@entrepriseslavalliere.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:52.306Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@entrepriseslavalliere.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-2aeedd473da3eab1c6a2ce2afe12ac55', t."id", 'info@entrepriseslavalliere.com', t."name", 'Quick question — Les Entreprises Lavallière', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:52.306Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@entrepriseslavalliere.com'
ON CONFLICT ("id") DO NOTHING;

-- info@electroaide.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-61e950e155732998e340893985424f9a', 'info@electroaide.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:41:57.001Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@electroaide.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-61e950e155732998e340893985424f9a', t."id", 'info@electroaide.ca', t."name", 'Quick question — Electro Aide Inc', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:41:57.001Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@electroaide.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@vortexair.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fcd51377a0b3d1c3f0156f13d800b7e4', 'info@vortexair.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:01.898Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@vortexair.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fcd51377a0b3d1c3f0156f13d800b7e4', t."id", 'info@vortexair.ca', t."name", 'Quick question — Ventilation Vortex Air', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:01.898Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@vortexair.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@rousso.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-4513b268d7586f9ad82abd0300c25cde', 'info@rousso.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:06.826Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@rousso.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-4513b268d7586f9ad82abd0300c25cde', t."id", 'info@rousso.ca', t."name", 'Quick question — Groupe Rousso', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:06.826Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@rousso.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@hpmtinc.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-65621c0e7ef3794d14e2e8a25f433ba5', 'info@hpmtinc.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:11.450Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@hpmtinc.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-65621c0e7ef3794d14e2e8a25f433ba5', t."id", 'info@hpmtinc.com', t."name", 'Quick question — HPMT Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:11.450Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@hpmtinc.com'
ON CONFLICT ("id") DO NOTHING;

-- info@aerosealglobal.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-616526af90fb9fcb197cdf6cfcc8e90e', 'info@aerosealglobal.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:15.631Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@aerosealglobal.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-616526af90fb9fcb197cdf6cfcc8e90e', t."id", 'info@aerosealglobal.ca', t."name", 'Quick question — Aeroseal Global', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:15.631Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@aerosealglobal.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@airmagique.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-027a95570e7ef6c7ea74d1452cefe572', 'info@airmagique.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:20.654Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@airmagique.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-027a95570e7ef6c7ea74d1452cefe572', t."id", 'info@airmagique.com', t."name", 'Quick question — Air Magique', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:20.654Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@airmagique.com'
ON CONFLICT ("id") DO NOTHING;

-- info@climatech.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-2114aa7ae29e26251c2d2a51ccabcfa9', 'info@climatech.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:25.229Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@climatech.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-2114aa7ae29e26251c2d2a51ccabcfa9', t."id", 'info@climatech.ca', t."name", 'Quick question — Climatech', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:25.229Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@climatech.ca'
ON CONFLICT ("id") DO NOTHING;

-- support@jwph.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-629589cab37f5f190102a5735ce1c280', 'support@jwph.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:30.329Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'support@jwph.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-629589cab37f5f190102a5735ce1c280', t."id", 'support@jwph.com', t."name", 'Quick question — J W Plumbing & Heating', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:30.329Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'support@jwph.com'
ON CONFLICT ("id") DO NOTHING;

-- info@conduitexpert.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-40d32d15dc51881d3ad2760fd219f0ae', 'info@conduitexpert.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:35.079Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@conduitexpert.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-40d32d15dc51881d3ad2760fd219f0ae', t."id", 'info@conduitexpert.ca', t."name", 'Quick question — Conduit Expert', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:35.079Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@conduitexpert.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@climatisationsolutionair.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-91dc195407cdfde572acdc69a6279831', 'info@climatisationsolutionair.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:39.786Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@climatisationsolutionair.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-91dc195407cdfde572acdc69a6279831', t."id", 'info@climatisationsolutionair.com', t."name", 'Quick question — Climatisation Solutionair', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:39.786Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@climatisationsolutionair.com'
ON CONFLICT ("id") DO NOTHING;

-- info@air-max.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-da90d8547ebd89cad6ac88ea24a6a69f', 'info@air-max.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:44.355Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@air-max.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-da90d8547ebd89cad6ac88ea24a6a69f', t."id", 'info@air-max.ca', t."name", 'Quick question — Airmax Climatisation', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:44.355Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@air-max.ca'
ON CONFLICT ("id") DO NOTHING;

-- contact@nordetclimatisation.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e8558c71b8dd06fb41dd7a120e48918c', 'contact@nordetclimatisation.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:49.350Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@nordetclimatisation.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e8558c71b8dd06fb41dd7a120e48918c', t."id", 'contact@nordetclimatisation.com', t."name", 'Quick question — Nordet Climatisation', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:49.350Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@nordetclimatisation.com'
ON CONFLICT ("id") DO NOTHING;

-- contact@ecoproheating.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-4439d262ee6b5423659fb055dbfb0052', 'contact@ecoproheating.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:54.579Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@ecoproheating.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-4439d262ee6b5423659fb055dbfb0052', t."id", 'contact@ecoproheating.ca', t."name", 'Quick question — Eco Pro Heating & Cooling', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:54.579Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@ecoproheating.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@aquatechmechanical.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-1959ff569542ef26577970cf9bd079b5', 'info@aquatechmechanical.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:42:59.039Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@aquatechmechanical.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-1959ff569542ef26577970cf9bd079b5', t."id", 'info@aquatechmechanical.ca', t."name", 'Quick question — Aquatech Vancouver Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:42:59.039Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@aquatechmechanical.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@totallinehvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3abf4832e11d53bded9d73e88e1bb184', 'info@totallinehvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:03.828Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@totallinehvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3abf4832e11d53bded9d73e88e1bb184', t."id", 'info@totallinehvac.ca', t."name", 'Quick question — Total Line Heating and Air Conditioning Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:03.828Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@totallinehvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@azhvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-69007b1a4c65c56f0d857d37221fbfed', 'info@azhvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:08.511Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@azhvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-69007b1a4c65c56f0d857d37221fbfed', t."id", 'info@azhvac.ca', t."name", 'Quick question — AZ Air Conditioning and Heating.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:08.511Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@azhvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@pacificbluemechanical.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-31b06c3b786fee0f1bb4ed639befa4b2', 'info@pacificbluemechanical.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:13.673Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@pacificbluemechanical.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-31b06c3b786fee0f1bb4ed639befa4b2', t."id", 'info@pacificbluemechanical.ca', t."name", 'Quick question — Pacific Blue Mechanical & Plumbing', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:13.673Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@pacificbluemechanical.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@eatonshomecare.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ff14f83750c1b8b647385c5d59519f83', 'info@eatonshomecare.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:18.203Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@eatonshomecare.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ff14f83750c1b8b647385c5d59519f83', t."id", 'info@eatonshomecare.com', t."name", 'Quick question — Eaton’s Furnace Heating & Air Conditioning HVAC', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:18.203Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@eatonshomecare.com'
ON CONFLICT ("id") DO NOTHING;

-- info@airmountmechanical.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-dfcbf3f4cf4f99b8fa5f5ff67bc23f77', 'info@airmountmechanical.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:22.751Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@airmountmechanical.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-dfcbf3f4cf4f99b8fa5f5ff67bc23f77', t."id", 'info@airmountmechanical.com', t."name", 'Quick question — Airmount Mechanical', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:22.751Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@airmountmechanical.com'
ON CONFLICT ("id") DO NOTHING;

-- info@titaniumhvac.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-31693374efe60a84f1ff7c2047220167', 'info@titaniumhvac.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:27.245Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@titaniumhvac.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-31693374efe60a84f1ff7c2047220167', t."id", 'info@titaniumhvac.com', t."name", 'Quick question — Titanium HVAC', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:27.245Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@titaniumhvac.com'
ON CONFLICT ("id") DO NOTHING;

-- info@harbourenergy.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-53e1388effc4516958e0ba46f9cd033b', 'info@harbourenergy.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:31.810Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@harbourenergy.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-53e1388effc4516958e0ba46f9cd033b', t."id", 'info@harbourenergy.ca', t."name", 'Quick question — Harbour Energy Systems', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:31.810Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@harbourenergy.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@millersheating.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ff7dc1d6576f54a82916f77f713fe10c', 'info@millersheating.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:36.472Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@millersheating.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ff7dc1d6576f54a82916f77f713fe10c', t."id", 'info@millersheating.com', t."name", 'Quick question — Miller''s Heating & Air', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:36.472Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@millersheating.com'
ON CONFLICT ("id") DO NOTHING;

-- info@maestroplumbing.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-5b4b1e23b198cb29d4263d0e4ed4595a', 'info@maestroplumbing.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:41.156Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@maestroplumbing.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-5b4b1e23b198cb29d4263d0e4ed4595a', t."id", 'info@maestroplumbing.ca', t."name", 'Quick question — Maestro Plumbing Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:41.156Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@maestroplumbing.ca'
ON CONFLICT ("id") DO NOTHING;

-- contact@redsealplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-08e12edeb9abf1126789daa5b826dacb', 'contact@redsealplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:45.038Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'contact@redsealplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-08e12edeb9abf1126789daa5b826dacb', t."id", 'contact@redsealplumbing.com', t."name", 'Quick question — Red Seal Plumbing', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:45.038Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'contact@redsealplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- info@atmoserra.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e13ebfe065715b9db5d07fc3496e8053', 'info@atmoserra.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:49.744Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@atmoserra.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e13ebfe065715b9db5d07fc3496e8053', t."id", 'info@atmoserra.ca', t."name", 'Quick question — ATMOSERRA Heating & Cooling', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:49.744Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@atmoserra.ca'
ON CONFLICT ("id") DO NOTHING;

-- office@hvaclimate.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ede245a49febed624bb0f4c44f6e44e5', 'office@hvaclimate.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:54.570Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@hvaclimate.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ede245a49febed624bb0f4c44f6e44e5', t."id", 'office@hvaclimate.com', t."name", 'Quick question — HVA Climate Control LLC', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:54.570Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@hvaclimate.com'
ON CONFLICT ("id") DO NOTHING;

-- matt@precisionmech.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c44284c9d849d82792b91094323a49ef', 'matt@precisionmech.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:43:58.552Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'matt@precisionmech.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c44284c9d849d82792b91094323a49ef', t."id", 'matt@precisionmech.ca', t."name", 'Quick question — Precision Gas & Mechanical Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:43:58.552Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'matt@precisionmech.ca'
ON CONFLICT ("id") DO NOTHING;

-- saleseast@sundawn.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c8c430e2d689af963bc4d039c65bade0', 'saleseast@sundawn.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:44:03.864Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'saleseast@sundawn.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c8c430e2d689af963bc4d039c65bade0', t."id", 'saleseast@sundawn.com', t."name", 'Quick question — Sundawn Integrated Services Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:44:03.864Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'saleseast@sundawn.com'
ON CONFLICT ("id") DO NOTHING;

-- info@experthvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-dd50f7c1238b9bf0b4a62e0151d684fd', 'info@experthvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:44:08.472Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@experthvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-dd50f7c1238b9bf0b4a62e0151d684fd', t."id", 'info@experthvac.ca', t."name", 'Quick question — Expert Hvac Solutions Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:44:08.472Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@experthvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- leads@harmonyheating.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-678b9037a52a7eb74eea45e6785d3258', 'leads@harmonyheating.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-12T19:44:13.066Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'leads@harmonyheating.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-678b9037a52a7eb74eea45e6785d3258', t."id", 'leads@harmonyheating.ca', t."name", 'Quick question — Harmony Heating & Air Conditioning Inc', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-12T19:44:13.066Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'leads@harmonyheating.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@gvmech.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-4276f545d29e0653453c6c098b74f3bb', 'info@gvmech.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:28:45.216Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@gvmech.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-4276f545d29e0653453c6c098b74f3bb', t."id", 'info@gvmech.ca', t."name", 'Quick question — Grand Valley Mechanical', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:28:45.216Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@gvmech.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@whcservicesgroup.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9595358b45869d17831c1c07196b70f0', 'info@whcservicesgroup.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:28:49.986Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@whcservicesgroup.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9595358b45869d17831c1c07196b70f0', t."id", 'info@whcservicesgroup.com', t."name", 'Quick question — WHC Services Group', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:28:49.986Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@whcservicesgroup.com'
ON CONFLICT ("id") DO NOTHING;

-- info@cahill.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e8694b33efcfbb8ace37f04e6e528bca', 'info@cahill.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:28:55.443Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@cahill.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e8694b33efcfbb8ace37f04e6e528bca', t."id", 'info@cahill.ca', t."name", 'Quick question — Lynk Electric Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:28:55.443Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@cahill.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@acerefrigeration.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-6b8fcaad0dc37b0ab7f28d59bdc3d965', 'info@acerefrigeration.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:00.740Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@acerefrigeration.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-6b8fcaad0dc37b0ab7f28d59bdc3d965', t."id", 'info@acerefrigeration.ca', t."name", 'Quick question — Ace Refrigeration and Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:00.740Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@acerefrigeration.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@365mechanical.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-f5a7c56d7aafe6f00544dd87f0bd968a', 'info@365mechanical.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:07.027Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@365mechanical.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-f5a7c56d7aafe6f00544dd87f0bd968a', t."id", 'info@365mechanical.ca', t."name", 'Quick question — 365 Mechanical Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:07.027Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@365mechanical.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@triumphheatandair.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-beb9c96eabf6b2829f57674a31487cae', 'info@triumphheatandair.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:12.942Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@triumphheatandair.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-beb9c96eabf6b2829f57674a31487cae', t."id", 'info@triumphheatandair.com', t."name", 'Quick question — Triumph Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:12.942Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@triumphheatandair.com'
ON CONFLICT ("id") DO NOTHING;

-- reception@radianmechanical.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a3b81c9ffbd25f666c5df7031d883181', 'reception@radianmechanical.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:18.121Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'reception@radianmechanical.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a3b81c9ffbd25f666c5df7031d883181', t."id", 'reception@radianmechanical.com', t."name", 'Quick question — Radian Mechanical Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:18.121Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'reception@radianmechanical.com'
ON CONFLICT ("id") DO NOTHING;

-- info@phillipsplumbingandheating.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-cd4436a53d8b582f67ff4e34f99cd51c', 'info@phillipsplumbingandheating.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:22.901Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@phillipsplumbingandheating.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-cd4436a53d8b582f67ff4e34f99cd51c', t."id", 'info@phillipsplumbingandheating.ca', t."name", 'Quick question — Phillips Plumbing Heating and Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:22.901Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@phillipsplumbingandheating.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@zeecoservices.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-aa7a92d1bc409aa3b5ceb1c4464b3c5e', 'info@zeecoservices.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:27.027Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@zeecoservices.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-aa7a92d1bc409aa3b5ceb1c4464b3c5e', t."id", 'info@zeecoservices.com', t."name", 'Quick question — Zeeco Services Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:27.027Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@zeecoservices.com'
ON CONFLICT ("id") DO NOTHING;

-- info@zolteramech.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0efe81f362220b14d90c10f0e52dccf6', 'info@zolteramech.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:32.279Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@zolteramech.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0efe81f362220b14d90c10f0e52dccf6', t."id", 'info@zolteramech.ca', t."name", 'Quick question — Zoltera Mechanical Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:32.279Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@zolteramech.ca'
ON CONFLICT ("id") DO NOTHING;

-- office@brentjansenplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-97c4de2efa117a1522539b84818184e6', 'office@brentjansenplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:36.335Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@brentjansenplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-97c4de2efa117a1522539b84818184e6', t."id", 'office@brentjansenplumbing.com', t."name", 'Quick question — Brent Jansen Plumbing & Heating Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:36.335Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@brentjansenplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- chris@oasisenvironments.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-50aeba8a101ac21f326cad68a00d626f', 'chris@oasisenvironments.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:42.729Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'chris@oasisenvironments.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-50aeba8a101ac21f326cad68a00d626f', t."id", 'chris@oasisenvironments.ca', t."name", 'Quick question — Oasis Environments', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:42.729Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'chris@oasisenvironments.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@accutemp.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0d6c70cf779ac442a8aa55ecda1d3d95', 'info@accutemp.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:47.793Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@accutemp.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0d6c70cf779ac442a8aa55ecda1d3d95', t."id", 'info@accutemp.ca', t."name", 'Quick question — Accutemp Refrigeration Air Conditioning & Heating Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:47.793Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@accutemp.ca'
ON CONFLICT ("id") DO NOTHING;

-- chris@bree-linkplumbingandheating.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0cd985aaef1b969f2009233bb4271c81', 'chris@bree-linkplumbingandheating.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:53.000Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'chris@bree-linkplumbingandheating.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0cd985aaef1b969f2009233bb4271c81', t."id", 'chris@bree-linkplumbingandheating.ca', t."name", 'Quick question — Bree-link plumbing and Heating', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:53.000Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'chris@bree-linkplumbingandheating.ca'
ON CONFLICT ("id") DO NOTHING;

-- service@coralhomecomfort.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-8581d7d37bf01bd527237fcfeb6913d2', 'service@coralhomecomfort.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:29:58.505Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@coralhomecomfort.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-8581d7d37bf01bd527237fcfeb6913d2', t."id", 'service@coralhomecomfort.com', t."name", 'Quick question — Coral Home Comfort', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:29:58.505Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@coralhomecomfort.com'
ON CONFLICT ("id") DO NOTHING;

-- service@northernclimatesudbury.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-03f014a3f1c96e759121e8bdb887a36f', 'service@northernclimatesudbury.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:03.923Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'service@northernclimatesudbury.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-03f014a3f1c96e759121e8bdb887a36f', t."id", 'service@northernclimatesudbury.com', t."name", 'Quick question — Northern Climate', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:03.923Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'service@northernclimatesudbury.com'
ON CONFLICT ("id") DO NOTHING;

-- info@uptownac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a996fa3db1b0d546aaae82d69fb56de3', 'info@uptownac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:09.530Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@uptownac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a996fa3db1b0d546aaae82d69fb56de3', t."id", 'info@uptownac.ca', t."name", 'Quick question — Uptown Air Conditioning Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:09.530Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@uptownac.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@bridgemanplumbing.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-5b1e930d84ec6a770459e0ef9208e7ca', 'info@bridgemanplumbing.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:14.842Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@bridgemanplumbing.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-5b1e930d84ec6a770459e0ef9208e7ca', t."id", 'info@bridgemanplumbing.ca', t."name", 'Quick question — Bridgeman Plumbing & Heating Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:14.842Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@bridgemanplumbing.ca'
ON CONFLICT ("id") DO NOTHING;

-- pete@flowright.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-9c922cc10f6da929d82562b532eeab61', 'pete@flowright.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:19.860Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'pete@flowright.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-9c922cc10f6da929d82562b532eeab61', t."id", 'pete@flowright.ca', t."name", 'Quick question — Flow Right Mechanical', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:19.860Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'pete@flowright.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@psltd.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-90d708a3661cf696e13261096ea7076b', 'info@psltd.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:25.169Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@psltd.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-90d708a3661cf696e13261096ea7076b', t."id", 'info@psltd.ca', t."name", 'Quick question — PSL Patrick Sprack Limited', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:25.169Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@psltd.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@efficiencyheating.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a8c4a0b7571faa02b591110a514b1bd0', 'info@efficiencyheating.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:30.144Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@efficiencyheating.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a8c4a0b7571faa02b591110a514b1bd0', t."id", 'info@efficiencyheating.com', t."name", 'Quick question — Efficiency Heating & Cooling', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:30.144Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@efficiencyheating.com'
ON CONFLICT ("id") DO NOTHING;

-- info@familyplumbing.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-8d4febfd04c06dc2e9a86c118411e0ca', 'info@familyplumbing.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:34.058Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@familyplumbing.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-8d4febfd04c06dc2e9a86c118411e0ca', t."id", 'info@familyplumbing.ca', t."name", 'Quick question — Family Plumbing and Heating Inc', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:34.058Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@familyplumbing.ca'
ON CONFLICT ("id") DO NOTHING;

-- csr@onesourcehome.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-358a06adeb545fc053dbfe765f13cd30', 'csr@onesourcehome.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:39.147Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'csr@onesourcehome.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-358a06adeb545fc053dbfe765f13cd30', t."id", 'csr@onesourcehome.ca', t."name", 'Quick question — One Source Home Services', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:39.147Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'csr@onesourcehome.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@castlesudbury.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0047f3ca450b157be8fb8030dbe11342', 'info@castlesudbury.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:44.668Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@castlesudbury.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0047f3ca450b157be8fb8030dbe11342', t."id", 'info@castlesudbury.com', t."name", 'Quick question — Castle Plumbing and Heating Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:44.668Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@castlesudbury.com'
ON CONFLICT ("id") DO NOTHING;

-- info@odellhvac.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-3019c4e8bbbe8b5d3ec1a8cfc7aa98f4', 'info@odellhvac.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:51.639Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@odellhvac.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-3019c4e8bbbe8b5d3ec1a8cfc7aa98f4', t."id", 'info@odellhvac.com', t."name", 'Quick question — O''Dell HVAC Group', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:51.639Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@odellhvac.com'
ON CONFLICT ("id") DO NOTHING;

-- info@2jac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-7a9ede29fd2efd75e189bfd8c2cde45a', 'info@2jac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:30:57.866Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@2jac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-7a9ede29fd2efd75e189bfd8c2cde45a', t."id", 'info@2jac.ca', t."name", 'Quick question — JAC Mechanical / 2JAC Contracting', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:30:57.866Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@2jac.ca'
ON CONFLICT ("id") DO NOTHING;

-- dbushey@master.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-cc3d2a4bdafb21b333bd2ea036385a5e', 'dbushey@master.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:02.845Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'dbushey@master.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-cc3d2a4bdafb21b333bd2ea036385a5e', t."id", 'dbushey@master.ca', t."name", 'Quick question — The Master Group Sudbury', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:02.845Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'dbushey@master.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@mountainpeakhvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0c7fe8e617bf31934201a4fb74cd9287', 'info@mountainpeakhvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:07.870Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@mountainpeakhvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0c7fe8e617bf31934201a4fb74cd9287', t."id", 'info@mountainpeakhvac.ca', t."name", 'Quick question — Mountain Peak Heating and Cooling Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:07.870Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@mountainpeakhvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- office@actionplumbing.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-acd2e56e6b4a6b812c69097d0cc036f5', 'office@actionplumbing.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:13.005Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'office@actionplumbing.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-acd2e56e6b4a6b812c69097d0cc036f5', t."id", 'office@actionplumbing.ca', t."name", 'Quick question — Action Plumbing and Heating Ltd', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:13.005Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'office@actionplumbing.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@excelsiormechanical.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-63224576599aa72172e4ad867dd1a052', 'info@excelsiormechanical.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:18.191Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@excelsiormechanical.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-63224576599aa72172e4ad867dd1a052', t."id", 'info@excelsiormechanical.com', t."name", 'Quick question — Excelsior Mechanical', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:18.191Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@excelsiormechanical.com'
ON CONFLICT ("id") DO NOTHING;

-- mike@fivestarheating.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e6774a5d960b9be43cbbfdc6b43a9d33', 'mike@fivestarheating.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:23.658Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'mike@fivestarheating.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e6774a5d960b9be43cbbfdc6b43a9d33', t."id", 'mike@fivestarheating.ca', t."name", 'Quick question — Five Star Plumbing Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:23.658Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'mike@fivestarheating.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@jobheating.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-34012c475c0be5dae4c1e72176ba9991', 'info@jobheating.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:28.616Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@jobheating.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-34012c475c0be5dae4c1e72176ba9991', t."id", 'info@jobheating.com', t."name", 'Quick question — JOB Heating and Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:28.616Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@jobheating.com'
ON CONFLICT ("id") DO NOTHING;

-- regina@welldone.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-fd2fdb5db8ca3b4271a0d9b50013d0d9', 'regina@welldone.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:34.332Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'regina@welldone.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-fd2fdb5db8ca3b4271a0d9b50013d0d9', t."id", 'regina@welldone.com', t."name", 'Quick question — Welldone Mechanical Services', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:34.332Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'regina@welldone.com'
ON CONFLICT ("id") DO NOTHING;

-- dispatch@inlandcomfort.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-cc14305464debb3838b9dd0a0ac7e04c', 'dispatch@inlandcomfort.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:39.433Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'dispatch@inlandcomfort.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-cc14305464debb3838b9dd0a0ac7e04c', t."id", 'dispatch@inlandcomfort.com', t."name", 'Quick question — Inland Comfort Air Conditioning Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:39.433Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'dispatch@inlandcomfort.com'
ON CONFLICT ("id") DO NOTHING;

-- info@dun-ritevac.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-66fbd1ee8647cbc5f762c6be26079515', 'info@dun-ritevac.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:44.293Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@dun-ritevac.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-66fbd1ee8647cbc5f762c6be26079515', t."id", 'info@dun-ritevac.com', t."name", 'Quick question — Dun-Rite Vac Regina', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:44.293Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@dun-ritevac.com'
ON CONFLICT ("id") DO NOTHING;

-- customairservice@customair.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-47d0db6cbb0adef663bfa0480a1a3aac', 'customairservice@customair.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:49.196Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'customairservice@customair.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-47d0db6cbb0adef663bfa0480a1a3aac', t."id", 'customairservice@customair.ca', t."name", 'Quick question — CustomAir', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:49.196Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'customairservice@customair.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@witherellplumbing.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ff38e1fafd30895879bc24dd3f7e9bd4', 'info@witherellplumbing.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:31:56.350Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@witherellplumbing.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ff38e1fafd30895879bc24dd3f7e9bd4', t."id", 'info@witherellplumbing.com', t."name", 'Quick question — Witherell Plumbing & Heating', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:31:56.350Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@witherellplumbing.com'
ON CONFLICT ("id") DO NOTHING;

-- info@bisschops.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-ab9f4f1d6ac0ef9139bab18f96a2c000', 'info@bisschops.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:01.280Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@bisschops.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-ab9f4f1d6ac0ef9139bab18f96a2c000', t."id", 'info@bisschops.ca', t."name", 'Quick question — Bisschops Industries', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:01.280Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@bisschops.ca'
ON CONFLICT ("id") DO NOTHING;

-- agenda@johntheplumber.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-dcf334be1978428326b090dc82b4cb68', 'agenda@johntheplumber.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:06.793Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'agenda@johntheplumber.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-dcf334be1978428326b090dc82b4cb68', t."id", 'agenda@johntheplumber.ca', t."name", 'Quick question — John The Plumber', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:06.793Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'agenda@johntheplumber.ca'
ON CONFLICT ("id") DO NOTHING;

-- reception@pro-west.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-a1e9fc25a4d8d43a5f5edc0f14fe6af6', 'reception@pro-west.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:11.607Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'reception@pro-west.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-a1e9fc25a4d8d43a5f5edc0f14fe6af6', t."id", 'reception@pro-west.ca', t."name", 'Quick question — Pro-West Refrigeration Ltd.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:11.607Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'reception@pro-west.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@nexgenmechanical.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-e99dd9eee69f1f103a31031975635697', 'info@nexgenmechanical.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:16.747Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@nexgenmechanical.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-e99dd9eee69f1f103a31031975635697', t."id", 'info@nexgenmechanical.ca', t."name", 'Quick question — NexGen Mechanical Inc', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:16.747Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@nexgenmechanical.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@aobutec.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-92d2593f85449d50e8e7e35cc46c8164', 'info@aobutec.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:21.831Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@aobutec.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-92d2593f85449d50e8e7e35cc46c8164', t."id", 'info@aobutec.ca', t."name", 'Quick question — AOBUTEC HVAC Heating & Cooling', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:21.831Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@aobutec.ca'
ON CONFLICT ("id") DO NOTHING;

-- garett.dillman@beav-airmechanical.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-741f7a002eb2388876398129668a0d6b', 'garett.dillman@beav-airmechanical.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:27.081Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'garett.dillman@beav-airmechanical.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-741f7a002eb2388876398129668a0d6b', t."id", 'garett.dillman@beav-airmechanical.com', t."name", 'Quick question — Beav-Air Mechanical Inc.', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:27.081Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'garett.dillman@beav-airmechanical.com'
ON CONFLICT ("id") DO NOTHING;

-- info@okgnr.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-6ba2b2aad0f82653c4c946a08f60a5c0', 'info@okgnr.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:33.520Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@okgnr.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-6ba2b2aad0f82653c4c946a08f60a5c0', t."id", 'info@okgnr.ca', t."name", 'Quick question — OKGN Refrigeration', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:33.520Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@okgnr.ca'
ON CONFLICT ("id") DO NOTHING;

-- sales@korehvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-878cb304b82644c2d4ddd7f0584a44b2', 'sales@korehvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:39.054Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'sales@korehvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-878cb304b82644c2d4ddd7f0584a44b2', t."id", 'sales@korehvac.ca', t."name", 'Quick question — Kore HVAC Services', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:39.054Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'sales@korehvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- email@smilehvac.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-30b069b7cc93ae56e2ca56f6a025481c', 'email@smilehvac.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:43.340Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'email@smilehvac.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-30b069b7cc93ae56e2ca56f6a025481c', t."id", 'email@smilehvac.ca', t."name", 'Quick question — Smile HVAC', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:43.340Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'email@smilehvac.ca'
ON CONFLICT ("id") DO NOTHING;

-- wayne@neighboursmechanical.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-c67a1273f7d813577ceea700582c174f', 'wayne@neighboursmechanical.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:48.481Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'wayne@neighboursmechanical.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-c67a1273f7d813577ceea700582c174f', t."id", 'wayne@neighboursmechanical.com', t."name", 'Quick question — Neighbours Mechanical', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:48.481Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'wayne@neighboursmechanical.com'
ON CONFLICT ("id") DO NOTHING;

-- info@haagsmaheatandair.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-621b28e93a12610ad8e73334488b0e67', 'info@haagsmaheatandair.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:53.441Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@haagsmaheatandair.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-621b28e93a12610ad8e73334488b0e67', t."id", 'info@haagsmaheatandair.com', t."name", 'Quick question — Haagsma Heating & Air Conditioning', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:53.441Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@haagsmaheatandair.com'
ON CONFLICT ("id") DO NOTHING;

-- info@elitemechanicalservices.ca
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-0e53eb87615f31a4c5a20632007af2d4', 'info@elitemechanicalservices.ca', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:32:58.558Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@elitemechanicalservices.ca' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-0e53eb87615f31a4c5a20632007af2d4', t."id", 'info@elitemechanicalservices.ca', t."name", 'Quick question — Elite Mechanical Services', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:32:58.558Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@elitemechanicalservices.ca'
ON CONFLICT ("id") DO NOTHING;

-- info@denoco.com
INSERT INTO "EmailSuppression" ("id", "email", "tenantId", "reason", "source", "metadataJson", "createdAt")
SELECT 'supp_legacy-outreach-761ce5c4d54d6f42cc16e87cc054a4e7', 'info@denoco.com', NULL, 'manual', 'legacy_sent_history', '{"sentAt":"2026-09-14T13:33:03.807Z"}', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" WHERE "email" = 'info@denoco.com' AND "tenantId" IS NULL
);

INSERT INTO "EmailCommunication" ("id", "tenantId", "recipientEmail", "recipientName", "subject", "htmlBody", "textBody", "category", "status", "sentAt", "sentByUserId", "createdAt", "updatedAt")
SELECT 'legacy-outreach-761ce5c4d54d6f42cc16e87cc054a4e7', t."id", 'info@denoco.com', t."name", 'Quick question — Denoco Energy Systems', '', 'Imported sent history. The original message body was not recorded.', 'outreach', 'sent', '2026-09-14T13:33:03.807Z'::timestamp, 'legacy-history-import', NOW(), NOW()
FROM "Tenant" t
WHERE lower(trim(t."email")) = 'info@denoco.com'
ON CONFLICT ("id") DO NOTHING;

COMMIT;
