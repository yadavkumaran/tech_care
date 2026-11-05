import React, { useEffect, useState } from 'react';
import { Plus, ReceiptText, CreditCard, Printer, Search, CheckCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, Customer, Invoice, Payment, RepairTicket } from '../types';

export const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, tktRes, custRes] = await Promise.all([
        api.get<ApiResponse<Invoice[]>>('/invoices'),
        api.get<ApiResponse<RepairTicket[]>>('/tickets'),
        api.get<ApiResponse<Customer[]>>('/customers'),
      ]);

      if (invRes.data.success) setInvoices(invRes.data.data);
      if (tktRes.data.success) setTickets(tktRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;

    const ticket = tickets.find((t) => t.id === Number(selectedTicketId));
    if (!ticket) return;

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
      alert('Tax invoice generated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error generating invoice');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

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
      alert('Payment recorded successfully! Invoice balance updated.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording payment');
    }
  };

  const printBill = () => {
    window.print();
  };

  return (
    <>
      <Navbar title="Billing & Invoicing" />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Official GST/Tax invoices generated for computer repairs and counter sales
          </p>

          <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
            <Plus size={18} />
            <span>Generate Invoice from Ticket</span>
          </button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.customer.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.customer.phone}</div>
                      </td>
                      <td>{inv.invoiceDate}</td>
                      <td>₹{Number(inv.subtotal).toFixed(2)}</td>
                      <td>₹{Number(inv.taxAmount).toFixed(2)}</td>
                      <td style={{ fontWeight: 700 }}>₹{Number(inv.totalAmount).toFixed(2)}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>₹{Number(inv.paidAmount).toFixed(2)}</td>
                      <td style={{ color: inv.balanceAmount > 0 ? '#d97706' : '#64748b', fontWeight: 600 }}>
                        ₹{Number(inv.balanceAmount).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : inv.status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-danger'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="Print / View Invoice"
                            onClick={() => setViewInvoice(inv)}
                          >
                            <Printer size={14} />
                          </button>
                          {inv.balanceAmount > 0 && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPayAmount(String(inv.balanceAmount));
                              }}
                            >
                              <CreditCard size={14} />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      {loading ? 'Loading invoices...' : 'No invoices generated yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: GENERATE INVOICE */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0' }}>Generate Invoice from Repair Ticket</h3>
            <form onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label className="form-label">Select Repair Ticket *</label>
                <select
                  className="form-control"
                  required
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(Number(e.target.value))}
                >
                  <option value="">-- Choose Ticket --</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.ticketNumber} – {t.customer.fullName} ({t.device.brand} {t.device.modelName}) [{t.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">GST Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Tax Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT */}
      {payingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 8px 0' }}>Collect Payment: {payingInvoice.invoiceNumber}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Customer: <b>{payingInvoice.customer.fullName}</b> | Balance Due: <b>₹{Number(payingInvoice.balanceAmount).toFixed(2)}</b>
            </p>

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label className="form-label">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  required
                  max={payingInvoice.balanceAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-control"
                    value={payMethod}
                    onChange={(e: any) => setPayMethod(e.target.value)}
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Type</label>
                  <select
                    className="form-control"
                    value={payType}
                    onChange={(e) => setPayType(e.target.value)}
                  >
                    <option value="FINAL_SETTLEMENT">Final Settlement</option>
                    <option value="ADVANCE_DEPOSIT">Advance Deposit</option>
                    <option value="PARTIAL_PAYMENT">Partial Payment</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Notes / Reference (UTR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. UTR: 329019283011"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPayingInvoice(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE PRINT PREVIEW */}
      {viewInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a' }}>TechCare</h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Computer & Laptop Service Center</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>GSTIN: 29ABCDE1234F1Z5</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#2563eb' }}>{viewInvoice.invoiceNumber}</h3>
                <div style={{ fontSize: '0.85rem' }}>Date: {viewInvoice.invoiceDate}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Billed To:</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{viewInvoice.customer.fullName}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{viewInvoice.customer.phone}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{viewInvoice.customer.address}</div>
              </div>
              {viewInvoice.repairTicket && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Serviced Device:</div>
                  <div style={{ fontWeight: 600 }}>{viewInvoice.repairTicket.device.brand} {viewInvoice.repairTicket.device.modelName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Ticket #{viewInvoice.repairTicket.ticketNumber}</div>
                </div>
              )}
            </div>

            <table style={{ margin: '20px 0', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr>
                  <th>Description</th>
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
                      <td style={{ fontWeight: 500 }}>{item.itemName}</td>
                      <td><span className="badge badge-neutral">{item.itemType}</span></td>
                      <td>{item.quantity}</td>
                      <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{ textAlign: 'center' }}>No item details</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ width: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span>₹{Number(viewInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>GST ({viewInvoice.taxRate}%):</span>
                  <span>₹{Number(viewInvoice.taxAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span>Discount:</span>
                  <span>-₹{Number(viewInvoice.discountAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total Amount:</span>
                  <span>₹{Number(viewInvoice.totalAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#059669', fontWeight: 600 }}>
                  <span>Amount Paid:</span>
                  <span>₹{Number(viewInvoice.paidAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: viewInvoice.balanceAmount > 0 ? '#d97706' : '#64748b', fontWeight: 700 }}>
                  <span>Balance Due:</span>
                  <span>₹{Number(viewInvoice.balanceAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setViewInvoice(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={printBill}>
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

