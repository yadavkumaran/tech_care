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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Cpu className="text-blue-500" size={26} color="#38bdf8" />
        <span>TechCare</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/tickets"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Wrench size={18} />
          <span>Repair Tickets</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Customers</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Package size={18} />
          <span>Spare Parts & Stock</span>
        </NavLink>

        {hasRole('ADMIN') && (
          <NavLink
            to="/purchases"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Truck size={18} />
            <span>Vendors & Purchases</span>
          </NavLink>
        )}

        {hasRole('ADMIN') && (
          <NavLink
            to="/staff"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UserCheck size={18} />
            <span>Staff & Technicians</span>
          </NavLink>
        )}

        {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
          <NavLink
            to="/billing"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ReceiptText size={18} />
            <span>Invoices & Billing</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div>
          <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
            {user?.fullName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {user?.roles[0]?.replace('ROLE_', '')}
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 6,
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

