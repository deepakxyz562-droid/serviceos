import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type Client = Prisma.TransactionClient;

/**
 * Apply multiple tags to a single contact, skipping (contactId, tagId) pairs
 * that already exist. SQLite's Prisma client does not support `skipDuplicates`
 * on createMany, so we pre-filter.
 *
 * Pass a transaction client when called inside `db.$transaction`.
 */
export async function applyTagsToContact(
  contactId: string,
  tagIds: string[],
  appliedById: string | null,
  client: Client = db as unknown as Client
): Promise<number> {
  if (!tagIds.length) return 0;
  const uniqueIds = Array.from(new Set(tagIds));
  const existing = await client.contactTag.findMany({
    where: { contactId, tagId: { in: uniqueIds } },
    select: { tagId: true },
  });
  const existingSet = new Set(existing.map((e) => e.tagId));
  const toCreate = uniqueIds.filter((id) => !existingSet.has(id));
  if (!toCreate.length) return 0;
  const res = await client.contactTag.createMany({
    data: toCreate.map((tagId) => ({ contactId, tagId, appliedById })),
  });
  return res.count;
}

/**
 * Add a single contact to multiple groups, skipping existing pairs.
 */
export async function addContactToGroups(
  contactId: string,
  groupIds: string[],
  addedById: string | null,
  client: Client = db as unknown as Client
): Promise<number> {
  if (!groupIds.length) return 0;
  const uniqueIds = Array.from(new Set(groupIds));
  const existing = await client.contactGroup.findMany({
    where: { contactId, groupId: { in: uniqueIds } },
    select: { groupId: true },
  });
  const existingSet = new Set(existing.map((e) => e.groupId));
  const toCreate = uniqueIds.filter((id) => !existingSet.has(id));
  if (!toCreate.length) return 0;
  const res = await client.contactGroup.createMany({
    data: toCreate.map((groupId) => ({ contactId, groupId, addedById })),
  });
  return res.count;
}

/**
 * Apply a single tag to multiple contacts, skipping existing pairs.
 */
export async function applyTagToContacts(
  tagId: string,
  contactIds: string[],
  appliedById: string | null,
  client: Client = db as unknown as Client
): Promise<number> {
  if (!contactIds.length) return 0;
  const uniqueIds = Array.from(new Set(contactIds));
  const existing = await client.contactTag.findMany({
    where: { tagId, contactId: { in: uniqueIds } },
    select: { contactId: true },
  });
  const existingSet = new Set(existing.map((e) => e.contactId));
  const toCreate = uniqueIds.filter((id) => !existingSet.has(id));
  if (!toCreate.length) return 0;
  const res = await client.contactTag.createMany({
    data: toCreate.map((contactId) => ({ contactId, tagId, appliedById })),
  });
  return res.count;
}

/**
 * Add multiple contacts to a single group, skipping existing pairs.
 */
export async function addContactsToGroup(
  groupId: string,
  contactIds: string[],
  addedById: string | null,
  client: Client = db as unknown as Client
): Promise<number> {
  if (!contactIds.length) return 0;
  const uniqueIds = Array.from(new Set(contactIds));
  const existing = await client.contactGroup.findMany({
    where: { groupId, contactId: { in: uniqueIds } },
    select: { contactId: true },
  });
  const existingSet = new Set(existing.map((e) => e.contactId));
  const toCreate = uniqueIds.filter((id) => !existingSet.has(id));
  if (!toCreate.length) return 0;
  const res = await client.contactGroup.createMany({
    data: toCreate.map((contactId) => ({ contactId, groupId, addedById })),
  });
  return res.count;
}
