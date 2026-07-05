import { Outlet } from 'react-router-dom';
import { PageShell } from './PageShell';

export function AppLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}
