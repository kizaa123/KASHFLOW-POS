/* Help Center: questions a shop user actually worries about, with plain answers. */
(function () {
  const ALL_CATS = [
    { id: 'all', label: 'All' },
    { id: 'start', label: 'Getting started' },
    { id: 'stock', label: 'Products & stock' },
    { id: 'pos', label: 'Selling (POS)' },
    { id: 'people', label: 'Staff & accounts' },
    { id: 'report', label: 'Dashboard & reports' },
    { id: 'reset', label: 'Reset & data' },
  ];
  const session = KF.getSession();
  const isAdmin = session && session.role === 'admin';
  const CATS = isAdmin ? ALL_CATS : ALL_CATS.filter((c) => ['all', 'start', 'stock', 'pos'].includes(c.id));

  const FAQ = [
    {
      id: 'start-using',
      cat: 'start',
      q: 'How do I start using the system?',
      a: `
        <p>Use KASHFLOW in this order the first time you set up a shop:</p>
        <ol>
          <li>Create your Administrator account on the welcome screen, then follow the hand guide on the Dashboard.</li>
          <li>Open <strong>Categories</strong> and add the groups you sell (for example Beverages, Snacks).</li>
          <li>Open <strong>Suppliers</strong> and add the people or companies you buy from.</li>
          <li>Open <strong>Products</strong> and load every item with its price, cost, stock quantity and a photo if you have one.</li>
          <li>Open <strong>Staff Management</strong> and <strong>User Accounts</strong> if other people will also use the computer.</li>
          <li>Go to <strong>POS</strong> and make a sale. Check the <strong>Dashboard</strong> and <strong>Report</strong> afterwards so you can see the sale landed.</li>
        </ol>
        <p>The demo items that appear on first login are only samples. Edit or delete them and add your real shop stock.</p>`,
    },
    {
      id: 'first-login',
      cat: 'start',
      q: 'What username and password do I use the first time?',
      a: `
        <p>There are no ready-made passwords. The first time KASHFLOW opens, a <strong>Welcome</strong> screen asks you to create your own Administrator account (a username and a password).</p>
        <p>You are logged in straight away, and a pointing hand walks you through the menu. Afterwards, log in with that same username and password and choose <em>Login As → Administrator</em>.</p>
        <p>To give a cashier their own login, add them on <strong>Staff Management</strong> (tick <em>Create a login account</em>) or on <strong>User Accounts</strong>.</p>`,
    },
    {
      id: 'replay-guide',
      cat: 'start',
      q: 'Can I see the hand guide again?',
      a: `<p>Yes. An Administrator can press <strong>Show the guide again</strong> at the top of this page. The Dashboard opens and the hand walks through the menu once more.</p>`,
    },
    {
      id: 'login-fail',
      cat: 'start',
      q: 'Why won’t my login work?',
      a: `
        <p>Check these things:</p>
        <ul>
          <li>Username and password must match an account on <strong>User Accounts</strong>.</li>
          <li><strong>Login As</strong> must match that account’s role. An Administrator account cannot log in as Cashier, and a Cashier account cannot log in as Administrator.</li>
          <li>Caps Lock can change a password. Passwords are checked exactly as typed.</li>
          <li>After 5 wrong passwords in a row, the login page locks for 5 minutes. Wait, then try again. The Administrator sees a <em>Login blocked</em> alert in Notifications.</li>
        </ul>`,
    },
    {
      id: 'theme',
      cat: 'start',
      q: 'How do I switch between light and dark theme?',
      a: `<p>Click the moon / sun button at the top-right of any page. The choice is saved on this computer, so the same theme comes back the next time you open KASHFLOW.</p>`,
    },
    {
      id: 'logout',
      cat: 'start',
      q: 'How do I log out?',
      a: `<p>Use the red <strong>Logout</strong> button at the bottom of the sidebar. You will need the username and password again to come back in. Closing the browser also logs you out. Always log out if other people use this computer.</p>`,
    },
    {
      id: 'who-sees-what',
      cat: 'people',
      q: 'What can an Administrator do that a Cashier cannot?',
      a: `
        <p>A <strong>Cashier</strong> can sell on POS, look at the dashboard, products, categories, suppliers, reports, notifications and this Help Center.</p>
        <p>Only an <strong>Administrator</strong> can open <strong>Staff Management</strong> and <strong>User Accounts</strong> (create logins, change passwords, delete accounts).</p>`,
    },
    {
      id: 'add-category',
      cat: 'stock',
      q: 'How do I add a category?',
      a: `<p>Open <strong>Categories</strong>, click <strong>Add Category</strong>, type the name (and an optional description) and save. Products need a category, so add your groups before you load a long product list.</p>`,
    },
    {
      id: 'add-supplier',
      cat: 'stock',
      q: 'How do I add a supplier?',
      a: `<p>Open <strong>Suppliers</strong>, click <strong>Add Supplier</strong>, and enter the name, phone, location and the goods they bring. You can then pick that supplier when you add a product.</p>`,
    },
    {
      id: 'add-product',
      cat: 'stock',
      q: 'How do I add a product?',
      a: `
        <p>Open <strong>Products</strong> → <strong>Add Product</strong>. Fill in:</p>
        <ul>
          <li>Name, category, supplier</li>
          <li><strong>Cost</strong> (what you pay) and <strong>Price</strong> (what the customer pays)</li>
          <li>Stock quantity</li>
          <li>Unit: <em>Single</em> or <em>Packet</em></li>
          <li>A photo, if you have one. A barcode is created for you if you leave it blank.</li>
        </ul>
        <p>Saving a product also raises a “Product loaded” notification.</p>`,
    },
    {
      id: 'packet',
      cat: 'stock',
      q: 'What is the difference between Single and Packet?',
      a: `
        <p><strong>Single</strong> means you sell one piece at a time (a bottle, a bar of soap).</p>
        <p><strong>Packet</strong> means you sell a pack that holds several pieces. Enter how many pieces are in one packet. Stock is counted in packets, and the system also shows the total pieces (for example 10 Pkts (120 Pcs)).</p>
        <p>On POS you still add whole packets to the order — you cannot sell half a packet.</p>`,
    },
    {
      id: 'low-stock',
      cat: 'stock',
      q: 'When is a product “low stock”?',
      a: `
        <p>Any product with fewer than <strong>10</strong> left is treated as low. On POS the quantity turns <strong>red</strong> when it is low and <strong>green</strong> when it is enough. The Dashboard lists low items, and the bell gets a low-stock notification.</p>
        <p>When you restock above 10, that alert is removed. If stock drops again later, a new alert appears.</p>`,
    },
    {
      id: 'edit-delete-product',
      cat: 'stock',
      q: 'How do I update or delete a product?',
      a: `<p>On <strong>Products</strong>, use the blue pencil to edit (change price, add stock, change photo) and the red bin to delete. Deleting a product does not delete past sales that already used that item — the sold name stays on the receipt and on the report.</p>`,
    },
    {
      id: 'make-sale',
      cat: 'pos',
      q: 'How do I make a sale?',
      a: `
        <ol>
          <li>Open <strong>POS</strong>.</li>
          <li>Tap a product (or type the name / barcode in the search box and press Enter) to add it to <strong>Current Order</strong>.</li>
          <li>Use + and − to change quantities. Click <strong>Clear</strong> if you need to start the order again.</li>
          <li>Click <strong>Proceed to Checkout</strong>.</li>
          <li>Choose the payment method (Cash, Mobile Money or Card) and an optional customer name. <strong>Served By</strong> is already the person signed in, so you do not pick staff each time.</li>
          <li>Click <strong>Confirm</strong>. Stock is taken out immediately, today’s dashboard and the report update, and a sale notification is raised.</li>
        </ol>`,
    },
    {
      id: 'over-sell',
      cat: 'pos',
      q: 'Can I sell more than what is in the shop?',
      a: `<p>No. POS will not let you add more than the quantity on the product. If someone else sold the last pieces on another window, checkout will stop you and ask you to adjust the order.</p>`,
    },
    {
      id: 'clear-order',
      cat: 'pos',
      q: 'How do I clear the current order?',
      a: `<p>On POS, click <strong>Clear</strong> next to Track Order in the Current Order header. That only empties the list you are building now. It does not cancel a sale that has already been confirmed.</p>`,
    },
    {
      id: 'print-receipt',
      cat: 'pos',
      q: 'How do I print a receipt after a sale?',
      a: `<p>When you see the <strong>Sale Completed!</strong> box, click <strong>Print Receipt</strong>. The shop printer dialog opens. If you do not want a paper receipt, click <strong>Done</strong> instead — that skips printing.</p>`,
    },
    {
      id: 'reprint',
      cat: 'pos',
      q: 'I skipped printing. How do I reprint a receipt later?',
      a: `
        <p>On POS click <strong>Track Order</strong>. Type the <strong>Order ID</strong> (for example ORD-1CETTB) from the receipt or from the sale notification, then search. The items, total and cashier appear. Click <strong>Print Receipt</strong>.</p>
        <p>You can also click the order number on a sale notification, or on the Report’s detailed table — that opens Track Order for that ID.</p>`,
    },
    {
      id: 'returns',
      cat: 'pos',
      q: 'Can a customer return items they already paid for?',
      a: `<p>No. Every printed receipt includes the line <em>“Items purchased cannot be returned.”</em> There is no return button on POS. Treat sales as final once Confirm is clicked.</p>`,
    },
    {
      id: 'served-by',
      cat: 'pos',
      q: 'Who is shown as “Served By” on the receipt?',
      a: `<p>The person signed in on the computer. Their name stays on Current Order and is filled on checkout automatically, so you do not pick a staff member for every sale. That name is stored on the sale, printed on the receipt, and used on the report under Sales by Cashier.</p>`,
    },
    {
      id: 'staff-vs-users',
      cat: 'people',
      q: 'What is the difference between Staff Management and User Accounts?',
      a: `
        <ul>
          <li><strong>Staff Management</strong> is the list of people who work in the shop (name, role, phone, photo). Tick <em>Create a login account</em> when adding them so they can sign in — their staff photo is the one that appears on the sidebar.</li>
          <li><strong>User Accounts</strong> are the usernames and passwords used on the login page. When you add an account, link it to the staff member so their profile picture is used when they log in.</li>
        </ul>
        <p>Both pages are only visible to Administrators.</p>`,
    },
    {
      id: 'create-cashier',
      cat: 'people',
      q: 'How do I create a login for a cashier?',
      a: `
        <p>Two ways:</p>
        <ul>
          <li>On <strong>Staff Management</strong>, add the person (with their photo) and tick <em>Create a login account</em>. Set a username, a password of at least 6 characters, and save.</li>
          <li>Or open <strong>User Accounts</strong> → add an account, choose that staff member, then set username, password and role <strong>Cashier</strong>.</li>
        </ul>
        <p>They log in with those details and choose <em>Login As → Cashier</em>. Their staff photo shows on the sidebar. Usernames must be unique and use letters, numbers, dots, underscores or hyphens (at least 3 characters).</p>`,
    },
    {
      id: 'delete-account',
      cat: 'people',
      q: 'Why can’t I delete some accounts?',
      a: `<p>You cannot delete the account you are currently signed in with (or you would lock yourself out). You also cannot remove or demote the last remaining Administrator — the shop must always have one person who can manage accounts.</p>`,
    },
    {
      id: 'dashboard',
      cat: 'report',
      q: 'What does the Dashboard show me?',
      a: `
        <p>The Dashboard is the morning snapshot:</p>
        <ul>
          <li><strong>Today’s Sale</strong> — money taken today (completed sales only)</li>
          <li><strong>Total Products / Categories / Suppliers</strong></li>
          <li><strong>Total Profit</strong> — selling price minus cost, for all completed sales</li>
          <li>The bar chart compares <strong>today</strong> (blue) with <strong>yesterday</strong> (orange), hour by hour</li>
          <li><strong>Low Stock Alerts</strong> lists items under 10</li>
        </ul>
        <p>Every confirmed POS sale updates these numbers straight away.</p>`,
    },
    {
      id: 'reports',
      cat: 'report',
      q: 'How do I see a full sales report?',
      a: `
        <p>Open <strong>Report</strong>. Filter by date (Today, This Month, Custom…), category and cashier. <strong>Visual Trends</strong> shows charts. <strong>Detailed Data</strong> lists every item sold, with a search box.</p>
        <p>Use <strong>Export to Excel</strong> or <strong>Export to PDF</strong> for a file of the items sold (tables only — no photos or charts). <strong>Print Report</strong> sends the same tables to the printer.</p>`,
    },
    {
      id: 'notifications',
      cat: 'report',
      q: 'What do the bell notifications mean?',
      a: `
        <p>Click the bell to open <strong>Notifications</strong>. You will see:</p>
        <ul>
          <li><strong>Sales</strong> — a new confirmed sale (with a link to Track Order)</li>
          <li><strong>Low stock</strong> — an item dropped under 10, or went out of stock</li>
          <li><strong>Products</strong> — a product was loaded or updated</li>
          <li><strong>Logins</strong> — who signed in, and when the previous login was</li>
        </ul>
        <p>The red badge on the bell is the number of unread alerts.</p>`,
    },
    {
      id: 'how-reset',
      cat: 'reset',
      q: 'How do I reset the system?',
      a: `
        <p>Go to the <strong>Dashboard</strong> and scroll to the footer. Click the red <strong>RESET</strong> button. Read the warning, then confirm.</p>
        <p>Only do this when you really want a clean shop — for example you were practising with sample items and now want to load the real stock.</p>`,
    },
    {
      id: 'reset-consequences',
      cat: 'reset',
      q: 'What happens after I reset? What do I lose?',
      a: `
        <div class="faq-warn">
          <p><strong>Reset cannot be undone.</strong> There is no recycle bin and no backup inside KASHFLOW.</p>
        </div>
        <p>These are deleted:</p>
        <ul>
          <li>All products, photos, barcodes and stock counts</li>
          <li>All categories and suppliers</li>
          <li>All staff records (the people list)</li>
          <li>All sales, order IDs, receipts and report history</li>
          <li>All notifications</li>
          <li>Every other user account except the one you are signed in with</li>
        </ul>
        <p>What stays:</p>
        <ul>
          <li>The login you used for this session (same username, password and role)</li>
          <li>The light / dark theme on this computer</li>
        </ul>
        <p>After reset the dashboard shows zeros, POS has no products to sell, Track Order cannot find old receipts, and the starter demo items do <strong>not</strong> come back. You must add categories, suppliers and products again before you can sell.</p>
        <p>Cashier logins are removed too. Create new ones afterwards if you still need them.</p>
        <p><strong>Going live:</strong> the products and categories you see on first install are demo samples. Press RESET once when you are ready to start your real business, then add your own goods.</p>`,
    },
    {
      id: 'where-data',
      cat: 'reset',
      q: 'Where is my shop data stored?',
      a: `
        <p>Everything is saved on this computer by the KASHFLOW POS app (not in the cloud), in the Windows folder <code>%APPDATA%\\KASHFLOW POS</code>. That is why the system works without an internet connection.</p>
        <p>Installing a new version of KASHFLOW keeps this data. A different Windows user or another PC starts with an empty shop — the data does not travel with you.</p>`,
    },
    {
      id: 'lost-data',
      cat: 'reset',
      q: 'What if I clear the browser or the computer is formatted?',
      a: `
        <p>Clearing this site’s data, using the browser’s “clear browsing data”, or resetting Windows will erase the shop the same way RESET does — including your login, unless you have written the username and password down.</p>
        <p>Before a big change, export a report to Excel or PDF so you at least have a copy of items sold. Keep a written list of products and the Administrator password somewhere safe.</p>`,
    },
    {
      id: 'zoom',
      cat: 'start',
      q: 'The screen looks too small or too big. Can I zoom?',
      a: `<p>Yes, a little. Hold <strong>Ctrl</strong> and press <strong>+</strong> to zoom in, <strong>−</strong> to zoom out (or turn the mouse wheel while holding Ctrl), and <strong>Ctrl + 0</strong> to go back to normal size.</p>
        <p>Zoom stays between <strong>80% and 120%</strong> so the screens never break apart, and KASHFLOW remembers your choice.</p>`,
    },
  ];

  const VISIBLE_FAQ = isAdmin ? FAQ : FAQ.filter((f) => ['start', 'stock', 'pos'].includes(f.cat));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chips = document.getElementById('helpChips');
  const list = document.getElementById('faqList');
  const empty = document.getElementById('helpEmpty');
  const search = document.getElementById('helpSearch');
  let cat = 'all';

  chips.innerHTML = CATS.map((c, i) =>
    `<button type="button" class="chip${i === 0 ? ' active' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`
  ).join('');

  function matches(item, q) {
    if (cat !== 'all' && item.cat !== cat) return false;
    if (!q) return true;
    const hay = (item.q + ' ' + item.a.replace(/<[^>]+>/g, ' ')).toLowerCase();
    return hay.includes(q);
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const items = VISIBLE_FAQ.filter((f) => matches(f, q));
    empty.hidden = items.length > 0;
    list.innerHTML = items.map((f) => `
      <article class="faq-item" id="${esc(f.id)}">
        <button type="button" class="faq-q" aria-expanded="false">
          <span>${esc(f.q)}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="faq-a" hidden>${f.a}</div>
      </article>`).join('');
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    cat = b.dataset.cat;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
    render();
  });
  search.addEventListener('input', render);

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-q');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    item.classList.toggle('open', !open);
    item.querySelector('.faq-a').hidden = open;
  });

  render();

  if (isAdmin && session.username !== KF.SUPPORT_USERNAME) {
    const intro = document.querySelector('.help-intro');
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'btn-purple small help-replay';
    replay.innerHTML = '<i class="fa-solid fa-hand-point-right"></i> Show the guide again';
    replay.addEventListener('click', () => {
      KF.replayTour(session.username);
      window.location.href = 'dashboard.html';
    });
    if (intro) intro.appendChild(replay);
  }

  // Open a question if the URL has #reset-consequences (or any FAQ id).
  const hash = (location.hash || '').replace('#', '');
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      const btn = target.querySelector('.faq-q');
      if (btn) btn.click();
      target.scrollIntoView({ block: 'start' });
    }
  }
})();
