import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export interface LayoutContextType {
  openMobileSidebar: () => void;
}

export const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className="main-content">
        <Outlet context={{ openMobileSidebar: () => setMobileOpen(true) }} />
      </main>
    </div>
  );
};
