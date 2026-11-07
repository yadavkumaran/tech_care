import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Shield,
  Phone,
  Mail,
  User as UserIcon,
  CheckCircle,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/ui/Modal';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../api/client';
import { ApiResponse, User } from '../types';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

export const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State (Create & Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'RECEPTIONIST' | 'TECHNICIAN'>('TECHNICIAN');
  const [isActive, setIsActive] = useState(true);

  // Button loading state
  const [savingStaff, setSavingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);

  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchStaff(true);
  }, []);

  const fetchStaff = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get<ApiResponse<User[]>>('/staff');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: silently refresh staff roster
  useRealtimeSync(['STAFF'], () => {
    fetchStaff(false);
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedStaffId(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('TECHNICIAN');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setSelectedStaffId(u.id);
    setUsername(u.username);
    setPassword('');
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setIsActive(u.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStaff(true);
    try {
      if (isEditing && selectedStaffId) {
        await api.put(`/staff/${selectedStaffId}`, {
          username,
          password: password || undefined,
          fullName,
          email,
          phone,
          role,
          isActive,
        });
        toast.success('Staff details updated successfully!');
      } else {
        await api.post('/staff', {
          username,
          password,
          fullName,
          email,
          phone,
          role,
          isActive,
        });
        toast.success('New staff member added successfully!');
      }

      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving staff member');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (window.confirm(`Are you sure you want to deactivate or remove ${u.fullName}?`)) {
      setDeletingStaffId(u.id);
      try {
        await api.delete(`/staff/${u.id}`);
        toast.success('Staff member removed or marked inactive');
        fetchStaff(false);
        broadcastLocalUpdate('STAFF', 'UPDATED');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error deleting staff');
      } finally {
        setDeletingStaffId(null);
      }
    }
  };

  const getRoleVariant = (roleStr: string): BadgeVariant => {
    switch (roleStr) {
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
    <>
      <Navbar
        title="Staff & Technicians"
        subtitle="Manage bench engineers, receptionists, and administrator access"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Top Control Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Active team accounts: <b>{staffList.filter((s) => s.isActive).length}</b> of {staffList.length}
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add Staff</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-table-view" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Username</th>
                  <th>Access Role</th>
                  <th>Contact Info</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length > 0 ? (
                  staffList.map((u) => {
                    const initials = u.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'TECHNICIAN' ? '#e0f2fe' : '#dcfce7',
                                color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'TECHNICIAN' ? '#075985' : '#166534',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {u.fullName}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.82rem',
                              color: 'var(--primary)',
                            }}
                          >
                            @{u.username}
                          </span>
                        </td>
                        <td>
                          <Badge variant={getRoleVariant(u.role)}>
                            {u.role}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={13} color="var(--text-tertiary)" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Phone size={13} color="var(--text-tertiary)" />
                              <span className="tabular">{u.phone}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge variant={u.isActive ? 'success' : 'neutral'}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              title="Edit Staff Member"
                              onClick={() => openEditModal(u)}
                            >
                              <Edit size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--status-danger-text)' }}
                              title="Deactivate / Delete"
                              disabled={deletingStaffId === u.id}
                              onClick={() => handleDelete(u)}
                            >
                              {deletingStaffId === u.id ? (
                                <Loader2 size={13} className="spin-fast" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={UserIcon}
                        title={loading ? 'Loading staff roster...' : 'No staff members registered'}
                        description="Add technicians, desk receptionists, and administrators."
                        actionText={!loading ? 'Add New Staff' : undefined}
                        onAction={!loading ? openCreateModal : undefined}
                        actionIcon={<Plus size={15} />}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-card-list">
          {staffList.length > 0 ? (
            staffList.map((u) => {
              const initials = u.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={u.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'TECHNICIAN' ? '#e0f2fe' : '#dcfce7',
                          color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'TECHNICIAN' ? '#075985' : '#166534',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {u.fullName}
                        </div>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.74rem',
                            color: 'var(--primary)',
                          }}
                        >
                          @{u.username}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getRoleVariant(u.role)}>{u.role}</Badge>
                  </div>

                  <div className="mobile-card-body">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Email
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Phone
                      </div>
                      {u.phone ? (
                        <a
                          href={`tel:${u.phone}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, marginTop: 2, display: 'block' }}
                        >
                          <span className="tabular">{u.phone}</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <Badge variant={u.isActive ? 'success' : 'neutral'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEditModal(u)}
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--status-danger-text)' }}
                        disabled={deletingStaffId === u.id}
                        onClick={() => handleDelete(u)}
                      >
                        {deletingStaffId === u.id ? (
                          <Loader2 size={13} className="spin-fast" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={UserIcon}
              title="No staff found"
              description="Register technicians and receptionists."
              actionText="Add Staff"
              onAction={openCreateModal}
              actionIcon={<Plus size={15} />}
            />
          )}
        </div>
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? `Edit Staff Member: ${fullName}` : 'Add New Staff / Technician'}
        description="Configure role-based access credentials and workbench capabilities"
        maxWidth={620}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Full Legal Name <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Arun Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Username <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. tech_arun"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Official Email Address <span className="required-mark">*</span>
              </label>
              <input
                type="email"
                inputMode="email"
                className="form-control"
                required
                placeholder="arun@techcare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                className="form-control"
                placeholder="+91 9876543212"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Role & Permissions <span className="required-mark">*</span>
              </label>
              <select
                className="form-control"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
              >
                <option value="TECHNICIAN">Technician (Workbench Engineer)</option>
                <option value="RECEPTIONIST">Receptionist (Front Desk Intake)</option>
                <option value="ADMIN">Admin (Full Service Center Control)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {isEditing ? 'New Password (Leave blank to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                className="form-control"
                required={!isEditing}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isEditing && (
            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginTop: 4,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active Employee Account
                </span>
              </label>
              <p style={{ margin: '4px 0 0 24px', fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                Unchecking preserves ticket history, parts consumption logs, and billing audit trails.
              </p>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingStaff}>
              {savingStaff ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Staff Member'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
