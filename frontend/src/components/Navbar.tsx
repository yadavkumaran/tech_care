import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export const Navbar: React.FC<{ title: string }> = ({ title }) => {
  const { user } = useAuth();
  const roleName = user?.roles[0]?.replace('ROLE_', '') || 'STAFF';

  return (
    <header className="navbar">
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
        {title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#2563eb" />
          <span className="badge badge-info">{roleName}</span>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.fullName}</div>
      </div>
    </header>
  );
};

