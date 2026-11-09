import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Truck,
  Edit,
  Trash2,
  PackagePlus,
  FileCheck,
  FileText,
  IndianRupee,
  ShoppingBag,
  Building,
  CheckCircle2,
  Phone,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTableRows, SkeletonCard } from '../components/ui/LoadingSequence';
import api from '../api/client';
import { ApiResponse, InventoryItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

interface Vendor {
  id: number;
  companyName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
}

interface PurchaseItemRecord {
  itemId: number;
  quantity: number;
  unitCost: number;
}

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'VENDORS'>('PURCHASES');

  // New Purchase Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Purchase items builder
  const [lineItems, setLineItems] = useState<PurchaseItemRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [itemQty, setItemQty] = useState('10');
  const [itemCost, setItemCost] = useState('');

  // On-the-fly new inventory item creation within purchase modal
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('SSD');
  const [newSellingPrice, setNewSellingPrice] = useState('');

  // Vendor Create/Edit Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [vCompanyName, setVCompanyName] = useState('');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vAddress, setVAddress] = useState('');
  const [vTaxId, setVTaxId] = useState('');

  // Button loading states
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [savingNewItem, setSavingNewItem] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState<number | null>(null);

  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [purchasesRes, vendorsRes, invRes] = await Promise.all([
        api.get<ApiResponse<any[]>>('/purchases'),
        api.get<ApiResponse<Vendor[]>>('/vendors'),
        api.get<ApiResponse<InventoryItem[]>>('/inventory'),
      ]);

      if (purchasesRes.data.success) setPurchases(purchasesRes.data.data);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data);
      if (invRes.data.success) setInventoryItems(invRes.data.data);
    } catch (err) {
      console.error('Failed to load purchases data', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: refresh purchases & inventory when vendor bills or stock update
  useRealtimeSync(['PURCHASE', 'INVENTORY', 'VENDOR'], () => {
    fetchData(false);
  });

  const addLineItem = () => {
    if (!selectedItemId || !itemQty || !itemCost) {
      toast.warning('Please select an item, quantity, and unit cost');
      return;
    }
    setLineItems([
      ...lineItems,
      {
        itemId: Number(selectedItemId),
        quantity: Number(itemQty),
        unitCost: Number(itemCost),
      },
    ]);
    setSelectedItemId('');
    setItemQty('10');
    setItemCost('');
    toast.info('Part added to purchase manifest');
  };

  const handleCreateNewItemOnTheFly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName || !itemCost || !newSellingPrice) {
      toast.warning('Please fill out all item details');
      return;
    }

    setSavingNewItem(true);
    try {
      const res = await api.post<ApiResponse<InventoryItem>>('/inventory', {
        sku: newSku,
        name: newName,
        category: newCategory,
        costPrice: Number(itemCost),
        sellingPrice: Number(newSellingPrice),
        currentStock: 0,
        reorderLevel: 5,
      });

      if (res.data.success) {
        const created = res.data.data;
        setInventoryItems([...inventoryItems, created]);
        setSelectedItemId(created.id);
        setShowNewItemForm(false);
        setNewSku('');
        setNewName('');
        setNewSellingPrice('');
        toast.success(`New part "${created.name}" registered in catalog!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating item');
    } finally {
      setSavingNewItem(false);
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const calculateTotal = () => {
    return lineItems.reduce((acc, curr) => acc + curr.quantity * curr.unitCost, 0);
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      toast.warning('Please add at least one line item to the purchase bill');
      return;
    }

    setSavingPurchase(true);
    try {
      await api.post('/purchases', {
        vendorId: Number(selectedVendorId),
        vendorBillNumber: vendorBillNo,
        paidAmount: paidAmount ? Number(paidAmount) : calculateTotal(),
        notes: purchaseNotes || undefined,
        items: lineItems,
      });

      setShowPurchaseModal(false);
      setSelectedVendorId('');
      setVendorBillNo('');
      setPaidAmount('');
      setPurchaseNotes('');
      setLineItems([]);
      fetchData();
      broadcastLocalUpdate('PURCHASE', 'RECORDED');
      broadcastLocalUpdate('INVENTORY', 'UPDATED');
      toast.success('Purchase recorded successfully! Inventory levels incremented.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error recording purchase');
    } finally {
      setSavingPurchase(false);
    }
  };

  const openVendorModal = (vendor?: Vendor) => {
    if (vendor) {
      setIsEditingVendor(true);
      setEditingVendorId(vendor.id);
      setVCompanyName(vendor.companyName);
      setVContactPerson(vendor.contactPerson || '');
      setVPhone(vendor.phone);
      setVEmail(vendor.email || '');
      setVAddress(vendor.address || '');
      setVTaxId(vendor.taxId || '');
    } else {
      setIsEditingVendor(false);
      setEditingVendorId(null);
      setVCompanyName('');
      setVContactPerson('');
      setVPhone('');
      setVEmail('');
      setVAddress('');
      setVTaxId('');
    }
    setShowVendorModal(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVendor(true);
    try {
      if (isEditingVendor && editingVendorId) {
        await api.put(`/vendors/${editingVendorId}`, {
          companyName: vCompanyName,
          contactPerson: vContactPerson || undefined,
          phone: vPhone,
          email: vEmail || undefined,
          address: vAddress || undefined,
          taxId: vTaxId || undefined,
        });
        toast.success('Vendor updated successfully!');
      } else {
        await api.post('/vendors', {
          companyName: vCompanyName,
          contactPerson: vContactPerson || undefined,
          phone: vPhone,
          email: vEmail || undefined,
          address: vAddress || undefined,
          taxId: vTaxId || undefined,
        });
        toast.success('Vendor registered successfully!');
      }
      setShowVendorModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving vendor');
    } finally {
      setSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendor.companyName}"?`)) {
      setDeletingVendorId(vendor.id);
      try {
        await api.delete(`/vendors/${vendor.id}`);
        toast.success('Vendor record removed');
        fetchData(false);
        broadcastLocalUpdate('VENDOR', 'DELETED');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error deleting vendor');
      } finally {
        setDeletingVendorId(null);
      }
    }
  };

  return (
    <>
      <Navbar
        title="Vendors & Purchases"
        subtitle="Manage supplier bills, purchase orders, and stock receipts"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Navigation & Action Bar */}
        <div className="page-control-bar">
          <div className="segmented-control">
            <button
              className={`segmented-btn ${activeTab === 'PURCHASES' ? 'active' : ''}`}
              onClick={() => setActiveTab('PURCHASES')}
            >
              <FileCheck size={14} />
              <span>Purchase Invoices ({purchases.length})</span>
            </button>
            <button
              className={`segmented-btn ${activeTab === 'VENDORS' ? 'active' : ''}`}
              onClick={() => setActiveTab('VENDORS')}
            >
              <Truck size={14} />
              <span>Vendors ({vendors.length})</span>
            </button>
          </div>

          <div className="page-actions-group">
            {activeTab === 'PURCHASES' ? (
              <button className="btn btn-primary" onClick={() => setShowPurchaseModal(true)}>
                <Plus size={16} />
                <span>New Purchase</span>
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => openVendorModal()}>
                <Plus size={16} />
                <span>Register Vendor</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: PURCHASES */}
        {activeTab === 'PURCHASES' && (
          <>
            {/* Desktop View */}
            <div className="card desktop-table-view" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>PO Reference</th>
                      <th>Vendor / Wholesaler</th>
                      <th>Vendor Bill #</th>
                      <th>Purchase Date</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Paid Amount</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows count={5} columns={7} />
                    ) : purchases.length > 0 ? (
                      purchases.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem', color: 'var(--primary)' }}>
                              {p.purchaseOrderNumber}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.vendor?.companyName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                              {p.vendor?.phone}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {p.vendorBillNumber || 'N/A'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {p.purchaseDate}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }} className="tabular">
                            ₹{Number(p.totalAmount).toFixed(2)}
                          </td>
                          <td style={{ color: '#059669', fontWeight: 600, textAlign: 'right' }} className="tabular">
                            ₹{Number(p.paidAmount).toFixed(2)}
                          </td>
                          <td>
                            <Badge variant={p.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                              {p.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            icon={ShoppingBag}
                            title={loading ? 'Loading purchases...' : 'No purchase orders recorded'}
                            description="Record incoming stock shipments to update bench inventory."
                            actionText={!loading ? 'New Purchase Entry' : undefined}
                            onAction={!loading ? () => setShowPurchaseModal(true) : undefined}
                            actionIcon={<Plus size={15} />}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View */}
            <div className="mobile-card-list">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : purchases.length > 0 ? (
                purchases.map((p) => (
                  <div key={p.id} className="mobile-data-card">
                    <div className="mobile-card-header">
                      <div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                          {p.purchaseOrderNumber}
                        </span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                          {p.vendor?.companyName}
                        </div>
                      </div>
                      <Badge variant={p.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                        {p.paymentStatus}
                      </Badge>
                    </div>

                    <div className="mobile-card-body">
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Bill # / Date
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                          {p.vendorBillNumber || 'N/A'} • {p.purchaseDate}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Total / Paid
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }} className="tabular">
                          ₹{Number(p.totalAmount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669' }} className="tabular">
                          Paid: ₹{Number(p.paidAmount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ShoppingBag}
                  title={loading ? 'Loading purchases...' : 'No purchase orders recorded'}
                  description="Record your first vendor purchase entry."
                  actionText={!loading ? 'New Purchase' : undefined}
                  onAction={!loading ? () => setShowPurchaseModal(true) : undefined}
                  actionIcon={<Plus size={15} />}
                />
              )}
            </div>
          </>
        )}

        {/* TAB 2: VENDORS */}
        {activeTab === 'VENDORS' && (
          <>
            {/* Desktop View */}
            <div className="card desktop-table-view" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Vendor Company</th>
                      <th>Contact Person</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>GSTIN / Tax ID</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows count={5} columns={6} />
                    ) : vendors.length > 0 ? (
                      vendors.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {v.companyName}
                            </div>
                            {v.address && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {v.address}
                              </div>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {v.contactPerson || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                              <Phone size={13} color="var(--text-tertiary)" />
                              <span className="tabular">{v.phone}</span>
                            </div>
                          </td>
                          <td>
                            {v.email ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                <Mail size={13} color="var(--text-tertiary)" />
                                <span>{v.email}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {v.taxId || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => openVendorModal(v)}
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--status-danger-text)' }}
                                disabled={deletingVendorId === v.id}
                                onClick={() => handleDeleteVendor(v)}
                                title="Delete or deactivate vendor"
                              >
                                {deletingVendorId === v.id ? (
                                  <Loader2 size={13} className="spin-fast" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={Building}
                            title={loading ? 'Loading vendors...' : 'No vendors registered'}
                            description="Register supplier and wholesaler contacts."
                            actionText={!loading ? 'Register Vendor' : undefined}
                            onAction={!loading ? () => openVendorModal() : undefined}
                            actionIcon={<Plus size={15} />}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View */}
            <div className="mobile-card-list">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : vendors.length > 0 ? (
                vendors.map((v) => (
                  <div key={v.id} className="mobile-data-card">
                    <div className="mobile-card-header">
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {v.companyName}
                        </div>
                        {v.contactPerson && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            Contact: {v.contactPerson}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mobile-card-body">
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Phone
                        </div>
                        <a
                          href={`tel:${v.phone}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, marginTop: 2 }}
                        >
                          <Phone size={13} />
                          <span className="tabular">{v.phone}</span>
                        </a>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Tax ID / GST
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem' }}>
                          {v.taxId || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {v.address || v.email || ''}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openVendorModal(v)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--status-danger-text)' }}
                          disabled={deletingVendorId === v.id}
                          onClick={() => handleDeleteVendor(v)}
                          title="Delete or deactivate vendor"
                        >
                          {deletingVendorId === v.id ? (
                            <Loader2 size={13} className="spin-fast" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Building}
                  title="No vendors registered"
                  description="Register wholesale suppliers to attach purchases."
                  actionText="Register Vendor"
                  onAction={() => openVendorModal()}
                  actionIcon={<Plus size={15} />}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: RECORD INBOUND PURCHASE */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Record Inbound Vendor Purchase"
        description="Attach incoming supplier bills and update bench stock counts"
        maxWidth={740}
      >
        <form onSubmit={handleRecordPurchase}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Vendor / Wholesaler <span className="required-mark">*</span>
              </label>
              <select
                className="form-control"
                required
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(Number(e.target.value))}
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Vendor Bill / Invoice #</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. INV-SUP-9981"
                value={vendorBillNo}
                onChange={(e) => setVendorBillNo(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="modal-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="modal-section-title" style={{ margin: 0 }}>
                <PackagePlus size={15} color="var(--primary)" />
                <span>Line Items on Supplier Bill</span>
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowNewItemForm(!showNewItemForm)}
              >
                <span>{showNewItemForm ? 'Cancel New Part' : '+ New Item'}</span>
              </button>
            </div>

            {showNewItemForm && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, color: 'var(--primary)' }}>
                  Register New Component into Catalog:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="SKU (e.g. SKU-FAN-120)"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Item Name (e.g. Cooler Fan)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="RAM">RAM</option>
                    <option value="SSD">SSD</option>
                    <option value="SCREEN">Screen</option>
                    <option value="BATTERY">Battery</option>
                    <option value="KEYBOARD">Keyboard</option>
                    <option value="ADAPTER">Adapter</option>
                    <option value="COOLING">Cooling</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className="form-control"
                    placeholder="Cost Price (₹)"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className="form-control"
                    placeholder="Retail Price (₹)"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingNewItem}
                    onClick={handleCreateNewItemOnTheFly}
                  >
                    {savingNewItem ? (
                      <>
                        <Loader2 size={13} className="spin-fast" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Part'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Normal Item Selector Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'end' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Part</label>
                <select
                  className="form-control"
                  value={selectedItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedItemId(id ? Number(id) : '');
                    const found = inventoryItems.find((i) => i.id === Number(id));
                    if (found) setItemCost(String(found.costPrice));
                  }}
                >
                  <option value="">-- Choose Existing Part --</option>
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Bench Stock: {i.currentStock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantity</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="form-control"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Cost Price (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="form-control"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-outline" onClick={addLineItem} style={{ height: 36 }}>
                + Add
              </button>
            </div>

            {/* Added Items Preview */}
            {lineItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <table style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Qty</th>
                      <th>Cost</th>
                      <th>Total</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, idx) => {
                      const itemObj = inventoryItems.find((i) => i.id === li.itemId);
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{itemObj?.name}</td>
                          <td className="tabular">{li.quantity}</td>
                          <td className="tabular">₹{li.unitCost.toFixed(2)}</td>
                          <td className="tabular" style={{ fontWeight: 600 }}>₹{(li.quantity * li.unitCost).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--status-danger-text)', padding: 2 }}
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }} className="tabular">
                  Bill Total: ₹{calculateTotal().toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Disbursed / Paid Amount (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="form-control"
                placeholder={`Leave blank to pay full (₹${calculateTotal()})`}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes & Internal Memo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Shipment tracking, courier receipt..."
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowPurchaseModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingPurchase}>
              {savingPurchase ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Committing...</span>
                </>
              ) : (
                <span>Commit Purchase</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VENDOR CREATE & EDIT */}
      <Modal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title={isEditingVendor ? `Edit Vendor: ${vCompanyName}` : 'Register New Vendor / Supplier'}
        description="Store supplier contact info, GST credentials, and warehouse address"
        maxWidth={600}
      >
        <form onSubmit={handleSaveVendor}>
          <div className="form-group">
            <label className="form-label">
              Company / Business Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Apex Tech Spares Pvt Ltd"
              value={vCompanyName}
              onChange={(e) => setVCompanyName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Manoj Agarwal"
                value={vContactPerson}
                onChange={(e) => setVContactPerson(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Phone Number <span className="required-mark">*</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                className="form-control"
                required
                placeholder="+91 8022334455"
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                inputMode="email"
                className="form-control"
                placeholder="sales@apexspares.com"
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN / Tax ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="29AAACA1234A1Z1"
                value={vTaxId}
                onChange={(e) => setVTaxId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Warehouse Address</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Wholesale market or distributor hub..."
              value={vAddress}
              onChange={(e) => setVAddress(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowVendorModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingVendor}>
              {savingVendor ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditingVendor ? 'Save Changes' : 'Register Vendor'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
