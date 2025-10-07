import { stackServerApp } from '@/stack/server';
import { InsightsClient } from '@/components/insights/insights-client';
import { Toaster } from 'sonner';

export default async function InsightsPage() {
  // Verificar autenticación
  await stackServerApp.getUser({ or: 'redirect' });

  return (
    <>
      <InsightsClient />
      <Toaster />
    </>
  );
}
