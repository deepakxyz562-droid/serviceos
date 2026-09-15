import { redirect } from 'next/navigation';

export default async function InvoicePageAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pay/${id}`);
}
