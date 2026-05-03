/* ═══════════════════════════════════════════
   register.js
═══════════════════════════════════════════ */

(async function () {
  // Load slots
  await loadSlots();

  // Generate next team ID preview
  const res = await fetch('/api/slots');
  if (res.ok) {
    const d = await res.json();
    const nextNum = d.booked + 1;
    const teamIdDisplay = document.getElementById('teamIdDisplay');
    if (teamIdDisplay) {
      teamIdDisplay.textContent = `VB2026-${String(nextNum).padStart(3, '0')}`;
    }
  }

  // Form validation helpers
  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function clearErr(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  function setInputErr(inputId, errId, msg) {
    const input = document.getElementById(inputId);
    if (input) input.style.borderColor = 'var(--danger)';
    showErr(errId, msg);
  }
  function clearInputErr(inputId, errId) {
    const input = document.getElementById(inputId);
    if (input) input.style.borderColor = '';
    clearErr(errId);
  }

  // Live validation
  document.getElementById('teamName')?.addEventListener('input', function () {
    if (this.value.trim()) clearInputErr('teamName', 'errTeamName');
  });
  document.getElementById('captainName')?.addEventListener('input', function () {
    if (this.value.trim()) clearInputErr('captainName', 'errCaptainName');
  });
  document.getElementById('phone')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
    if (/^\d{10}$/.test(this.value)) clearInputErr('phone', 'errPhone');
  });
  document.getElementById('teamSize')?.addEventListener('change', function () {
    if (this.value) clearInputErr('teamSize', 'errTeamSize');
  });
  document.getElementById('hometown')?.addEventListener('input', function () {
    if (this.value.trim()) clearInputErr('hometown', 'errHometown');
  });

  // Form submit
  document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    let valid = true;

    const teamName = document.getElementById('teamName').value.trim();
    const captainName = document.getElementById('captainName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const teamSize = document.getElementById('teamSize').value;
    const hometown = document.getElementById('hometown').value.trim();
    const terms = document.getElementById('termsAgree').checked;

    if (!teamName) { setInputErr('teamName', 'errTeamName', 'Team name is required'); valid = false; }
    if (!captainName) { setInputErr('captainName', 'errCaptainName', 'Captain name is required'); valid = false; }
    if (!/^\d{10}$/.test(phone)) { setInputErr('phone', 'errPhone', 'Enter a valid 10-digit phone number'); valid = false; }
    if (!teamSize) { setInputErr('teamSize', 'errTeamSize', 'Please select team size'); valid = false; }
    if (!hometown) { setInputErr('hometown', 'errHometown', 'Hometown is required'); valid = false; }
    if (!terms) { showToast('Please agree to the tournament rules to proceed', 'error'); valid = false; }

    if (!valid) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Reserving Slot…';

    const result = await apiFetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ team_name: teamName, captain_name: captainName, phone, team_size: parseInt(teamSize), hometown })
    });

    if (result.ok) {
      // Store for next pages
      sessionStorage.setItem('vb_registration', JSON.stringify(result.data));
      showToast('Registration successful! Redirecting…', 'success');
      setTimeout(() => {
        window.location.href = '/payment';
      }, 1200);
    } else {
      showToast(result.error, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Reserve Slot →';
    }
  });
})();
