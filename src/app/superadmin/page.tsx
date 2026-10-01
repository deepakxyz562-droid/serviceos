import { redirect } from 'next/navigation';

/**
 * Direct route handler for /superadmin.
 * Redirects to the homepage client shell with view=superadmin query parameter.
 */
export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set('view', 'superadmin');
  for (const [k, v] of Object.entries(sp)) {
    if (k !== 'view' && typeof v === 'string') {
      params.set(k, v);
    }
  }
  redirect(`/?${params.toString()}`);
}
