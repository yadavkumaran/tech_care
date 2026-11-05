import React, { useEffect, useState } from 'react';
import { Plus, Truck, Calendar, DollarSign, PackagePlus } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, InventoryItem } from '../types';

interface Vendor {
  id: number;
  companyName: string;
  phone: string;
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

  // New Purchase Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Purchase items builder
  const [lineItems, setLineItems] = useState<PurchaseItemRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [itemQty, setItemQty] = useState('10');
  const [itemCost, setItemCost] = useState('');

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

      setShowModal(false);
      setSelectedVendorId('');
      setVendorBillNo('');
      setPaidAmount('');
      setPurchaseNotes('');
      setLineItems([]);
      fetchData();
      alert('Purchase recorded successfully! Inventory levels have been updated.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording purchase');
    }
  };

  return (
    <>
      <Navbar title="Vendor & Purchase Procurement" />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Restock parts and accessories from wholesale vendors with auto-inventory update
          </p>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>New Purchase Entry</span>
          </button>
        </div>

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
      </div>

      {/* MODAL: DIRECT PURCHASE ENTRY */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 680 }}>
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

              {/* Line Items Builder */}
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
                  Add Items to Purchase Bill:
                </div>
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
                      <option value="">-- Select Item --</option>
                      {inventoryItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
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
                    + Add
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
                    <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700 }}>
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
                    placeholder="Memo, shipment details..."
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                  />
                </div>
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
                  Commit Purchase & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

