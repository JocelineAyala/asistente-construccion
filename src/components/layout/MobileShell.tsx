import { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AppHeader } from './AppHeader';

type MobileShellProps = {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
};

export function MobileShell({ children, className, showHeader = true }: MobileShellProps) {
  return (
    <div className="mobile-stage">
      <div className={cn('mobile-shell', className)}>
        {showHeader && <AppHeader />}
        <main className="mobile-content">{children}</main>
      </div>
    </div>
  );
}
