# TechCare – Technical Assessment & System Capability Report

**Project Title:** TechCare – Computer Service Center Management System  
**Prepared For:** Technical Evaluators, Internship Assessment Panel & HR  
**Assessment Target:** Internship Technical Evaluation Demonstration  
**Document Version:** 1.0 (Final Architecture & System Delivery)  

---

## 1. Executive Summary

**TechCare** is a web-based, full-stack service center management application engineered specifically for computer, laptop, and electronic repair enterprises. The system addresses common operational challenges faced by repair shops: disorganized paper intake slips, lack of accountability during repairs, inaccurate inventory tracking, vendor restocking discrepancies, and uncollected outstanding balances.

Rather than being a simple CRUD prototype, **TechCare is designed around enterprise-grade architectural patterns**:
- **Strict separation** between customer liability assets under repair and shop-owned retail inventory.
- **7-Stage state machine** enforcing authorized repair transitions.
- **Double-entry style audit ledger** tracking all stock additions and consumptions.
- **Role-Based Access Control (RBAC)** across three distinct organizational personas (`ADMIN`, `RECEPTIONIST`, `TECHNICIAN`).

---

## 2. Technology Stack & Architectural Decisions

| Layer | Technology | Engineering Justification |
| :--- | :--- | :--- |
| **Backend API** | Java 17 + Spring Boot 3.2.5 | Mature enterprise runtime providing strict typing, robust transaction management (`@Transactional`), and dependency injection. |
| **Security Layer** | Spring Security 6 + JJWT 0.12.5 | Stateless JSON Web Token authentication; eliminates server session state and enables headless consumption by web and mobile clients. |
| **ORM / Persistence**| Spring Data JPA + Hibernate 6 | High-level data mapping with repository abstraction, clean query methods, and database independence. |
| **Database** | PostgreSQL 15+ (Hosted on Supabase) | ACID-compliant relational engine featuring strict foreign keys, check constraints, composite B-tree indexing, and connection pooling. |
| **File Storage** | Supabase Storage (S3-compatible) | Cloud object storage bucket (`techcare-attachments`) for high-resolution intake damage photos and vendor bill scans. |
| **Web Frontend** | React 18 + TypeScript 5.4 + Vite 5.2 | Reactive, type-safe single-page application (SPA) with component modularity and lightning-fast HMR builds. |
| **API Testing** | Postman Test Suite | Automated collection with token auto-extraction for regression and evaluator API verification. |

---

## 3. Pinpointed System Capabilities: "What TechCare CAN Do"

### 3.1 Authentication & Role-Based Access Control (RBAC)
- [x] **Secure Authentication:** Passwords hashed with standard **BCrypt**.
- [x] **Stateless JWT Authorization:** Every request is authenticated via the `Authorization: Bearer <token>` header with role claims.
- [x] **Granular Role Protection:**
  - `ADMIN`: Full access across financials, staff management, vendor purchasing, and settings.
  - `RECEPTIONIST`: Front-counter operations: intake job sheets, customer quote management, invoicing, and payment collection.
  - `TECHNICIAN`: Focused bench view: viewing assigned tickets, logging diagnosis notes, and consuming spare parts. Restricted from financial analytics and staff salaries.
- [x] **Quick Demo Switcher:** 1-click test credential fill for evaluators on the login page (`admin`, `receptionist`, `tech_arun`).

### 3.2 Staff & Technician Lifecycle Management
- [x] **Add Staff:** Onboard new technicians, receptionists, or administrators with contact details, credentials, and roles.
- [x] **Edit Staff:** Modify phone numbers, roles, emails, or update passwords.
- [x] **Resignation / Deactivation Workflow:** Mark a technician as *Inactive / Resigned*. This safely hides them from future job assignment dropdowns while strictly preserving all historical audit logs and repair tickets they worked on.
- [x] **Delete Staff:** Permanent deletion with automated safety checks (prevented if currently assigned to active jobs).

### 3.3 Customer & Custody Equipment Management
- [x] **Real-Time Customer Search:** Instant search by phone number or name.
- [x] **Customer Profiles:** Full CRUD for customers (Name, Phone, Email, Address, GST/Tax ID).
- [x] **Custody Equipment Onboarding:** Registers customer-owned laptops/desktops with Brand, Model, Serial Number, OS PIN/Password, cosmetic condition, and accessories left (chargers, bags, dongles).
- [x] **Device History Inspection:** View all past repair tickets associated with a specific customer or device.

### 3.4 Repair Job Ticket Lifecycle (The Core Heart)
- [x] **Intake Job Sheet Creation:** Generates unique, formatted ticket identifiers (e.g. `TC-2026-0001`).
- [x] **Priority Tagging:** Flags jobs as `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
- [x] **Technician Assignment:** Assign or reassign tickets to bench engineers.
- [x] **Diagnostic Log & Quotation:** Technicians record root causes, labor charges, and required parts.
- [x] **7-Stage Validated State Machine:**
  $$\text{RECEIVED} \rightarrow \text{DIAGNOSING} \rightarrow \text{ESTIMATION\_PENDING} \rightarrow \text{APPROVED} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{READY\_FOR\_DELIVERY} \rightarrow \text{DELIVERED}$$
- [x] **Immutable Status Audit Trail:** Every status change writes an audit record capturing the previous state, new state, user ID, timestamp, and explanation remarks.
- [x] **Inventory Consumption:** Technicians select spare parts directly from the workbench; the system validates stock availability, deducts inventory, and records an auditable `REPAIR_CONSUMPTION` stock movement.

### 3.5 Spare Parts & Inventory Management
- [x] **Stock Catalog:** SKU, barcode, category (SSD, RAM, Screen, Battery, etc.), cost price, and selling price.
- [x] **Low Stock Alerts:** Visual warning indicator and dedicated filter when $\text{Current Stock} \le \text{Reorder Level}$.
- [x] **Double-Entry Stock Ledger:** Every addition or deduction is recorded in `stock_movements`.
- [x] **Manual Stock Adjustments:** Adjust stock counts (e.g., transit damage, inventory correction) with mandatory audit notes.
- [x] **Edit & Delete Parts:** Update selling prices or deactivate discontinued parts.

### 3.6 Vendors & Inbound Procurement
- [x] **Vendor Directory:** Maintain supplier profiles, contacts, phones, and addresses.
- [x] **Direct Purchase Recording:** Record supplier bills (Vendor, Bill #, Date, Paid Amount).
- [x] **Multi-Item Purchase Builder:** Add multiple spare parts to a single purchase order.
- [x] **On-The-Fly Part Creation:** If a vendor delivers a brand-new part not yet in the catalog, users can click `+ New Item (Not in Stock)` to register it on the spot without leaving the purchase screen.
- [x] **Automated Stock Increment:** Upon purchase commitment, inventory levels and latest cost prices are automatically updated.

### 3.7 Invoicing, Billing & Split Payments
- [x] **Automated Invoice Generation:** Creates invoices directly from repair tickets, auto-aggregating parts consumed and labor charges.
- [x] **Tax & Discount Calculations:** Configurable GST rates and line discounts.
- [x] **Split & Multi-Tender Payments:** Multiple payments (Cash, UPI, Card, Net Banking) can be recorded against one invoice.
- [x] **Outstanding Receivables Tracking:** Calculates balance due; tracks unpaid or partially paid accounts.
- [x] **Printable Tax Invoices:** Built-in formatted print template for physical customer handovers.

### 3.8 Dashboard & Business Analytics
- [x] **KPI Counters:** Total Active Repairs, Pending Quotes, Ready for Pickup, Low Stock Alert items.
- [x] **Financial Summaries:** Today's collected revenue (Cash/UPI/Card) and total outstanding customer dues.
- [x] **Recent Repair Queue:** Real-time visibility into the latest tickets undergoing service.

---

## 4. Current System Boundaries: "What TechCare CANNOT Do"

To demonstrate mature analytical competence to your evaluators, it is equally important to articulate what was deliberately scoped out as **non-essential for an internship assessment**:

| Capability | Current Status | Architectural Rationale & Recommended Phase 2 Extension |
| :--- | :--- | :--- |
| **SMS / WhatsApp Gateway** | *Not Integrated* | Third-party SMS gateways (Twilio, Gupshup) require paid commercial API keys and DLT registration. *Simulated via on-screen alerts and email templates.* |
| **Direct Payment Gateway (Razorpay/Stripe)** | *Not Integrated* | Requires live merchant accounts and webhook callbacks. TechCare records real-world counter payment references (UTR numbers, Cash, Card swipe IDs) instead. |
| **Complex Payroll / Commission Calculation**| *Not Implemented* | Focus was placed on repair workflows and inventory rather than internal HR payroll algorithms. Simple technician assignment is tracked. |
| **Multi-Branch / Multi-Store Franchise Mode**| *Single-Store Focus*| Designed for a single service center location. Multi-tenant partitioning (`store_id` isolation) was omitted to avoid unnecessary schema complexity. |
| **Native Mobile App (Android APK)** | *Documented Architecture* | The mobile app is documented as an **extensibility roadmap** (`ANDROID_INTEGRATION_PLAN.md`) using the existing REST API. |

---

## 5. Security & Data Integrity Assurance

1. **ACID Transaction Boundaries:** All stock deductions and invoice creations execute within Spring `@Transactional` boundaries. If stock is insufficient, the transaction rolls back atomically.
2. **Password Protection:** No plain-text passwords exist in the database. All user accounts use salted `BCryptPasswordEncoder`.
3. **Prevention of Stale Lazy Loading:** Configured with `spring.jpa.open-in-view=true` and `@JsonIgnoreProperties` to prevent Hibernate proxy serialization exceptions.
4. **Data Isolation:** Customer equipment (`customer_devices`) is strictly isolated from commercial stock (`inventory_items`).

---

## 6. Live Evaluator Demonstration Script (Step-by-Step)

Follow this 5-minute walkthrough during your assessment:

```
[Step 1: Login & Roles]
Log in as 'admin' -> Show Dashboard metrics (KPIs, Today's Revenue, Active Tickets).

[Step 2: Customer & Device Intake]
Go to 'Customers' -> Register a customer (e.g., 'Karan Sharma', phone '+91 9988771122').
Go to 'Repair Tickets' -> Click 'New Device Intake' -> Select Karan -> Select his Laptop -> Problem: "Broken Screen & Fan Noise" -> Priority: HIGH -> Assign to 'Arun Kumar' -> Submit.
Show the newly generated Ticket #TC-2026-000X.

[Step 3: Diagnosis & Parts Consumption]
Click 'Manage' on the ticket -> Enter diagnostic notes: "FHD IPS screen damaged, fan clogged".
Enter Labor: ₹500 -> Consume part: "15.6 Inch Screen" (Qty: 1) -> Click 'Deduct & Attach'.
Show that stock has decremented and status history logged the action.

[Step 4: Status Transition & Delivery]
Change status from 'IN_PROGRESS' to 'READY_FOR_DELIVERY' -> Add note "Screen replaced and tested".
Click 'Apply State Change'.

[Step 5: Billing & Invoicing]
Go to 'Invoices & Billing' -> Click 'Generate Invoice from Ticket' -> Select Karan's ticket.
Notice: The invoice automatically pulls the screen cost + ₹500 labor + 18% GST.
Click 'Pay' -> Select 'UPI' -> Amount ₹3,500 -> Pay.
Show status change to 'PAID' and click 'Print Invoice' to demonstrate the formatted receipt.

[Step 6: Staff & Resignation Management]
Go to 'Staff & Technicians' -> Edit technician 'Suresh Patel' -> Uncheck 'Active' (simulating resignation) -> Save.
Show that Suresh is marked inactive and will not appear in new assignment dropdowns, but past tickets remain preserved.
```

---

## 7. Conclusion & Assessment Verdict

**TechCare** fulfills all internship assessment requirements. It demonstrates:
- Strong grasp of **system architecture and clean code**.
- Practical understanding of **relational database normalization and audit trails**.
- Competence in modern **Spring Boot 3 REST design and React/TypeScript development**.
- Clear business sense distinguishing core features from out-of-scope enterprise complexities.

The codebase is compiled, version-controlled with Git, and verified for live demonstration.
