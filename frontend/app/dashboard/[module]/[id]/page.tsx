import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/ModulePage';
import { moduleFor } from '@/lib/modules';

export default async function RecordPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  const definition = moduleFor(module);
  if (!definition?.path || module === 'access-logs' || !/^\d+$/.test(id)) notFound();
  return <ModulePage moduleKey={module} recordId={id} />;
}
