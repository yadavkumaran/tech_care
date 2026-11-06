import React, { useEffect, useState } from 'react';
import { Plus, Truck, Edit, Trash2, PackagePlus, FileCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, InventoryItem } from '../types';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const addLineItem = () => {
    if (!selectedItemId || !itemQty || !itemCost) {
      alert('Please select an item, quantity, and unit cost');
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
  };

  const handleCreateNewItemOnTheFly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName || !itemCost || !newSellingPrice) {
      alert('Please fill out all item details');
      return;
    }

    try {
      const res = await api.post<ApiResponse<InventoryItem>>('/inventory', {
        sku: newSku,
        name: newName,
        category: newCategory,
        costPrice: Number(itemCost),
        sellingPrice: Number(newSellingPrice),
        currentStock: 0, // Stock will be added when purchase is committed
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
        alert(`New part "${created.name}" registered in catalog!`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating item');
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
      alert('Please add at least one line item to the purchase bill');
      return;
    }

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
      alert('Purchase recorded successfully! Inventory levels have been incremented.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording purchase');
    }
  };

  // Vendor CRUD
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
        alert('Vendor updated successfully!');
      } else {
        await api.post('/vendors', {
          companyName: vCompanyName,
          contactPerson: vContactPerson || undefined,
          phone: vPhone,
          email: vEmail || undefined,
          address: vAddress || undefined,
          taxId: vTaxId || undefined,
        });
        alert('Vendor created successfully!');
      }
      setShowVendorModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving vendor');
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendor.companyName}"?`)) {
      try {
        await api.delete(`/vendors/${vendor.id}`);
        alert('Vendor deleted or deactivated');
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting vendor');
      }
    }
  };

  return (
    <>
      <Navbar title="Vendors & Inbound Procurement" />
      <div className="page-body">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${activeTab === 'PURCHASES' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('PURCHASES')}
            >
              <FileCheck size={16} />
              <span>Purchase Invoices & Bills</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'VENDORS' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('VENDORS')}
            >
              <Truck size={16} />
              <span>Vendors Directory ({vendors.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'PURCHASES' ? (
              <button className="btn btn-primary" onClick={() => setShowPurchaseModal(true)}>
                <Plus size={18} />
                <span>New Purchase Entry</span>
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => openVendorModal()}>
                <Plus size={18} />
                <span>Register New Vendor</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: PURCHASES TABLE */}
        {activeTab === 'PURCHASES' && (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>PO Reference</th>
                    <th>Vendor</th>
                    <th>Vendor Bill #</th>
                    <th>Purchase Date</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length > 0 ? (
                    purchases.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{p.purchaseOrderNumber}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.vendor?.companyName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.vendor?.phone}</div>
                        </td>
                        <td>{p.vendorBillNumber || 'N/A'}</td>
                        <td>{p.purchaseDate}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(p.totalAmount).toFixed(2)}</td>
                        <td style={{ color: '#059669' }}>₹{Number(p.paidAmount).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${p.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                        {loading ? 'Loading purchases...' : 'No vendor purchases recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VENDORS TABLE */}
        {activeTab === 'VENDORS' && (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length > 0 ? (
                    vendors.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>{v.companyName}</td>
                        <td>{v.contactPerson || '—'}</td>
                        <td>{v.phone}</td>
                        <td>{v.email || '—'}</td>
                        <td>{v.address || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openVendorModal(v)}
                            >
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDeleteVendor(v)}
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
                        No vendors registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: RECORD INBOUND PURCHASE */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 720 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Record Inbound Vendor Purchase</h3>
            <form onSubmit={handleRecordPurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Vendor / Wholesaler *</label>
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

              {/* Items Section */}
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select or Create Items on Bill:</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowNewItemForm(!showNewItemForm)}
                  >
                    <PackagePlus size={14} />
                    <span>{showNewItemForm ? 'Cancel New Part' : '+ New Item (Not in Stock)'}</span>
                  </button>
                </div>

                {/* Form to add a brand new item into catalog right from purchase */}
                {showNewItemForm && (
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 8, color: '#2563eb' }}>
                      Register New Spare Part into System:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8, marginBottom: 8 }}>
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
                        placeholder="Item Name (e.g. Cooler Master 120mm Case Fan)"
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
                        step="0.01"
                        className="form-control"
                        placeholder="Cost Price (₹)"
                        value={itemCost}
                        onChange={(e) => setItemCost(e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="Retail Selling Price (₹)"
                        value={newSellingPrice}
                        onChange={(e) => setNewSellingPrice(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateNewItemOnTheFly}>
                        Save Part to Catalog
                      </button>
                    </div>
                  </div>
                )}

                {/* Normal item selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Spare Part</label>
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
                          {i.name} (Current Stock: {i.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantity</label>
                    <input
                      type="number"
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
                      step="0.01"
                      className="form-control"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addLineItem}>
                    + Add to Bill
                  </button>
                </div>

                {/* Added Items List */}
                {lineItems.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <table style={{ background: '#ffffff', borderRadius: 6 }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit Cost</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li, idx) => {
                          const itemObj = inventoryItems.find((i) => i.id === li.itemId);
                          return (
                            <tr key={idx}>
                              <td>{itemObj?.name}</td>
                              <td>{li.quantity}</td>
                              <td>₹{li.unitCost.toFixed(2)}</td>
                              <td>₹{(li.quantity * li.unitCost).toFixed(2)}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(idx)}
                                  style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, fontSize: '1rem' }}>
                      Bill Total: ₹{calculateTotal().toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Paid Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder={`Leave blank to pay full (₹${calculateTotal()})`}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Memo, shipment receipt..."
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Purchase & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VENDOR CREATE & EDIT */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0' }}>
              {isEditingVendor ? `Edit Vendor: ${vCompanyName}` : 'Register New Vendor / Supplier'}
            </h3>
            <form onSubmit={handleSaveVendor}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Apex Tech Spares Pvt Ltd"
                  value={vCompanyName}
                  onChange={(e) => setVCompanyName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="+91 8022334455"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
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

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Wholesale Market address..."
                  value={vAddress}
                  onChange={(e) => setVAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowVendorModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditingVendor ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
