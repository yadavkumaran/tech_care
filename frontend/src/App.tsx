import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tickets } from './pages/Tickets';
import { Customers } from './pages/Customers';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Staff } from './pages/Staff';
import { Billing } from './pages/Billing';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Role-Guarded Route Component
const RoleRoute: React.FC<{ children: React.ReactElement; requiredRole: string }> = ({
  children,
  requiredRole,
}) => {
  const { hasRole, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="customers" element={<Customers />} />
            <Route path="inventory" element={<Inventory />} />
            <Route
              path="purchases"
              element={
                <RoleRoute requiredRole="ADMIN">
                  <Purchases />
                </RoleRoute>
              }
            />
            <Route
              path="staff"
              element={
                <RoleRoute requiredRole="ADMIN">
                  <Staff />
                </RoleRoute>
              }
            />
            <Route path="billing" element={<Billing />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

