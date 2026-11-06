import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, Edit, Trash2, Shield, Phone, Mail } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, User } from '../types';

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

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<User[]>>('/staff');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      setLoading(false);
    }
  };

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
    setPassword(''); // Leave blank if not changing
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setIsActive(u.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert('Staff details updated successfully!');
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
        alert('New staff member added successfully!');
      }

      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving staff member');
    }
  };

  const handleDelete = async (u: User) => {
    if (window.confirm(`Are you sure you want to remove or deactivate ${u.fullName}?`)) {
      try {
        await api.delete(`/staff/${u.id}`);
        alert('Staff member removed or marked inactive');
        fetchStaff();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting staff');
      }
    }
  };

  return (
    <>
      <Navbar title="Staff & Technician Management" />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Manage bench technicians, front desk receptionists, and system administrators
          </p>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            <span>Add New Staff / Technician</span>
          </button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length > 0 ? (
                  staffList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                      </td>
                      <td style={{ color: '#2563eb', fontWeight: 500 }}>@{u.username}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'TECHNICIAN' ? 'badge-info' : 'badge-neutral'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={13} color="#64748b" /> {u.email}
                        </div>
                        {u.phone && (
                          <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Phone size={13} color="#64748b" /> {u.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {u.isActive ? 'Active' : 'Inactive / Resigned'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Edit Staff"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444' }}
                            title="Delete / Deactivate"
                            onClick={() => handleDelete(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      {loading ? 'Loading staff members...' : 'No staff found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0' }}>
              {isEditing ? `Edit Staff: ${fullName}` : 'Add New Technician / Staff Member'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Arun Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
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
                    type="text"
                    className="form-control"
                    placeholder="+91 9876543212"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-control"
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                  >
                    <option value="TECHNICIAN">Technician (Workbench Engineer)</option>
                    <option value="RECEPTIONIST">Receptionist (Front Desk)</option>
                    <option value="ADMIN">Admin (Shop Manager)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {isEditing ? 'New Password (Leave blank to keep)' : 'Password *'}
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
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Employee</span>
                  </label>
                  <p style={{ margin: '4px 0 0 24px', fontSize: '0.78rem', color: '#64748b' }}>
                    Uncheck if technician has resigned or is on leave (preserves ticket history).
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
