import { redirect } from 'next/navigation';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set('auth', 'register');
  for (const [k, v] of Object.entries(sp)) {
    if (k !== 'auth' && typeof v === 'string') {
      params.set(k, v);
    }
  }
  redirect(`/?${params.toString()}`);
}
