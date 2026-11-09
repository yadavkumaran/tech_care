import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Menu } from 'lucide-react';
import { Badge } from './ui/Badge';

interface NavbarProps {
  title: string;
  subtitle?: string;
  onOpenMobile?: () => void;
  actions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  onOpenMobile,
  actions,
}) => {
  const { user } = useAuth();
  const rawRole = user?.roles[0]?.replace('ROLE_', '') || 'STAFF';

  // Format badge variant based on role
  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'TECHNICIAN':
        return 'info';
      case 'RECEPTIONIST':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onOpenMobile && (
          <button
            type="button"
            className="btn btn-ghost btn-icon mobile-menu-toggle"
            onClick={onOpenMobile}
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="navbar-title">{title}</div>
          {subtitle && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: -2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {actions}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Badge variant={getRoleVariant(rawRole)}>
            <ShieldCheck size={12} style={{ marginRight: 2 }} />
            {rawRole}
          </Badge>
          <div className="navbar-user-name" style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.fullName}
          </div>
        </div>
      </div>
    </header>
  );
};
