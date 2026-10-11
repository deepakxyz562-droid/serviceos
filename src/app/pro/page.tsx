import type { Metadata } from 'next';
import { ProWebApp } from '@/components/pro-app/pro-web-app';

export const metadata: Metadata = {
  title: 'Fieseros Pro | Partner Portal for Service Contractors',
  description:
    'Find local jobs, submit instant 3-tier quotes, manage team dispatch, track earnings, and complete bookings with Fieseros Pro.',
};

export default function ProPortalPage() {
  return <ProWebApp />;
}
