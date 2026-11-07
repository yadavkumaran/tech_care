import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  FileText,
  ArrowRight,
  TrendingUp,
  Laptop,
  CheckCircle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/ui/StatCard';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../api/client';
import { ApiResponse, DashboardStats } from '../types';
import { LayoutContextType } from '../components/Layout';
import { useRealtimeSync } from '../context/SyncContext';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchStats();
  }, []);

  // Real-time synchronization: refresh dashboard metrics when any workshop, billing, or inventory event occurs
  useRealtimeSync(['TICKET', 'INVOICE', 'PAYMENT', 'INVENTORY'], () => {
    fetchStats();
  });

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
    let variant: BadgeVariant = 'neutral';
    let label = status.replace(/_/g, ' ');

    switch (status) {
      case 'RECEIVED':
        variant = 'neutral';
        label = 'Received';
        break;
      case 'DIAGNOSING':
        variant = 'info';
        label = 'Diagnosing';
        break;
      case 'ESTIMATION_PENDING':
        variant = 'warning';
        label = 'Pending Quote';
        break;
      case 'APPROVED':
        variant = 'info';
        label = 'Approved';
        break;
      case 'IN_PROGRESS':
        variant = 'info';
        label = 'In Progress';
        break;
      case 'WAITING_FOR_PARTS':
        variant = 'purple';
        label = 'Waiting Parts';
        break;
      case 'ON_HOLD':
        variant = 'warning';
        label = 'On Hold';
        break;
      case 'READY_FOR_DELIVERY':
        variant = 'success';
        label = 'Ready for Pickup';
        break;
      case 'DELIVERED':
        variant = 'success';
        label = 'Delivered';
        break;
      case 'CANCELLED':
      case 'REJECTED':
        variant = 'danger';
        label = status === 'CANCELLED' ? 'Cancelled' : 'Rejected';
        break;
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <>
      <Navbar
        title="Operations Dashboard"
        subtitle={`Live overview for ${todayStr}`}
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* KPI Counter Grid */}
        <div className="stat-grid">
          <StatCard
            title="Active Repairs"
            value={stats?.totalActiveRepairs ?? (loading ? '—' : 0)}
            icon={<Wrench size={22} />}
            iconBg="var(--status-info-bg)"
            iconColor="var(--status-info-text)"
            footnote="In workbench queue"
          />

          <StatCard
            title="Pending Quotes"
            value={stats?.pendingApprovalCount ?? (loading ? '—' : 0)}
            icon={<Clock size={22} />}
            iconBg="var(--status-warning-bg)"
            iconColor="var(--status-warning-text)"
            footnote="Awaiting customer approval"
          />

          <StatCard
            title="Ready for Pickup"
            value={stats?.readyForDeliveryCount ?? (loading ? '—' : 0)}
            icon={<CheckCircle2 size={22} />}
            iconBg="var(--status-success-bg)"
            iconColor="var(--status-success-text)"
            footnote="QA passed & bench-tested"
          />

          <StatCard
            title="Low Stock Items"
            value={stats?.lowStockCount ?? (loading ? '—' : 0)}
            icon={<AlertTriangle size={22} />}
            iconBg="var(--status-danger-bg)"
            iconColor="var(--status-danger-text)"
            footnote="Below reorder threshold"
          />
        </div>

        {/* Financial Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div className="card" style={{ margin: 0, padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--status-success-bg)',
                    color: 'var(--status-success-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IndianRupee size={18} />
                </div>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Today's Collected Revenue
                </span>
              </div>
              <Badge variant="success">Settled</Badge>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
              className="tabular"
            >
              ₹{Number(stats?.todayRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-tertiary)',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <TrendingUp size={13} color="#059669" />
              <span>Cash, UPI, and Card collections today</span>
            </div>
          </div>

          <div className="card" style={{ margin: 0, padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'var(--status-warning-bg)',
                    color: 'var(--status-warning-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} />
                </div>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Outstanding Customer Dues
                </span>
              </div>
              <Badge variant="warning">Receivables</Badge>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#b45309',
              }}
              className="tabular"
            >
              ₹{Number(stats?.totalOutstandingDues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-tertiary)',
                marginTop: 6,
              }}
            >
              Total unpaid and partially settled invoices
            </div>
          </div>
        </div>

        {/* Recent Repair Tickets */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="card-title">Recent Repair Tickets</h3>
                {stats?.recentTickets && stats.recentTickets.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-default)',
                      padding: '2px 7px',
                      borderRadius: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {stats.recentTickets.length} active
                  </span>
                )}
              </div>
              <p className="card-subtitle">
                Latest customer devices serviced on the workbench
              </p>
            </div>
            <Link to="/tickets" className="btn btn-outline btn-sm">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Customer</th>
                    <th>Device Under Repair</th>
                    <th>Reported Issue</th>
                    <th>Assigned Tech</th>
                    <th>Status</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentTickets && stats.recentTickets.length > 0 ? (
                    stats.recentTickets.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700 }}>
                          <Link
                            to="/tickets"
                            style={{
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {t.ticketNumber}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t.customer.fullName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                            {t.customer.phone}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                            }}
                          >
                            <Laptop size={14} color="var(--text-tertiary)" />
                            <span>
                              {t.device ? `${t.device.brand} ${t.device.modelName}` : 'Equipment'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {t.device?.deviceType || 'Hardware'}
                          </div>
                        </td>
                        <td
                          style={{
                            maxWidth: 240,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={t.problemReported}
                        >
                          {t.problemReported}
                        </td>
                        <td>
                          {t.assignedTechnician ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {t.assignedTechnician.fullName[0]}
                              </div>
                              <span>{t.assignedTechnician.fullName}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td>{getStatusBadge(t.status)}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={Wrench}
                          title={loading ? 'Loading active tickets...' : 'No active repairs in the shop'}
                          description={
                            loading
                              ? 'Fetching latest workbench updates...'
                              : 'All customer jobs are completed. Create a new intake ticket to get started.'
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-list" style={{ padding: 12 }}>
            {stats?.recentTickets && stats.recentTickets.length > 0 ? (
              stats.recentTickets.map((t) => (
                <div key={t.id} className="mobile-data-card">
                  <div className="mobile-card-header">
                    <div>
                      <div
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {t.ticketNumber}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {t.customer.fullName}
                      </div>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  <div className="mobile-card-body">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Device
                      </div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>
                        {t.device ? `${t.device.brand} ${t.device.modelName}` : 'Equipment'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Assigned Tech
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                        {t.assignedTechnician ? t.assignedTechnician.fullName : 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {t.problemReported}
                    </div>
                    <Link to="/tickets" className="btn btn-outline btn-sm">
                      <span>View</span>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Wrench}
                title={loading ? 'Loading active tickets...' : 'No active repairs in the shop'}
                description="All customer jobs are completed. Create a new intake ticket to get started."
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
