/* Lock screen shown when the free trial is over: share the Machine ID with KB.TECH, enter the key. */
(function () {
  const lic = window.kfLicense;
  const idEl = document.getElementById('machineId');
  const errEl = document.getElementById('lockError');
  const keyEl = document.getElementById('licenseKey');
  const form = document.getElementById('activateForm');

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  if (!lic) {
    idEl.textContent = 'Open KASHFLOW POS from the desktop icon';
    form.querySelector('button').disabled = true;
    return;
  }

  lic.status().then((s) => {
    if (!s.locked) {
      window.location.replace('login.html');
      return;
    }
    idEl.textContent = s.machineId;
    if (s.wrongDate) {
      document.getElementById('lockTitle').textContent = "Let's check your date";
      document.getElementById('lockText').textContent =
        "Your computer's date looks wrong. Please set the correct date and time in Windows, then open KASHFLOW POS again.";
    }
  });

  document.getElementById('lockWhatsApp').addEventListener('click', () => lic.openContact('whatsapp'));

  // Type or paste the key in any form; it is shown as XXXXX-XXXXX-XXXXX-XXXXX.
  keyEl.addEventListener('input', () => {
    const raw = keyEl.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 20);
    keyEl.value = raw.match(/.{1,5}/g)?.join('-') || '';
    errEl.hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const key = keyEl.value.trim();
    if (key.replace(/-/g, '').length < 20) {
      showError('Please enter the full 20-character licence key.');
      return;
    }
    const result = await lic.activate(key);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    form.innerHTML = '<p class="lock-success"><i class="fa-solid fa-circle-check"></i> All set! Thank you for choosing KASHFLOW.</p>';
    setTimeout(() => window.location.replace('login.html'), 1500);
  });
})();
