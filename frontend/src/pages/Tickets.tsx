import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Wrench,
  Package,
  History,
  FileText,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import {
  ApiResponse,
  Customer,
  CustomerDevice,
  InventoryItem,
  RepairTicket,
  TicketLog,
  TicketStatus,
  User,
} from '../types';
import { useAuth } from '../context/AuthContext';

export const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Intake Modal State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [devices, setDevices] = useState<CustomerDevice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [problemReported, setProblemReported] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // New Customer & Device quick form inside Intake modal
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newDevBrand, setNewDevBrand] = useState('HP');
  const [newDevModel, setNewDevModel] = useState('');
  const [newDevSerial, setNewDevSerial] = useState('');
  const [newDevType, setNewDevType] = useState('LAPTOP');

  // Ticket Detail & Action Modal State
  const [activeTicket, setActiveTicket] = useState<RepairTicket | null>(null);
  const [ticketLogs, setTicketLogs] = useState<TicketLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);

  // Diagnosis inputs
  const [diagNotes, setDiagNotes] = useState('');
  const [estCost, setEstCost] = useState('');
  const [laborCharge, setLaborCharge] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');

  // Part consumption inputs
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState(1);

  const { hasRole } = useAuth();

  useEffect(() => {
    fetchTickets();
    loadTechsAndInventory();
  }, [selectedStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = '/tickets';
      if (selectedStatus !== 'ALL') {
        url += `?status=${selectedStatus}`;
      }
      const res = await api.get<ApiResponse<RepairTicket[]>>(url);
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTechsAndInventory = async () => {
    try {
      const [techRes, invRes, custRes] = await Promise.all([
        api.get<ApiResponse<User[]>>('/staff/technicians'),
        api.get<ApiResponse<InventoryItem[]>>('/inventory'),
        api.get<ApiResponse<Customer[]>>('/customers'),
      ]);
      if (techRes.data.success) setTechnicians(techRes.data.data);
      if (invRes.data.success) setInventory(invRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
    } catch (err) {
      console.error('Failed to load reference data', err);
    }
  };

  const handleCustomerChange = async (customerId: number) => {
    setSelectedCustomerId(customerId);
    setSelectedDeviceId('');
    try {
      const res = await api.get<ApiResponse<CustomerDevice[]>>(`/devices/customer/${customerId}`);
      if (res.data.success) {
        setDevices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer devices', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let custId = selectedCustomerId;
      let devId = selectedDeviceId;

      // Handle on-the-fly customer and device creation
      if (isNewCustomer) {
        const custRes = await api.post<ApiResponse<Customer>>('/customers', {
          fullName: newCustName,
          phone: newCustPhone,
        });
        custId = custRes.data.data.id;

        const devRes = await api.post<ApiResponse<CustomerDevice>>('/devices', {
          customerId: custId,
          deviceType: newDevType,
          brand: newDevBrand,
          modelName: newDevModel,
          serialNumber: newDevSerial,
        });
        devId = devRes.data.data.id;
      }

      await api.post('/tickets', {
        customerId: custId,
        deviceId: devId,
        assignedTechnicianId: selectedTechId || null,
        problemReported,
        priority,
      });

      setShowIntakeModal(false);
      resetIntakeForm();
      fetchTickets();
      alert('Repair job ticket created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating repair ticket');
    }
  };

  const resetIntakeForm = () => {
    setSelectedCustomerId('');
    setSelectedDeviceId('');
    setSelectedTechId('');
    setProblemReported('');
    setIsNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewDevBrand('HP');
    setNewDevModel('');
    setNewDevSerial('');
  };

  const openTicketDetails = async (ticket: RepairTicket) => {
    setActiveTicket(ticket);
    setDiagNotes(ticket.diagnosticNotes || '');
    setEstCost(ticket.estimatedCost ? String(ticket.estimatedCost) : '');
    setLaborCharge(ticket.laborCharge ? String(ticket.laborCharge) : '');
    setNewStatus(ticket.status);
    setStatusRemarks('');

    try {
      const logsRes = await api.get<ApiResponse<TicketLog[]>>(`/tickets/${ticket.id}/logs`);
      if (logsRes.data.success) setTicketLogs(logsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }

    setShowActionModal(true);
  };

  const handleUpdateDiagnosis = async () => {
    if (!activeTicket) return;
    try {
      await api.patch(`/tickets/${activeTicket.id}/diagnosis`, {
        diagnosticNotes: diagNotes,
        estimatedCost: estCost ? Number(estCost) : 0,
        laborCharge: laborCharge ? Number(laborCharge) : 0,
      });
      alert('Diagnosis updated successfully');
      fetchTickets();
      setShowActionModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update diagnosis');
    }
  };

  const handleStatusTransition = async () => {
    if (!activeTicket || !newStatus) return;
    try {
      await api.patch(`/tickets/${activeTicket.id}/status`, {
        status: newStatus,
        remarks: statusRemarks || undefined,
      });
      alert(`Ticket status updated to ${newStatus}`);
      fetchTickets();
      setShowActionModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to change status');
    }
  };

  const handleConsumePart = async () => {
    if (!activeTicket || !selectedPartId) return;
    try {
      await api.post(`/tickets/${activeTicket.id}/consume-part`, {
        itemId: selectedPartId,
        quantity: Number(partQty),
      });
      alert('Spare part consumed and deducted from inventory!');
      setSelectedPartId('');
      setPartQty(1);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to consume spare part');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.phone.includes(searchTerm) ||
      t.device.modelName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge badge-neutral">Received</span>;
      case 'DIAGNOSING':
        return <span className="badge badge-info">Diagnosing</span>;
      case 'ESTIMATION_PENDING':
        return <span className="badge badge-warning">Pending Approval</span>;
      case 'APPROVED':
        return <span className="badge badge-info">Approved</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-info">In Progress</span>;
      case 'READY_FOR_DELIVERY':
        return <span className="badge badge-success">Ready for Delivery</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      case 'CANCELLED':
      case 'REJECTED':
        return <span className="badge badge-danger">{status}</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <>
      <Navbar title="Repair Job Tickets" />
      <div className="page-body">
        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, maxWidth: 460 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search ticket #, customer name, phone, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              loadTechsAndInventory();
              setShowIntakeModal(true);
            }}
          >
            <Plus size={18} />
            <span>New Device Intake</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {['ALL', 'RECEIVED', 'DIAGNOSING', 'ESTIMATION_PENDING', 'APPROVED', 'IN_PROGRESS', 'READY_FOR_DELIVERY', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`btn btn-sm ${selectedStatus === st ? 'btn-primary' : 'btn-outline'}`}
            >
              {st === 'ALL' ? 'All Tickets' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Tickets Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Customer</th>
                  <th>Device Under Repair</th>
                  <th>Priority</th>
                  <th>Assigned Tech</th>
                  <th>Status</th>
                  <th>Cost Estimate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{t.ticketNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.customer.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.customer.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.device.brand} {t.device.modelName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>SN: {t.device.serialNumber || 'N/A'}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: t.priority === 'URGENT' ? '#ef4444' : t.priority === 'HIGH' ? '#f59e0b' : '#64748b'
                        }}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        {t.assignedTechnician ? (
                          <span>{t.assignedTechnician.fullName}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>₹{Number(t.estimatedCost || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Labor: ₹{Number(t.laborCharge || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openTicketDetails(t)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      {loading ? 'Loading tickets...' : 'No tickets matching your filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: NEW DEVICE INTAKE JOB SHEET */}
      {showIntakeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>New Device Intake Check-in</h3>
            <form onSubmit={handleCreateTicket}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${!isNewCustomer ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setIsNewCustomer(false)}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isNewCustomer ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setIsNewCustomer(true)}
                >
                  + New Customer & Device
                </button>
              </div>

              {!isNewCustomer ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Customer</label>
                    <select
                      className="form-control"
                      value={selectedCustomerId}
                      onChange={(e) => handleCustomerChange(Number(e.target.value))}
                      required
                    >
                      <option value="">-- Choose registered customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Customer Device</label>
                    <select
                      className="form-control"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                      required
                    >
                      <option value="">-- Choose device --</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brand} {d.modelName} (SN: {d.serialNumber || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="e.g. Ramesh Gupta"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Device Type</label>
                      <select
                        className="form-control"
                        value={newDevType}
                        onChange={(e) => setNewDevType(e.target.value)}
                      >
                        <option value="LAPTOP">Laptop</option>
                        <option value="DESKTOP">Desktop</option>
                        <option value="ALL_IN_ONE">All-in-One</option>
                        <option value="CUSTOM_PC">Custom PC</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Brand</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newDevBrand}
                        onChange={(e) => setNewDevBrand(e.target.value)}
                        placeholder="Dell, HP, Apple, Lenovo"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newDevModel}
                        onChange={(e) => setNewDevModel(e.target.value)}
                        placeholder="Inspiron 15, MacBook Pro"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Serial Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newDevSerial}
                        onChange={(e) => setNewDevSerial(e.target.value)}
                        placeholder="Serial Number"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reported Issue / Customer Complaint</label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="Describe problem (e.g. Broken screen, overheating, BSOD blue screen crash)..."
                  value={problemReported}
                  onChange={(e) => setProblemReported(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Assign Technician</label>
                  <select
                    className="form-control"
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Assign Later --</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-control"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowIntakeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Job Sheet & Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET MANAGEMENT / DIAGNOSIS & SPARE PARTS CONSUMPTION */}
      {showActionModal && activeTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Ticket #{activeTicket.ticketNumber}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {activeTicket.device.brand} {activeTicket.device.modelName} – {activeTicket.customer.fullName} ({activeTicket.customer.phone})
                </span>
              </div>
              <div>{getStatusBadge(activeTicket.status)}</div>
            </div>

            {/* Section 1: State Machine Transition */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="#2563eb" />
                <span>Transition Status State Machine</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
                <select
                  className="form-control"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="DIAGNOSING">DIAGNOSING</option>
                  <option value="ESTIMATION_PENDING">ESTIMATION_PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="READY_FOR_DELIVERY">READY_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Audit remark notes..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={handleStatusTransition}>
                  Apply State Change
                </button>
              </div>
            </div>

            {/* Section 2: Technician Diagnosis & Cost Estimation */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={16} color="#2563eb" />
                <span>Diagnostic Notes & Quotation</span>
              </div>
              <div className="form-group">
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Root cause, testing results, required work..."
                  value={diagNotes}
                  onChange={(e) => setDiagNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estimated Total (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={estCost}
                    onChange={(e) => setEstCost(e.target.value)}
                    placeholder="e.g. 3200"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Labor Charge (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={laborCharge}
                    onChange={(e) => setLaborCharge(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <button className="btn btn-outline" onClick={handleUpdateDiagnosis}>
                  Save Diagnosis
                </button>
              </div>
            </div>

            {/* Section 3: Spare Parts Consumption */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={16} color="#2563eb" />
                <span>Consume Spare Part from Inventory</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10 }}>
                <select
                  className="form-control"
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Choose Part from Stock --</option>
                  {inventory.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Stock: {i.currentStock} | ₹{i.sellingPrice})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={partQty}
                  onChange={(e) => setPartQty(Number(e.target.value))}
                  placeholder="Qty"
                />
                <button className="btn btn-outline" onClick={handleConsumePart}>
                  Deduct & Attach
                </button>
              </div>
            </div>

            {/* Section 4: Audit Log Trail */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <History size={16} color="#64748b" />
                <span>Status Audit Log History</span>
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                {ticketLogs.map((log) => (
                  <div key={log.id} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span><b>{log.newStatus}</b> {log.previousStatus ? `(from ${log.previousStatus})` : ''}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {log.remarks && <div style={{ color: '#334155', marginTop: 2 }}>{log.remarks}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowActionModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

