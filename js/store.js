/* KASHFLOW data layer – everything is kept in localStorage for now. */
(function (global) {
  const KEYS = {
    products: 'kf_products',
    categories: 'kf_categories',
    suppliers: 'kf_suppliers',
    sales: 'kf_sales',
    staff: 'kf_staff',
    users: 'kf_users',
    theme: 'kf_theme',
    session: 'kf_session',
    seeded: 'kf_seeded',
    tourDone: 'kf_tour_done',
    zoom: 'kf_zoom',
    notifications: 'kf_notifications',
    lastLogin: 'kf_last_login',
    shopName: 'kf_shop_name',
    authTokens: 'kf_auth_tokens',
    loginLock: 'kf_login_lock',
    demoSalesRemoved: 'kf_demo_sales_removed',
  };

  // Sessions used to live in localStorage, where they never expired. Drop any left over.
  localStorage.removeItem(KEYS.session);

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.session));
    } catch (e) {
      return null;
    }
  }
  function newToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const LOW_STOCK_LIMIT = 10;

  // Old versions shipped these logins with public passwords. Any still on those passwords are removed.
  const OLD_DEFAULT_PASSWORDS = { admin: 'admin123', cashier: 'cashier123' };

  // KB.TECH STUDIO support login. It is never stored with the shop's accounts and never shown on
  // User Accounts. Only a PBKDF2-SHA256 hash of its password is kept here.
  const SUPPORT_ACCOUNT = {
    username: 'kbtech.support',
    role: 'Administrator',
    displayName: 'KB.TECH Support',
    support: true,
  };
  const SUPPORT_SECRET = {
    salt: '5c377352d24bd9881c1f2db75df00c6b',
    iterations: 210000,
    hash: '12c3923a9f475f004f8eeaf09ca57e72297d43a31215f222057b92bd063ea236',
  };

  const hexToBytes = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
  const bytesToHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

  function read(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---- Date helpers ----
  function dayKey(date) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function todayKey() { return dayKey(new Date()); }
  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dayKey(d);
  }

  function money(n) {
    return 'GH₵' + Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function generateBarcode() {
    return '#PR-' + String(Math.floor(1000 + Math.random() * 9000));
  }

  // Older saved products may be missing the newer fields.
  function migrateProducts() {
    const list = read(KEYS.products, []);
    let changed = false;
    list.forEach((p) => {
      if (!p.barcode) { p.barcode = generateBarcode(); changed = true; }
      if (!p.unit) { p.unit = 'single'; changed = true; }
      if (!p.piecesPerPkt) { p.piecesPerPkt = 1; changed = true; }
      if (p.image === undefined) { p.image = null; changed = true; }
    });
    if (changed) write(KEYS.products, list);

    const cats = read(KEYS.categories, []);
    let catChanged = false;
    cats.forEach((c) => {
      if (c.description === undefined) { c.description = ''; catChanged = true; }
      if (!c.createdAt) { c.createdAt = new Date().toISOString(); catChanged = true; }
    });
    if (catChanged) write(KEYS.categories, cats);

    const sups = read(KEYS.suppliers, []);
    let supChanged = false;
    sups.forEach((s) => {
      if (s.location === undefined) { s.location = ''; supChanged = true; }
      if (s.goods === undefined) { s.goods = ''; supChanged = true; }
      if (s.phone === undefined) { s.phone = ''; supChanged = true; }
      if (!s.createdAt) { s.createdAt = new Date().toISOString(); supChanged = true; }
    });
    if (supChanged) write(KEYS.suppliers, sups);

    // Older versions seeded made-up sales. Every real POS sale has an order number; the demo ones never did.
    if (!read(KEYS.demoSalesRemoved, false)) {
      write(KEYS.sales, read(KEYS.sales, []).filter((s) => s.orderNo));
      write(KEYS.demoSalesRemoved, true);
    }
  }

  // ---- Demo seed so the dashboard is not empty on first run ----
  function seedIfEmpty() {
    if (read(KEYS.seeded, false)) { migrateProducts(); return; }

    const seedTime = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString();
    const categories = [
      ['Beverages', 'Drinks, water and juices'],
      ['Snacks', 'For chewing'],
      ['Toiletries', 'Soap, toothpaste and bathroom items'],
      ['Household', 'Cleaning and home items'],
      ['Stationery', 'Paper, pens and office supplies'],
      ['Electronics', 'Cables, chargers and gadgets'],
      ['Cosmetics', 'Lotions and beauty products'],
      ['Baby Care', 'Diapers and baby items'],
      ['Frozen Foods', 'Chilled and frozen items'],
    ].map(([name, description], i) => ({ id: i + 1, name, description, createdAt: seedTime((9 - i) * 37) }));

    const suppliers = [
      { id: 1, name: 'Accra Wholesale Ltd', phone: '+233 24 000 0000', location: 'Makola, Accra', goods: 'Beverages, snacks and toiletries', createdAt: seedTime(600) },
    ];

    const products = [
      ['Coca-Cola 500ml', 1, 1, 60, 5, 7],
      ['Voltic Water 1.5L', 1, 1, 48, 3, 4],
      ['Malta Guinness', 1, 1, 8, 6, 8],
      ['Pringles Original', 2, 1, 20, 18, 25],
      ['Digestive Biscuits', 2, 1, 35, 9, 12],
      ['Pepsodent Toothpaste', 3, 1, 25, 10, 14],
      ['Dettol Soap', 3, 1, 6, 7, 10],
      ['Omo Detergent 1kg', 4, 1, 15, 28, 35],
      ['Dish Sponge (3pk)', 4, 1, 40, 4, 6],
      ['A4 Paper Ream', 5, 1, 12, 32, 40],
      ['Bic Pen (Box)', 5, 1, 30, 12, 18],
      ['USB-C Cable', 6, 1, 4, 15, 25],
      ['Nivea Lotion 400ml', 7, 1, 18, 30, 42],
      ['Pampers Size 3', 8, 1, 9, 65, 80],
      ['Frozen Chicken 1kg', 9, 1, 22, 38, 48],
    ].map(([name, categoryId, supplierId, qty, cost, price], i) => ({
      id: i + 1, name, categoryId, supplierId, qty, cost, price,
      barcode: generateBarcode(), image: null, unit: 'single', piecesPerPkt: 1,
    }));

    // No demo sales: the dashboard chart, profit and reports only ever show sales made on the POS.
    write(KEYS.categories, categories);
    write(KEYS.suppliers, suppliers);
    write(KEYS.products, products);
    write(KEYS.sales, []);
    write(KEYS.seeded, true);
    write(KEYS.demoSalesRemoved, true);
  }

  // ---- Public API ----
  const KF = {
    KEYS,
    LOW_STOCK_LIMIT,
    money,
    dayKey,
    todayKey,
    yesterdayKey,
    seedIfEmpty,
    generateBarcode,

    // "5/5/2026, 8:53:55 PM"
    formatDateTime(iso) {
      const d = new Date(iso);
      if (isNaN(d)) return '—';
      return d.toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      });
    },

    nextId(list) {
      return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    },

    // "38 Qty" for single items, "379 Pkts (6064 Pcs)" for packets.
    stockLabel(p) {
      const qty = Number(p.qty) || 0;
      const per = Number(p.piecesPerPkt) || 1;
      if (p.unit === 'packet' && per > 1) return `${qty} Pkts (${(qty * per).toLocaleString()} Pcs)`;
      return `${qty} Qty`;
    },

    getProducts: () => read(KEYS.products, []),
    saveProducts(list) {
      write(KEYS.products, list);
      KF.syncLowStockNotifications();
    },
    getCategories: () => read(KEYS.categories, []),
    saveCategories: (list) => write(KEYS.categories, list),
    getSuppliers: () => read(KEYS.suppliers, []),
    saveSuppliers: (list) => write(KEYS.suppliers, list),
    getSales: () => read(KEYS.sales, []),
    saveSales: (list) => write(KEYS.sales, list),
    getStaff: () => read(KEYS.staff, []),
    saveStaff(list) {
      write(KEYS.staff, list);
    },
    // The shop's own accounts (the support login is never in this list).
    getUsers() {
      const list = read(KEYS.users, []);
      const kept = list.filter((u) => !(u.builtIn && OLD_DEFAULT_PASSWORDS[u.username] === u.password));
      if (kept.length !== list.length) write(KEYS.users, kept);
      return kept;
    },
    saveUsers(list) {
      write(KEYS.users, list.filter((u) => !u.support));
    },

    // First run (or every Administrator removed): the shop owner must create an account.
    needsSetup() {
      return !KF.getUsers().some((u) => u.role === 'Administrator');
    },

    SUPPORT_USERNAME: SUPPORT_ACCOUNT.username,
    isReservedUsername: (username) => String(username || '').trim().toLowerCase() === SUPPORT_ACCOUNT.username,

    // A shop account or the support login, for checking a session.
    findAccount(username) {
      if (username === SUPPORT_ACCOUNT.username) return SUPPORT_ACCOUNT;
      return KF.getUsers().find((u) => u.username === username) || null;
    },

    // Resolves to the support account when the password matches, otherwise null.
    async verifySupportLogin(username, password) {
      if (username !== SUPPORT_ACCOUNT.username || !password) return null;
      if (!global.crypto || !crypto.subtle) return null;
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(SUPPORT_SECRET.salt), iterations: SUPPORT_SECRET.iterations },
        key,
        256,
      );
      const got = bytesToHex(bits);
      let diff = got.length ^ SUPPORT_SECRET.hash.length;
      for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ SUPPORT_SECRET.hash.charCodeAt(i);
      return diff === 0 ? SUPPORT_ACCOUNT : null;
    },

    // Administrator -> admin access, every other role -> cashier access.
    accessLevel: (role) => (role === 'Administrator' ? 'admin' : 'cashier'),

    usernameFromName(name) {
      return String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
    },

    findStaffForAccount(account) {
      if (!account) return null;
      const staff = KF.getStaff();
      if (account.staffId) {
        const byId = staff.find((s) => s.id === Number(account.staffId));
        if (byId) return byId;
      }
      const display = String(account.displayName || '').trim().toLowerCase();
      if (display) {
        const byName = staff.find((s) => (s.name || '').trim().toLowerCase() === display);
        if (byName) return byName;
      }
      const user = String(account.username || '').trim().toLowerCase();
      if (!user) return null;
      const bySlug = staff.filter((s) => KF.usernameFromName(s.name) === user);
      if (bySlug.length === 1) return bySlug[0];
      const byFirst = staff.filter((s) => (s.name || '').trim().toLowerCase().split(/\s+/)[0] === user);
      if (byFirst.length === 1) return byFirst[0];
      return null;
    },

    resolveAccountProfile(account) {
      const staff = KF.findStaffForAccount(account);
      return {
        photo: (staff && staff.photo) || (account && account.photo) || null,
        displayName: (staff && staff.name) || (account && account.displayName) || (account && account.username) || '',
        staffId: (account && account.staffId) || (staff && staff.id) || null,
      };
    },

    syncStaffProfileToUsers(staff) {
      if (!staff) return;
      const users = KF.getUsers();
      let changed = false;
      users.forEach((u) => {
        if (u.staffId !== staff.id) return;
        u.photo = staff.photo || null;
        u.displayName = staff.name;
        changed = true;
      });
      if (changed) KF.saveUsers(users);
      const session = KF.getSession();
      if (!session) return;
      const mine = users.find((u) => u.username === session.username && u.staffId === staff.id);
      if (mine) {
        session.photo = mine.photo || null;
        session.displayName = mine.displayName;
        KF.setSession(session);
      }
    },

    lowStock() {
      return KF.getProducts().filter((p) => Number(p.qty) < LOW_STOCK_LIMIT);
    },

    // Completed (not returned) sales only – used for all totals and charts.
    activeSales() {
      return KF.getSales().filter((s) => !s.returned);
    },

    salesForDay(key) {
      return KF.activeSales().filter((s) => dayKey(s.time) === key);
    },

    totalProfit() {
      return KF.activeSales().reduce(
        (sum, s) => sum + s.items.reduce((a, l) => a + l.qty * (l.price - l.cost), 0),
        0,
      );
    },

    // ---- Point of sale ----
    getShopName: () => read(KEYS.shopName, 'KASHFLOW'),
    setShopName: (name) => write(KEYS.shopName, name),

    // "ORD-5B936Z"
    orderNumber() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
      let s = '';
      for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return 'ORD-' + s;
    },

    // Saves a sale, takes the items out of stock and raises the notifications.
    recordSale(sale) {
      const products = KF.getProducts();
      sale.items.forEach((line) => {
        const p = products.find((x) => x.id === line.productId);
        if (p) p.qty = Math.max(0, (Number(p.qty) || 0) - line.qty);
      });
      const sales = KF.getSales();
      const record = { id: KF.nextId(sales), ...sale };
      sales.push(record);
      write(KEYS.sales, sales);
      KF.saveProducts(products); // also refreshes low-stock alerts
      KF.notify({
        type: 'sale',
        title: 'New sale ' + record.orderNo,
        message: `${record.items.reduce((n, l) => n + l.qty, 0)} item(s) sold for ${money(record.total)} by ${record.cashier}.`,
        link: 'pos.html#order=' + encodeURIComponent(record.orderNo),
      });
      return record;
    },

    // Puts the items of a completed sale back into stock and marks the sale as returned.
    returnSale(orderNo, by) {
      const sales = KF.getSales();
      const sale = sales.find((s) => (s.orderNo || '').toUpperCase() === String(orderNo).trim().toUpperCase());
      if (!sale) return { error: 'No order with that number was found.' };
      if (sale.returned) return { error: `Order ${sale.orderNo} was already returned on ${KF.formatDateTime(sale.returnedAt)}.` };

      const products = KF.getProducts();
      sale.items.forEach((line) => {
        const p = products.find((x) => x.id === line.productId);
        if (p) p.qty = (Number(p.qty) || 0) + line.qty;
      });
      sale.returned = true;
      sale.returnedAt = new Date().toISOString();
      sale.returnedBy = by;
      write(KEYS.sales, sales);
      KF.saveProducts(products);
      KF.notify({
        type: 'sale',
        title: 'Order returned ' + sale.orderNo,
        message: `${sale.items.reduce((n, l) => n + l.qty, 0)} item(s) worth ${money(sale.total)} returned to stock by ${by}.`,
        link: 'pos.html#order=' + encodeURIComponent(sale.orderNo),
      });
      return { sale };
    },

    // ---- Notifications ----
    getNotifications: () => read(KEYS.notifications, []),
    saveNotifications: (list) => write(KEYS.notifications, list),
    notify({ type, title, message, link = null, key = null }) {
      const list = KF.getNotifications();
      const n = { id: KF.nextId(list), type, title, message, link, key, time: new Date().toISOString(), read: false };
      list.push(n);
      if (list.length > 200) list.splice(0, list.length - 200);
      write(KEYS.notifications, list);
      return n;
    },
    unreadCount() {
      return KF.getNotifications().filter((n) => !n.read).length;
    },
    // One alert per product while it stays low; cleared when it is restocked so it can fire again.
    syncLowStockNotifications() {
      const list = KF.getNotifications();
      const products = KF.getProducts();
      let changed = false;
      products.forEach((p) => {
        const key = 'low-' + p.id;
        const existing = list.find((n) => n.key === key);
        const isLow = Number(p.qty) < LOW_STOCK_LIMIT;
        const qty = Number(p.qty) || 0;
        const message = qty <= 0
          ? `${p.name} is out of stock. Restock now.`
          : `Only ${KF.stockLabel(p)} left in the shop. Restock soon.`;
        if (isLow && !existing) {
          list.push({
            id: KF.nextId(list), type: 'low', key, qty,
            title: (qty <= 0 ? 'Out of stock: ' : 'Low stock: ') + p.name,
            message, link: 'products.html', time: new Date().toISOString(), read: false,
          });
          changed = true;
        } else if (isLow && existing && existing.qty !== qty) {
          // Stock moved while still low: refresh the alert and bring it back to the top.
          existing.qty = qty;
          existing.title = (qty <= 0 ? 'Out of stock: ' : 'Low stock: ') + p.name;
          existing.message = message;
          existing.time = new Date().toISOString();
          existing.read = false;
          changed = true;
        } else if (!isLow && existing) {
          list.splice(list.indexOf(existing), 1);
          changed = true;
        }
      });
      if (changed) write(KEYS.notifications, list);
    },
    getLastLogin: () => read(KEYS.lastLogin, null),
    setLastLogin: (iso) => write(KEYS.lastLogin, iso),

    // Theme
    getTheme: () => read(KEYS.theme, 'dark'),
    setTheme(theme) {
      write(KEYS.theme, theme);
      document.documentElement.setAttribute('data-theme', theme);
    },

    // ---- Session ----
    // A session lives in this tab only (sessionStorage) and ends when the browser closes.
    // It is only valid while its random token is registered by the login page and the
    // account still exists; the access level always comes from the account, never the session.
    getSession() {
      const s = readSession();
      if (!s || typeof s.token !== 'string' || typeof s.username !== 'string') return null;
      const tokens = read(KEYS.authTokens, {});
      if (tokens[s.token] !== s.username) return null;
      const account = KF.findAccount(s.username);
      if (!account) return null;
      s.role = KF.accessLevel(account.role);
      s.roleTitle = account.role;
      return s;
    },
    setSession(s) {
      const current = readSession();
      if (!current || !current.token) return;
      sessionStorage.setItem(KEYS.session, JSON.stringify({ ...s, token: current.token, username: current.username }));
    },
    startSession(data) {
      const token = newToken();
      const tokens = read(KEYS.authTokens, {});
      tokens[token] = data.username;
      write(KEYS.authTokens, tokens);
      sessionStorage.setItem(KEYS.session, JSON.stringify({ ...data, token }));
    },
    clearSession() {
      const s = readSession();
      if (s && s.token) {
        const tokens = read(KEYS.authTokens, {});
        delete tokens[s.token];
        write(KEYS.authTokens, tokens);
      }
      sessionStorage.removeItem(KEYS.session);
    },
    // Signs out every tab using this account (after its password, role or name changes, or it is deleted).
    endSessionsFor(username, exceptToken) {
      const tokens = read(KEYS.authTokens, {});
      Object.keys(tokens).forEach((t) => {
        if (tokens[t] === username && t !== exceptToken) delete tokens[t];
      });
      write(KEYS.authTokens, tokens);
    },
    // Moves the signed-in tab to a renamed account without logging it out.
    renameSession(oldName, newName) {
      const s = readSession();
      const tokens = read(KEYS.authTokens, {});
      KF.endSessionsFor(oldName, s && s.token);
      if (s && s.token && tokens[s.token] === oldName) {
        const fresh = read(KEYS.authTokens, {});
        fresh[s.token] = newName;
        write(KEYS.authTokens, fresh);
        sessionStorage.setItem(KEYS.session, JSON.stringify({ ...s, username: newName }));
      }
    },
    currentToken() {
      const s = readSession();
      return s ? s.token : null;
    },

    // ---- Login lockout: 5 wrong passwords lock the login page for 5 minutes ----
    MAX_LOGIN_TRIES: 5,
    LOGIN_LOCK_MS: 5 * 60 * 1000,
    getLoginLock: () => read(KEYS.loginLock, { fails: 0, until: 0 }),
    setLoginLock: (lock) => write(KEYS.loginLock, lock),
    clearLoginLock: () => localStorage.removeItem(KEYS.loginLock),

    // ---- First-time guide (hand pointer), shown once per account ----
    tourDone: (username) => read(KEYS.tourDone, []).includes(username),
    markTourDone(username) {
      const done = read(KEYS.tourDone, []);
      if (!done.includes(username)) done.push(username);
      write(KEYS.tourDone, done);
    },
    replayTour(username) {
      write(KEYS.tourDone, read(KEYS.tourDone, []).filter((u) => u !== username));
    },

    // ---- Screen zoom: kept between 80% and 120% so the layout never breaks ----
    ZOOM_MIN: 0.8,
    ZOOM_MAX: 1.2,
    ZOOM_STEP: 0.1,
    clampZoom: (z) => Math.min(KF.ZOOM_MAX, Math.max(KF.ZOOM_MIN, Math.round((Number(z) || 1) * 10) / 10)),
    getZoom: () => KF.clampZoom(read(KEYS.zoom, 1)),
    setZoom(z) {
      const v = KF.clampZoom(z);
      write(KEYS.zoom, v);
      document.documentElement.style.zoom = v === 1 ? '' : String(v);
      return v;
    },

    // Wipe products, sales, staff and the rest. Keep only the signed-in login account.
    // A reset done from the support login keeps no shop account, so the owner sets up again.
    resetShop() {
      const session = KF.getSession();
      const keep = session
        ? KF.getUsers().find((u) => u.username === session.username)
        : null;
      write(KEYS.products, []);
      write(KEYS.categories, []);
      write(KEYS.suppliers, []);
      write(KEYS.sales, []);
      write(KEYS.staff, []);
      write(KEYS.notifications, []);
      write(KEYS.seeded, true);
      localStorage.removeItem(KEYS.shopName);
      localStorage.removeItem(KEYS.lastLogin);
      const token = KF.currentToken();
      write(KEYS.authTokens, session && token ? { [token]: session.username } : {});
      KF.saveUsers(keep ? [keep] : []);
      return keep;
    },
  };

  global.KF = KF;
})(window);
