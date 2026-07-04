import { Outlet } from 'react-router-dom';
import { MobileShell } from './MobileShell';

export function AppLayout() {
  return (
    <MobileShell>
      <Outlet />
    </MobileShell>
  );
}
