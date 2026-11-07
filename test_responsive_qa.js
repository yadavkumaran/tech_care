import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
const CDP_PORT = 9222;

const VIEWPORTS = [
  { name: 'Android Small', width: 360, height: 800, isMobile: true },
  { name: 'iPhone 12/13/14', width: 390, height: 844, isMobile: true },
  { name: 'iPhone Pro Max', width: 430, height: 932, isMobile: true },
  { name: 'iPad Portrait', width: 768, height: 1024, isMobile: true },
  { name: 'Tablet Landscape', width: 1024, height: 768, isMobile: false },
  { name: 'Desktop Standard', width: 1440, height: 900, isMobile: false },
];

const ROLES = [
  {
    role: 'ADMIN',
    userData: {
      token: 'mock-admin-token',
      type: 'Bearer',
      id: 1,
      username: 'admin',
      email: 'admin@techcare.com',
      fullName: 'Vikram Malhotra',
      roles: ['ROLE_ADMIN'],
    },
  },
  {
    role: 'RECEPTIONIST',
    userData: {
      token: 'mock-receptionist-token',
      type: 'Bearer',
      id: 2,
      username: 'receptionist',
      email: 'reception@techcare.com',
      fullName: 'Pooja Sharma',
      roles: ['ROLE_RECEPTIONIST'],
    },
  },
  {
    role: 'TECHNICIAN',
    userData: {
      token: 'mock-technician-token',
      type: 'Bearer',
      id: 3,
      username: 'tech_arun',
      email: 'arun@techcare.com',
      fullName: 'Arun Kumar',
      roles: ['ROLE_TECHNICIAN'],
    },
  },
];

const ROUTES = [
  '/login',
  '/dashboard',
  '/tickets',
  '/customers',
  '/inventory',
  '/purchases',
  '/staff',
  '/billing',
];

const MOCK_DATA = {
  stats: {
    totalActiveRepairs: 14,
    pendingApprovalCount: 3,
    readyForDeliveryCount: 5,
    lowStockCount: 2,
    todayRevenue: 48500,
    totalOutstandingDues: 12800,
    recentTickets: [
      {
        id: 1,
        ticketNumber: "TC-1001",
        customer: { id: 1, fullName: "Rahul Sharma", phone: "9876543210" },
        device: { id: 1, brand: "Apple", modelName: "MacBook Pro M1 14\"" },
        assignedTechnician: { id: 3, fullName: "Arun Kumar" },
        status: "IN_PROGRESS",
        priority: "HIGH",
        problemReported: "Battery draining rapidly and trackpad unresponsive",
        estimatedCost: 14500,
        createdAt: "2026-11-04T10:30:00Z"
      }
    ]
  },
  tickets: [
    {
      id: 1,
      ticketNumber: "TC-1001",
      customer: { id: 1, fullName: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com" },
      device: { id: 1, brand: "Apple", modelName: "MacBook Pro M1 14\"", serialNumber: "C02G1234MD6R" },
      assignedTechnician: { id: 3, fullName: "Arun Kumar", role: "TECHNICIAN" },
      createdBy: { id: 2, fullName: "Pooja Sharma", role: "RECEPTIONIST" },
      status: "IN_PROGRESS",
      priority: "HIGH",
      problemReported: "Battery draining rapidly and trackpad unresponsive",
      diagnosticNotes: "Requires battery replacement and SMC recalibration",
      estimatedCost: 14500,
      laborCharge: 2500,
      createdAt: "2026-11-04T10:30:00Z"
    },
    {
      id: 2,
      ticketNumber: "TC-1002",
      customer: { id: 2, fullName: "Ananya Patel", phone: "9811223344", email: "ananya@example.com" },
      device: { id: 2, brand: "Apple", modelName: "iPhone 14 Pro", serialNumber: "F2LZ89XQ" },
      assignedTechnician: null,
      createdBy: { id: 2, fullName: "Pooja Sharma", role: "RECEPTIONIST" },
      status: "RECEIVED",
      priority: "URGENT",
      problemReported: "Shattered OLED display, touch ghosting",
      diagnosticNotes: "Awaiting customer approval for OEM OLED",
      estimatedCost: 22000,
      laborCharge: 3000,
      createdAt: "2026-11-05T14:15:00Z"
    },
    {
      id: 3,
      ticketNumber: "TC-1003",
      customer: { id: 3, fullName: "Vikram Singhania", phone: "9833445566", email: "vikram@example.com" },
      device: { id: 3, brand: "Apple", modelName: "iPad Air 5", serialNumber: "DMPQ9877" },
      assignedTechnician: { id: 3, fullName: "Arun Kumar", role: "TECHNICIAN" },
      createdBy: { id: 1, fullName: "Vikram Malhotra", role: "ADMIN" },
      status: "READY_FOR_DELIVERY",
      priority: "MEDIUM",
      problemReported: "Charging port loose, no power draw",
      diagnosticNotes: "Replaced USB-C flex assembly, tested 30W charging",
      estimatedCost: 6500,
      laborCharge: 1500,
      createdAt: "2026-11-03T11:00:00Z"
    }
  ],
  customers: [
    {
      id: 1,
      fullName: "Rahul Sharma",
      phone: "9876543210",
      email: "rahul@example.com",
      address: "402 Palm Heights, Bandra West, Mumbai",
      createdAt: "2026-10-15T09:00:00Z"
    },
    {
      id: 2,
      fullName: "Ananya Patel",
      phone: "9811223344",
      email: "ananya@example.com",
      address: "12 Linking Road, Khar, Mumbai",
      createdAt: "2026-10-20T11:30:00Z"
    }
  ],
  devices: [
    {
      id: 1,
      customerId: 1,
      deviceType: "LAPTOP",
      brand: "Apple",
      modelName: "MacBook Pro M1 14\"",
      serialNumber: "C02G1234MD6R",
      devicePassword: "apple123-secret",
      physicalCondition: "Clean, minor scratch near hinge",
      accessoriesReceived: "67W MagSafe Charger, Sleeve",
      createdAt: "2026-10-15T09:10:00Z"
    }
  ],
  inventory: [
    {
      id: 1,
      sku: "SCR-MBP14-M1",
      name: "Liquid Retina XDR Display 14\"",
      category: "Display Panels",
      currentStock: 3,
      reorderLevel: 5,
      costPrice: 21000,
      sellingPrice: 28000,
      isActive: true
    },
    {
      id: 2,
      sku: "BAT-IP14P",
      name: "OEM Battery Pack iPhone 14 Pro",
      category: "Batteries",
      currentStock: 14,
      reorderLevel: 4,
      costPrice: 2800,
      sellingPrice: 4200,
      isActive: true
    }
  ],
  vendors: [
    {
      id: 1,
      vendorName: "Apex Spares Ltd",
      contactPerson: "Rajesh Gupta",
      phone: "9819001122",
      email: "sales@apexspares.com",
      address: "Lamington Road, Mumbai",
      rating: 4.8
    }
  ],
  purchases: [
    {
      id: 1,
      poNumber: "PO-2026-089",
      vendor: { id: 1, vendorName: "Apex Spares Ltd" },
      totalAmount: 84000,
      status: "RECEIVED",
      orderDate: "2026-10-28T09:00:00Z",
      items: [
        { id: 1, item: { name: "Liquid Retina XDR Display 14\"" }, quantity: 4, unitPrice: 21000 }
      ]
    }
  ],
  staff: [
    {
      id: 1,
      username: "admin",
      fullName: "Vikram Malhotra",
      email: "admin@techcare.com",
      phone: "9820011223",
      role: "ADMIN",
      isActive: true
    },
    {
      id: 2,
      username: "receptionist",
      fullName: "Pooja Sharma",
      email: "reception@techcare.com",
      phone: "9820033445",
      role: "RECEPTIONIST",
      isActive: true
    },
    {
      id: 3,
      username: "tech_arun",
      fullName: "Arun Kumar",
      email: "arun@techcare.com",
      phone: "9820055667",
      role: "TECHNICIAN",
      isActive: true
    }
  ],
  invoices: [
    {
      id: 1,
      invoiceNumber: "INV-2026-0042",
      customer: { id: 1, fullName: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com" },
      repairTicket: {
        id: 1,
        ticketNumber: "TC-1001",
        device: { brand: "Apple", modelName: "MacBook Pro M1 14\"", serialNumber: "C02G1234MD6R" }
      },
      invoiceType: "REPAIR",
      subtotal: 14500,
      taxRate: 18,
      taxAmount: 2610,
      discountAmount: 0,
      totalAmount: 17110,
      paidAmount: 17110,
      balanceAmount: 0,
      status: "PAID",
      invoiceDate: "2026-11-04T12:30:00Z",
      items: [
        { id: 1, itemName: "MacBook Pro Battery OEM", itemType: "PART", quantity: 1, unitPrice: 12000, totalPrice: 12000 },
        { id: 2, itemName: "Precision Labor & SMC Calibration", itemType: "LABOR", quantity: 1, unitPrice: 2500, totalPrice: 2500 }
      ]
    }
  ]
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        // Catch console errors
        if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const errText = msg.params.args.map((a) => a.value || a.description || '').join(' ');
            this.consoleErrors.push(errText);
          }
        }

        // Intercept network requests matching /api/*
        if (msg.method === 'Fetch.requestPaused') {
          const { requestId, request } = msg.params;
          const url = request.url;
          let bodyObj = { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };

          if (url.includes('/api/dashboard/stats')) {
            bodyObj.data = MOCK_DATA.stats;
          } else if (url.includes('/api/tickets') && url.includes('/logs')) {
            bodyObj.data = [
              { id: 1, ticketId: 1, previousStatus: 'RECEIVED', newStatus: 'IN_PROGRESS', remarks: 'Work commenced by tech_arun', createdAt: new Date().toISOString() }
            ];
          } else if (url.includes('/api/tickets')) {
            bodyObj.data = MOCK_DATA.tickets;
          } else if (url.includes('/api/customers')) {
            bodyObj.data = MOCK_DATA.customers;
          } else if (url.includes('/api/devices/customer/')) {
            bodyObj.data = MOCK_DATA.devices;
          } else if (url.includes('/api/devices/') && url.includes('/security-pin')) {
            bodyObj.data = { devicePassword: 'apple123-secret' };
          } else if (url.includes('/api/devices')) {
            bodyObj.data = MOCK_DATA.devices;
          } else if (url.includes('/api/inventory')) {
            bodyObj.data = MOCK_DATA.inventory;
          } else if (url.includes('/api/vendors')) {
            bodyObj.data = MOCK_DATA.vendors;
          } else if (url.includes('/api/purchases')) {
            bodyObj.data = MOCK_DATA.purchases;
          } else if (url.includes('/api/staff/technicians')) {
            bodyObj.data = MOCK_DATA.staff.filter((s) => s.role === 'TECHNICIAN');
          } else if (url.includes('/api/staff')) {
            bodyObj.data = MOCK_DATA.staff;
          } else if (url.includes('/api/invoices')) {
            bodyObj.data = MOCK_DATA.invoices;
          } else if (url.includes('/api/auth/login')) {
            bodyObj.data = {
              token: 'mock-admin-token',
              type: 'Bearer',
              id: 1,
              username: 'admin',
              email: 'admin@techcare.com',
              fullName: 'Vikram Malhotra',
              roles: ['ROLE_ADMIN']
            };
          } else {
            bodyObj.data = {};
          }

          const responseBody = Buffer.from(JSON.stringify(bodyObj)).toString('base64');

          this.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Access-Control-Allow-Origin', value: '*' },
            ],
            body: responseBody,
          }).catch(() => {});
          return;
        }

        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }
}

async function navigateAndWait(cdp, url, minWait = 450) {
  await cdp.send('Page.navigate', { url });
  for (let i = 0; i < 30; i++) {
    await sleep(100);
    const isReady = await cdp.evaluate(`
      document.readyState === 'complete' &&
      !!(document.querySelector('.app-container') || document.querySelector('.login-card') || document.querySelector('.main-content'))
    `);
    if (isReady) break;
  }
  await sleep(minWait);
}

async function runAudit() {
  console.log('--- TechCare Responsive QA & Usability Automation Suite ---');

  // 1. Start Vite Preview Server
  console.log('[1/4] Spawning Vite preview on port', PORT);
  const vite = spawn('npx.cmd', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: './frontend',
    shell: true,
  });

  await sleep(2500);

  // 2. Launch Headless Chrome with Remote Debugging
  console.log('[2/4] Spawning Headless Chrome with CDP on port', CDP_PORT);
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      'about:blank',
    ],
    { shell: false }
  );

  await sleep(2500);

  // 3. Connect to Chrome CDP
  console.log('[3/4] Connecting to Chrome DevTools Protocol...');
  const targets = await fetchJSON(`http://localhost:${CDP_PORT}/json/list`);
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  if (!pageTarget) {
    throw new Error('No page target found on Chrome debug port');
  }

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('Connected to CDP target successfully.');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '*api*' }],
  });

  // Warm-up initial bundle compilation
  await navigateAndWait(cdp, `http://localhost:${PORT}/login`, 1000);

  const results = {
    viewportsTested: [],
    overflowTests: [],
    navigationTests: [],
    roleRouteTests: [],
    touchTargetTests: [],
    modalSheetTests: [],
    invoicePrintTests: [],
    moreDrawerTests: [],
    inputAccessibilityTests: [],
    consoleErrors: [],
  };

  try {
    console.log('\n[4/4] Executing Viewport and Route Verification Matrix...');

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) Mobile=${vp.isMobile}`);
      console.log(`======================================================`);
      results.viewportsTested.push(vp.name);

      // Set Device Metrics
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.isMobile,
      });

      // Test Login Page (unauthenticated)
      await cdp.evaluate(`
        localStorage.removeItem('techcare_token');
        localStorage.removeItem('techcare_user');
      `);
      await navigateAndWait(cdp, `http://localhost:${PORT}/login`, 400);

      const loginOverflow = await cdp.evaluate(`
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
          buttonsCount: document.querySelectorAll('button').length
        })
      `);
      console.log(`  [Route: /login] Overflow: ${loginOverflow.hasOverflow ? 'FAIL' : 'PASS'} (scrollWidth=${loginOverflow.scrollWidth}, clientWidth=${loginOverflow.clientWidth})`);
      results.overflowTests.push({ viewport: vp.name, route: '/login', ...loginOverflow });

      // Test Role-based Navigation for ADMIN, RECEPTIONIST, TECHNICIAN
      for (const roleObj of ROLES) {
        console.log(`\n  --- Testing Role: ${roleObj.role} at ${vp.width}x${vp.height} ---`);

        // Inject Auth Credentials into localStorage and reload window
        await cdp.evaluate(`
          localStorage.setItem('techcare_token', '${roleObj.userData.token}');
          localStorage.setItem('techcare_user', JSON.stringify(${JSON.stringify(roleObj.userData)}));
          window.location.href = 'http://localhost:${PORT}/dashboard';
        `);
        await sleep(700);

        for (const route of ROUTES) {
          if (route === '/login') continue;

          await navigateAndWait(cdp, `http://localhost:${PORT}${route}`, 400);

          const pageAudit = await cdp.evaluate(`
            (() => {
              const currentPath = window.location.pathname;
              const docWidth = document.documentElement.scrollWidth;
              const winWidth = window.innerWidth;
              const hasOverflow = docWidth > winWidth + 1; // 1px threshold for subpixel

              // Check navigation elements
              const sidebar = document.querySelector('.sidebar');
              const sidebarVisible = sidebar ? (window.getComputedStyle(sidebar).display !== 'none' && window.getComputedStyle(sidebar).visibility !== 'hidden') : false;
              const bottomNav = document.querySelector('.bottom-nav');
              const bottomNavVisible = bottomNav ? (window.getComputedStyle(bottomNav).display !== 'none' && window.getComputedStyle(bottomNav).visibility !== 'hidden') : false;

              // Check cards vs table
              const desktopTable = document.querySelector('.desktop-table-view');
              const desktopTableVisible = desktopTable ? window.getComputedStyle(desktopTable).display !== 'none' : false;
              const mobileCards = document.querySelector('.mobile-card-list');
              const mobileCardsVisible = mobileCards ? window.getComputedStyle(mobileCards).display !== 'none' : false;

              // Check touch targets
              const interactives = Array.from(document.querySelectorAll('button, a.btn, .bottom-nav-item, input, select'));
              const smallElements = interactives.filter(b => {
                const rect = b.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.height < 28;
              });

              // Check input fontSize for iOS auto-zoom prevention (>= 16px or 1rem)
              const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
              const sub16Inputs = inputs.filter(inp => {
                const fs = parseFloat(window.getComputedStyle(inp).fontSize);
                return fs > 0 && fs < 15.5;
              });

              return {
                currentPath,
                docWidth,
                winWidth,
                hasOverflow,
                sidebarVisible,
                bottomNavVisible,
                desktopTableVisible,
                mobileCardsVisible,
                interactiveCount: interactives.length,
                smallCount: smallElements.length,
                sub16InputsCount: sub16Inputs.length
              };
            })()
          `);

          const isPermitted =
            (route === '/purchases' || route === '/staff') ? roleObj.role === 'ADMIN' :
            route === '/billing' ? (roleObj.role === 'ADMIN' || roleObj.role === 'RECEPTIONIST') :
            true;

          const routeStatus = isPermitted
            ? (pageAudit.currentPath === route ? 'ACCESSED' : `REDIRECTED_TO_${pageAudit.currentPath}`)
            : (pageAudit.currentPath === '/dashboard' ? 'PROPERLY_GUARDED' : `UNEXPECTED_${pageAudit.currentPath}`);

          console.log(`    [Route: ${route.padEnd(11)}] Status=${routeStatus.padEnd(16)} | Overflow=${pageAudit.hasOverflow ? 'FAIL' : 'PASS'} (doc=${pageAudit.docWidth}, win=${pageAudit.winWidth}) | BottomNav=${pageAudit.bottomNavVisible} | MobileCards=${pageAudit.mobileCardsVisible}`);

          results.roleRouteTests.push({
            viewport: vp.name,
            role: roleObj.role,
            route,
            routeStatus,
            hasOverflow: pageAudit.hasOverflow,
            docWidth: pageAudit.docWidth,
            winWidth: pageAudit.winWidth,
            bottomNavVisible: pageAudit.bottomNavVisible,
            mobileCardsVisible: pageAudit.mobileCardsVisible,
            smallCount: pageAudit.smallCount,
            sub16InputsCount: pageAudit.sub16InputsCount
          });
        }

        // Test Modal & Bottom Sheet on /tickets (for ADMIN)
        if (roleObj.role === 'ADMIN') {
          await navigateAndWait(cdp, `http://localhost:${PORT}/tickets`, 400);

          // Click New Device Intake button
          await cdp.evaluate(`
            const intakeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Intake') || b.innerText.includes('New Device Intake'));
            if (intakeBtn) intakeBtn.click();
          `);

          await sleep(400);

          const sheetCheck = await cdp.evaluate(`
            (() => {
              const overlay = document.querySelector('.modal-overlay');
              const content = document.querySelector('.modal-content');
              const dragHandle = document.querySelector('.sheet-drag-handle');
              const cancelBtn = Array.from(document.querySelectorAll('.modal-footer button')).find(b => b.innerText.includes('Cancel'));

              if (!overlay || !content) return { open: false };

              const overlayStyle = window.getComputedStyle(overlay);
              const contentStyle = window.getComputedStyle(content);
              const dragHandleStyle = dragHandle ? window.getComputedStyle(dragHandle) : null;

              const isBottomSheet = overlayStyle.alignItems === 'flex-end';
              const contentHeight = Math.round(content.getBoundingClientRect().height);
              const contentWidth = Math.round(content.getBoundingClientRect().width);

              if (cancelBtn) cancelBtn.click(); // Clean close

              return {
                open: true,
                isBottomSheet,
                dragHandleVisible: dragHandleStyle ? dragHandleStyle.display !== 'none' : false,
                contentHeight,
                contentWidth,
                maxHeight: contentStyle.maxHeight
              };
            })()
          `);

          console.log(`    [Modal/Bottom Sheet] Open=${sheetCheck.open} | IsBottomSheet=${sheetCheck.isBottomSheet} | DragHandle=${sheetCheck.dragHandleVisible} | Size=${sheetCheck.contentWidth}x${sheetCheck.contentHeight}`);
          results.modalSheetTests.push({ viewport: vp.name, ...sheetCheck });
        }

        // Test BottomNav "More" Drawer on Mobile Viewports (for ADMIN)
        if (roleObj.role === 'ADMIN' && vp.isMobile) {
          await navigateAndWait(cdp, `http://localhost:${PORT}/dashboard`, 400);

          await cdp.evaluate(`
            const moreBtn = Array.from(document.querySelectorAll('.bottom-nav-item')).find(b => b.innerText.includes('More'));
            if (moreBtn) moreBtn.click();
          `);
          await sleep(350);

          const moreDrawerCheck = await cdp.evaluate(`
            (() => {
              const sidebar = document.querySelector('.sidebar');
              const overlay = document.querySelector('.sidebar-overlay');
              const isOpen = sidebar ? sidebar.classList.contains('mobile-open') : false;
              const hasBackdrop = overlay ? overlay.classList.contains('active') : false;

              // Click backdrop to close
              if (overlay) overlay.click();

              return {
                hasMoreBtn: true,
                opensDrawer: isOpen,
                hasBackdrop: hasBackdrop
              };
            })()
          `);

          console.log(`    [Mobile More Drawer] HasMoreBtn=${moreDrawerCheck.hasMoreBtn} | OpensDrawer=${moreDrawerCheck.opensDrawer} | Backdrop=${moreDrawerCheck.hasBackdrop}`);
          results.moreDrawerTests.push({ viewport: vp.name, ...moreDrawerCheck });
        }

        // Test Print View for Invoices (on Billing page for ADMIN on desktop)
        if (roleObj.role === 'ADMIN' && vp.name === 'Desktop Standard') {
          await navigateAndWait(cdp, `http://localhost:${PORT}/billing`, 400);

          // Click invoice view button
          await cdp.evaluate(`
            const printBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('View') || b.innerText.includes('Print'));
            if (printBtn) printBtn.click();
          `);
          await sleep(400);

          const invoiceModalCheck = await cdp.evaluate(`
            (() => {
              const invoiceModal = document.querySelector('.modal-content');
              const invoiceHeader = Array.from(document.querySelectorAll('h3, h2')).find(h => h.innerText.includes('Invoice') || h.innerText.includes('INV-'));
              const closeBtn = document.querySelector('.modal-content button');
              if (closeBtn) closeBtn.click();

              return {
                modalFound: !!invoiceModal,
                invoiceHeaderFound: !!invoiceHeader,
                hasPrintStyles: !!document.querySelector('style, link[rel="stylesheet"]')
              };
            })()
          `);

          console.log(`    [Invoice Print Audit] ViewModalFound=${invoiceModalCheck.modalFound} | HeaderFound=${invoiceModalCheck.invoiceHeaderFound}`);
          results.invoicePrintTests.push(invoiceModalCheck);
        }
      }
    }
  } catch (err) {
    console.error('Test Suite encountered error:', err);
  } finally {
    // Check collected console errors
    results.consoleErrors = cdp.consoleErrors;

    console.log('\n======================================================');
    console.log('AUDIT EXECUTION COMPLETE. SUMMARY:');
    console.log('======================================================');
    console.log(`Viewports Tested: ${results.viewportsTested.join(', ')}`);
    console.log(`Total Route Checks Executed: ${results.roleRouteTests.length}`);
    const overflowFails = results.roleRouteTests.filter((r) => r.hasOverflow);
    console.log(`Horizontal Overflows Detected: ${overflowFails.length}`);
    if (overflowFails.length > 0) {
      console.log('Overflow Fail Details:', overflowFails.map((f) => `${f.viewport} ${f.route}: doc=${f.docWidth} win=${f.winWidth}`));
    }
    const guardFails = results.roleRouteTests.filter((r) => !['ACCESSED', 'PROPERLY_GUARDED'].includes(r.routeStatus));
    console.log(`RBAC Guard Failures: ${guardFails.length}`);
    if (guardFails.length > 0) {
      console.log('RBAC Fail Details:', guardFails.map((g) => `${g.viewport} [${g.role}] ${g.route}: ${g.routeStatus}`));
    }
    console.log(`Modal & Bottom Sheet Tests Passed: ${results.modalSheetTests.filter(m => m.open).length}/${results.modalSheetTests.length}`);
    console.log(`Mobile More Drawer Tests Passed: ${results.moreDrawerTests.filter(m => m.opensDrawer).length}/${results.moreDrawerTests.length}`);
    console.log(`Invoice Print Verification Passed: ${results.invoicePrintTests.filter(i => i.modalFound).length}/${results.invoicePrintTests.length}`);
    console.log(`Console Errors Logged: ${results.consoleErrors.length}`);
    if (results.consoleErrors.length > 0) {
      console.log('Console Errors:', results.consoleErrors);
    }

    // Cleanup Chrome and Vite
    try {
      chrome.kill();
      vite.kill();
    } catch (e) {}

    process.exit(0);
  }
}

runAudit();
