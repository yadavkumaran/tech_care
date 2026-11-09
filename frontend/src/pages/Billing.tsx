import React, { useEffect, useState } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  ReceiptText,
  CreditCard,
  Printer,
  Search,
  CheckCircle,
  FileText,
  IndianRupee,
  Calendar,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/ui/Modal';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchInput } from '../components/ui/SearchInput';
import api from '../api/client';
import { ApiResponse, Customer, Invoice, Payment, RepairTicket } from '../types';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';
import { launchRazorpayCheckout, RazorpayOrderData } from '../utils/razorpay';

export const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // New Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState('18.00');
  const [discountAmount, setDiscountAmount] = useState('0.00');

  // Record Payment Modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'UPI' | 'CASH' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [payType, setPayType] = useState('FINAL_SETTLEMENT');
  const [payNotes, setPayNotes] = useState('');

  // Invoice Print Preview Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Button loading states
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isPayingWithRazorpay, setIsPayingWithRazorpay] = useState(false);

  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();
  const location = useLocation();
  const navigate = useNavigate();

  // Listen to navigation state from Tickets page (e.g. direct "Generate Bill" or "View Bill")
  useEffect(() => {
    const state = location.state as {
      autoOpenInvoice?: boolean;
      preselectedTicketId?: number;
      searchTicketNumber?: string;
    } | null;

    if (state?.preselectedTicketId) {
      setSelectedTicketId(state.preselectedTicketId);
      if (state.autoOpenInvoice) {
        setShowInvoiceModal(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.searchTicketNumber) {
      setSearchTerm(state.searchTicketNumber);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Support query parameters ?ticketId=123&create=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramTicketId = params.get('ticketId');
    if (paramTicketId) {
      setSelectedTicketId(Number(paramTicketId));
      if (params.get('create') === 'true') {
        setShowInvoiceModal(true);
      }
    }
  }, [location.search]);

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get<ApiResponse<Invoice[]>>('/invoices'),
        api.get<ApiResponse<RepairTicket[]>>('/tickets'),
        api.get<ApiResponse<Customer[]>>('/customers'),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.data.success) {
        setInvoices(results[0].value.data.data);
      }
      if (results[1].status === 'fulfilled' && results[1].value.data.success) {
        setTickets(results[1].value.data.data);
      }
      if (results[2].status === 'fulfilled' && results[2].value.data.success) {
        setCustomers(results[2].value.data.data);
      }
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: silently refresh invoices & balances when payments/tickets update
  useRealtimeSync(['INVOICE', 'PAYMENT', 'TICKET'], () => {
    fetchData(false);
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;

    const ticket = tickets.find((t) => t.id === Number(selectedTicketId));
    if (!ticket) return;

    setIsGeneratingInvoice(true);
    try {
      await api.post('/invoices', {
        customerId: ticket.customer.id,
        repairTicketId: ticket.id,
        invoiceType: 'REPAIR',
        taxRate: Number(taxRate),
        discountAmount: Number(discountAmount),
      });

      setShowInvoiceModal(false);
      setSelectedTicketId('');
      fetchData();
      broadcastLocalUpdate('INVOICE', 'CREATED');
      toast.success('Tax invoice generated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error generating invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setIsRecordingPayment(true);
    try {
      await api.post('/payments', {
        invoiceId: payingInvoice.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentType: payType,
        transactionNotes: payNotes || undefined,
      });

      setPayingInvoice(null);
      setPayAmount('');
      setPayNotes('');
      fetchData();
      broadcastLocalUpdate('PAYMENT', 'RECORDED');
      toast.success('Payment collected successfully! Invoice balance updated.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error recording payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!payingInvoice) return;
    setIsPayingWithRazorpay(true);
    try {
      const orderRes = await api.post<ApiResponse<RazorpayOrderData>>('/payments/razorpay/create-order', {
        invoiceId: payingInvoice.id,
        amount: payAmount ? Number(payAmount) : undefined,
      });

      if (!orderRes.data.success || !orderRes.data.data) {
        throw new Error(orderRes.data.message || 'Failed to initialize payment gateway');
      }

      const orderData = orderRes.data.data;

      await launchRazorpayCheckout(
        orderData,
        async (paymentRes) => {
          try {
            const verifyRes = await api.post<ApiResponse<Payment>>('/payments/razorpay/verify', {
              invoiceId: payingInvoice.id,
              razorpayOrderId: paymentRes.razorpay_order_id,
              razorpayPaymentId: paymentRes.razorpay_payment_id,
              razorpaySignature: paymentRes.razorpay_signature,
              paymentMethod: 'UPI',
            });
            if (verifyRes.data.success) {
              toast.success('Payment verified & settled successfully via Razorpay!');
              setPayingInvoice(null);
              setPayAmount('');
              setPayNotes('');
              fetchData();
              broadcastLocalUpdate('PAYMENT', 'RECORDED');
              broadcastLocalUpdate('INVOICE', 'SETTLED');
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        (err) => {
          toast.error(err.description || err.message || 'Payment cancelled or failed');
        },
        () => {
          setIsPayingWithRazorpay(false);
        }
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error starting Razorpay checkout');
    } finally {
      setIsPayingWithRazorpay(false);
    }
  };

  const printBill = () => {
    window.print();
  };

  const getInvoiceStatusBadge = (status: string) => {
    let variant: BadgeVariant = 'neutral';
    switch (status) {
      case 'PAID':
        variant = 'success';
        break;
      case 'PARTIALLY_PAID':
        variant = 'warning';
        break;
      case 'UNPAID':
        variant = 'danger';
        break;
      case 'CANCELLED':
        variant = 'neutral';
        break;
    }
    return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
  };

  // Financial aggregates
  const totalBilled = invoices.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalPaid = invoices.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalDue = invoices.reduce((acc, curr) => acc + (Number(curr.balanceAmount) || 0), 0);

  const invoicedTicketIds = new Set(
    invoices.filter((i) => i.repairTicket && i.status !== 'CANCELLED').map((i) => i.repairTicket!.id)
  );

  // Filter ONLY available tickets that can be billed:
  // 1. Not already invoiced
  // 2. Not in cancelled or rejected status
  // Also preserve currently selected ticket if navigated directly from tickets page
  const billableTickets = tickets.filter((t) => {
    if (selectedTicketId && t.id === Number(selectedTicketId)) return true;
    if (invoicedTicketIds.has(t.id)) return false;
    if (t.status === 'CANCELLED' || t.status === 'REJECTED') return false;
    return true;
  });

  const selectedTicket = tickets.find((t) => t.id === Number(selectedTicketId));

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customer?.fullName?.toLowerCase().includes(term) ||
      inv.customer?.phone?.includes(term) ||
      (inv.repairTicket?.ticketNumber && inv.repairTicket.ticketNumber.toLowerCase().includes(term))
    );
  });

  return (
    <>
      <Navbar
        title="Billing & Invoices"
        subtitle="GST tax invoices, settlements, and customer receipts"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* KPI Summaries */}
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <StatCard
            title="Total Invoiced"
            value={`₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={<ReceiptText size={22} />}
            iconBg="var(--status-info-bg)"
            iconColor="var(--status-info-text)"
            footnote={`${invoices.length} total bills`}
          />

          <StatCard
            title="Total Collected"
            value={`₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={<CheckCircle size={22} />}
            iconBg="var(--status-success-bg)"
            iconColor="var(--status-success-text)"
            footnote="Settled in accounts"
          />

          <StatCard
            title="Outstanding Dues"
            value={`₹${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={<AlertCircle size={22} />}
            iconBg="var(--status-warning-bg)"
            iconColor="var(--status-warning-text)"
            footnote="Receivables pending"
          />
        </div>

        {/* Action Header */}
        <div className="page-control-bar">
          <SearchInput
            placeholder="Search by invoice #, customer, phone, or ticket #..."
            value={searchTerm}
            onChange={setSearchTerm}
            maxWidth={440}
          />

          <div className="page-actions-group">
            <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
              <Plus size={16} />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-table-view" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Tax</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Collected</th>
                  <th style={{ textAlign: 'right' }}>Balance Due</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.84rem',
                            color: 'var(--primary)',
                          }}
                        >
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {inv.customer.fullName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          {inv.customer.phone}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {inv.invoiceDate}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', textAlign: 'right' }} className="tabular">
                        ₹{Number(inv.subtotal).toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', textAlign: 'right' }} className="tabular">
                        ₹{Number(inv.taxAmount).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }} className="tabular">
                        ₹{Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td style={{ color: '#059669', fontWeight: 600, textAlign: 'right' }} className="tabular">
                        ₹{Number(inv.paidAmount).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: inv.balanceAmount > 0 ? '#b45309' : 'var(--text-secondary)',
                          }}
                          className="tabular"
                        >
                          ₹{Number(inv.balanceAmount).toFixed(2)}
                        </span>
                      </td>
                      <td>{getInvoiceStatusBadge(inv.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Print / View Invoice"
                            onClick={() => setViewInvoice(inv)}
                          >
                            <Printer size={13} />
                            <span>View</span>
                          </button>
                          {inv.balanceAmount > 0 && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPayAmount(String(inv.balanceAmount));
                              }}
                            >
                              <CreditCard size={13} />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState
                        icon={ReceiptText}
                        title={loading ? 'Loading tax invoices...' : (searchTerm ? 'No matching invoices' : 'No invoices generated')}
                        description={searchTerm ? `No invoices found matching "${searchTerm}". Try another search term.` : 'Generate an invoice from a diagnosed or completed repair ticket.'}
                        actionText={!loading && !searchTerm ? 'Generate Invoice' : undefined}
                        onAction={!loading && !searchTerm ? () => setShowInvoiceModal(true) : undefined}
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
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => (
              <div key={inv.id} className="mobile-data-card">
                <div className="mobile-card-header">
                  <div>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        fontSize: '0.92rem',
                      }}
                    >
                      {inv.invoiceNumber}
                    </span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, fontSize: '0.9rem' }}>
                      {inv.customer.fullName}
                    </div>
                  </div>
                  {getInvoiceStatusBadge(inv.status)}
                </div>

                <div className="mobile-card-body">
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Date / Subtotal
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                      {inv.invoiceDate} • ₹{Number(inv.subtotal).toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Total & Balance
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }} className="tabular">
                      ₹{Number(inv.totalAmount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: inv.balanceAmount > 0 ? '#b45309' : '#059669' }} className="tabular">
                      Due: ₹{Number(inv.balanceAmount).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mobile-card-footer">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setViewInvoice(inv)}
                  >
                    <Printer size={13} />
                    <span>View Bill</span>
                  </button>

                  {inv.balanceAmount > 0 && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setPayingInvoice(inv);
                        setPayAmount(String(inv.balanceAmount));
                      }}
                    >
                      <CreditCard size={13} />
                      <span>Collect ₹{Number(inv.balanceAmount).toFixed(0)}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={loading ? 'Loading invoices...' : (searchTerm ? 'No matching invoices' : 'No invoices found')}
              description={searchTerm ? `No invoices found matching "${searchTerm}".` : 'Generate tax invoices from completed repair job tickets.'}
              actionText={!loading && !searchTerm ? 'Generate Invoice' : undefined}
              onAction={!loading && !searchTerm ? () => setShowInvoiceModal(true) : undefined}
              actionIcon={<Plus size={15} />}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: GENERATE INVOICE */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Generate Tax Invoice"
        description="Select an available repair ticket to compute parts and labor charges"
        maxWidth={600}
      >
        <form onSubmit={handleCreateInvoice}>
          <div className="form-group">
            <label className="form-label">
              Select Repair Ticket <span className="required-mark">*</span>
            </label>
            <select
              className="form-control"
              required
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value ? Number(e.target.value) : '')}
              autoFocus
            >
              <option value="">
                {billableTickets.length > 0
                  ? `-- Choose Billable Ticket (${billableTickets.length} Available) --`
                  : '-- No Pending Billable Tickets Available --'}
              </option>
              {billableTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.ticketNumber} — {t.customer?.fullName || 'Customer'} ({t.device?.brand || ''} {t.device?.modelName || 'Device'}) • ₹{Number(t.estimatedCost || 0).toLocaleString('en-IN')} [{t.status.replace(/_/g, ' ')}]
                </option>
              ))}
            </select>
            {billableTickets.length === 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'var(--status-info-bg)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: '0.80rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>All active repair tickets are already invoiced or none are pending billing.</span>
              </div>
            )}
          </div>

          {selectedTicket && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: 'rgba(0, 113, 227, 0.05)',
                border: '1px solid rgba(0, 113, 227, 0.2)',
                borderRadius: 10,
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedTicket.device?.brand} {selectedTicket.device?.modelName}
                </span>
                <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
                  {selectedTicket.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                <div>Customer: <b style={{ color: 'var(--text-primary)' }}>{selectedTicket.customer?.fullName}</b></div>
                <div>Phone: <b style={{ color: 'var(--text-primary)' }}>{selectedTicket.customer?.phone}</b></div>
                <div>Labor Fee: <b style={{ color: 'var(--text-primary)' }}>₹{Number(selectedTicket.laborCharge || 0).toFixed(2)}</b></div>
                <div>Estimated: <b style={{ color: 'var(--text-primary)' }}>₹{Number(selectedTicket.estimatedCost || 0).toFixed(2)}</b></div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">GST Tax Rate (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="form-control"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Discount (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="form-control"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowInvoiceModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isGeneratingInvoice}>
              {isGeneratingInvoice ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Tax Invoice</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECORD PAYMENT */}
      {payingInvoice && (
        <Modal
          isOpen={!!payingInvoice}
          onClose={() => setPayingInvoice(null)}
          title={`Collect Payment: ${payingInvoice.invoiceNumber}`}
          description={`Customer: ${payingInvoice.customer.fullName} | Balance Due: ₹${Number(payingInvoice.balanceAmount).toFixed(2)}`}
          maxWidth={560}
        >
          <form onSubmit={handleRecordPayment}>
            <div className="form-group">
              <label className="form-label">
                Collection Amount (₹) <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="form-control"
                required
                max={payingInvoice.balanceAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">
                  Payment Method <span className="required-mark">*</span>
                </label>
                <select
                  className="form-control"
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Counter Cash</option>
                  <option value="CARD">Credit / Debit Card POS</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS / Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Settlement Type</label>
                <select
                  className="form-control"
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                >
                  <option value="FINAL_SETTLEMENT">Final Settlement</option>
                  <option value="ADVANCE_DEPOSIT">Advance Deposit</option>
                  <option value="PARTIAL_PAYMENT">Partial Installment</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Bank Reference (UTR / Txn ID)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UTR: 329019283011"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>

            {/* Razorpay Online Checkout Option */}
            <div
              style={{
                marginTop: 16,
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                border: '1px solid rgba(0, 113, 227, 0.25)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0071e3', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={16} />
                  <span>Razorpay Instant Online Payment</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Accept UPI (GPay/PhonePe), Credit/Debit Cards, QR Code, or NetBanking with instant verification.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isPayingWithRazorpay || !payAmount || Number(payAmount) <= 0}
                onClick={handleRazorpayPayment}
                style={{
                  background: 'linear-gradient(135deg, #0071e3 0%, #4f46e5 100%)',
                  borderColor: 'transparent',
                  fontWeight: 600,
                  fontSize: '0.80rem',
                  padding: '6px 14px',
                }}
              >
                {isPayingWithRazorpay ? (
                  <>
                    <Loader2 size={13} className="spin-fast" />
                    <span>Opening Gateway...</span>
                  </>
                ) : (
                  <span>Launch Razorpay Gateway →</span>
                )}
              </button>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPayingInvoice(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isRecordingPayment}>
                {isRecordingPayment ? (
                  <>
                    <Loader2 size={15} className="spin-fast" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Issue Receipt</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: INVOICE PRINT PREVIEW (OFFICIAL TAX INVOICE) */}
      {viewInvoice && (
        <Modal
          isOpen={!!viewInvoice}
          onClose={() => setViewInvoice(null)}
          title={`Tax Invoice — ${viewInvoice.invoiceNumber}`}
          description={`Billed to ${viewInvoice.customer.fullName} on ${viewInvoice.invoiceDate}`}
          maxWidth={760}
        >
          <div
            id="printable-tax-invoice"
            style={{
              padding: '20px 24px',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--text-primary)',
                paddingBottom: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Cpu size={16} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    TechCare
                  </h2>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Computer & Device Service Center
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  GSTIN: 29ABCDE1234F1Z5 • PAN: ABCDE1234F
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  {viewInvoice.invoiceNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Date: {viewInvoice.invoiceDate}
                </div>
                <div style={{ marginTop: 4 }}>
                  {getInvoiceStatusBadge(viewInvoice.status)}
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Billed To
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)', marginTop: 2 }}>
                  {viewInvoice.customer.fullName}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Phone: {viewInvoice.customer.phone}
                </div>
                {viewInvoice.customer.address && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {viewInvoice.customer.address}
                  </div>
                )}
              </div>

              {viewInvoice.repairTicket && (
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Serviced Equipment
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: 2 }}>
                    {viewInvoice.repairTicket.device ? `${viewInvoice.repairTicket.device.brand} ${viewInvoice.repairTicket.device.modelName}` : 'Diagnostic Repair'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Repair Job #{viewInvoice.repairTicket.ticketNumber}
                  </div>
                  {viewInvoice.repairTicket.device?.serialNumber && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      SN: {viewInvoice.repairTicket.device.serialNumber}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div style={{ margin: '14px 0', overflowX: 'auto' }}>
              <table style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items && viewInvoice.items.length > 0 ? (
                    viewInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.itemName}
                        </td>
                        <td>
                          <Badge variant="neutral">{item.itemType}</Badge>
                        </td>
                        <td className="tabular">{item.quantity}</td>
                        <td className="tabular">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }} className="tabular">
                          ₹{Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)' }}>
                        No itemized parts or labor lines
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <div style={{ width: 280, maxWidth: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gross Subtotal:</span>
                  <span className="tabular">₹{Number(viewInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(viewInvoice.discountAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem', color: '#059669' }}>
                    <span>Less: Discount:</span>
                    <span className="tabular">-₹{Number(viewInvoice.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Taxable Value:</span>
                  <span className="tabular">₹{(Number(viewInvoice.subtotal) - Number(viewInvoice.discountAmount || 0)).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GST ({viewInvoice.taxRate}%):</span>
                  <span className="tabular">₹{Number(viewInvoice.taxAmount).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: 'var(--text-primary)',
                    borderTop: '1px solid var(--border-default)',
                    marginTop: 4,
                  }}
                >
                  <span>Grand Total:</span>
                  <span className="tabular">₹{Number(viewInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#059669', fontWeight: 600, fontSize: '0.88rem' }}>
                  <span>Amount Paid:</span>
                  <span className="tabular">₹{Number(viewInvoice.paidAmount).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    color: viewInvoice.balanceAmount > 0 ? '#b45309' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                  }}
                >
                  <span>Balance Due:</span>
                  <span className="tabular">₹{Number(viewInvoice.balanceAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 10,
                borderTop: '1px dashed var(--border-default)',
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <div>Thank you for choosing TechCare. 30 days workbench warranty.</div>
              <div>Computer Generated Tax Invoice</div>
            </div>
          </div>

          <div className="modal-footer no-print">
            <button className="btn btn-outline" onClick={() => setViewInvoice(null)}>
              Close
            </button>
            <button className="btn btn-primary" onClick={printBill}>
              <Printer size={15} />
              <span>Print Official Invoice</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};
