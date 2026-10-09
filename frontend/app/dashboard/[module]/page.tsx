import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/ModulePage';
import { modules, moduleFor } from '@/lib/modules';

export function generateStaticParams() {
  return modules.map((item) => ({ module: item.key }));
}

export default async function DomainPage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!moduleFor(module)) notFound();
  return <ModulePage key={module} moduleKey={module} />;
}
