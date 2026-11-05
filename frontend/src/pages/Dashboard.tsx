import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import api from '../api/client';
import { ApiResponse, DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge badge-neutral">Received</span>;
      case 'DIAGNOSING':
        return <span className="badge badge-info">Diagnosing</span>;
      case 'ESTIMATION_PENDING':
        return <span className="badge badge-warning">Pending Approval</span>;
      case 'APPROVED':
      case 'IN_PROGRESS':
        return <span className="badge badge-info">In Progress</span>;
      case 'READY_FOR_DELIVERY':
        return <span className="badge badge-success">Ready for Delivery</span>;
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <>
      <Navbar title="Operational Dashboard" />
      <div className="page-body">
        {/* KPI Counter Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Wrench size={24} />
            </div>
            <div>
              <div className="stat-title">Active Repairs</div>
              <div className="stat-value">{stats?.totalActiveRepairs ?? 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-title">Pending Quotes</div>
              <div className="stat-value">{stats?.pendingApprovalCount ?? 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="stat-title">Ready for Pickup</div>
              <div className="stat-value">{stats?.readyForDeliveryCount ?? 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="stat-title">Low Stock Items</div>
              <div className="stat-value">{stats?.lowStockCount ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Today's Collected Revenue</span>
              <IndianRupee size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>
              ₹{Number(stats?.todayRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              Cash, UPI and Card collections for {new Date().toLocaleDateString()}
            </div>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Outstanding Customer Dues</span>
              <FileText size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#d97706' }}>
              ₹{Number(stats?.totalOutstandingDues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              Total unpaid and partially paid invoice balances
            </div>
          </div>
        </div>

        {/* Recent Repair Tickets */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Recent Repair Tickets</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Latest computers and laptops serviced in the shop
              </p>
            </div>
            <Link to="/tickets" className="btn btn-primary btn-sm">
              <PlusCircle size={15} />
              <span>View All Tickets</span>
            </Link>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Customer</th>
                  <th>Device</th>
                  <th>Reported Issue</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentTickets && stats.recentTickets.length > 0 ? (
                  stats.recentTickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{t.ticketNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.customer.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.customer.phone}</div>
                      </td>
                      <td>
                        <div>{t.device.brand} {t.device.modelName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t.device.deviceType}</div>
                      </td>
                      <td style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.problemReported}
                      </td>
                      <td>
                        {t.assignedTechnician ? (
                          <span>{t.assignedTechnician.fullName}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      {loading ? 'Loading tickets...' : 'No tickets found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

