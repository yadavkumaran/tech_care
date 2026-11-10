import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Printer,
  ShoppingBag,
  Wrench,
  Loader2,
  AlertCircle,
  Cpu,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Phone,
} from 'lucide-react';
import api from '../api/client';
import { ApiResponse } from '../types';
import { launchRazorpayCheckout, RazorpayOrderData } from '../utils/razorpay';

interface PublicInvoiceItem {
  itemName: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PublicInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: 'REPAIR' | 'DIRECT_SALE';
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  customerName: string;
  customerPhoneMasked: string;
  customerAddress?: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  items: PublicInvoiceItem[];
  companyName: string;
  gstin: string;
  repairTicketNumber?: string;
  deviceDescription?: string;
}

export const PublicInvoicePay: React.FC = () => {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingOnline, setPayingOnline] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (invoiceNumber) {
      fetchInvoice(invoiceNumber);
    }
  }, [invoiceNumber]);

  const fetchInvoice = async (invNum: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ApiResponse<PublicInvoice>>(
        `/public/invoices/${encodeURIComponent(invNum.trim().toUpperCase())}`
      );
      if (res.data.success && res.data.data) {
        setInvoice(res.data.data);
      } else {
        setError('Invoice not found. Please verify the invoice number.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invoice not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!invoice || invoice.balanceAmount <= 0) return;
    setPayingOnline(true);
    try {
      const orderRes = await api.post<ApiResponse<RazorpayOrderData>>(
        '/public/invoices/payments/razorpay/create-order',
        {
          invoiceId: invoice.id,
          amount: invoice.balanceAmount,
        }
      );

      if (!orderRes.data.success || !orderRes.data.data) {
        throw new Error(orderRes.data.message || 'Failed to initialize payment gateway');
      }

      const orderData = orderRes.data.data;

      await launchRazorpayCheckout(
        orderData,
        async (paymentRes) => {
          try {
            const verifyRes = await api.post<ApiResponse<any>>(
              '/public/invoices/payments/razorpay/verify',
              {
                invoiceId: invoice.id,
                razorpayOrderId: paymentRes.razorpay_order_id,
                razorpayPaymentId: paymentRes.razorpay_payment_id,
                razorpaySignature: paymentRes.razorpay_signature,
                paymentMethod: 'UPI',
              }
            );

            if (verifyRes.data.success) {
              setPaymentSuccess(true);
              fetchInvoice(invoice.invoiceNumber);
            }
          } catch (err: any) {
            alert(err.response?.data?.message || 'Payment verification failed. Please contact support.');
          }
        },
        (err) => {
          alert(err.description || err.message || 'Payment was cancelled or could not be completed.');
        },
        () => {
          setPayingOnline(false);
        }
      );
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error opening payment gateway.');
    } finally {
      setPayingOnline(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary, #f8fafc)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--primary, #0071e3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary, #1e293b)' }}>
              TechCare
            </span>
          </div>

          <Link
            to="/track"
            style={{
              fontSize: '0.84rem',
              color: 'var(--primary, #0071e3)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Track Repair Status →
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16 }}>
            <Loader2 size={32} className="spin-fast" color="var(--primary, #0071e3)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem' }}>
              Retrieving invoice details...
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #fee2e2',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: '1.1rem' }}>Invoice Not Found</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)', fontSize: '0.88rem' }}>{error}</p>
          </div>
        )}

        {/* Invoice View */}
        {!loading && invoice && (
          <div>
            {/* Payment Success Banner */}
            {paymentSuccess && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '14px 18px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.92rem' }}>
                    Payment Successful & Verified!
                  </div>
                  <div style={{ color: '#047857', fontSize: '0.82rem' }}>
                    Thank you! Your payment has been received and credited to your account.
                  </div>
                </div>
              </div>
            )}

            {/* Main Tax Invoice Card */}
            <div
              id="printable-customer-invoice"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                border: '1px solid var(--border-default, #e2e8f0)',
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Invoice Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  borderBottom: '2px solid var(--text-primary, #1e293b)',
                  paddingBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: '#0071e3',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Cpu size={14} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>TechCare</h2>
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#64748b' }}>
                    Computer & Device Service Center
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontFamily: 'monospace' }}>
                    GSTIN: {invoice.gstin}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#0071e3',
                    }}
                  >
                    {invoice.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 4 }}>
                    Date: {invoice.invoiceDate}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {invoice.status === 'PAID' ? (
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        PAID
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: '1px solid #fde68a',
                        }}
                      >
                        {invoice.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer & Equipment / Sale Info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  padding: '16px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                    Billed To
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#1e293b', marginTop: 2 }}>
                    {invoice.customerName}
                  </div>
                  <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 2 }}>
                    Phone: {invoice.customerPhoneMasked}
                  </div>
                  {invoice.customerAddress && (
                    <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 2 }}>
                      {invoice.customerAddress}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                    Invoice Type
                  </div>
                  {invoice.invoiceType === 'DIRECT_SALE' ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShoppingBag size={14} color="#0071e3" />
                        <span>Direct Hardware & Retail Sale</span>
                      </div>
                      <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 2 }}>
                        Over-the-Counter Hardware Purchase
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Wrench size={14} color="#0071e3" />
                        <span>{invoice.deviceDescription || 'Diagnostic Repair Service'}</span>
                      </div>
                      {invoice.repairTicketNumber && (
                        <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 2 }}>
                          Job Ticket #{invoice.repairTicketNumber}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ margin: '16px 0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Item Description</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Type</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Qty</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Rate</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: 500, color: '#1e293b' }}>
                            {item.itemName}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem' }}>
                              {item.itemType}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.quantity}</td>
                          <td style={{ padding: '10px', fontFamily: 'monospace' }}>₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                            ₹{Number(item.totalPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div style={{ width: 280, maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem' }}>
                    <span style={{ color: '#64748b' }}>Gross Subtotal:</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(invoice.discountAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem', color: '#059669' }}>
                      <span>Discount:</span>
                      <span style={{ fontFamily: 'monospace' }}>-₹{Number(invoice.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem', fontWeight: 600 }}>
                    <span style={{ color: '#1e293b' }}>Taxable Value:</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      ₹{(Number(invoice.subtotal) - Number(invoice.discountAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.84rem' }}>
                    <span style={{ color: '#64748b' }}>GST ({invoice.taxRate}%):</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{Number(invoice.taxAmount).toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderTop: '1px solid #e2e8f0',
                      borderBottom: '1px solid #e2e8f0',
                      marginTop: 4,
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#1e293b',
                    }}
                  >
                    <span>Grand Total:</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{Number(invoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem', color: '#059669', fontWeight: 600 }}>
                    <span>Amount Paid:</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{Number(invoice.paidAmount).toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      fontSize: '0.96rem',
                      fontWeight: 700,
                      color: invoice.balanceAmount > 0 ? '#b45309' : '#059669',
                    }}
                  >
                    <span>Balance Due:</span>
                    <span style={{ fontFamily: 'monospace' }}>₹{Number(invoice.balanceAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar (Razorpay Online Pay or Print) */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: '0.88rem',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>

              {invoice.balanceAmount > 0 && (
                <button
                  type="button"
                  disabled={payingOnline}
                  onClick={handleOnlinePayment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #0071e3 0%, #4f46e5 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
                  }}
                >
                  {payingOnline ? (
                    <>
                      <Loader2 size={16} className="spin-fast" />
                      <span>Opening Payment Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={17} />
                      <span>Pay ₹{Number(invoice.balanceAmount).toFixed(2)} via UPI / Card</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Footer Shop Info */}
            <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.80rem', color: '#94a3b8' }}>
              <div>TechCare Computer & Device Service Center • Mon - Sat: 10:00 AM - 8:00 PM</div>
              <div style={{ marginTop: 4 }}>For questions or support, contact +91 98765 43210</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
