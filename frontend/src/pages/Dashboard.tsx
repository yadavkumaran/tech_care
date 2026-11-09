import React, { useEffect, useState, useMemo } from 'react';
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
  Users,
  AlertCircle,
  Package,
  Flame,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatCard } from '../components/ui/StatCard';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../api/client';
import { ApiResponse, DashboardStats } from '../types';
import { LayoutContextType } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useRealtimeSync } from '../context/SyncContext';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, hasRole } = useAuth();
  const outletContext = useOutletContext<LayoutContextType | null>();

  const isTechnician = hasRole('TECHNICIAN') && !hasRole('ADMIN');
  const isReceptionist = hasRole('RECEPTIONIST') && !hasRole('ADMIN');
  const [techFilter, setTechFilter] = useState<'ONGOING' | 'READY' | 'ALL'>('ONGOING');

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

  const getDashboardTitle = () => {
    if (isTechnician) return 'Technician Workbench';
    if (isReceptionist) return 'Service Desk Overview';
    return 'Operations & Financial Dashboard';
  };

  const getDashboardSubtitle = () => {
    if (isTechnician) return `Workbench assignment for ${user?.fullName || 'Technician'} • ${todayStr}`;
    if (isReceptionist) return `Front-desk intake & customer handover • ${todayStr}`;
    return `Executive business & workshop overview • ${todayStr}`;
  };

  const ticketsToDisplay = useMemo(() => {
    const raw = (isTechnician && stats?.myAssignedTickets && stats.myAssignedTickets.length > 0)
      ? stats.myAssignedTickets
      : (stats?.recentTickets || []);

    if (!isTechnician) return raw;

    if (techFilter === 'ONGOING') {
      return raw.filter((t) => t.status !== 'DELIVERED' && t.status !== 'CANCELLED' && t.status !== 'READY_FOR_DELIVERY');
    }
    if (techFilter === 'READY') {
      return raw.filter((t) => t.status === 'READY_FOR_DELIVERY');
    }
    return raw;
  }, [isTechnician, stats, techFilter]);

  return (
    <>
      <Navbar
        title={getDashboardTitle()}
        subtitle={getDashboardSubtitle()}
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* KPI Counter Grid (Tailored per role) */}
        <div className="stat-grid">
          {isTechnician ? (
            <>
              <StatCard
                title="My Active Queue"
                value={stats?.myActiveJobsCount ?? (loading ? '—' : 0)}
                icon={<Wrench size={22} />}
                iconBg="var(--status-info-bg)"
                iconColor="var(--status-info-text)"
                footnote="Assigned to your bench"
              />

              <StatCard
                title="Total Cases Handled"
                value={stats?.myCompletedCasesCount ?? (loading ? '—' : 0)}
                icon={<CheckCircle2 size={22} />}
                iconBg="var(--status-success-bg)"
                iconColor="var(--status-success-text)"
                footnote="Repairs completed by you"
              />

              <StatCard
                title="Due Today (Last Date)"
                value={stats?.dueTodayCount ?? (loading ? '—' : 0)}
                icon={<Flame size={22} />}
                iconBg="rgba(239, 68, 68, 0.12)"
                iconColor="var(--status-danger)"
                footnote="Promised completion today"
              />

              <StatCard
                title="High Priority Jobs"
                value={stats?.myHighPriorityCount ?? (loading ? '—' : 0)}
                icon={<AlertCircle size={22} />}
                iconBg="var(--status-danger-bg)"
                iconColor="var(--status-danger-text)"
                footnote="Urgent & high priority"
              />
            </>
          ) : isReceptionist ? (
            <>
              <StatCard
                title="Active Repair Queue"
                value={stats?.totalActiveRepairs ?? (loading ? '—' : 0)}
                icon={<Wrench size={22} />}
                iconBg="var(--status-info-bg)"
                iconColor="var(--status-info-text)"
                footnote="Devices under service"
              />

              <StatCard
                title="Pending Quote Approvals"
                value={stats?.pendingApprovalCount ?? (loading ? '—' : 0)}
                icon={<Clock size={22} />}
                iconBg="var(--status-warning-bg)"
                iconColor="var(--status-warning-text)"
                footnote="Call customer to confirm"
              />

              <StatCard
                title="Ready for Customer Pickup"
                value={stats?.readyForDeliveryCount ?? (loading ? '—' : 0)}
                icon={<CheckCircle2 size={22} />}
                iconBg="var(--status-success-bg)"
                iconColor="var(--status-success-text)"
                footnote="Handover at front counter"
              />

              <StatCard
                title="Registered Clients"
                value={stats?.totalCustomersCount ?? (loading ? '—' : 0)}
                icon={<Users size={22} />}
                iconBg="rgba(147, 51, 234, 0.12)"
                iconColor="#9333ea"
                footnote="Total customer records"
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* SLA Due Today & Overdue Alert Banner */}
        {((stats?.dueTodayCount || 0) > 0 || (stats?.overdueCount || 0) > 0) && (
          <div
            style={{
              marginTop: 16,
              marginBottom: 16,
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Flame size={20} color="var(--status-danger)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Target Date SLA Alert: {stats?.dueTodayCount || 0} repair job{(stats?.dueTodayCount || 0) !== 1 ? 's' : ''} promised for completion TODAY
                  {(stats?.overdueCount || 0) > 0 ? ` & ${stats?.overdueCount} overdue` : ''}!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Prioritize these jobs before workbench closing so customer delivery commitments are honored.
                </div>
              </div>
            </div>
            <Link
              to="/tickets?filter=DUE_TODAY"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.78rem', height: 32, gap: 6 }}
            >
              <Flame size={14} />
              <span>View Due Today ({stats?.dueTodayCount || 0}) →</span>
            </Link>
          </div>
        )}

        {/* Section below KPIs: Technician Workbench Banner OR Financial Highlights */}
        {isTechnician ? (
          <div
            className="card"
            style={{
              marginBottom: 20,
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.06) 0%, rgba(0, 113, 227, 0.02) 100%)',
              border: '1px solid rgba(0, 113, 227, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Workstation: {user?.fullName || 'Technician'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                You have <strong>{stats?.myActiveJobsCount || 0} active jobs</strong> currently on your bench. Diagnose faults, consume needed spare parts, and mark ready for delivery once repair QA is verified.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/tickets" className="btn btn-primary btn-sm">
                <Wrench size={14} />
                <span>My Assigned Tickets</span>
              </Link>
              <Link to="/inventory" className="btn btn-outline btn-sm">
                <Package size={14} />
                <span>Check Parts Inventory</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Financial Highlights (Only shown for Admin and Receptionist) */
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
                    {isReceptionist ? "Today's Counter Collections" : "Today's Collected Revenue"}
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
                <span>Cash, UPI, and Card receipts today</span>
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
                    {isReceptionist ? 'Unsettled Delivery Invoices' : 'Outstanding Customer Dues'}
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
                Total unpaid and partially settled invoices to collect
              </div>
            </div>
          </div>
        )}

        {/* Repair Tickets Table */}
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
                <h3 className="card-title">
                  {isTechnician ? 'My Assigned Workbench Jobs' : 'Recent Repair Tickets'}
                </h3>
                {ticketsToDisplay.length > 0 && (
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
                    {ticketsToDisplay.length} jobs
                  </span>
                )}
              </div>
              <p className="card-subtitle">
                {isTechnician
                  ? 'Customer hardware assigned to your station for diagnostics & repair'
                  : 'Latest customer devices serviced on the workbench'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {isTechnician && (
                <div className="segmented-control" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`segmented-btn ${techFilter === 'ONGOING' ? 'active' : ''}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => setTechFilter('ONGOING')}
                  >
                    Ongoing Bench Jobs
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${techFilter === 'READY' ? 'active' : ''}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => setTechFilter('READY')}
                  >
                    Ready for Pickup
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${techFilter === 'ALL' ? 'active' : ''}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => setTechFilter('ALL')}
                  >
                    All My Jobs
                  </button>
                </div>
              )}
              <Link to="/tickets" className="btn btn-outline btn-sm">
                <span>View All Tickets</span>
                <ArrowRight size={14} />
              </Link>
            </div>
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
                  {ticketsToDisplay.length > 0 ? (
                    ticketsToDisplay.map((t) => (
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
            {ticketsToDisplay.length > 0 ? (
              ticketsToDisplay.map((t) => (
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
