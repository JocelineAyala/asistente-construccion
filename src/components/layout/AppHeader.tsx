import { HardHat, UserRound } from 'lucide-react';
import { APP_NAME } from '../../constants/app';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-icon" aria-hidden="true">
          <HardHat size={20} />
        </span>
        <span>{APP_NAME}</span>
      </div>
      <span className="user-avatar" aria-label="Usuario">
        <UserRound size={20} />
      </span>
    </header>
  );
}
