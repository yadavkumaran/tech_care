import React, { useEffect, useState } from 'react';
import { Plus, Search, User, Laptop, Phone, Edit, Trash2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, Customer, CustomerDevice } from '../types';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State (Create & Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  // Customer Devices Drawer/Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDevices, setCustomerDevices] = useState<CustomerDevice[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search = '') => {
    setLoading(true);
    try {
      const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
      const res = await api.get<ApiResponse<Customer[]>>(url);
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchTerm);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxId('');
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setIsEditing(true);
    setEditingId(c.id);
    setFullName(c.fullName);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setTaxId(c.taxId || '');
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await api.put(`/customers/${editingId}`, {
          fullName,
          phone,
          email: email || undefined,
          address: address || undefined,
          taxId: taxId || undefined,
        });
        alert('Customer details updated successfully!');
      } else {
        await api.post('/customers', {
          fullName,
          phone,
          email: email || undefined,
          address: address || undefined,
          taxId: taxId || undefined,
        });
        alert('Customer registered successfully!');
      }

      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving customer');
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (window.confirm(`Are you sure you want to delete customer "${c.fullName}"?`)) {
      try {
        await api.delete(`/customers/${c.id}`);
        alert('Customer deleted successfully');
        fetchCustomers();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting customer');
      }
    }
  };

  const viewDevices = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const res = await api.get<ApiResponse<CustomerDevice[]>>(`/devices/customer/${customer.id}`);
      if (res.data.success) {
        setCustomerDevices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load devices', err);
    }
  };

  return (
    <>
      <Navbar title="Customer Relationship Management" />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 450 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by customer name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-outline">
              <Search size={16} />
            </button>
          </form>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            <span>Register New Customer</span>
          </button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Registered On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={16} color="#2563eb" />
                          <span>{c.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                          <Phone size={14} color="#64748b" />
                          <span>{c.phone}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.email || '—'}</span>
                      </td>
                      <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.address || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="View Devices"
                            onClick={() => viewDevices(c)}
                          >
                            <Laptop size={14} />
                            <span>Devices</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Edit Customer"
                            onClick={() => openEditModal(c)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444' }}
                            title="Delete Customer"
                            onClick={() => handleDeleteCustomer(c)}
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
                      {loading ? 'Loading customers...' : 'No customers found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: REGISTER / EDIT CUSTOMER */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0' }}>
              {isEditing ? `Edit Customer: ${fullName}` : 'Register New Customer Profile'}
            </h3>
            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Priya Sundaram"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Billing / Home Address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW CUSTOMER DEVICES */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 8px 0' }}>Devices for {selectedCustomer.fullName}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Customer-owned equipment registered in the system
            </p>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {customerDevices.length > 0 ? (
                customerDevices.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {d.brand} {d.modelName} ({d.deviceType})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                      <b>Serial Number:</b> {d.serialNumber || 'Not recorded'}
                    </div>
                    {d.accessoriesReceived && (
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                        <b>Accessories Left:</b> {d.accessoriesReceived}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  No devices currently registered for this customer.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
