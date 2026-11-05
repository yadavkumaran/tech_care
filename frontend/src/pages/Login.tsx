import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, User as UserIcon } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ApiResponse, AuthResponse } from '../types';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        username,
        password,
      });

      if (response.data.success) {
        login(response.data.data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Invalid username or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u: string) => {
    setUsername(u);
    setPassword('password123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Cpu size={28} />
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#0f172a' }}>
            TechCare
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            Computer Service Center Management System
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              borderRadius: 8,
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>
            Quick Demo Fill (Assessment Evaluators):
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('receptionist')}
            >
              Reception
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('tech_arun')}
            >
              Technician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

