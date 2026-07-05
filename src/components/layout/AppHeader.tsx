import { UserRound } from 'lucide-react';
import logo from '../../assets/logo.svg';
import { APP_NAME } from '../../constants/app';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-icon" aria-hidden="true">
          <img src={logo} alt="" />
        </span>
        <span>{APP_NAME}</span>
      </div>
      <span className="user-avatar" aria-label="Usuario">
        <UserRound size={20} />
      </span>
    </header>
  );
}
