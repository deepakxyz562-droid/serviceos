import { directPrisma } from '../src/lib/direct-prisma';
async function main() {
  const creds = await directPrisma.credential.findMany({
    where: { OR: [{ type: 'whatsapp' }, { type: 'apiKey' }, { name: { contains: 'hatsapp' } }] },
    select: { id: true, name: true, type: true, encryptedData: true, updatedAt: true }
  });
  for (const c of creds) {
    const data = (() => { try { return JSON.parse(c.encryptedData || '{}'); } catch { return {}; } })();
    console.log(JSON.stringify({ id: c.id, name: c.name, type: c.type, hasAccessToken: !!data.accessToken, hasPhoneNumberId: !!data.phoneNumberId, phoneIdValue: data.phoneNumberId, updatedAt: c.updatedAt }, null, 2));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
