import { redirect } from 'next/navigation';

export default async function PayRootPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; inv?: string; number?: string; invoiceId?: string }>;
}) {
  const params = await searchParams;
  const invoiceId = params.id || params.inv || params.number || params.invoiceId;

  if (invoiceId) {
    redirect(`/pay/${invoiceId}`);
  }

  redirect('/?view=invoices');
}
