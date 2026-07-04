import { NavLink } from 'react-router-dom';
import { BriefcaseBusiness, Home, UsersRound } from 'lucide-react';
import { APP_NAME } from '../../constants/app';
import { NAV_ITEMS } from '../../constants/navigation';

const iconMap = {
  home: Home,
  professional: BriefcaseBusiness,
  selector: UsersRound,
};

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/src/assets/logo.svg" alt="" className="brand-mark small" />
        <span>{APP_NAME}</span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <NavLink key={item.path} to={item.path} className="sidebar-link">
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
