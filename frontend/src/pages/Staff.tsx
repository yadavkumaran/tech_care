import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Shield,
  Phone,
  Mail,
  User as UserIcon,
  CheckCircle,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  Lock,
  IndianRupee,
  Receipt,
  Printer,
  Calendar,
  Wallet,
  TrendingDown,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/ui/Modal';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTableRows, SkeletonCard } from '../components/ui/LoadingSequence';
import api from '../api/client';
import { ApiResponse, User, SalarySettlement } from '../types';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

export const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STAFF' | 'SALARIES'>('STAFF');

  // Salary Settlements State
  const [settlements, setSettlements] = useState<SalarySettlement[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [payslipModal, setPayslipModal] = useState<SalarySettlement | null>(null);

  // Quick Base Salary Modal State
  const [salaryModalStaff, setSalaryModalStaff] = useState<User | null>(null);
  const [quickBaseSalary, setQuickBaseSalary] = useState('0');
  const [isSavingBaseSalary, setIsSavingBaseSalary] = useState(false);

  // Settle Salary Form State
  const [settleStaffId, setSettleStaffId] = useState<number | ''>('');
  const [settleMonth, setSettleMonth] = useState('');
  const [settleBase, setSettleBase] = useState('0');
  const [settleBonus, setSettleBonus] = useState('0');
  const [settleDeductions, setSettleDeductions] = useState('0');
  const [settleMethod, setSettleMethod] = useState('BANK_TRANSFER');
  const [settleRef, setSettleRef] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // Staff Modal State (Create & Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'RECEPTIONIST' | 'TECHNICIAN'>('TECHNICIAN');
  const [baseSalary, setBaseSalary] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Button loading state
  const [savingStaff, setSavingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Password Policy Validation Criteria
  const passwordCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const passedCriteriaCount = Object.values(passwordCriteria).filter(Boolean).length;
  const strengthLabel =
    password.length === 0
      ? 'Not Set'
      : passedCriteriaCount <= 2
      ? 'Weak'
      : passedCriteriaCount <= 4
      ? 'Moderate'
      : 'Strong & Compliant';
  const strengthColor =
    passedCriteriaCount <= 2
      ? 'var(--status-danger, #ef4444)'
      : passedCriteriaCount <= 4
      ? 'var(--status-warning, #f59e0b)'
      : 'var(--status-success, #10b981)';

  const generateStrongPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const specials = '@$!%*?&#^';

    let pwd = '';
    for (let i = 0; i < 3; i++) pwd += uppers[Math.floor(Math.random() * uppers.length)];
    for (let i = 0; i < 4; i++) pwd += lowers[Math.floor(Math.random() * lowers.length)];
    for (let i = 0; i < 3; i++) pwd += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 0; i < 2; i++) pwd += specials[Math.floor(Math.random() * specials.length)];

    const shuffled = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setPassword(shuffled);
    setShowPassword(true);
    toast.info('Strong compliant password generated and applied.');
  };

  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();

  useEffect(() => {
    fetchStaff(true);
    fetchSettlements();
  }, []);

  // Real-time synchronization: refresh staff roster & settlements
  useRealtimeSync(['STAFF'], () => {
    fetchStaff(false);
    fetchSettlements();
  });

  const fetchStaff = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get<ApiResponse<User[]>>('/staff');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchSettlements = async () => {
    setSettlementsLoading(true);
    try {
      const res = await api.get<ApiResponse<SalarySettlement[]>>('/salaries');
      if (res.data.success) {
        setSettlements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load salary settlements', err);
    } finally {
      setSettlementsLoading(false);
    }
  };

  const getDefaultSalaryMonth = () => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const openSettleModal = (staff?: User) => {
    const target = staff || staffList.find((s) => s.isActive) || staffList[0];
    setSettleStaffId(target ? target.id : '');
    setSettleBase(target && target.baseSalary != null ? String(target.baseSalary) : '0');
    setSettleBonus('0');
    setSettleDeductions('0');
    setSettleMonth(getDefaultSalaryMonth());
    setSettleMethod('BANK_TRANSFER');
    setSettleRef('');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleNotes('');
    setShowSettleModal(true);
  };

  const handleStaffSelectInSettle = (staffIdNum: number | '') => {
    if (staffIdNum === '' || isNaN(Number(staffIdNum)) || Number(staffIdNum) <= 0) {
      setSettleStaffId('');
      return;
    }
    const cleanId = Number(staffIdNum);
    setSettleStaffId(cleanId);
    const found = staffList.find((s) => s.id === cleanId);
    if (found) {
      setSettleBase(found.baseSalary != null ? String(found.baseSalary) : '0');
    }
  };

  const openQuickBaseSalaryModal = (staff: User) => {
    setSalaryModalStaff(staff);
    setQuickBaseSalary(staff.baseSalary != null ? String(staff.baseSalary) : '0');
  };

  const handleQuickBaseSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModalStaff) return;
    setIsSavingBaseSalary(true);
    try {
      const res = await api.patch<ApiResponse<User>>(`/staff/${salaryModalStaff.id}/base-salary`, {
        baseSalary: Number(quickBaseSalary || 0),
      });
      if (res.data.success) {
        toast.success(`Base salary for ${salaryModalStaff.fullName} set to ₹${Number(quickBaseSalary || 0).toLocaleString('en-IN')}`);
        setSalaryModalStaff(null);
        fetchStaff(false);
        broadcastLocalUpdate('STAFF', 'UPDATED');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update base salary');
    } finally {
      setIsSavingBaseSalary(false);
    }
  };

  const calculatedNetSalary = Math.max(
    0,
    Number(settleBase || 0) + Number(settleBonus || 0) - Number(settleDeductions || 0)
  );

  const handleSettleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleStaffId || Number(settleStaffId) <= 0) {
      toast.error('Please select an active employee from the list');
      return;
    }
    if (!settleMonth.trim()) {
      toast.error('Please specify the salary month');
      return;
    }

    setIsSubmittingSettlement(true);
    try {
      const res = await api.post<ApiResponse<SalarySettlement>>('/salaries/settle', {
        staffId: Number(settleStaffId),
        salaryMonth: settleMonth.trim(),
        baseSalary: Number(settleBase || 0),
        bonus: Number(settleBonus || 0),
        deductions: Number(settleDeductions || 0),
        paymentMethod: settleMethod,
        transactionRef: settleRef.trim() || undefined,
        paymentDate: settleDate || new Date().toISOString().split('T')[0],
        notes: settleNotes.trim() || undefined,
      });

      if (res.data.success && res.data.data) {
        toast.success(`Salary settled successfully for ${res.data.data.staffName}!`);
        setShowSettleModal(false);
        fetchSettlements();
        fetchStaff(false);
        broadcastLocalUpdate('STAFF', 'UPDATED');
        setPayslipModal(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to settle salary');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  const handleDeleteSettlement = async (id: number) => {
    if (window.confirm('Are you sure you want to remove/void this salary disbursement record?')) {
      try {
        await api.delete(`/salaries/${id}`);
        toast.success('Salary record removed');
        fetchSettlements();
        broadcastLocalUpdate('STAFF', 'UPDATED');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error deleting settlement record');
      }
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedStaffId(null);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('TECHNICIAN');
    setBaseSalary('0');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setIsEditing(true);
    setSelectedStaffId(u.id);
    setUsername(u.username);
    setPassword('');
    setShowPassword(false);
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setBaseSalary(String(u.baseSalary || 0));
    setIsActive(u.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !isPasswordValid) {
      toast.warning('Please meet all strict password requirements before registering staff (8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char).');
      return;
    }
    if (isEditing && password.trim() && !isPasswordValid) {
      toast.warning('New password does not meet the strict security requirements.');
      return;
    }

    setSavingStaff(true);
    try {
      if (isEditing && selectedStaffId) {
        await api.put(`/staff/${selectedStaffId}`, {
          username,
          password: password || undefined,
          fullName,
          email,
          phone,
          role,
          baseSalary: baseSalary ? Number(baseSalary) : 0,
          isActive,
        });
        toast.success('Staff details updated successfully!');
      } else {
        await api.post('/staff', {
          username,
          password,
          fullName,
          email,
          phone,
          role,
          baseSalary: baseSalary ? Number(baseSalary) : 0,
          isActive,
        });
        toast.success('New staff member added successfully!');
      }

      setShowModal(false);
      fetchStaff();
      broadcastLocalUpdate('STAFF', 'UPDATED');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving staff member');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (window.confirm(`Are you sure you want to deactivate or remove ${u.fullName}?`)) {
      setDeletingStaffId(u.id);
      try {
        await api.delete(`/staff/${u.id}`);
        toast.success('Staff member removed or marked inactive');
        fetchStaff(false);
        broadcastLocalUpdate('STAFF', 'UPDATED');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error deleting staff');
      } finally {
        setDeletingStaffId(null);
      }
    }
  };

  const getRoleVariant = (roleStr: string): BadgeVariant => {
    switch (roleStr) {
      case 'ADMIN':
        return 'danger';
      case 'TECHNICIAN':
        return 'info';
      case 'RECEPTIONIST':
        return 'success';
      default:
        return 'neutral';
    }
  };

  // Calculations for settlements tab
  const totalSettledAllTime = settlements.reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  const currentMonthStr = getDefaultSalaryMonth();
  const settledCurrentMonth = settlements
    .filter((s) => s.salaryMonth.toLowerCase() === currentMonthStr.toLowerCase())
    .reduce((sum, s) => sum + Number(s.netSalary || 0), 0);

  return (
    <>
      <Navbar
        title="Staff & Payroll Management"
        subtitle="Manage bench engineers, role access credentials, and employee monthly salary settlements"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border-default)', paddingBottom: 12 }}>
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'STAFF' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'STAFF' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <UserIcon size={16} />
            <span>Staff Directory ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SALARIES')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'SALARIES' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'SALARIES' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Receipt size={16} />
            <span>Salary Settlements & Payslips ({settlements.length})</span>
          </button>
        </div>

        {activeTab === 'STAFF' ? (
          <>
            {/* Staff Control Bar */}
            <div className="page-control-bar">
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Active team accounts: <b>{staffList.filter((s) => s.isActive).length}</b> of {staffList.length}
              </div>

              <div className="page-actions-group">
                <button
                  className="btn btn-outline"
                  onClick={() => openSettleModal()}
                  style={{ gap: 6 }}
                >
                  <IndianRupee size={15} />
                  <span>Settle Salary</span>
                </button>
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={16} />
                  <span>Add Staff</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="card desktop-table-view" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Username</th>
                      <th>Access Role</th>
                      <th>Monthly Base Salary</th>
                      <th>Contact Info</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTableRows count={5} columns={7} />
                    ) : staffList.length > 0 ? (
                      staffList.map((u) => {
                        const initials = u.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    background: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'TECHNICIAN' ? '#e0f2fe' : '#dcfce7',
                                    color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'TECHNICIAN' ? '#075985' : '#166534',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {u.fullName}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  fontSize: '0.82rem',
                                  color: 'var(--primary)',
                                }}
                              >
                                @{u.username}
                              </span>
                            </td>
                            <td>
                              <Badge variant={getRoleVariant(u.role)}>
                                {u.role}
                              </Badge>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                  ₹{Number(u.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>
                                    / mo
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  title="Quick Set Base Salary"
                                  onClick={() => openQuickBaseSalaryModal(u)}
                                  style={{ padding: '2px 4px', color: 'var(--primary)' }}
                                >
                                  <Edit size={12} />
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Mail size={13} color="var(--text-tertiary)" />
                                <span>{u.email}</span>
                              </div>
                              {u.phone && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <Phone size={13} color="var(--text-tertiary)" />
                                  <span className="tabular">{u.phone}</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge variant={u.isActive ? 'success' : 'neutral'}>
                                {u.isActive ? 'Active' : 'Deactivated'}
                              </Badge>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  title="Settle Monthly Salary"
                                  onClick={() => openSettleModal(u)}
                                  style={{ color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)' }}
                                >
                                  <IndianRupee size={13} />
                                  <span>Pay Salary</span>
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  title="Edit Staff Member"
                                  onClick={() => openEditModal(u)}
                                >
                                  <Edit size={13} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--status-danger-text)' }}
                                  title="Deactivate / Delete"
                                  disabled={deletingStaffId === u.id}
                                  onClick={() => handleDelete(u)}
                                >
                                  {deletingStaffId === u.id ? (
                                    <Loader2 size={13} className="spin-fast" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            icon={UserIcon}
                            title={loading ? 'Loading staff roster...' : 'No staff members registered'}
                            description="Add technicians, desk receptionists, and administrators."
                            actionText={!loading ? 'Add New Staff' : undefined}
                            onAction={!loading ? openCreateModal : undefined}
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
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : staffList.length > 0 ? (
                staffList.map((u) => {
                  const initials = u.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={u.id} className="mobile-data-card">
                      <div className="mobile-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'TECHNICIAN' ? '#e0f2fe' : '#dcfce7',
                              color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'TECHNICIAN' ? '#075985' : '#166534',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                              {u.fullName}
                            </div>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.74rem',
                                color: 'var(--primary)',
                              }}
                            >
                              @{u.username}
                            </span>
                          </div>
                        </div>
                        <Badge variant={getRoleVariant(u.role)}>{u.role}</Badge>
                      </div>

                      <div className="mobile-card-body">
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Base Salary
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, fontSize: '0.9rem' }}>
                            ₹{Number(u.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / mo
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Phone
                          </div>
                          {u.phone ? (
                            <a
                              href={`tel:${u.phone}`}
                              style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, marginTop: 2, display: 'block' }}
                            >
                              <span className="tabular">{u.phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          )}
                        </div>
                      </div>

                      <div className="mobile-card-footer">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openSettleModal(u)}
                          style={{ color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)', gap: 4 }}
                        >
                          <IndianRupee size={13} />
                          <span>Pay Salary</span>
                        </button>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--status-danger-text)' }}
                            disabled={deletingStaffId === u.id}
                            onClick={() => handleDelete(u)}
                          >
                            {deletingStaffId === u.id ? (
                              <Loader2 size={13} className="spin-fast" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={UserIcon}
                  title="No staff found"
                  description="Register technicians and receptionists."
                  actionText="Add Staff"
                  onAction={openCreateModal}
                  actionIcon={<Plus size={15} />}
                />
              )}
            </div>
          </>
        ) : (
          /* SALARY SETTLEMENTS & PAYROLL TAB */
          <>
            {/* Top Payroll Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div className="card" style={{ margin: 0, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Settled Payroll</span>
                  <div style={{ padding: 6, borderRadius: 8, background: '#dcfce7', color: '#166534' }}>
                    <Wallet size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{totalSettledAllTime.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Cumulative all-time staff payroll outflow
                </div>
              </div>

              <div className="card" style={{ margin: 0, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Disbursed {currentMonthStr}</span>
                  <div style={{ padding: 6, borderRadius: 8, background: '#e0f2fe', color: '#075985' }}>
                    <Calendar size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0284c7' }}>
                  ₹{settledCurrentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Settled for the current calendar month
                </div>
              </div>

              <div className="card" style={{ margin: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>1-Click Payroll Action</span>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 4, fontWeight: 500 }}>
                    Settle monthly compensation, incentives, and generate official pay slips
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openSettleModal()}
                  style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                >
                  <IndianRupee size={15} />
                  <span>Settle Staff Salary Now</span>
                </button>
              </div>
            </div>

            {/* Settlements Table */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                  Salary Disbursement History & Payslips
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {settlements.length} settlement records
                </span>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Pay Month</th>
                      <th>Base Pay</th>
                      <th>Bonus / Inc.</th>
                      <th>Deductions</th>
                      <th>Net Paid</th>
                      <th>Payment Method</th>
                      <th>Payment Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementsLoading ? (
                      <SkeletonTableRows count={5} columns={9} />
                    ) : settlements.length > 0 ? (
                      settlements.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.staffName}</div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>{s.staffRole}</span>
                          </td>
                          <td>
                            <Badge variant="info">{s.salaryMonth}</Badge>
                          </td>
                          <td>₹{Number(s.baseSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: Number(s.bonus) > 0 ? '#10b981' : 'var(--text-tertiary)' }}>
                            {Number(s.bonus) > 0 ? `+₹${Number(s.bonus).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ color: Number(s.deductions) > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
                            {Number(s.deductions) > 0 ? `-₹${Number(s.deductions).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.92rem' }}>
                              ₹{Number(s.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {s.paymentMethod.replace(/_/g, ' ')}
                            </span>
                            {s.transactionRef && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                Ref: {s.transactionRef}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {s.paymentDate}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setPayslipModal(s)}
                                title="Print / Download Pay Slip"
                                style={{ color: 'var(--primary)', borderColor: 'rgba(0, 113, 227, 0.3)' }}
                              >
                                <Receipt size={13} />
                                <span>Payslip</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDeleteSettlement(s.id)}
                                title="Remove / Void"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9}>
                          <EmptyState
                            icon={Receipt}
                            title="No salary settlements recorded yet"
                            description="Settle monthly staff payroll to generate printable payslips and track business net profit."
                            actionText="Settle First Salary"
                            onAction={() => openSettleModal()}
                            actionIcon={<Plus size={15} />}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? `Edit Staff Member: ${fullName}` : 'Add New Staff / Technician'}
        description="Configure role-based access credentials and workbench capabilities"
        maxWidth={620}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Full Legal Name <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Arun Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Username <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. tech_arun"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Official Email Address <span className="required-mark">*</span>
              </label>
              <input
                type="email"
                inputMode="email"
                className="form-control"
                required
                placeholder="arun@techcare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                className="form-control"
                placeholder="+91 9876543212"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Role & Permissions <span className="required-mark">*</span>
              </label>
              <select
                className="form-control"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
              >
                <option value="TECHNICIAN">Technician (Workbench Engineer)</option>
                <option value="RECEPTIONIST">Receptionist (Front Desk Intake)</option>
                <option value="ADMIN">Admin (Full Service Center Control)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Monthly Base Salary (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <IndianRupee size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  style={{ paddingLeft: 30 }}
                  placeholder="e.g. 25000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3, display: 'block' }}>
                Used as default monthly payroll baseline for automated settlements
              </span>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {isEditing ? 'New Password (Optional)' : 'Staff Password'} <span className="required-mark">{!isEditing ? '*' : ''}</span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--primary)', gap: 4, padding: '2px 6px', fontSize: '0.74rem' }}
                onClick={generateStrongPassword}
              >
                <Sparkles size={12} />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                required={!isEditing}
                placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter strong password (e.g. Staff@2026)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password security criteria validator */}
            {(!isEditing || password.length > 0) && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-tertiary, #f8fafc)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.76rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Password Strength:</span>
                  <span style={{ color: strengthColor, fontWeight: 700 }}>{strengthLabel}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: passwordCriteria.length ? '#10b981' : '#94a3b8' }}>
                    {passwordCriteria.length ? <Check size={12} /> : <X size={12} />}
                    <span>8+ characters</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: passwordCriteria.hasUpper ? '#10b981' : '#94a3b8' }}>
                    {passwordCriteria.hasUpper ? <Check size={12} /> : <X size={12} />}
                    <span>1 Upper (A-Z)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: passwordCriteria.hasLower ? '#10b981' : '#94a3b8' }}>
                    {passwordCriteria.hasLower ? <Check size={12} /> : <X size={12} />}
                    <span>1 Lower (a-z)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: passwordCriteria.hasNumber ? '#10b981' : '#94a3b8' }}>
                    {passwordCriteria.hasNumber ? <Check size={12} /> : <X size={12} />}
                    <span>1 Number (0-9)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: passwordCriteria.hasSpecial ? '#10b981' : '#94a3b8' }}>
                    {passwordCriteria.hasSpecial ? <Check size={12} /> : <X size={12} />}
                    <span>1 Special (@, $, %, !)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Account is active</span>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingStaff || (!isEditing && !isPasswordValid)}
            >
              {savingStaff ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Register Staff'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* SETTLE SALARY MODAL */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Settle Employee Monthly Salary"
        description="Record staff salary disbursement, bonus, deductions, and generate official pay slip"
        maxWidth={640}
      >
        <form onSubmit={handleSettleSalarySubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">
                Select Employee <span className="required-mark">*</span>
              </label>
              <select
                className="form-control"
                required
                value={settleStaffId !== '' ? String(settleStaffId) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSettleStaffId('');
                  } else {
                    handleStaffSelectInSettle(Number(val));
                  }
                }}
              >
                <option value="">-- Choose Employee --</option>
                {staffList.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role}) — Base: ₹{Number(s.baseSalary || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Salary Month <span className="required-mark">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. November 2026"
                value={settleMonth}
                onChange={(e) => setSettleMonth(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Base Salary (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                required
                value={settleBase}
                onChange={(e) => setSettleBase(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bonus / Incentive (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={settleBonus}
                onChange={(e) => setSettleBonus(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deductions (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={settleDeductions}
                onChange={(e) => setSettleDeductions(e.target.value)}
              />
            </div>
          </div>

          {/* Net Salary Live Calculation Card */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(5, 150, 105, 0.08)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>Net Take-Home Payable</span>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Base (₹{settleBase}) + Bonus (₹{settleBonus}) - Deductions (₹{settleDeductions})
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#059669' }}>
              ₹{calculatedNetSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Payment Method <span className="required-mark">*</span></label>
              <select
                className="form-control"
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash in Hand</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Ref / UTR #</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. UTR12345678"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                className="form-control"
                required
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Settlement Notes (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Performance bonus included for completing 45 repair tickets on schedule"
              value={settleNotes}
              onChange={(e) => setSettleNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowSettleModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingSettlement || !settleStaffId}
            >
              {isSubmittingSettlement ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Processing Payout...</span>
                </>
              ) : (
                <span>Confirm & Settle ₹{calculatedNetSalary.toLocaleString('en-IN')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK SET BASE SALARY MODAL */}
      <Modal
        isOpen={Boolean(salaryModalStaff)}
        onClose={() => setSalaryModalStaff(null)}
        title={`Set Base Salary: ${salaryModalStaff?.fullName || ''}`}
        description="Update official monthly baseline payroll for this employee"
        maxWidth={440}
      >
        <form onSubmit={handleQuickBaseSalarySubmit}>
          <div className="form-group">
            <label className="form-label">Monthly Base Salary (₹) <span className="required-mark">*</span></label>
            <div style={{ position: 'relative' }}>
              <IndianRupee size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="form-control"
                style={{ paddingLeft: 30 }}
                placeholder="e.g. 25000"
                value={quickBaseSalary}
                onChange={(e) => setQuickBaseSalary(e.target.value)}
                autoFocus
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
              This default amount is auto-populated whenever settling monthly salary for this employee.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSalaryModalStaff(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingBaseSalary}
            >
              {isSavingBaseSalary ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Base Salary</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* OFFICIAL PRINTABLE SALARY PAY SLIP MODAL */}
      {payslipModal && (
        <Modal
          isOpen={Boolean(payslipModal)}
          onClose={() => setPayslipModal(null)}
          title={`Salary Pay Slip: ${payslipModal.staffName}`}
          description={`Payment disbursement voucher for ${payslipModal.salaryMonth}`}
          maxWidth={680}
        >
          <div
            id="printable-payslip"
            style={{
              padding: '24px 28px',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid var(--border-default)',
              color: '#0f172a',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0071e3', paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0071e3', letterSpacing: '-0.02em' }}>
                  TECHCARE SERVICE CENTER
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  123 Tech Park Road, Electronic City, Bangalore • Phone: +91 98765 43210
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  GSTIN: 33AAAAA0000A1Z5 • Email: support@techcare.com
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Salary Pay Slip
                </span>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                  Disbursement ID: #{payslipModal.id.toString().padStart(5, '0')}
                </div>
              </div>
            </div>

            {/* Employee & Period Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background: '#f8fafc',
                marginBottom: 18,
                fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Employee Name:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.staffName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Role / Designation:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.staffRole}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Salary Period:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.salaryMonth}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Payment Date:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.paymentDate}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Disbursement Mode:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.paymentMethod.replace(/_/g, ' ')}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Transaction / UTR:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{payslipModal.transactionRef || 'N/A'}</strong>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {/* Earnings */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 8 }}>
                  EARNINGS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Basic Salary:</span>
                  <span>₹{Number(payslipModal.baseSalary).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Bonus / Incentives:</span>
                  <span style={{ color: '#059669' }}>+₹{Number(payslipModal.bonus).toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.84rem' }}>
                  <span>Gross Earnings:</span>
                  <span>₹{(Number(payslipModal.baseSalary) + Number(payslipModal.bonus)).toFixed(2)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#b91c1c', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 8 }}>
                  DEDUCTIONS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Advances / Leaves:</span>
                  <span style={{ color: '#dc2626' }}>-₹{Number(payslipModal.deductions).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Statutory / Taxes:</span>
                  <span>₹0.00</span>
                </div>
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.84rem' }}>
                  <span>Total Deductions:</span>
                  <span style={{ color: '#dc2626' }}>-₹{Number(payslipModal.deductions).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Net Paid Box */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 8,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534' }}>
                  NET SALARY DISBURSED
                </div>
                <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                  Direct settlement credited to employee account
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d' }}>
                ₹{Number(payslipModal.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {payslipModal.notes && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 20 }}>
                <strong>Remarks / Notes:</strong> {payslipModal.notes}
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 30, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
              <div>
                <div style={{ borderBottom: '1px solid #cbd5e1', width: '70%', height: 35 }}></div>
                <div style={{ marginTop: 6, color: '#64748b' }}>Employee Signature & Date</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid #cbd5e1', width: '70%', height: 35, marginLeft: 'auto' }}></div>
                <div style={{ marginTop: 6, color: '#64748b' }}>
                  Authorized Signatory {payslipModal.settledByName ? `(${payslipModal.settledByName})` : '(Admin)'}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPayslipModal(null)}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={15} />
              <span>Print Pay Slip</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};
