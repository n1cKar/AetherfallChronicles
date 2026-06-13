import type { PropsWithChildren } from 'react';
import { DEVELOPER_CREDIT } from '../config/constants';

interface PageShellProps extends PropsWithChildren {
  className: string;
  particles?: boolean;
}

export function PageShell({ className, particles = false, children }: PageShellProps) {
  return (
    <div className={`${className} page-shell`}>
      <div className="splash-bg" />
      {particles && <div className="splash-particles" />}
      {children}
      <footer className="credits-footer">
        <strong>{DEVELOPER_CREDIT}</strong>
      </footer>
    </div>
  );
}
