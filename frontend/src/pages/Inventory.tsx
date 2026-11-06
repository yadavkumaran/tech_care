import React, { useEffect, useState } from 'react';
import { Plus, Search, AlertTriangle, SlidersHorizontal, Edit, Trash2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // New & Edit Item Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SSD');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('5');

  // Adjust Stock Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const { hasRole } = useAuth();

  useEffect(() => {
    fetchInventory();
  }, [showLowStockOnly]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const url = showLowStockOnly ? '/inventory/alerts/low-stock' : '/inventory';
      const res = await api.get<ApiResponse<InventoryItem[]>>(url);
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditingItem(false);
    setEditingItemId(null);
    setSku('');
    setName('');
    setCategory('SSD');
    setCostPrice('');
    setSellingPrice('');
    setCurrentStock('0');
    setReorderLevel('5');
    setShowCreateModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setIsEditingItem(true);
    setEditingItemId(item.id);
    setSku(item.sku);
    setName(item.name);
    setCategory(item.category);
    setCostPrice(String(item.costPrice));
    setSellingPrice(String(item.sellingPrice));
    setCurrentStock(String(item.currentStock));
    setReorderLevel(String(item.reorderLevel));
    setShowCreateModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingItem && editingItemId) {
        await api.put(`/inventory/${editingItemId}`, {
          sku,
          name,
          category,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          currentStock: Number(currentStock),
          reorderLevel: Number(reorderLevel),
        });
        alert('Inventory item updated successfully!');
      } else {
        await api.post('/inventory', {
          sku,
          name,
          category,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          currentStock: Number(currentStock),
          reorderLevel: Number(reorderLevel),
        });
        alert('Inventory item created successfully!');
      }

      setShowCreateModal(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving inventory item');
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete or deactivate "${item.name}"?`)) {
      try {
        await api.delete(`/inventory/${item.id}`);
        alert('Inventory item removed or marked inactive');
        fetchInventory();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting inventory item');
      }
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    try {
      await api.post(`/inventory/${adjustingItem.id}/adjust-stock`, {
        quantity: Number(adjustQty),
        notes: adjustNotes || undefined,
      });

      setAdjustingItem(null);
      setAdjustQty('');
      setAdjustNotes('');
      fetchInventory();
      alert('Stock adjusted and movement ledger logged successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adjusting stock');
    }
  };

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar title="Spare Parts & Inventory Management" />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 460 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search parts by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn btn-sm ${showLowStockOnly ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertTriangle size={15} />
              <span>{showLowStockOnly ? 'Showing Low Stock Only' : 'Filter Low Stock'}</span>
            </button>

            {hasRole('ADMIN') && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={18} />
                <span>Add New Part / Item</span>
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU / Part Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock Available</th>
                  <th>Reorder Level</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isLowStock = item.currentStock <= item.reorderLevel;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{item.sku}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>
                          <span className="badge badge-neutral">{item.category}</span>
                        </td>
                        <td>
                          <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}>
                            {item.currentStock} Units {isLowStock && '⚠️'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{item.reorderLevel}</td>
                        <td style={{ color: '#64748b' }}>₹{Number(item.costPrice).toFixed(2)}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>₹{Number(item.sellingPrice).toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              title="Adjust Stock Quantity"
                              onClick={() => setAdjustingItem(item)}
                            >
                              <SlidersHorizontal size={14} />
                            </button>
                            {hasRole('ADMIN') && (
                              <>
                                <button
                                  className="btn btn-outline btn-sm"
                                  title="Edit Part Details"
                                  onClick={() => openEditModal(item)}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#ef4444' }}
                                  title="Delete Item"
                                  onClick={() => handleDeleteItem(item)}
                                >
                                  <Trash2 size={14} />
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
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      {loading ? 'Loading inventory...' : 'No inventory items match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT INVENTORY ITEM */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0' }}>
              {isEditingItem ? `Edit Part: ${name}` : 'Add Spare Part to Inventory'}
            </h3>
            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label className="form-label">SKU Code *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  disabled={isEditingItem}
                  placeholder="e.g. SKU-SSD-500NVME"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Item / Part Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Crucial P3 500GB PCIe 3.0 NVMe M.2 SSD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="RAM">RAM</option>
                    <option value="SSD">SSD</option>
                    <option value="HDD">HDD</option>
                    <option value="SCREEN">Display Screen</option>
                    <option value="BATTERY">Battery</option>
                    <option value="KEYBOARD">Keyboard</option>
                    <option value="ADAPTER">Adapter / Charger</option>
                    <option value="MOTHERBOARD">Motherboard</option>
                    <option value="COOLING">Cooling</option>
                    <option value="ACCESSORY">Accessory</option>
                    <option value="CONSUMABLE">Consumable (Paste/Solder)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reorder Alert Level</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isEditingItem ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12 }}>
                {!isEditingItem && (
                  <div className="form-group">
                    <label className="form-label">Initial Stock</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    placeholder="2100"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    placeholder="2900"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditingItem ? 'Save Changes' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL STOCK ADJUSTMENT (AUDIT LOGGED) */}
      {adjustingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 8px 0' }}>Stock Adjustment: {adjustingItem.name}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Current stock on bench: <b>{adjustingItem.currentStock} units</b>
            </p>

            <form onSubmit={handleAdjustStock}>
              <div className="form-group">
                <label className="form-label">Adjustment Quantity (+ to add, - to subtract) *</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  placeholder="e.g. +5 or -2"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Notes for Audit Ledger</label>
                <textarea
                  className="form-control"
                  rows={2}
                  required
                  placeholder="e.g. Physical inventory count correction, damaged during transit..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAdjustingItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
