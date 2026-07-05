import { NavLink } from 'react-router-dom';
import { Clock3, Home, Plus, UsersRound } from 'lucide-react';
import mayanPattern from '../../assets/sidebar/mayan-pattern.svg';
import sidebarBottom from '../../assets/sidebar/sidebar-bottom.svg';
import logo from '../../assets/logo.svg';
import { APP_NAME } from '../../constants/app';

const sidebarItems = [
  { icon: Home, label: 'Inicio', path: '/home/usuario' },
  { icon: Plus, label: 'Nueva consulta', path: '/usuario/nueva-consulta' },
  { icon: Clock3, label: 'Historial', path: '/usuario/historial' },
  { icon: UsersRound, label: 'Perfil', path: '/seleccion-perfil' },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = true }: SidebarProps) {
  return (
    <aside className={`sv-sidebar${isOpen ? '' : ' sv-sidebar-closed'}`}>
      <img className="sv-sidebar-bottom" src={sidebarBottom} alt="" aria-hidden="true" />
      <img className="sv-sidebar-pattern" src={mayanPattern} alt="" aria-hidden="true" />

      <div className="sv-sidebar-brand">
        <img src={logo} alt="" className="sv-sidebar-logo" />
        <span>{APP_NAME}</span>
      </div>

      <nav className="sv-sidebar-nav" aria-label="Navegación principal">
        {sidebarItems.map(({ icon: Icon, label, path }) => (
          <NavLink key={path} to={path} className="sv-sidebar-link">
            <Icon size={24} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <p className="sv-sidebar-note">Prototipo visual para asistencia en construcción y edificación.</p>
    </aside>
  );
}
