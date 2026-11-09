import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  User,
  Laptop,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../api/client';
import { ApiResponse, Customer, CustomerDevice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { hasRole } = useAuth();

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
  const [loadingDevices, setLoadingDevices] = useState(false);

  // New Device Form inside Devices Modal
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devType, setDevType] = useState('LAPTOP');
  const [devBrand, setDevBrand] = useState('');
  const [devModel, setDevModel] = useState('');
  const [devSerial, setDevSerial] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devCondition, setDevCondition] = useState('');
  const [devAccessories, setDevAccessories] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);

  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchCustomers(searchTerm, true);
  }, []);

  const fetchCustomers = async (search = '', showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
      const res = await api.get<ApiResponse<Customer[]>>(url);
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: silently refresh customer list on client updates
  useRealtimeSync(['CUSTOMER', 'DEVICE'], () => {
    fetchCustomers(searchTerm, false);
  });

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
    setSavingCustomer(true);
    try {
      if (isEditing && editingId) {
        await api.put(`/customers/${editingId}`, {
          fullName,
          phone,
          email: email || undefined,
          address: address || undefined,
          taxId: taxId || undefined,
        });
        toast.success('Customer details updated successfully!');
      } else {
        await api.post('/customers', {
          fullName,
          phone,
          email: email || undefined,
          address: address || undefined,
          taxId: taxId || undefined,
        });
        toast.success('Customer registered successfully!');
      }

      setShowModal(false);
      fetchCustomers(searchTerm);
      broadcastLocalUpdate('CUSTOMER', isEditing ? 'UPDATED' : 'CREATED');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = (c: Customer) => {
    setCustomerToDelete(c);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      toast.success(`Customer "${customerToDelete.fullName}" deleted successfully`);
      fetchCustomers(searchTerm);
      broadcastLocalUpdate('CUSTOMER', 'DELETED');
      setCustomerToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting customer');
    } finally {
      setDeletingCustomer(false);
    }
  };

  const viewDevices = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAddDevice(false);
    setLoadingDevices(true);
    try {
      const res = await api.get<ApiResponse<CustomerDevice[]>>(`/devices/customer/${customer.id}`);
      if (res.data.success) {
        setCustomerDevices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRegisterDeviceForCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSavingDevice(true);
    try {
      const res = await api.post<ApiResponse<CustomerDevice>>('/devices', {
        customerId: selectedCustomer.id,
        deviceType: devType,
        brand: devBrand,
        modelName: devModel,
        serialNumber: devSerial || undefined,
        devicePassword: devPassword || undefined,
        physicalCondition: devCondition || undefined,
        accessoriesReceived: devAccessories || undefined,
      });
      if (res.data.success) {
        toast.success('Device registered successfully for ' + selectedCustomer.fullName);
        setCustomerDevices((prev) => [...prev, res.data.data]);
        setShowAddDevice(false);
        setDevBrand('');
        setDevModel('');
        setDevSerial('');
        setDevPassword('');
        setDevCondition('');
        setDevAccessories('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register device');
    } finally {
      setSavingDevice(false);
    }
  };

  const handleDeleteDevice = async (device: CustomerDevice) => {
    if (window.confirm(`Are you sure you want to remove device "${device.brand} ${device.modelName}"?`)) {
      setDeletingDeviceId(device.id);
      try {
        await api.delete(`/devices/${device.id}`);
        setCustomerDevices((prev) => prev.filter((d) => d.id !== device.id));
        toast.success(`Device "${device.brand} ${device.modelName}" removed successfully`);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error removing device');
      } finally {
        setDeletingDeviceId(null);
      }
    }
  };

  return (
    <>
      <Navbar
        title="Customer CRM"
        subtitle="Manage client accounts, registered hardware, and contact history"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Top Control Bar */}
        <div className="page-control-bar">
          <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, maxWidth: 440 }}>
            <SearchInput
              placeholder="Search by customer name or phone..."
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                if (val === '') fetchCustomers('');
              }}
              maxWidth="100%"
            />
          </form>

          {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
            <div className="page-actions-group">
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} />
                <span>New Customer</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-table-view" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Phone</th>
                  <th>Email Address</th>
                  <th>Physical Address</th>
                  <th>Registered On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((c) => {
                    const initials = c.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: '#f3f4f6',
                                color: '#374151',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {c.fullName}
                              </div>
                              {c.taxId && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                  GST/Tax: {c.taxId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <a
                            href={`tel:${c.phone}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.86rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            <Phone size={13} color="var(--primary)" />
                            <span className="tabular">{c.phone}</span>
                          </a>
                        </td>
                        <td>
                          {c.email ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                              <Mail size={13} color="var(--text-tertiary)" />
                              <span>{c.email}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            maxWidth: 220,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.84rem',
                          }}
                          title={c.address || ''}
                        >
                          {c.address ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={13} color="var(--text-tertiary)" />
                              <span>{c.address}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              title="View registered devices"
                              onClick={() => viewDevices(c)}
                            >
                              <Laptop size={13} />
                              <span>Devices</span>
                            </button>
                            {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
                              <>
                                <button
                                  className="btn btn-outline btn-sm"
                                  title="Edit Customer"
                                  onClick={() => openEditModal(c)}
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--status-danger-text)' }}
                                  title="Delete Customer"
                                  onClick={() => handleDeleteCustomer(c)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={User}
                        title={loading ? 'Loading customer records...' : 'No customers found'}
                        description="Register a new customer profile to get started."
                        actionText={!loading && !searchTerm && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? 'New Customer' : undefined}
                        onAction={!loading && !searchTerm && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? openCreateModal : undefined}
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
          {customers.length > 0 ? (
            customers.map((c) => {
              const initials = c.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={c.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: '#f3f4f6',
                          color: '#374151',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {c.fullName}
                        </div>
                        {c.taxId && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            GST: {c.taxId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-body">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Phone
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        <Phone size={13} />
                        <span className="tabular">{c.phone}</span>
                      </a>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Email
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => viewDevices(c)}
                    >
                      <Laptop size={13} />
                      <span>Devices</span>
                    </button>

                    {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(c)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--status-danger-text)' }}
                          onClick={() => handleDeleteCustomer(c)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={User}
              title={loading ? 'Loading customer records...' : 'No customers found'}
              description="Register customer profiles to track devices and billing history."
              actionText={!loading && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? 'New Customer' : undefined}
              onAction={!loading && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? openCreateModal : undefined}
              actionIcon={<Plus size={15} />}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: REGISTER / EDIT CUSTOMER */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? `Edit Customer: ${fullName}` : 'Register New Customer Profile'}
        description="Enter customer contact details for work orders, invoicing, and updates"
        maxWidth={580}
      >
        <form onSubmit={handleSaveCustomer}>
          <div className="form-group">
            <label className="form-label">
              Full Legal Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Priya Sundaram"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Primary Phone Number <span className="required-mark">*</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
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
                inputMode="email"
                className="form-control"
                placeholder="priya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tax ID / GSTIN (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Billing / Home Address</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Street address, apartment, city, pincode..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingCustomer}>
              {savingCustomer ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW CUSTOMER DEVICES */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Registered Devices for ${selectedCustomer.fullName}`}
          description={`Phone: ${selectedCustomer.phone}`}
          maxWidth={640}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hardware Equipment ({customerDevices.length})
            </div>
            {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowAddDevice(!showAddDevice)}
              >
                <Plus size={14} />
                <span>{showAddDevice ? 'Close Form' : '+ Add New Device'}</span>
              </button>
            )}
          </div>

          {showAddDevice && (
            <form onSubmit={handleRegisterDeviceForCustomer} style={{ background: 'var(--bg-surface-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: 10, color: 'var(--text-primary)' }}>
                Register New Device for {selectedCustomer.fullName}:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Device Type <span className="required-mark">*</span></label>
                  <select
                    className="form-control"
                    value={devType}
                    onChange={(e) => setDevType(e.target.value)}
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop</option>
                    <option value="ALL_IN_ONE">All-in-One PC</option>
                    <option value="PRINTER">Printer / Peripheral</option>
                    <option value="CUSTOM_PC">Custom PC / Workstation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand <span className="required-mark">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={devBrand}
                    onChange={(e) => setDevBrand(e.target.value)}
                    placeholder="Apple, Dell, HP, Lenovo"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Model Name <span className="required-mark">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={devModel}
                    onChange={(e) => setDevModel(e.target.value)}
                    placeholder="e.g. ThinkPad T14 / MacBook Pro"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Serial Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={devSerial}
                    onChange={(e) => setDevSerial(e.target.value)}
                    placeholder="S/N or Service Tag"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Device PIN / Unlock Pattern</label>
                  <input
                    type="text"
                    className="form-control"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="PIN or Password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Condition</label>
                  <input
                    type="text"
                    className="form-control"
                    value={devCondition}
                    onChange={(e) => setDevCondition(e.target.value)}
                    placeholder="Scratches, dents, cracks..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Accessories Left with Device</label>
                <input
                  type="text"
                  className="form-control"
                  value={devAccessories}
                  onChange={(e) => setDevAccessories(e.target.value)}
                  placeholder="e.g. Charger, Power Cable, Laptop Bag"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddDevice(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingDevice}
                >
                  {savingDevice ? (
                    <>
                      <Loader2 size={13} className="spin-fast" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Register Device'
                  )}
                </button>
              </div>
            </form>
          )}

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loadingDevices ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Loading hardware records...
              </div>
            ) : customerDevices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customerDevices.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 14,
                      background: 'var(--bg-surface-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Laptop size={16} color="var(--primary)" />
                        <span>{d.brand} {d.modelName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge variant="info">{d.deviceType}</Badge>
                        {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--status-danger-text)', padding: 4 }}
                            title="Delete Device"
                            disabled={deletingDeviceId === d.id}
                            onClick={() => handleDeleteDevice(d)}
                          >
                            {deletingDeviceId === d.id ? <Loader2 size={13} className="spin-fast" /> : <Trash2 size={13} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Serial Number: </span>
                        <span className="tabular">{d.serialNumber || 'N/A'}</span>
                      </div>
                      {d.physicalCondition && (
                        <div>
                          <span style={{ color: 'var(--text-tertiary)' }}>Condition: </span>
                          <span>{d.physicalCondition}</span>
                        </div>
                      )}
                    </div>

                    {d.accessoriesReceived && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontWeight: 600 }}>Accessories Left: </span>
                        <span>{d.accessoriesReceived}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Laptop}
                title="No hardware registered"
                description="This customer does not have any devices registered in the system yet."
                actionText={(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && !showAddDevice ? '+ Add Device Now' : undefined}
                onAction={(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && !showAddDevice ? () => setShowAddDevice(true) : undefined}
              />
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-outline"
              onClick={() => setSelectedCustomer(null)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM DELETE CUSTOMER */}
      <Modal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        title="Confirm Customer Deletion"
        description="Verify deletion requirements"
        maxWidth={460}
      >
        <div style={{ padding: '4px 0' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            Are you sure you want to delete customer <strong>{customerToDelete?.fullName}</strong> ({customerToDelete?.phone})?
          </p>
          <div style={{ padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.80rem', color: '#92400e', marginBottom: 18 }}>
            <strong>Note:</strong> Under system integrity rules, customer profiles with historical repair tickets, registered devices, or invoices cannot be deleted.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={deletingCustomer}
              onClick={() => setCustomerToDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deletingCustomer}
              onClick={confirmDeleteCustomer}
            >
              {deletingCustomer ? 'Deleting...' : 'Delete Customer Profile'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
