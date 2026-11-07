import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  Truck,
  ReceiptText,
  LogOut,
  Cpu,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout, hasRole } = useAuth();

  const roleName = user?.roles[0]?.replace('ROLE_', '') || 'STAFF';

  // Get user initials for avatar
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'TC';

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
      />
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-wrapper">
            <div className="brand-icon-box">
              <Cpu size={18} strokeWidth={2.4} />
            </div>
            <div className="brand-title">
              <span>TechCare</span>
              <span className="brand-badge">SaaS</span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onCloseMobile}
              style={{ display: mobileOpen ? 'flex' : 'none' }}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-nav-container">
          {/* Group 1: General */}
          <div>
            <div className="nav-group-label">Overview</div>
            <div className="nav-group-items">
              <NavLink
                to="/dashboard"
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard size={17} strokeWidth={2} />
                <span>Dashboard</span>
              </NavLink>
            </div>
          </div>

          {/* Group 2: Service Desk */}
          <div>
            <div className="nav-group-label">Service Operations</div>
            <div className="nav-group-items">
              <NavLink
                to="/tickets"
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Wrench size={17} strokeWidth={2} />
                <span>Repair Tickets</span>
              </NavLink>

              <NavLink
                to="/customers"
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Users size={17} strokeWidth={2} />
                <span>Customers & CRM</span>
              </NavLink>
            </div>
          </div>

          {/* Group 3: Inventory */}
          <div>
            <div className="nav-group-label">Inventory & Supply</div>
            <div className="nav-group-items">
              <NavLink
                to="/inventory"
                onClick={onCloseMobile}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Package size={17} strokeWidth={2} />
                <span>Spare Parts & Stock</span>
              </NavLink>

              {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
                <NavLink
                  to="/purchases"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Truck size={17} strokeWidth={2} />
                  <span>Vendors & Purchases</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* Group 4: Finance & Administration */}
          {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
            <div>
              <div className="nav-group-label">Finance & Team</div>
              <div className="nav-group-items">
                <NavLink
                  to="/billing"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <ReceiptText size={17} strokeWidth={2} />
                  <span>Invoices & Billing</span>
                </NavLink>

                {hasRole('ADMIN') && (
                  <NavLink
                    to="/staff"
                    onClick={onCloseMobile}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <UserCheck size={17} strokeWidth={2} />
                    <span>Staff & Technicians</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-profile-info">
              <div className="user-avatar">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{user?.fullName || 'User'}</div>
                <div className="user-role-badge">{roleName}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out of TechCare"
              className="btn btn-ghost btn-icon"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
