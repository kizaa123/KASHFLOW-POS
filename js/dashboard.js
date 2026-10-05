/* Dashboard: stat cards, Today vs Yesterday hourly chart, low stock alerts. */
(function () {
  const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');
  let chart = null;

  function hourlyTotals(sales) {
    const buckets = new Array(24).fill(0);
    sales.forEach((s) => { buckets[new Date(s.time).getHours()] += Number(s.total) || 0; });
    return buckets;
  }
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function renderStats() {
    const todaySales = KF.salesForDay(KF.todayKey());
    KFUI.countTo(document.getElementById('statTodaySale'), sum(todaySales.map((s) => s.total)), { money: true, decimals: 2, prefix: 'GH₵ ' });
    KFUI.countTo(document.getElementById('statProducts'), KF.getProducts().length);
    KFUI.countTo(document.getElementById('statCategories'), KF.getCategories().length);
    KFUI.countTo(document.getElementById('statSuppliers'), KF.getSuppliers().length);
    KFUI.countTo(document.getElementById('statProfit'), KF.totalProfit(), { money: true, decimals: 2, prefix: 'GH₵ ' });
  }

  function renderChart() {
    const today = hourlyTotals(KF.salesForDay(KF.todayKey()));
    const yesterday = hourlyTotals(KF.salesForDay(KF.yesterdayKey()));

    KFUI.countTo(document.getElementById('chartToday'), sum(today), { money: true, decimals: 2, prefix: 'GH₵' });
    KFUI.countTo(document.getElementById('chartYesterday'), sum(yesterday), { money: true, decimals: 2, prefix: 'GH₵' });

    const empty = document.getElementById('chartEmpty');
    const noSales = sum(today) === 0 && sum(yesterday) === 0;
    if (empty) empty.hidden = !noSales;

    const textColor = cssVar('--text') || '#333';
    const gridColor = cssVar('--grid') || '#ddd';

    const config = {
      type: 'bar',
      data: {
        labels: HOURS,
        datasets: [
          { label: 'Yesterday', data: yesterday, backgroundColor: '#f26b1d', borderRadius: 2, barPercentage: 1, categoryPercentage: 0.7 },
          { label: 'Today', data: today, backgroundColor: '#1d4ed8', borderRadius: 2, barPercentage: 1, categoryPercentage: 0.7 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end', labels: { color: textColor, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${KF.money(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              font: { size: 9 },
              maxRotation: 0,
              autoSkip: false,
              // Label every 3 hours (00:00, 03:00, ...) like the original dashboard.
              callback: (value, index) => (index % 3 === 0 ? HOURS[index] : ''),
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            // With no sales Chart.js would draw a 0–1 scale (GH₵0.1, GH₵0.2…); keep a readable one instead.
            suggestedMax: noSales ? 100 : undefined,
            ticks: { color: textColor, font: { size: 9 }, precision: 0, callback: (v) => 'GH₵' + v },
            grid: { color: gridColor },
          },
        },
      },
    };

    if (chart) chart.destroy();
    if (typeof Chart === 'undefined') {
      document.querySelector('.chart-wrap').innerHTML = '<p class="muted">The chart could not load. Reinstall KASHFLOW POS if this keeps happening.</p>';
      return;
    }
    chart = new Chart(document.getElementById('salesChart'), config);
  }

  function renderLowStock() {
    const list = document.getElementById('lowStockList');
    const low = KF.lowStock().sort((a, b) => a.qty - b.qty);
    if (low.length === 0) {
      list.innerHTML = '<li><span class="dot"></span> All stock levels are healthy.</li>';
      return;
    }
    list.innerHTML = low
      .map((p) => `<li class="warn"><span class="dot"></span> <strong>${esc(p.name)}</strong> is running low <span class="qty">${esc(p.qty)} left</span></li>`)
      .join('');
  }

  renderStats();
  renderChart();
  renderLowStock();

  document.addEventListener('kf:themechange', renderChart);

  // RESET: wipe shop data, keep the signed-in login account.
  const resetBtn = document.getElementById('resetBtn');
  const resetModal = document.getElementById('resetModal');
  if (resetBtn && resetModal) {
    const keepName = document.getElementById('resetKeepName');
    const session = KF.getSession();
    if (keepName && session) keepName.textContent = session.username + (session.roleTitle ? ` (${session.roleTitle})` : '');

    function openReset() { KFUI.openModal(resetModal); }
    function closeReset() { KFUI.closeModal(resetModal); }
    resetBtn.addEventListener('click', openReset);
    document.getElementById('resetClose').addEventListener('click', closeReset);
    document.getElementById('resetCancel').addEventListener('click', closeReset);
    resetModal.addEventListener('click', (e) => { if (e.target === resetModal) closeReset(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !resetModal.hidden) closeReset(); });
    document.getElementById('resetConfirm').addEventListener('click', () => {
      KF.resetShop();
      window.location.reload();
    });
  }

  function refreshAll() {
    renderStats();
    renderChart();
    renderLowStock();
  }

  // Re-render when the day changes so today's bars become yesterday's (orange).
  let currentDay = KF.todayKey();
  function checkDay() {
    if (KF.todayKey() === currentDay) return;
    currentDay = KF.todayKey();
    refreshAll();
  }
  setInterval(checkDay, 60 * 1000);

  // A sale, return or stock change made in another window shows up straight away.
  window.addEventListener('storage', (e) => {
    if (e.key === KF.KEYS.sales || e.key === KF.KEYS.products) refreshAll();
  });
  // Coming back to the dashboard (Back button, or the PC waking from sleep after midnight).
  window.addEventListener('pageshow', (e) => { if (e.persisted) refreshAll(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { checkDay(); refreshAll(); }
  });
})();
