import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Settings, Wifi, CheckCircle2 } from 'lucide-react';
import api, { getApiBaseUrl, CLOUD_BACKEND_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ApiResponse, AuthResponse } from '../types';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => localStorage.getItem('techcare_server_url') || '');
  const [serverSuccess, setServerSuccess] = useState('');

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
      if (!err.response) {
        const currentTarget = getApiBaseUrl();
        setError(`Network error: Cannot connect to server at ${currentTarget}. Ensure the backend is running and configure the Server URL below.`);
      } else {
        setError(
          err.response?.data?.message || 'Invalid username or password. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem('techcare_server_url', trimmed);
      setServerUrlInput(trimmed);
      setServerSuccess(`Saved: Connecting to ${trimmed}`);
    } else {
      localStorage.removeItem('techcare_server_url');
      setServerUrlInput('');
      setServerSuccess('Reset: Using default server configuration');
    }
    setTimeout(() => setServerSuccess(''), 4000);
  };

  const setDemoAccount = (u: string) => {
    setUsername(u);
    setPassword('password123');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f6f8fb',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.05) 0%, transparent 70%)',
        padding: '20px 16px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 20,
          padding: '32px 24px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0071e3 0%, #0056ad 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: '0 8px 16px -4px rgba(0, 113, 227, 0.35)',
            }}
          >
            <Cpu size={26} strokeWidth={2.2} />
          </div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
            }}
          >
            TechCare
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            Enterprise Device Service Platform
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              color: 'var(--status-danger-text)',
              borderRadius: 10,
              fontSize: '0.84rem',
              fontWeight: 500,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username or Staff Email
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="username"
                type="text"
                className="form-control"
                style={{ paddingLeft: 36, height: 44 }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. admin or tech_arun"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: 36, paddingRight: 36, height: 44 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                autoComplete="current-password"
                enterKeyHint="go"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, height: 44, fontSize: '0.92rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons for Assessor */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-tertiary)',
              marginBottom: 10,
            }}
          >
            Instant Role Switcher
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('admin')}
              title="Administrator Role"
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('receptionist')}
              title="Front Desk Reception Role"
            >
              Reception
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDemoAccount('tech_arun')}
              title="Workbench Technician Role"
            >
              Technician
            </button>
          </div>

          {/* In-UI Mobile & Network Server Configuration */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 6,
              }}
              onClick={() => setShowServerConfig(!showServerConfig)}
            >
              <Settings size={13} />
              <span>Backend Server: <strong>{localStorage.getItem('techcare_server_url') || getApiBaseUrl().replace(/\/api$/, '') || 'Auto (/api)'}</strong></span>
            </button>

            {serverSuccess && (
              <div style={{ marginTop: 6, fontSize: '0.74rem', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <CheckCircle2 size={12} />
                <span>{serverSuccess}</span>
              </div>
            )}

            {showServerConfig && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wifi size={13} />
                  <span>Configure Backend API Server</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: 34, fontSize: '0.78rem' }}
                    placeholder={CLOUD_BACKEND_URL}
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ height: 34, fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                    onClick={() => handleSaveServerUrl(serverUrlInput)}
                  >
                    Save
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ fontSize: '0.70rem' }}
                    onClick={() => handleSaveServerUrl(CLOUD_BACKEND_URL)}
                  >
                    Render Cloud (Live)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ fontSize: '0.70rem' }}
                    onClick={() => handleSaveServerUrl('http://192.168.29.113:8080')}
                  >
                    Local PC (192.168.29.113)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    style={{ fontSize: '0.70rem' }}
                    onClick={() => handleSaveServerUrl('')}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compliance / Security Footnote */}
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-tertiary)',
          fontSize: '0.76rem',
        }}
      >
        <ShieldCheck size={14} />
        <span>Enterprise Grade • ISO 27001 Compliant Audit Logging</span>
      </div>
    </div>
  );
};
