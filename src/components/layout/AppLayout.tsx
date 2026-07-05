import { Outlet, useLocation } from 'react-router-dom';
import { MobileShell } from './MobileShell';
import { PageShell } from './PageShell';

export function AppLayout() {
  const location = useLocation();

  if (location.pathname === '/usuario/nueva-consulta') {
    return (
      <MobileShell>
        <Outlet />
      </MobileShell>
    );
  }

  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}
