import { SessionProvider } from '@/components/SessionProvider';
import { Workspace } from '@/components/Workspace';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Workspace>{children}</Workspace></SessionProvider>;
}
