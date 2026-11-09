import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  Wrench,
  Package,
  History,
  FileText,
  Trash2,
  Lock,
  Unlock,
  Laptop,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sliders,
  DollarSign,
  Tag,
  Eye,
  Phone,
  User as UserIcon,
  Loader2,
  UserPlus,
  CheckCircle2,
  ReceiptText,
  Printer,
  MessageCircle,
  Calendar,
  Flame,
  Send,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SearchInput } from '../components/ui/SearchInput';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTableRows, SkeletonCard } from '../components/ui/LoadingSequence';
import { DEVICE_TYPES, formatDeviceType, getDeviceIcon } from '../utils/deviceUtils';
import api from '../api/client';
import {
  ApiResponse,
  Customer,
  CustomerDevice,
  InventoryItem,
  Invoice,
  RepairTicket,
  TicketLog,
  TicketStatus,
  TicketPriority,
  User,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSync, useRealtimeSync } from '../context/SyncContext';
import { LayoutContextType } from '../components/Layout';

export const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [invoicedTicketIds, setInvoicedTicketIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ONGOING');
  const [selectedTechFilter, setSelectedTechFilter] = useState<number | 'ALL' | 'UNASSIGNED'>('ALL');

  // Intake Modal State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [devices, setDevices] = useState<CustomerDevice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [problemReported, setProblemReported] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');

  // Phone-First Customer Intake State
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [phoneLookupStatus, setPhoneLookupStatus] = useState<'IDLE' | 'SEARCHING' | 'FOUND' | 'NEW'>('IDLE');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [useManualSelect, setUseManualSelect] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isNewDeviceForExistingCustomer, setIsNewDeviceForExistingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newDevBrand, setNewDevBrand] = useState('HP');
  const [newDevModel, setNewDevModel] = useState('');
  const [newDevSerial, setNewDevSerial] = useState('');
  const [newDevType, setNewDevType] = useState('LAPTOP');
  const [newDevPassword, setNewDevPassword] = useState('');
  const [newDevCondition, setNewDevCondition] = useState('');
  const [newDevAccessories, setNewDevAccessories] = useState('');

  // Ticket Detail & Action Modal State
  const [activeTicket, setActiveTicket] = useState<RepairTicket | null>(null);
  const [ticketLogs, setTicketLogs] = useState<TicketLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationTicket, setQuotationTicket] = useState<RepairTicket | null>(null);

  // Diagnosis inputs
  const [diagNotes, setDiagNotes] = useState('');
  const [estCost, setEstCost] = useState('');
  const [laborCharge, setLaborCharge] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');

  // Part consumption inputs
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('');
  const [partQty, setPartQty] = useState(1);

  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);

  // Button loading states for instant responsive feedback
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [consumingPart, setConsumingPart] = useState(false);

  // Target completion date & delivery reminder state
  const [intakeTargetDate, setIntakeTargetDate] = useState<string>('');
  const [diagTargetDate, setDiagTargetDate] = useState<string>('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const { user, hasRole } = useAuth();
  const isTechnician = hasRole('TECHNICIAN') && !hasRole('ADMIN');
  const { toast } = useToast();
  const { broadcastLocalUpdate } = useSync();
  const outletContext = useOutletContext<LayoutContextType | null>();
  const navigate = useNavigate();
  const location = useLocation();

  // Support direct filter from URL ?filter=DUE_TODAY or ?filter=OVERDUE
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam) {
      setSelectedStatus(filterParam);
    }
  }, [location.search]);

  // If user is a technician, default technician filter to their own account
  useEffect(() => {
    if (isTechnician && user?.id) {
      setSelectedTechFilter(user.id);
    }
  }, [user?.id, isTechnician]);

  const getSlaDeadlineInfo = (ticket: RepairTicket) => {
    if (!ticket.estimatedCompletionDate) return null;
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(ticket.status)) return null;

    const targetDate = new Date(ticket.estimatedCompletionDate);
    const now = new Date();

    const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((targetDay - today) / oneDay);

    if (diffDays === 0) {
      return {
        type: 'DUE_TODAY' as const,
        label: '🔥 Due Today',
        fullLabel: '🔥 Target: Today is the last date!',
        badgeClass: 'badge-danger',
        variant: 'danger' as BadgeVariant,
        tooltip: 'Promised completion is today! Prioritize workbench execution.',
      };
    } else if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        type: 'OVERDUE' as const,
        label: `⚠️ Overdue (${daysOverdue}d)`,
        fullLabel: `⚠️ Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        badgeClass: 'badge-danger',
        variant: 'danger' as BadgeVariant,
        tooltip: `Target date was ${targetDate.toLocaleDateString()}. Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}!`,
      };
    } else {
      return {
        type: 'UPCOMING' as const,
        label: `Target: ${targetDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
        fullLabel: `Target: ${targetDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} (${diffDays}d left)`,
        badgeClass: 'badge-neutral',
        variant: 'neutral' as BadgeVariant,
        tooltip: `Target completion in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      };
    }
  };

  const handleSendDeliveryReminder = async (channel: 'WHATSAPP' | 'SMS' | 'CALL') => {
    if (!activeTicket) return;
    setSendingReminder(true);
    try {
      if (channel === 'WHATSAPP') {
        const cleanPhone = (activeTicket.customer?.phone || '').replace(/\D/g, '');
        const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `*TechCare Service Center — Device Ready for Pickup*\n\n` +
          `Dear *${activeTicket.customer?.fullName || 'Customer'}*,\n` +
          `Your *${activeTicket.device?.brand || ''} ${activeTicket.device?.modelName || 'device'}* (Job #${activeTicket.ticketNumber}) has been diagnosed, repaired, and is ready for collection at our service center.\n\n` +
          `• *Problem Repaired:* ${activeTicket.problemReported}\n` +
          `• *Estimated Total:* ₹${Number(activeTicket.estimatedCost || 0).toFixed(2)}\n` +
          `• *Collection Counter:* TechCare Service Center\n` +
          `• *Operating Hours:* Mon - Sat, 10:00 AM - 8:00 PM\n\n` +
          `Please present your Ticket #${activeTicket.ticketNumber} upon arrival.\n` +
          `Thank you for choosing TechCare!`;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      } else if (channel === 'SMS') {
        const cleanPhone = (activeTicket.customer?.phone || '').replace(/\D/g, '');
        const smsBody = `TechCare: Your ${activeTicket.device?.brand || ''} ${activeTicket.device?.modelName || 'device'} (#${activeTicket.ticketNumber}) is repaired and ready for pickup! Hours: 10AM-8PM.`;
        window.open(`sms:${cleanPhone}?body=${encodeURIComponent(smsBody)}`, '_self');
      } else if (channel === 'CALL') {
        window.open(`tel:${activeTicket.customer?.phone}`, '_self');
      }

      const res = await api.post<ApiResponse<RepairTicket>>(`/tickets/${activeTicket.id}/remind-delivery?channel=${channel}`);
      if (res.data.success && res.data.data) {
        setActiveTicket(res.data.data);
      }
      fetchTickets(false);
      broadcastLocalUpdate('TICKET', 'STATUS_CHANGED');
      toast.success(`Customer delivery reminder dispatched via ${channel}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch delivery reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  useEffect(() => {
    fetchTickets(true);
    loadTechsAndInventory();
  }, [selectedStatus, selectedTechFilter]);

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = '/tickets';
      const params: string[] = [];
      if (selectedStatus !== 'ALL') {
        params.push(`status=${selectedStatus}`);
      }
      if (typeof selectedTechFilter === 'number') {
        params.push(`technicianId=${selectedTechFilter}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const res = await api.get<ApiResponse<RepairTicket[]>>(url);
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time synchronization: silently refresh on external updates, other roles' mutations, or window resume
  useRealtimeSync(['TICKET', 'CUSTOMER', 'DEVICE', 'INVOICE'], () => {
    fetchTickets(false);
    loadTechsAndInventory();
  });

  const loadTechsAndInventory = async () => {
    try {
      const [techRes, invRes, custRes, invcRes] = await Promise.all([
        api.get<ApiResponse<User[]>>('/staff/technicians'),
        api.get<ApiResponse<InventoryItem[]>>('/inventory'),
        api.get<ApiResponse<Customer[]>>('/customers'),
        api.get<ApiResponse<Invoice[]>>('/invoices').catch(() => null),
      ]);
      if (techRes.data.success) setTechnicians(techRes.data.data);
      if (invRes.data.success) setInventory(invRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (invcRes && invcRes.data && invcRes.data.success) {
        const invoicedSet = new Set<number>(
          invcRes.data.data
            .filter((inv) => inv.repairTicket && inv.status !== 'CANCELLED')
            .map((inv) => inv.repairTicket!.id)
        );
        setInvoicedTicketIds(invoicedSet);
      }
    } catch (err) {
      console.error('Failed to load reference data', err);
    }
  };

  const loadCustomerDevices = async (customerId: number) => {
    try {
      const res = await api.get<ApiResponse<CustomerDevice[]>>(`/devices/customer/${customerId}`);
      if (res.data.success) {
        const fetched = res.data.data;
        setDevices(fetched);
        if (fetched.length > 0) {
          setSelectedDeviceId(fetched[0].id);
          setIsNewDeviceForExistingCustomer(false);
        } else {
          setSelectedDeviceId('');
          setIsNewDeviceForExistingCustomer(true);
        }
      }
    } catch (err) {
      console.error('Failed to load customer devices', err);
    }
  };

  const handlePhoneLookup = async (phone: string) => {
    setCustomerPhoneInput(phone);
    setNewCustPhone(phone);
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    if (cleaned.length < 5) {
      setPhoneLookupStatus('IDLE');
      setMatchedCustomer(null);
      setSelectedCustomerId('');
      setDevices([]);
      setIsNewCustomer(false);
      setIsNewDeviceForExistingCustomer(false);
      return;
    }

    // 1. Instant local search in loaded customers
    const localMatch = customers.find((c) => {
      const cClean = c.phone ? c.phone.replace(/[\s\-\(\)\+]/g, '') : '';
      return (
        cClean === cleaned ||
        (cClean.length >= 10 && cleaned.length >= 10 && cClean.slice(-10) === cleaned.slice(-10))
      );
    });

    if (localMatch) {
      setMatchedCustomer(localMatch);
      setPhoneLookupStatus('FOUND');
      setIsNewCustomer(false);
      setSelectedCustomerId(localMatch.id);
      await loadCustomerDevices(localMatch.id);
      return;
    }

    // 2. Server lookup if at least 7 digits
    if (cleaned.length >= 7) {
      setPhoneLookupStatus('SEARCHING');
      try {
        const res = await api.get<ApiResponse<Customer>>(`/customers/by-phone?phone=${encodeURIComponent(cleaned)}`);
        if (res.data.success && res.data.data) {
          const found = res.data.data;
          setMatchedCustomer(found);
          setPhoneLookupStatus('FOUND');
          setIsNewCustomer(false);
          setSelectedCustomerId(found.id);
          setCustomers((prev) => (prev.some((c) => c.id === found.id) ? prev : [found, ...prev]));
          await loadCustomerDevices(found.id);
          return;
        }
      } catch (err) {
        // Continue to check if considered new
      }
    }

    // 3. If standard 10+ digits reached and not found -> New Customer
    if (cleaned.length >= 10) {
      setPhoneLookupStatus('NEW');
      setMatchedCustomer(null);
      setIsNewCustomer(true);
      setSelectedCustomerId('');
      setDevices([]);
      setIsNewDeviceForExistingCustomer(false);
    } else {
      setPhoneLookupStatus('IDLE');
      setMatchedCustomer(null);
      setIsNewCustomer(false);
    }
  };

  const handleCustomerChange = async (customerId: number) => {
    setSelectedCustomerId(customerId);
    setSelectedDeviceId('');
    if (!customerId) {
      setDevices([]);
      setIsNewDeviceForExistingCustomer(false);
      setMatchedCustomer(null);
      return;
    }
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setMatchedCustomer(found);
      setCustomerPhoneInput(found.phone);
      setPhoneLookupStatus('FOUND');
      setIsNewCustomer(false);
    }
    await loadCustomerDevices(customerId);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIntake(true);
    try {
      let custId = selectedCustomerId;
      let devId = selectedDeviceId;

      // Handle on-the-fly customer and device creation
      if (isNewCustomer || phoneLookupStatus === 'NEW') {
        const phoneToSave = (customerPhoneInput || newCustPhone).trim();
        if (!newCustName.trim()) {
          toast.warning('Please enter customer full name.');
          setSubmittingIntake(false);
          return;
        }
        if (!phoneToSave) {
          toast.warning('Please enter customer phone number.');
          setSubmittingIntake(false);
          return;
        }
        if (!newDevBrand.trim() || !newDevModel.trim()) {
          toast.warning('Please enter brand and model name for the device.');
          setSubmittingIntake(false);
          return;
        }

        let custId = selectedCustomerId;
        let devId = selectedDeviceId;

        try {
          const custRes = await api.post<ApiResponse<Customer>>('/customers', {
            fullName: newCustName.trim(),
            phone: phoneToSave,
            email: newCustEmail.trim() || undefined,
          });
          custId = custRes.data.data.id;
        } catch (custErr: any) {
          // If customer already exists with this phone, auto-link their existing profile seamlessly
          try {
            const existingRes = await api.get<ApiResponse<Customer>>(`/customers/by-phone?phone=${encodeURIComponent(phoneToSave)}`);
            if (existingRes.data.success && existingRes.data.data) {
              custId = existingRes.data.data.id;
              toast.info(`Linked intake ticket to registered customer: ${existingRes.data.data.fullName}`);
            } else {
              throw custErr;
            }
          } catch {
            throw custErr;
          }
        }

        const devRes = await api.post<ApiResponse<CustomerDevice>>('/devices', {
          customerId: custId,
          deviceType: newDevType,
          brand: newDevBrand.trim(),
          modelName: newDevModel.trim(),
          serialNumber: newDevSerial.trim() || undefined,
          devicePassword: newDevPassword || undefined,
          physicalCondition: newDevCondition || undefined,
          accessoriesReceived: newDevAccessories || undefined,
        });
        devId = devRes.data.data.id;
      } else {
        // Existing customer
        if (!custId) {
          toast.warning('Please enter or select a valid customer.');
          setSubmittingIntake(false);
          return;
        }
        if (isNewDeviceForExistingCustomer || !devId) {
          if (!newDevBrand.trim() || !newDevModel.trim()) {
            toast.warning('Please enter brand and model name for the new device.');
            setSubmittingIntake(false);
            return;
          }
          const devRes = await api.post<ApiResponse<CustomerDevice>>('/devices', {
            customerId: custId,
            deviceType: newDevType,
            brand: newDevBrand.trim(),
            modelName: newDevModel.trim(),
            serialNumber: newDevSerial.trim() || undefined,
            devicePassword: newDevPassword || undefined,
            physicalCondition: newDevCondition || undefined,
            accessoriesReceived: newDevAccessories || undefined,
          });
          devId = devRes.data.data.id;
        }
      }

      await api.post('/tickets', {
        customerId: custId,
        deviceId: devId,
        assignedTechnicianId: selectedTechId || null,
        problemReported: problemReported.trim(),
        priority,
        estimatedCompletionDate: intakeTargetDate ? `${intakeTargetDate}T18:00:00` : null,
      });

      setShowIntakeModal(false);
      resetIntakeForm();
      fetchTickets();
      broadcastLocalUpdate('TICKET', 'CREATED');
      toast.success('Repair job ticket created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating repair ticket');
    } finally {
      setSubmittingIntake(false);
    }
  };

  const resetIntakeForm = () => {
    setCustomerPhoneInput('');
    setPhoneLookupStatus('IDLE');
    setMatchedCustomer(null);
    setUseManualSelect(false);
    setSelectedCustomerId('');
    setSelectedDeviceId('');
    setSelectedTechId('');
    setProblemReported('');
    setIntakeTargetDate('');
    setIsNewCustomer(false);
    setIsNewDeviceForExistingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewDevBrand('HP');
    setNewDevModel('');
    setNewDevSerial('');
    setNewDevType('LAPTOP');
    setNewDevPassword('');
    setNewDevCondition('');
    setNewDevAccessories('');
    setPriority('MEDIUM');
    setDevices([]);
  };

  const openTicketDetails = async (ticket: RepairTicket) => {
    setActiveTicket(ticket);
    setRevealedPin(null);
    setDiagNotes(ticket.diagnosticNotes || '');
    setEstCost(ticket.estimatedCost ? String(ticket.estimatedCost) : '');
    setLaborCharge(ticket.laborCharge ? String(ticket.laborCharge) : '');
    setDiagTargetDate(ticket.estimatedCompletionDate ? ticket.estimatedCompletionDate.split('T')[0] : '');
    setNewStatus('');
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
    setSavingDiagnosis(true);
    try {
      const updatedEst = estCost ? Number(estCost) : 0;
      const updatedLabor = laborCharge ? Number(laborCharge) : 0;
      const formattedDate = diagTargetDate ? `${diagTargetDate}T18:00:00` : null;
      await api.patch(`/tickets/${activeTicket.id}/diagnosis`, {
        diagnosticNotes: diagNotes,
        estimatedCost: updatedEst,
        laborCharge: updatedLabor,
        estimatedCompletionDate: formattedDate,
      });
      toast.success('Diagnosis and quotation updated successfully');
      setActiveTicket({
        ...activeTicket,
        diagnosticNotes: diagNotes,
        estimatedCost: updatedEst,
        laborCharge: updatedLabor,
        estimatedCompletionDate: formattedDate || undefined,
      });
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update diagnosis');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleShareWhatsAppQuote = (ticket: RepairTicket) => {
    if (!ticket.customer?.phone) {
      toast.error('Customer phone number not available');
      return;
    }
    // Clean phone number (strip spaces/dashes)
    let phone = ticket.customer.phone.replace(/[^0-9]/g, '');
    if (phone.length === 10) {
      phone = '91' + phone; // Default to India country code if 10 digits
    }

    const deviceName = ticket.device ? `${ticket.device.brand} ${ticket.device.modelName}` : 'Device';
    const estTotal = ticket.estimatedCost || 0;
    const labor = ticket.laborCharge || 0;
    const partsEst = Math.max(0, estTotal - labor);
    const trackingUrl = `${window.location.origin}/track/${ticket.ticketNumber}`;

    const text =
      `Hello ${ticket.customer.fullName},\n\n` +
      `Here is the repair quotation for your *${deviceName}* (Ticket: *#${ticket.ticketNumber}*):\n\n` +
      `🔍 *Diagnosis Findings:* ${ticket.diagnosticNotes || 'Hardware diagnosis completed.'}\n` +
      `💵 *Estimated Total:* ₹${estTotal.toLocaleString('en-IN')}\n` +
      `   • Estimated Parts: ₹${partsEst.toLocaleString('en-IN')}\n` +
      `   • Labor & Service: ₹${labor.toLocaleString('en-IN')}\n\n` +
      `📱 *View Diagnosis & Approve Online:* ${trackingUrl}\n\n` +
      `Please reply with your approval to proceed with the repair.\n` +
      `— TechCare Multi-Brand Service Center`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenQuotation = (ticket: RepairTicket) => {
    setQuotationTicket(ticket);
    setShowQuotationModal(true);
  };

  const handleStatusTransition = async () => {
    if (!activeTicket || !newStatus) return;
    setSubmittingStatus(true);
    try {
      await api.patch(`/tickets/${activeTicket.id}/status`, {
        status: newStatus,
        remarks: statusRemarks || undefined,
      });
      toast.success(`Ticket status transitioned to ${newStatus.replace(/_/g, ' ')}`);
      fetchTickets();
      broadcastLocalUpdate('TICKET', 'STATUS_CHANGED');
      setShowActionModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const getAllowedNextStatuses = (ticket: RepairTicket): string[] => {
    // If ticket is already in a terminal state, no further transitions
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(ticket.status)) {
      return [];
    }

    // List of available workflow statuses
    const allStatuses = [
      'RECEIVED',
      'DIAGNOSING',
      'ESTIMATION_PENDING',
      'APPROVED',
      'IN_PROGRESS',
      'WAITING_FOR_PARTS',
      'ON_HOLD',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ];

    // Filter out current status
    let options = allStatuses.filter((st) => st !== ticket.status);

    // Delivering directly requires the item to be in READY_FOR_DELIVERY first
    if (ticket.status !== 'READY_FOR_DELIVERY') {
      options = options.filter((st) => st !== 'DELIVERED');
    }

    // Technicians can do diagnostics, estimations, approvals, workshop progress, and ready-for-delivery
    // Delivery handover and ticket cancellations are front-desk actions
    if (hasRole('TECHNICIAN') && !hasRole('ADMIN') && !hasRole('RECEPTIONIST')) {
      options = options.filter((st) => st !== 'DELIVERED' && st !== 'CANCELLED');
    }

    return options;
  };

  const handleConsumePart = async () => {
    if (!activeTicket || !selectedPartId) return;
    setConsumingPart(true);
    try {
      await api.post(`/tickets/${activeTicket.id}/consume-part`, {
        itemId: selectedPartId,
        quantity: Number(partQty),
      });
      toast.success('Spare part deducted from inventory and linked to this job!');
      setSelectedPartId('');
      setPartQty(1);
      fetchTickets();
      broadcastLocalUpdate('TICKET', 'PART_CONSUMED');
      broadcastLocalUpdate('INVENTORY', 'UPDATED');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to consume spare part');
    } finally {
      setConsumingPart(false);
    }
  };

  const handleRevealPin = async () => {
    if (!activeTicket) return;
    setLoadingPin(true);
    try {
      const res = await api.get<ApiResponse<{ devicePassword?: string }>>(`/devices/${activeTicket.device.id}/security-pin`);
      if (res.data.success && res.data.data) {
        setRevealedPin(res.data.data.devicePassword || 'No PIN set by customer');
        toast.info('Security PIN revealed for active ticket');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Access Denied: You are not authorized to view this PIN.');
    } finally {
      setLoadingPin(false);
    }
  };

  const handleDeleteTicket = async (t: RepairTicket) => {
    if (window.confirm(`Are you sure you want to cancel ticket #${t.ticketNumber}? This will safely archive the ticket and preserve all logs, parts, and billing history.`)) {
      try {
        await api.delete(`/tickets/${t.id}`);
        toast.success(`Ticket #${t.ticketNumber} cancelled and safely archived`);
        fetchTickets();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Error cancelling ticket');
      }
    }
  };

  const filteredTickets = tickets.filter((t) => {
    // 1. Status Filter reinforcement
    if (selectedStatus === 'ONGOING') {
      if (t.status === 'DELIVERED' || t.status === 'CANCELLED' || t.status === 'REJECTED') {
        return false;
      }
    } else if (selectedStatus === 'DUE_TODAY') {
      const sla = getSlaDeadlineInfo(t);
      if (sla?.type !== 'DUE_TODAY') return false;
    } else if (selectedStatus === 'OVERDUE') {
      const sla = getSlaDeadlineInfo(t);
      if (sla?.type !== 'OVERDUE') return false;
    } else if (selectedStatus !== 'ALL') {
      if (t.status !== selectedStatus) {
        return false;
      }
    }

    // 2. Technician Filter reinforcement
    if (selectedTechFilter === 'UNASSIGNED') {
      if (t.assignedTechnician) return false;
    } else if (typeof selectedTechFilter === 'number') {
      if (!t.assignedTechnician || t.assignedTechnician.id !== selectedTechFilter) {
        return false;
      }
    }

    // 3. Search query
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.customer?.fullName || '').toLowerCase().includes(q) ||
        (t.customer?.phone || '').includes(q) ||
        (t.device?.modelName || '').toLowerCase().includes(q) ||
        (t.device?.brand || '').toLowerCase().includes(q) ||
        (t.device?.serialNumber || '').toLowerCase().includes(q) ||
        (t.assignedTechnician?.fullName || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const getStatusBadge = (status: TicketStatus) => {
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
      case 'WAITING_FOR_PARTS':
        variant = 'purple';
        label = 'Waiting Parts';
        break;
      case 'ON_HOLD':
        variant = 'warning';
        label = 'On Hold';
        break;
      case 'IN_PROGRESS':
        variant = 'info';
        label = 'In Progress';
        break;
      case 'READY_FOR_DELIVERY':
        variant = 'success';
        label = 'Ready for Delivery';
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

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem' }}>
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: '0.75rem' }}>
            Low
          </span>
        );
    }
  };

  const statusFilterTabs = [
    { key: 'ONGOING', label: '⚡ Ongoing Repairs' },
    { key: 'DUE_TODAY', label: '🔥 Due Today (Last Date)' },
    { key: 'OVERDUE', label: '⚠️ Overdue' },
    { key: 'READY_FOR_DELIVERY', label: '📦 Ready for Pickup' },
    { key: 'DELIVERED', label: 'Delivered (Completed)' },
    { key: 'ALL', label: 'All Tickets' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'DIAGNOSING', label: 'Diagnosing' },
    { key: 'WAITING_FOR_PARTS', label: 'Waiting for Parts' },
    { key: 'ESTIMATION_PENDING', label: 'Quote Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <>
      <Navbar
        title="Repair Job Tickets"
        subtitle="Manage customer equipment, diagnoses, and state transitions"
        onOpenMobile={outletContext?.openMobileSidebar}
      />
      <div className="page-body">
        {/* Top Control Bar */}
        <div className="page-control-bar">
          <SearchInput
            placeholder="Search ticket #, customer, phone, or model..."
            value={searchTerm}
            onChange={setSearchTerm}
            maxWidth={440}
          />

          {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) && (
            <div className="page-actions-group">
              <button
                className="btn btn-primary"
                onClick={() => {
                  loadTechsAndInventory();
                  setShowIntakeModal(true);
                }}
              >
                <Plus size={16} />
                <span>New Intake</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Filter Segmented Controls */}
        <div style={{ marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          <div className="segmented-control">
            {statusFilterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`segmented-btn ${selectedStatus === tab.key ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Technician Filter Bar & Quick Counters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            padding: '10px 14px',
            background: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Left: Role-Aware Technician Filter */}
          {isTechnician ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wrench size={14} color="var(--primary)" />
                Filter by Assignment:
              </span>
              <div className="segmented-control" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`segmented-btn ${selectedTechFilter === user?.id ? 'active' : ''}`}
                  onClick={() => setSelectedTechFilter(user?.id || 'ALL')}
                >
                  My Assigned Tickets Alone
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${selectedTechFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedTechFilter('ALL')}
                >
                  All Technicians' Tickets
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wrench size={14} color="var(--primary)" />
                Assigned Technician:
              </span>
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 190, height: 34, fontSize: '0.82rem', padding: '0 10px' }}
                value={selectedTechFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL' || val === 'UNASSIGNED') {
                    setSelectedTechFilter(val);
                  } else {
                    setSelectedTechFilter(Number(val));
                  }
                }}
              >
                <option value="ALL">All Technicians ({technicians.length})</option>
                <option value="UNASSIGNED">Unassigned Tickets</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.fullName}
                  </option>
                ))}
              </select>
              {user?.id && (
                <button
                  type="button"
                  className={`btn btn-xs ${selectedTechFilter === user.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedTechFilter(selectedTechFilter === user.id ? 'ALL' : user.id)}
                >
                  My Tickets Alone
                </button>
              )}
            </div>
          )}

          {/* Right: Active Ticket Count Summary */}
          <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredTickets.length}</strong>{' '}
            <span style={{ color: selectedStatus === 'ONGOING' ? 'var(--primary)' : 'inherit', fontWeight: 600 }}>
              {selectedStatus === 'ONGOING' ? 'ongoing' : selectedStatus.toLowerCase().replace(/_/g, ' ')}
            </span>{' '}
            ticket{filteredTickets.length === 1 ? '' : 's'}
            {selectedTechFilter === user?.id ? ' (assigned to you)' : ''}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="card desktop-table-view" style={{ padding: 0 }}>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows count={5} columns={8} />
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>
                        <span style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                          {t.ticketNumber}
                        </span>
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
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getDeviceIcon(t.device?.deviceType, 15)}
                          <span>{t.device ? `${t.device.brand} ${t.device.modelName}` : 'Equipment'}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {formatDeviceType(t.device?.deviceType)}
                          </span>
                          <span>•</span>
                          <span>SN: {t.device?.serialNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
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
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          {getStatusBadge(t.status)}
                          {(() => {
                            const sla = getSlaDeadlineInfo(t);
                            if (!sla) return null;
                            return (
                              <span
                                className={`badge badge-sm ${sla.type === 'DUE_TODAY' || sla.type === 'OVERDUE' ? 'badge-danger' : 'badge-neutral'}`}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: sla.type === 'DUE_TODAY' ? 700 : 600,
                                }}
                                title={sla.tooltip}
                              >
                                {sla.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="tabular">
                          ₹{Number(t.estimatedCost || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }} className="tabular">
                          Labor: ₹{Number(t.laborCharge || 0).toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) &&
                            !['CANCELLED', 'REJECTED'].includes(t.status) && (
                              <button
                                className={invoicedTicketIds.has(t.id) ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
                                title={invoicedTicketIds.has(t.id) ? 'View Tax Invoice in Billing' : 'Generate Tax Invoice'}
                                onClick={() => {
                                  if (invoicedTicketIds.has(t.id)) {
                                    navigate('/billing', { state: { searchTicketNumber: t.ticketNumber } });
                                  } else {
                                    navigate('/billing', {
                                      state: {
                                        autoOpenInvoice: true,
                                        preselectedTicketId: t.id,
                                      },
                                    });
                                  }
                                }}
                                style={{
                                  fontSize: '0.75rem',
                                  height: 28,
                                  padding: '0 8px',
                                  color: invoicedTicketIds.has(t.id) ? 'var(--status-success-text)' : undefined,
                                }}
                              >
                                <ReceiptText size={13} />
                                <span>{invoicedTicketIds.has(t.id) ? 'View Bill' : 'Bill'}</span>
                              </button>
                            )}
                          {Number(t.estimatedCost || 0) > 0 && (
                            <button
                              className="btn btn-outline btn-sm"
                              title="Send Quotation via WhatsApp"
                              onClick={() => handleShareWhatsAppQuote(t)}
                              style={{
                                fontSize: '0.75rem',
                                height: 28,
                                padding: '0 8px',
                                color: '#16a34a',
                                borderColor: '#86efac',
                              }}
                            >
                              <MessageCircle size={13} />
                              <span>Quote</span>
                            </button>
                          )}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openTicketDetails(t)}
                          >
                            <Sliders size={13} />
                            <span>Manage</span>
                          </button>
                          {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) &&
                            t.status !== 'CANCELLED' &&
                            t.status !== 'DELIVERED' &&
                            t.status !== 'REJECTED' && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--status-danger-text)' }}
                                title="Cancel Ticket"
                                onClick={() => handleDeleteTicket(t)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={Wrench}
                        title="No tickets match your filter criteria"
                        description="Try another search term or filter status."
                        actionText={!searchTerm && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? 'New Device Intake' : undefined}
                        onAction={!searchTerm && (hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? () => setShowIntakeModal(true) : undefined}
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
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((t) => (
              <div key={t.id} className="mobile-data-card">
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
                      {t.ticketNumber}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {t.customer.fullName}
                      </span>
                      {getPriorityBadge(t.priority)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {getStatusBadge(t.status)}
                    {(() => {
                      const sla = getSlaDeadlineInfo(t);
                      if (!sla) return null;
                      return (
                        <span
                          className={`badge badge-sm ${sla.type === 'DUE_TODAY' || sla.type === 'OVERDUE' ? 'badge-danger' : 'badge-neutral'}`}
                          style={{
                            fontSize: '0.66rem',
                            padding: '2px 5px',
                            fontWeight: sla.type === 'DUE_TODAY' ? 700 : 600,
                          }}
                        >
                          {sla.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="mobile-card-body">
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Device
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getDeviceIcon(t.device?.deviceType, 13)}
                      <span>{t.device ? `${t.device.brand} ${t.device.modelName}` : 'Equipment'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {formatDeviceType(t.device?.deviceType)} • SN: {t.device?.serialNumber || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Estimate
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }} className="tabular">
                      ₹{Number(t.estimatedCost || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }} className="tabular">
                      Labor: ₹{Number(t.laborCharge || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mobile-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <UserIcon size={13} color="var(--text-tertiary)" />
                    <span>{t.assignedTechnician ? t.assignedTechnician.fullName : 'Unassigned'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) &&
                      !['CANCELLED', 'REJECTED'].includes(t.status) && (
                        <button
                          className={invoicedTicketIds.has(t.id) ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
                          onClick={() => {
                            if (invoicedTicketIds.has(t.id)) {
                              navigate('/billing', { state: { searchTicketNumber: t.ticketNumber } });
                            } else {
                              navigate('/billing', {
                                state: {
                                  autoOpenInvoice: true,
                                  preselectedTicketId: t.id,
                                },
                              });
                            }
                          }}
                          style={{
                            fontSize: '0.75rem',
                            color: invoicedTicketIds.has(t.id) ? 'var(--status-success-text)' : undefined,
                          }}
                        >
                          <ReceiptText size={13} />
                          <span>{invoicedTicketIds.has(t.id) ? 'View Bill' : 'Bill'}</span>
                        </button>
                      )}
                    {Number(t.estimatedCost || 0) > 0 && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleShareWhatsAppQuote(t)}
                        style={{ fontSize: '0.75rem', color: '#16a34a', borderColor: '#86efac' }}
                      >
                        <MessageCircle size={13} />
                        <span>Quote</span>
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openTicketDetails(t)}
                    >
                      <Sliders size={13} />
                      <span>Manage</span>
                    </button>
                    {(hasRole('ADMIN') || hasRole('RECEPTIONIST')) &&
                      t.status !== 'CANCELLED' &&
                      t.status !== 'DELIVERED' &&
                      t.status !== 'REJECTED' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--status-danger-text)' }}
                          onClick={() => handleDeleteTicket(t)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Wrench}
              title="No tickets match filter"
              description="No repair tickets match the selected status filter or search query."
              actionText={(hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? 'New Device Intake' : undefined}
              onAction={(hasRole('ADMIN') || hasRole('RECEPTIONIST')) ? () => setShowIntakeModal(true) : undefined}
              actionIcon={<Plus size={15} />}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: NEW DEVICE INTAKE JOB SHEET */}
      <Modal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        title="New Device Intake Job Sheet"
        description="Check in customer equipment, register hardware specifications, and assign technicians"
        maxWidth={660}
      >
        <form onSubmit={handleCreateTicket}>
          {/* 1. PHONE-FIRST CUSTOMER IDENTIFICATION */}
          <div className="modal-section-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={15} color="var(--primary)" />
                <span>Customer Mobile Number <span className="required-mark">*</span></span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}
                onClick={() => {
                  setUseManualSelect(!useManualSelect);
                  if (useManualSelect) resetIntakeForm();
                }}
              >
                {useManualSelect ? '← Enter Phone Number' : 'Or select by customer name →'}
              </button>
            </div>

            {!useManualSelect ? (
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="form-control"
                    style={{ height: 44, fontSize: '0.98rem', fontWeight: 600, paddingLeft: 40, letterSpacing: '0.5px' }}
                    placeholder="Enter 10-digit mobile number (e.g. 9876543210)..."
                    value={customerPhoneInput}
                    onChange={(e) => handlePhoneLookup(e.target.value)}
                    autoFocus
                    required
                  />
                  <Phone
                    size={17}
                    style={{ position: 'absolute', left: 13, top: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}
                  />
                  {phoneLookupStatus === 'SEARCHING' && (
                    <Loader2
                      size={17}
                      className="spin-fast"
                      style={{ position: 'absolute', right: 14, top: 14, color: 'var(--primary)' }}
                    />
                  )}
                </div>

                {/* Case A: Existing Customer Verified */}
                {phoneLookupStatus === 'FOUND' && matchedCustomer && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      background: 'var(--status-success-bg, #f0fdf4)',
                      border: '1px solid var(--status-success-border, #bbf7d0)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={20} color="var(--status-success-text, #16a34a)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--status-success-text, #15803d)' }}>
                          Existing Customer: {matchedCustomer.fullName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          Phone: <strong>{matchedCustomer.phone}</strong> {matchedCustomer.email ? `• ${matchedCustomer.email}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      Registered
                    </span>
                  </div>
                )}

                {/* Case B: New Customer Intake Form */}
                {phoneLookupStatus === 'NEW' && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      background: 'var(--status-info-bg, #eff6ff)',
                      border: '1px solid var(--status-info-border, #bfdbfe)',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <UserPlus size={18} color="var(--primary)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--primary)' }}>
                          New Customer (First Visit)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Number not found in database. Enter name below to register their profile.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Customer Full Name <span className="required-mark">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="e.g. Ramesh Patel"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email Address (Optional)</label>
                        <input
                          type="email"
                          className="form-control"
                          value={newCustEmail}
                          onChange={(e) => setNewCustEmail(e.target.value)}
                          placeholder="ramesh@example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback Dropdown for manual name selection */
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(Number(e.target.value))}
                  required
                >
                  <option value="">-- Choose registered customer by name --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. DEVICE EQUIPMENT SECTION */}
          <div className="modal-section-card" style={{ marginBottom: 16 }}>
            {selectedCustomerId && !isNewCustomer && devices.length > 0 && !isNewDeviceForExistingCustomer ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>
                    Select Customer's Equipment <span className="required-mark">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--primary)', fontWeight: 600, padding: '2px 8px', fontSize: '0.80rem' }}
                    onClick={() => {
                      setIsNewDeviceForExistingCustomer(true);
                      setSelectedDeviceId('');
                    }}
                  >
                    + Brought a Different Device
                  </button>
                </div>
                <select
                  className="form-control"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  required
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.modelName} ({formatDeviceType(d.deviceType)}) — SN: {d.serialNumber || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Device Equipment Details <span className="required-mark">*</span>
                  </div>
                  {selectedCustomerId && devices.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--primary)', fontWeight: 600 }}
                      onClick={() => {
                        setIsNewDeviceForExistingCustomer(false);
                        setSelectedDeviceId(devices[0]?.id || '');
                      }}
                    >
                      ← Select From Previous Devices
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Device Type <span className="required-mark">*</span></label>
                    <select
                      className="form-control"
                      value={newDevType}
                      onChange={(e) => setNewDevType(e.target.value)}
                    >
                      {DEVICE_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.badge} — {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand <span className="required-mark">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={newDevBrand}
                      onChange={(e) => setNewDevBrand(e.target.value)}
                      placeholder="Apple, Dell, HP, Lenovo"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model Name <span className="required-mark">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={newDevModel}
                      onChange={(e) => setNewDevModel(e.target.value)}
                      placeholder="e.g. MacBook Pro M1 / ThinkPad T14"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newDevSerial}
                      onChange={(e) => setNewDevSerial(e.target.value)}
                      placeholder="Hardware S/N or Service Tag"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Device PIN / Unlock Passcode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newDevPassword}
                      onChange={(e) => setNewDevPassword(e.target.value)}
                      placeholder="PIN or Password"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Physical Condition</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newDevCondition}
                      onChange={(e) => setNewDevCondition(e.target.value)}
                      placeholder="Scratches, minor dent, screen intact..."
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Accessories Left with Device</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newDevAccessories}
                    onChange={(e) => setNewDevAccessories(e.target.value)}
                    placeholder="e.g. Original Charger, Power Adapter, Laptop Sleeve"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Reported Issue / Symptoms <span className="required-mark">*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="Describe symptoms (e.g. Broken screen, won't boot, liquid spill)..."
              value={problemReported}
              onChange={(e) => setProblemReported(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
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
              <label className="form-label">Priority Level</label>
              <select
                className="form-control"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Promised Target Date</label>
              <input
                type="date"
                className="form-control"
                value={intakeTargetDate}
                onChange={(e) => setIntakeTargetDate(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                  onClick={() => {
                    const d = new Date();
                    setIntakeTargetDate(d.toISOString().split('T')[0]);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setIntakeTargetDate(d.toISOString().split('T')[0]);
                  }}
                >
                  +1d
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 2);
                    setIntakeTargetDate(d.toISOString().split('T')[0]);
                  }}
                >
                  +2d
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowIntakeModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submittingIntake}>
              {submittingIntake ? (
                <>
                  <Loader2 size={15} className="spin-fast" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Job Sheet</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TICKET MANAGEMENT / DIAGNOSIS & SPARE PARTS CONSUMPTION */}
      {activeTicket && (
        <Modal
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          title={`Ticket #${activeTicket.ticketNumber}`}
          description={`${activeTicket.device ? `${activeTicket.device.brand} ${activeTicket.device.modelName}` : 'Equipment'} — ${activeTicket.customer?.fullName || 'Customer'}`}
          maxWidth={720}
        >
          {/* Header Status & PIN Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Status:
              </span>
              {getStatusBadge(activeTicket.status)}
            </div>

            {/* Audited Security PIN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600 }}>PIN: </span>
                {revealedPin ? (
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {revealedPin}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    Protected
                  </span>
                )}
              </div>
              {(hasRole('ADMIN') ||
                (hasRole('TECHNICIAN') && activeTicket.assignedTechnician?.id === user?.id)) &&
                !revealedPin && (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={loadingPin}
                    onClick={handleRevealPin}
                    title="Access device unlock PIN"
                  >
                    <Eye size={13} />
                    <span>{loadingPin ? '...' : 'Reveal'}</span>
                  </button>
                )}
            </div>
          </div>

          {/* Section 1: State Machine Transition */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <Clock size={15} color="var(--primary)" />
              <span>State Machine Status Transition</span>
            </div>

            {['DELIVERED', 'REJECTED', 'CANCELLED'].includes(activeTicket.status) ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                This repair ticket is in terminal state ({activeTicket.status}). No further state changes are permitted.
              </div>
            ) : getAllowedNextStatuses(activeTicket).length === 0 ? (
              <div style={{ color: '#b45309', fontSize: '0.84rem' }}>
                {hasRole('TECHNICIAN') && activeTicket.assignedTechnician?.id !== user?.id
                  ? `Assigned to another technician (${activeTicket.assignedTechnician?.fullName || 'another staff member'}). Workshop transitions are reserved for the assigned technician or administrator.`
                  : 'No transitions available for your role at this stage.'}
              </div>
            ) : (
              <div className="modal-form-grid-3">
                <select
                  className="form-control"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">-- Choose Next State --</option>
                  {getAllowedNextStatuses(activeTicket).map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Audit remarks..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!newStatus || submittingStatus}
                  onClick={handleStatusTransition}
                  style={{ height: 38 }}
                >
                  {submittingStatus ? (
                    <>
                      <Loader2 size={13} className="spin-fast" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    'Apply Change'
                  )}
                </button>
              </div>
            )}

            {activeTicket.status === 'READY_FOR_DELIVERY' && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  background: 'rgba(0, 113, 227, 0.05)',
                  border: '1px solid rgba(0, 113, 227, 0.15)',
                  borderRadius: 10,
                  fontSize: '0.80rem',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} color="#0071e3" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Customer Handover Requirement:</strong> Delivering a device (DELIVERED) is executed by counter Receptionists or Admins once any associated repair invoice is settled in full.
                </span>
              </div>
            )}

            {/* Direct Billing Action for Receptionist & Admin */}
            {!hasRole('TECHNICIAN') && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  background: invoicedTicketIds.has(activeTicket.id)
                    ? 'rgba(34, 197, 94, 0.06)'
                    : 'rgba(0, 113, 227, 0.06)',
                  border: invoicedTicketIds.has(activeTicket.id)
                    ? '1px solid rgba(34, 197, 94, 0.25)'
                    : '1px solid rgba(0, 113, 227, 0.25)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
                  {invoicedTicketIds.has(activeTicket.id) ? (
                    <CheckCircle2 size={18} color="var(--status-success)" style={{ flexShrink: 0 }} />
                  ) : (
                    <ReceiptText size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      {invoicedTicketIds.has(activeTicket.id)
                        ? 'Tax Invoice Generated'
                        : 'Billing & Invoice Generation'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {invoicedTicketIds.has(activeTicket.id)
                        ? 'An invoice is already generated for this repair ticket.'
                        : 'Click below to directly open Billing and generate tax invoice for this ticket.'}
                    </div>
                  </div>
                </div>

                {invoicedTicketIds.has(activeTicket.id) ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setShowActionModal(false);
                      navigate('/billing', { state: { searchTicketNumber: activeTicket.ticketNumber } });
                    }}
                    style={{ whiteSpace: 'nowrap', gap: 6, fontSize: '0.78rem' }}
                  >
                    <ReceiptText size={14} />
                    <span>View Bill in Billing →</span>
                  </button>
                ) : !['CANCELLED', 'REJECTED'].includes(activeTicket.status) ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowActionModal(false);
                      navigate('/billing', {
                        state: {
                          autoOpenInvoice: true,
                          preselectedTicketId: activeTicket.id,
                        },
                      });
                    }}
                    style={{ whiteSpace: 'nowrap', gap: 6, fontSize: '0.78rem' }}
                  >
                    <ReceiptText size={14} />
                    <span>Generate Bill for this Ticket →</span>
                  </button>
                ) : null}
              </div>
            )}

            {/* Customer Delivery Notification & Pickup Reminders */}
            {activeTicket.status === 'READY_FOR_DELIVERY' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  background: 'rgba(37, 211, 102, 0.08)',
                  border: '1px solid rgba(37, 211, 102, 0.25)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageCircle size={18} color="#16a34a" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        Customer Delivery Notification & Pickup Reminders
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {activeTicket.reminderCount && activeTicket.reminderCount > 0
                          ? `Total Reminders Sent: ${activeTicket.reminderCount} • Last: ${activeTicket.lastReminderSentAt ? new Date(activeTicket.lastReminderSentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}`
                          : 'No delivery reminders dispatched to customer yet.'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: '#25D366', color: '#fff', border: 'none', gap: 5, fontSize: '0.78rem' }}
                      disabled={sendingReminder}
                      onClick={() => handleSendDeliveryReminder('WHATSAPP')}
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp Pickup Alert</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ gap: 5, fontSize: '0.78rem' }}
                      disabled={sendingReminder}
                      onClick={() => handleSendDeliveryReminder('SMS')}
                    >
                      <Send size={13} />
                      <span>SMS</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ gap: 5, fontSize: '0.78rem' }}
                      disabled={sendingReminder}
                      onClick={() => handleSendDeliveryReminder('CALL')}
                    >
                      <Phone size={13} />
                      <span>Call</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Diagnosis & Labor Charge */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <Wrench size={15} color="var(--primary)" />
              <span>Diagnostic Notes & Customer Quotation</span>
            </div>
            {['DELIVERED', 'REJECTED', 'CANCELLED'].includes(activeTicket.status) ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                This repair ticket is finalized ({activeTicket.status}). Diagnosis findings and labor charges are locked.
              </div>
            ) : hasRole('TECHNICIAN') && activeTicket.assignedTechnician?.id !== user?.id ? (
              <div style={{ color: '#b45309', fontSize: '0.84rem' }}>
                Diagnostic notes and quotation can only be recorded by the assigned technician ({activeTicket.assignedTechnician?.fullName || 'unassigned'}) or administrator.
              </div>
            ) : (
              <>
                <div className="form-group">
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Hardware diagnosis, findings, recommended replacements..."
                    value={diagNotes}
                    onChange={(e) => setDiagNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estimated Total (₹)</label>
                    <input
                      type="number"
                      inputMode="decimal"
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
                      inputMode="decimal"
                      className="form-control"
                      value={laborCharge}
                      onChange={(e) => setLaborCharge(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Target Completion</label>
                    <input
                      type="date"
                      className="form-control"
                      value={diagTargetDate}
                      onChange={(e) => setDiagTargetDate(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-outline"
                    disabled={savingDiagnosis}
                    onClick={handleUpdateDiagnosis}
                    style={{ height: 38 }}
                  >
                    {savingDiagnosis ? (
                      <>
                        <Loader2 size={13} className="spin-fast" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Diagnosis'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Customer Quotation Sharing Box */}
            {(Number(activeTicket.estimatedCost || 0) > 0 || Number(estCost || 0) > 0) && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  background: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--status-success-text, #16a34a)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ReceiptText size={16} />
                      <span>Customer Quotation Ready</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Total Estimate: <strong>₹{Number(activeTicket.estimatedCost || estCost || 0).toLocaleString('en-IN')}</strong> (Labor: ₹{Number(activeTicket.laborCharge || laborCharge || 0).toLocaleString('en-IN')})
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: '#25D366',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 12px',
                        borderRadius: 6,
                      }}
                      onClick={() => handleShareWhatsAppQuote(activeTicket)}
                      title="Send repair estimate & tracking link to customer on WhatsApp"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp Quote</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                      }}
                      onClick={() => handleOpenQuotation(activeTicket)}
                      title="Preview & print official estimate sheet"
                    >
                      <Printer size={14} />
                      <span>Print Estimate Sheet</span>
                    </button>
                    <a
                      href={`/track/${activeTicket.ticketNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--primary)',
                        padding: '5px 8px',
                        textDecoration: 'none',
                      }}
                    >
                      Customer View ↗
                    </a>
                  </div>
                </div>

                {/* Quick verbal customer approval / decline controls for staff */}
                {['ESTIMATION_PENDING', 'DIAGNOSING'].includes(activeTicket.status) && (
                  <div
                    style={{
                      borderTop: '1px dashed rgba(34, 197, 94, 0.25)',
                      paddingTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      fontSize: '0.76rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Customer response received over call/counter?
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          height: 26,
                          color: 'var(--status-success-text, #16a34a)',
                          borderColor: 'var(--status-success-border, #bbf7d0)',
                        }}
                        onClick={async () => {
                          try {
                            await api.patch(`/tickets/${activeTicket.id}/status`, {
                              status: 'APPROVED_BY_CUSTOMER',
                              remarks: 'Customer accepted quotation verbally (confirmed by staff)',
                            });
                            toast.success('Quotation marked as Approved by Customer');
                            fetchTickets();
                            setShowActionModal(false);
                          } catch (e: any) {
                            toast.error(e.response?.data?.message || 'Failed to update');
                          }
                        }}
                      >
                        ✓ Mark Approved
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          height: 26,
                          color: 'var(--status-danger-text, #ef4444)',
                          borderColor: '#fca5a5',
                        }}
                        onClick={async () => {
                          try {
                            await api.patch(`/tickets/${activeTicket.id}/status`, {
                              status: 'REJECTED',
                              remarks: 'Customer declined quotation estimate',
                            });
                            toast.success('Ticket marked as Rejected by Customer');
                            fetchTickets();
                            setShowActionModal(false);
                          } catch (e: any) {
                            toast.error(e.response?.data?.message || 'Failed to update');
                          }
                        }}
                      >
                        ✕ Mark Declined
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Spare Parts Consumption */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <Package size={15} color="var(--primary)" />
              <span>Consume Spare Part from Inventory</span>
            </div>
            {['DELIVERED', 'REJECTED', 'CANCELLED'].includes(activeTicket.status) ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                This repair ticket is finalized ({activeTicket.status}). Additional parts cannot be consumed.
              </div>
            ) : hasRole('TECHNICIAN') && activeTicket.assignedTechnician?.id !== user?.id ? (
              <div style={{ color: '#b45309', fontSize: '0.84rem' }}>
                Parts consumption is reserved for the assigned technician ({activeTicket.assignedTechnician?.fullName || 'unassigned'}) or administrator.
              </div>
            ) : (
              <div className="modal-form-grid-parts">
                <div>
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
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    placeholder="Qty"
                  />
                </div>
                <button
                  className="btn btn-outline"
                  disabled={!selectedPartId || consumingPart}
                  onClick={handleConsumePart}
                  style={{ height: 38 }}
                >
                  {consumingPart ? (
                    <>
                      <Loader2 size={13} className="spin-fast" />
                      <span>Deducting...</span>
                    </>
                  ) : (
                    'Deduct Stock'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Audit Log Trail */}
          <div>
            <div className="modal-section-title">
              <History size={15} color="var(--text-secondary)" />
              <span>Status Audit Log History</span>
            </div>
            <div
              style={{
                maxHeight: 130,
                overflowY: 'auto',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {ticketLogs.length > 0 ? (
                ticketLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>
                        <b style={{ color: 'var(--text-primary)' }}>{log.newStatus}</b>{' '}
                        {log.previousStatus ? `(from ${log.previousStatus})` : ''}
                      </span>
                      <span className="tabular" style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.remarks && (
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                        {log.remarks}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  No historical transition logs recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowActionModal(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CUSTOMER ESTIMATE QUOTATION SHEET (PRINTABLE) */}
      {quotationTicket && (
        <Modal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          title={`Repair Quotation — #${quotationTicket.ticketNumber}`}
          description="Customer repair cost estimate & diagnosis summary"
          maxWidth={680}
        >
          <div
            id="quotation-sheet-printable"
            style={{
              padding: '16px',
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0071e3',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0071e3', letterSpacing: '-0.02em' }}>
                  TECHCARE SERVICE SOLUTIONS
                </div>
                <div style={{ fontSize: '0.80rem', color: '#64748b' }}>
                  Authorized Multi-Brand Tech Diagnostics & Repair Center
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                  Phone: +91 98765 43210 • Support: care@techcare.internal
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 4,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Repair Quotation
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  #{quotationTicket.ticketNumber}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Date: {new Date(quotationTicket.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Customer & Equipment Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Customer Details
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginTop: 2 }}>
                  {quotationTicket.customer?.fullName}
                </div>
                <div style={{ fontSize: '0.80rem', color: '#334155', marginTop: 2 }}>
                  Phone: {quotationTicket.customer?.phone}
                </div>
                {quotationTicket.customer?.email && (
                  <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                    Email: {quotationTicket.customer.email}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Device Equipment
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginTop: 2 }}>
                  {quotationTicket.device?.brand} {quotationTicket.device?.modelName}
                </div>
                <div style={{ fontSize: '0.80rem', color: '#334155', marginTop: 2 }}>
                  Type: {formatDeviceType(quotationTicket.device?.deviceType)} • SN: {quotationTicket.device?.serialNumber || 'N/A'}
                </div>
                <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                  Reported Issue: <em>{quotationTicket.problemReported}</em>
                </div>
              </div>
            </div>

            {/* Diagnostic Findings */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                Technician Diagnostic Findings
              </div>
              <div style={{ fontSize: '0.86rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {quotationTicket.diagnosticNotes || 'Inspection completed. Hardware overhaul/repair required as estimated below.'}
              </div>
            </div>

            {/* Cost Breakdown Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item / Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Estimated Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                    <strong>Estimated Spare Parts & Hardware Components</strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Replacement components required for repair</div>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                    ₹{Math.max(0, (quotationTicket.estimatedCost || 0) - (quotationTicket.laborCharge || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                    <strong>Labor & Workshop Diagnostics Service Charge</strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Level-2/3 technician bench labor & post-repair testing</div>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                    ₹{Number(quotationTicket.laborCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #0071e3' }}>
                  <td style={{ padding: '10px', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    Total Estimated Repair Cost
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#0071e3' }}>
                    ₹{Number(quotationTicket.estimatedCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Terms and conditions */}
            <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <div>• This estimation is valid for 7 calendar days from the date of issue.</div>
              <div>• Additional defects found during microscopic teardown will be reported to the customer before proceeding.</div>
              <div>• Customer can track real-time status and provide approval at: <strong>{window.location.origin}/track/{quotationTicket.ticketNumber}</strong></div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: '#25D366',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => handleShareWhatsAppQuote(quotationTicket)}
            >
              <MessageCircle size={15} />
              <span>Send WhatsApp</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => window.print()}
            >
              <Printer size={15} />
              <span>Print Quote</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowQuotationModal(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};
