// TechCare Core TypeScript Domain Interfaces

export type Role = 'ADMIN' | 'RECEPTIONIST' | 'TECHNICIAN';

export type TicketStatus = 
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'ESTIMATION_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WAITING_FOR_PARTS'
  | 'ON_HOLD'
  | 'IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  baseSalary?: number;
  isActive: boolean;
}

export interface SalarySettlement {
  id: number;
  staffId: number;
  staffName: string;
  staffEmail: string;
  staffPhone?: string;
  staffRole: string;
  salaryMonth: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentMethod: string;
  transactionRef?: string;
  paymentDate: string;
  status: string;
  notes?: string;
  settledById?: number;
  settledByName?: string;
  createdAt: string;
}

export interface FinancialAnalytics {
  period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  serviceRevenue: number;
  hardwareRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  salaryExpenses: number;
  purchaseExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  totalReceivables: number;
  totalInvoices: number;
  settledSalariesCount: number;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
}

export interface CustomerDevice {
  id: number;
  customerId: number;
  deviceType: string;
  brand: string;
  modelName: string;
  serialNumber?: string;
  devicePassword?: string;
  physicalCondition?: string;
  accessoriesReceived?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
}

export interface RepairTicket {
  id: number;
  ticketNumber: string;
  customer: Customer;
  device: CustomerDevice;
  assignedTechnician?: User;
  createdBy: User;
  status: TicketStatus;
  priority: TicketPriority;
  problemReported: string;
  diagnosticNotes?: string;
  estimatedCost: number;
  laborCharge: number;
  estimatedCompletionDate?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  completedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface TicketLog {
  id: number;
  ticketId: number;
  previousStatus?: string;
  newStatus: string;
  remarks?: string;
  changedBy?: User;
  createdAt: string;
}

export interface TicketPartUsed {
  id: number;
  ticketId: number;
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  consumedAt: string;
}

export interface InvoiceItem {
  id: number;
  itemId?: number;
  itemName: string;
  itemType: 'PART' | 'LABOR' | 'ACCESSORY';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customer: Customer;
  repairTicket?: RepairTicket;
  invoiceType: 'REPAIR' | 'DIRECT_SALE';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  invoiceDate: string;
  items: InvoiceItem[];
}

export interface Payment {
  id: number;
  paymentReference: string;
  invoiceId: number;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  paymentType: 'ADVANCE_DEPOSIT' | 'FINAL_SETTLEMENT' | 'PARTIAL_PAYMENT';
  transactionNotes?: string;
  collectedBy?: User;
  paymentDate: string;
}

export interface DashboardStats {
  totalActiveRepairs: number;
  pendingApprovalCount: number;
  readyForDeliveryCount: number;
  lowStockCount: number;
  dueTodayCount?: number;
  overdueCount?: number;
  todayRevenue?: number;
  totalOutstandingDues?: number;
  recentTickets: RepairTicket[];

  // Technician-specific metrics
  myActiveJobsCount?: number;
  myCompletedCasesCount?: number;
  myPendingDiagnosticsCount?: number;
  myHighPriorityCount?: number;
  myAssignedTickets?: RepairTicket[];

  // Receptionist / Operations metrics
  totalCustomersCount?: number;
  activeTechniciansCount?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

