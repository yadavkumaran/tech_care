import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Laptop,
  Check,
  X,
  Phone,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import api from '../api/client';
import { ApiResponse, TicketStatus, TicketPriority } from '../types';

interface PublicTicket {
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerName: string;
  customerPhoneMasked: string;
  deviceBrand: string;
  deviceModel: string;
  deviceType: string;
  problemReported: string;
  diagnosticNotes?: string;
  estimatedCost: number;
  laborCharge: number;
  estimatedCompletionDate?: string;
  createdAt: string;
  completedAt?: string;
  deliveredAt?: string;
}

const STAGES: { key: TicketStatus; label: string }[] = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'DIAGNOSING', label: 'Diagnosing' },
  { key: 'ESTIMATION_PENDING', label: 'Quote Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Pickup' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export const PublicTrack: React.FC = () => {
  const { ticketNumber: paramTicketNumber } = useParams<{ ticketNumber?: string }>();
  const [ticketInput, setTicketInput] = useState(paramTicketNumber || '');
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (paramTicketNumber && paramTicketNumber.trim()) {
      fetchTicket(paramTicketNumber.trim());
    }
  }, [paramTicketNumber]);

  const fetchTicket = async (tNum: string) => {
    if (!tNum.trim()) return;
    setLoading(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await api.get<ApiResponse<PublicTicket>>(`/public/track/${encodeURIComponent(tNum.trim().toUpperCase())}`);
      if (res.data.success && res.data.data) {
        setTicket(res.data.data);
      } else {
        setError('No repair ticket found with this ticket number. Please verify and try again.');
        setTicket(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ticket not found. Please verify the ticket number on your receipt.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      fetchTicket(ticketInput.trim());
    }
  };

  const handleCustomerApprove = async () => {
    if (!ticket) return;
    setActionLoading(true);
    setActionSuccess('');
    try {
      const res = await api.post<ApiResponse<PublicTicket>>(`/public/track/${ticket.ticketNumber}/approve`);
      if (res.data.success && res.data.data) {
        setTicket(res.data.data);
        setActionSuccess('Thank you! You have approved the quotation. Our technicians will now proceed with the repair.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quote approval. Please call our shop.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCustomerReject = async () => {
    if (!ticket) return;
    if (!window.confirm('Are you sure you want to decline this repair quotation? The device will be assembled for collection.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post<ApiResponse<PublicTicket>>(`/public/track/${ticket.ticketNumber}/reject`);
      if (res.data.success && res.data.data) {
        setTicket(res.data.data);
        setActionSuccess('You have declined the quotation. Our counter will prepare your device for collection.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit decline. Please contact us.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStageIndex = (status: TicketStatus) => {
    switch (status) {
      case 'RECEIVED': return 0;
      case 'DIAGNOSING': return 1;
      case 'ESTIMATION_PENDING': return 2;
      case 'APPROVED': return 3;
      case 'IN_PROGRESS':
      case 'WAITING_FOR_PARTS':
      case 'ON_HOLD': return 4;
      case 'READY_FOR_DELIVERY': return 5;
      case 'DELIVERED': return 6;
      default: return 1;
    }
  };

  const currentStageIndex = ticket ? getStageIndex(ticket.status) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app, #f8fafc)', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Brand Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: '#ffffff', borderRadius: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12 }}>
          <Wrench size={18} color="var(--primary, #0071e3)" />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.3px' }}>TechCare Service Center</span>
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>Customer Repair Tracking & Quotation</h1>
        <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
          Check real-time diagnostic findings, inspect repair estimates, and track workbench progress
        </p>
      </div>

      {/* Lookup Bar */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-control"
              style={{ height: 46, fontSize: '0.96rem', fontWeight: 600, paddingLeft: 40, textTransform: 'uppercase' }}
              placeholder="Enter Ticket Number (e.g. TC-2026-0001)..."
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              required
            />
            <Search size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 46, padding: '0 20px', fontWeight: 700 }} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin-fast" /> : 'Track'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ticket Details Body */}
      {ticket && (
        <div style={{ maxWidth: 680, width: '100%' }}>
          {/* Action Success Alert */}
          {actionSuccess && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={20} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Ticket Hero Card */}
          <div className="card" style={{ padding: 20, marginBottom: 16, borderTop: '4px solid var(--primary, #0071e3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary, #0071e3)', letterSpacing: '0.5px' }}>
                  Repair Ticket Number
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '2px 0 0 0', fontFamily: 'JetBrains Mono, monospace', color: '#0f172a' }}>
                  {ticket.ticketNumber}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', padding: '4px 10px' }}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  Registered: {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Device & Owner Info Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Equipment / Hardware</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  {ticket.deviceBrand} {ticket.deviceModel}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Type: {ticket.deviceType}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Customer Account</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  {ticket.customerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone: {ticket.customerPhoneMasked}</div>
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="card" style={{ padding: '20px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="var(--primary)" />
              <span>Service Progress Pipeline</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', overflowX: 'auto', paddingBottom: 8 }}>
              {STAGES.map((st, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70, flex: 1, textAlign: 'center', zIndex: 1 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isPassed ? 'var(--primary, #0071e3)' : '#e2e8f0',
                        color: isPassed ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        marginBottom: 6,
                        boxShadow: isCurrent ? '0 0 0 4px rgba(0, 113, 227, 0.2)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isPassed ? <Check size={14} /> : idx + 1}
                    </div>
                    <span style={{ fontSize: '0.70rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary, #0071e3)' : '#64748b' }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ⭐ ESTIMATED TOTAL COST & QUOTATION CARD (Where Customer Sees the Estimate) */}
          <div
            className="card"
            style={{
              padding: 20,
              marginBottom: 16,
              background: '#ffffff',
              border: ticket.status === 'ESTIMATION_PENDING' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              boxShadow: ticket.status === 'ESTIMATION_PENDING' ? '0 4px 14px rgba(245, 158, 11, 0.15)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IndianRupee size={20} color="var(--primary, #0071e3)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Technician Repair Estimate & Quotation
                </h3>
              </div>
              {ticket.status === 'ESTIMATION_PENDING' && (
                <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
                  Awaiting Your Approval
                </span>
              )}
              {ticket.status === 'APPROVED' && (
                <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>
                  ✓ Approved by Customer
                </span>
              )}
            </div>

            {/* Problem & Diagnosis Notes */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                Initial Reported Issue:
              </div>
              <div style={{ fontSize: '0.88rem', color: '#1e293b', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
                {ticket.problemReported}
              </div>

              {ticket.diagnosticNotes ? (
                <>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    Technician Diagnostic Findings:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#1e293b', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '10px 12px', borderRadius: 6 }}>
                    {ticket.diagnosticNotes}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                  Our technician is currently conducting hardware diagnosis. Quotation will appear here shortly.
                </div>
              )}
            </div>

            {/* Financial Quotation Breakdown */}
            {ticket.estimatedCost > 0 ? (
              <div style={{ padding: '14px 16px', background: 'var(--bg-surface-subtle, #f8fafc)', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                  <span style={{ color: '#475569' }}>Parts / Replacement Hardware:</span>
                  <span style={{ fontWeight: 600 }}>₹{Math.max(0, ticket.estimatedCost - (ticket.laborCharge || 0)).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                  <span style={{ color: '#475569' }}>Service & Labor Charge:</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(ticket.laborCharge || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  <span>Total Estimated Cost:</span>
                  <span style={{ color: 'var(--primary, #0071e3)' }}>₹{Number(ticket.estimatedCost).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, textAlign: 'center', fontSize: '0.84rem', color: '#64748b', marginBottom: 16 }}>
                Cost estimation in progress by bench technician.
              </div>
            )}

            {/* Customer Approval Controls */}
            {ticket.status === 'ESTIMATION_PENDING' && (
              <div style={{ background: '#fef3c7', padding: '14px 16px', borderRadius: 8, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                  Customer Decision Required:
                </div>
                <div style={{ fontSize: '0.80rem', color: '#78350f', marginBottom: 12 }}>
                  Do you approve our technician to proceed with this repair for ₹{Number(ticket.estimatedCost).toFixed(2)}?
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, height: 40 }}
                    onClick={handleCustomerApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 size={15} className="spin-fast" /> : <Check size={16} />}
                    <span>Approve Repair Estimate</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, height: 40 }}
                    onClick={handleCustomerReject}
                    disabled={actionLoading}
                  >
                    <X size={16} />
                    <span>Decline Estimate</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Support / Contact Footer */}
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.82rem', color: '#64748b' }}>
            <div>Have questions about your repair? Contact our service desk:</div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 16 }}>
              <a href="tel:+919876543210" style={{ color: 'var(--primary, #0071e3)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={14} /> Call Shop (+91 98765 43210)
              </a>
              <Link to="/login" style={{ color: '#64748b', textDecoration: 'underline' }}>
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
