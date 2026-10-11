import type { Metadata } from 'next';
import { CustomerWebApp } from '@/components/customer-app/customer-web-app';

export const metadata: Metadata = {
  title: 'Fieseros App | Customer Service Booking, Quotes & Home Memory',
  description:
    'Find trusted professionals, compare up to 3 competitive upfront quotes, track arrivals live, and manage home appliances with Fieseros AI Assistant.',
};

export default function CustomerPortalPage() {
  return <CustomerWebApp />;
}
