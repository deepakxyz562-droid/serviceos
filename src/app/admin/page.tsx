import type { Metadata } from 'next';
import { AdminWebApp } from '@/components/admin-app/admin-web-app';

export const metadata: Metadata = {
  title: 'Fieseros Admin | Marketplace Operations & Governance',
  description:
    'Superadmin platform for contractor verification, booking ledgers, escrow payouts, and marketplace mediation.',
};

export default function AdminPortalPage() {
  return <AdminWebApp />;
}
