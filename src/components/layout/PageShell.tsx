import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DecorativeBackground } from './DecorativeBackground';
import { Sidebar } from './Sidebar';

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const userLabel = location.pathname.includes('profesional')
    ? 'Usuario profesional'
    : 'Usuario normal';

  return (
    <div className={`sv-shell${sidebarOpen ? '' : ' sv-shell-sidebar-collapsed'}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen ? (
        <button
          type="button"
          className="sv-sidebar-backdrop"
          aria-label="Ocultar menú lateral"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="sv-main">
        <DecorativeBackground />
        <div className="sv-topbar">
          <button
            type="button"
            className="sv-sidebar-toggle"
            aria-label={sidebarOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            <span>{sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}</span>
          </button>
          <div className="sv-topbar-user">
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="sv-user-avatar-img" />
                ) : null}
                <span className="sv-user-pill sv-user-pill-account">
                  {user.displayName || user.email}
                </span>
                <button type="button" className="sv-signout-btn" onClick={() => signOut()}>
                  Salir
                </button>
              </>
            ) : (
              <Link to="/login" className="sv-user-pill">
                Iniciar sesión
              </Link>
            )}
            <span className="sv-user-pill sv-user-pill-role">{userLabel}</span>
          </div>
        </div>
        <main className="sv-content">{children}</main>
      </div>
    </div>
  );
}
