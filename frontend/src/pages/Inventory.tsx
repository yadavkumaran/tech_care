import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  AlertTriangle,
  SlidersHorizontal,
  Edit,
  Trash2,
  Package,
  Layers,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../api/client';
import { ApiResponse, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

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

  // Button loading states
  const [savingItem, setSavingItem] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { hasRole } = useAuth();
  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchInventory(true);
  }, [showLowStockOnly]);

  const fetchInventory = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = showLowStockOnly ? '/inventory/alerts/low-stock' : '/inventory';
      const res = await api.get<ApiResponse<InventoryItem[]>>(url);
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: silently refresh stock on purchases, job consumption, or stock adjustments
  useRealtimeSync(['INVENTORY', 'PURCHASE', 'TICKET'], () => {
    fetchInventory(false);
  });

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
    setSavingItem(true);
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
        toast.success('Inventory item updated successfully!');
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
        toast.success('Inventory item created successfully!');
      }

      setShowCreateModal(false);
      fetchInventory();
      broadcastLocalUpdate('INVENTORY', 'UPDATED');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving inventory item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to deactivate or remove "${item.name}"?`)) {
      setDeletingItemId(item.id);
      try {
        await api.delete(`/inventory/${item.id}`);
        toast.success('Inventory item removed or marked inactive');
        fetchInventory();
        broadcastLocalUpdate('INVENTORY', 'UPDATED');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error deleting inventory item');
      } finally {
        setDeletingItemId(null);
      }
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    setAdjustingStock(true);
    try {
      await api.post(`/inventory/${adjustingItem.id}/adjust-stock`, {
        quantity: Number(adjustQty),
        notes: adjustNotes || undefined,
      });

      setAdjustingItem(null);
      setAdjustQty('');
      setAdjustNotes('');
      fetchInventory();
      broadcastLocalUpdate('INVENTORY', 'UPDATED');
      toast.success('Stock adjustment committed and recorded in the audit ledger!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adjusting stock');
    } finally {
      setAdjustingStock(false);
    }
  };

  const filteredItems = items.filter((i) => {
    const q = searchTerm.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  const cpNum = Number(costPrice) || 0;
  const spNum = Number(sellingPrice) || 0;
  const marginPercent = cpNum > 0 && spNum >= cpNum ? (((spNum - cpNum) / spNum) * 100).toFixed(1) : null;

  return (
    <>
      <Navbar
        title="Spare Parts & Stock"
        subtitle="Track stock on bench, low-inventory alerts, and component margins"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Top Control Bar */}
        <div className="page-control-bar">
          <SearchInput
            placeholder="Search parts by name, SKU, or category..."
            value={searchTerm}
            onChange={setSearchTerm}
            maxWidth={420}
          />

          <div className="page-actions-group">
            <button
              className={`btn btn-sm ${showLowStockOnly ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertTriangle size={14} />
              <span>{showLowStockOnly ? 'Low Stock Filter' : 'Filter Low Stock'}</span>
            </button>

            {hasRole('ADMIN') && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} />
                <span>Add Part</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-table-view" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Item / Spare Part Name</th>
                  <th>Category</th>
                  <th>Bench Stock</th>
                  <th>Reorder Alert</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isLowStock = item.currentStock <= item.reorderLevel;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.82rem',
                              color: 'var(--primary)',
                            }}
                          >
                            {item.sku}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.name}
                          </div>
                        </td>
                        <td>
                          <Badge variant="neutral">{item.category}</Badge>
                        </td>
                        <td>
                          <Badge variant={isLowStock ? 'danger' : 'success'}>
                            {item.currentStock} Units {isLowStock && '⚠️'}
                          </Badge>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }} className="tabular">
                          {item.reorderLevel}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }} className="tabular">
                          ₹{Number(item.costPrice).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="tabular">
                            ₹{Number(item.sellingPrice).toFixed(2)}
                          </div>
                          {item.sellingPrice > item.costPrice && (
                            <div style={{ fontSize: '0.72rem', color: '#059669' }}>
                              +{(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100).toFixed(0)}% margin
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              title="Adjust Stock Quantity"
                              onClick={() => setAdjustingItem(item)}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Adjust</span>
                            </button>
                            {hasRole('ADMIN') && (
                              <>
                                <button
                                  className="btn btn-outline btn-sm"
                                  title="Edit Part Details"
                                  onClick={() => openEditModal(item)}
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--status-danger-text)' }}
                                  title="Delete Item"
                                  disabled={deletingItemId === item.id}
                                  onClick={() => handleDeleteItem(item)}
                                >
                                  {deletingItemId === item.id ? (
                                    <Loader2 size={13} className="spin-fast" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
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
                    <td colSpan={8}>
                      <EmptyState
                        icon={Package}
                        title={loading ? 'Loading inventory catalog...' : 'No inventory items found'}
                        description="No components matching your filter criteria."
                        actionText={!loading && !searchTerm && hasRole('ADMIN') ? 'Add New Part' : undefined}
                        onAction={!loading && !searchTerm && hasRole('ADMIN') ? openCreateModal : undefined}
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
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isLowStock = item.currentStock <= item.reorderLevel;
              return (
                <div key={item.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        {item.name}
                      </div>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.76rem',
                          color: 'var(--primary)',
                          marginTop: 2,
                          display: 'block',
                        }}
                      >
                        {item.sku}
                      </span>
                    </div>
                    <Badge variant={isLowStock ? 'danger' : 'success'}>
                      {item.currentStock} in stock {isLowStock && '⚠️'}
                    </Badge>
                  </div>

                  <div className="mobile-card-body">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Category & Alert
                      </div>
                      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.category}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>(alert at {item.reorderLevel})</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Pricing
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }} className="tabular">
                        ₹{Number(item.sellingPrice).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }} className="tabular">
                        Cost: ₹{Number(item.costPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setAdjustingItem(item)}
                    >
                      <SlidersHorizontal size={13} />
                      <span>Adjust Stock</span>
                    </button>

                    {hasRole('ADMIN') && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--status-danger-text)' }}
                          disabled={deletingItemId === item.id}
                          onClick={() => handleDeleteItem(item)}
                        >
                          {deletingItemId === item.id ? (
                            <Loader2 size={13} className="spin-fast" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={Package}
              title={loading ? 'Loading inventory...' : 'No items match'}
              description="No spare parts match your search query."
              actionText={!loading && hasRole('ADMIN') ? 'Add New Part' : undefined}
              onAction={!loading && hasRole('ADMIN') ? openCreateModal : undefined}
              actionIcon={<Plus size={15} />}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT INVENTORY ITEM */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={isEditingItem ? `Edit Part: ${name}` : 'Add Spare Part to Catalog'}
        description="Configure component specifications, pricing tiers, and reorder thresholds"
        maxWidth={620}
      >
        <form onSubmit={handleSaveItem}>
          <div className="form-group">
            <label className="form-label">
              SKU / Hardware Code <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              required
              disabled={isEditingItem}
              placeholder="e.g. SKU-SSD-500NVME"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              autoFocus={!isEditingItem}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Item / Part Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Crucial P3 500GB PCIe 3.0 NVMe M.2 SSD"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Category <span className="required-mark">*</span>
              </label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="RAM">RAM / Memory Modules</option>
                <option value="SSD">Solid State Drives (SSD)</option>
                <option value="HDD">Hard Disk Drives (HDD)</option>
                <option value="SCREEN">Display Screens & Panels</option>
                <option value="BATTERY">Laptop Batteries</option>
                <option value="KEYBOARD">Keyboards & Trackpads</option>
                <option value="ADAPTER">Power Adapters & Chargers</option>
                <option value="MOTHERBOARD">Motherboards & Logic Boards</option>
                <option value="COOLING">Thermal Fans & Heat Sinks</option>
                <option value="ACCESSORY">Accessories & Cables</option>
                <option value="CONSUMABLE">Consumables (Paste / Solder)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reorder Alert Threshold</label>
              <input
                type="number"
                inputMode="numeric"
                className="form-control"
                required
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {!isEditingItem && (
              <div className="form-group">
                <label className="form-label">Initial Stock Count</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-control"
                  required
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Cost Price (₹)</label>
              <input
                type="number"
                inputMode="decimal"
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
                inputMode="decimal"
                step="0.01"
                className="form-control"
                required
                placeholder="2900"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          {marginPercent && (
            <div
              style={{
                fontSize: '0.8rem',
                color: '#059669',
                background: 'var(--status-success-bg)',
                border: '1px solid var(--status-success-border)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={14} />
              <span>Gross Margin: <b>{marginPercent}%</b></span>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingItem}>
              {savingItem ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditingItem ? 'Save Changes' : 'Register Part'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: MANUAL STOCK ADJUSTMENT (AUDIT LOGGED) */}
      {adjustingItem && (
        <Modal
          isOpen={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          title={`Stock Adjustment: ${adjustingItem.name}`}
          description={`Current bench inventory: ${adjustingItem.currentStock} units`}
          maxWidth={540}
        >
          <form onSubmit={handleAdjustStock}>
            <div className="form-group">
              <label className="form-label">
                Adjustment Quantity (+ to add, - to deduct) <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="form-control"
                required
                placeholder="e.g. +5 or -2"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Reason / Ledger Audit Notes <span className="required-mark">*</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                required
                placeholder="e.g. Physical inventory count correction, damaged during transit..."
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setAdjustingItem(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={adjustingStock}>
                {adjustingStock ? (
                  <>
                    <Loader2 size={15} className="spin-fast" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <span>Commit Adjustment</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
