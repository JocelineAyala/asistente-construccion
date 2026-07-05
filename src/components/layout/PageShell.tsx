import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { DecorativeBackground } from './DecorativeBackground';
import { Sidebar } from './Sidebar';

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  const location = useLocation();
  const userLabel = location.pathname.includes('profesional')
    ? 'Usuario profesional'
    : 'Usuario normal';

  return (
    <div className="sv-shell">
      <Sidebar />
      <div className="sv-main">
        <DecorativeBackground />
        <div className="sv-topbar">
          <span className="sv-user-pill">{userLabel}</span>
        </div>
        <main className="sv-content">{children}</main>
      </div>
    </div>
  );
}
