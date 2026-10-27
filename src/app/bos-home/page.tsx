import type { Metadata } from 'next';
import BosEntry from '@/components/bos/landing/bos-entry';
export const metadata: Metadata = {
 title: 'BOS — Run Your Entire Business in One Place',
 description: 'Bring billing, inventory, customers, appointments and your online store together. Explore BOS for shops, salons, clinics and service businesses.',
 alternates: { canonical: 'https://bos.fieseros.com/' },
 openGraph: { title: 'BOS — Your business. All together.', description: 'One workspace for your everyday business.', url: 'https://bos.fieseros.com/', images: [{ url: 'https://bos.fieseros.com/bos/landing/owner.webp', width: 1536, height: 1024 }] },
};
export default BosEntry;
