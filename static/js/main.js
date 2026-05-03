/* ═══════════════════════════════════════════
   main.js — Shared utilities
═══════════════════════════════════════════ */

// Toast notifications
function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  toast.innerHTML = `<span style="color:${type==='success'?'#22c55e':type==='error'?'#ef4444':'#F4A91F'}">${icon}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Fetch wrapper
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Load slot info and update UI
async function loadSlots() {
  const res = await fetch('/api/slots');
  if (!res.ok) return;
  const d = await res.json();

  const avail = document.getElementById('slotsAvail');
  const total = document.getElementById('slotsTotal');
  const fill = document.getElementById('slotFill');
  const label = document.getElementById('slotBarLabel');
  const closedBanner = document.getElementById('closedBanner');
  const registerBtn = document.getElementById('registerBtn');
  const formCard = document.getElementById('formCard');

  if (avail) avail.textContent = d.available;
  if (total) total.textContent = d.max;

  if (fill) {
    const pct = ((d.max - d.available) / d.max * 100).toFixed(1);
    fill.style.width = pct + '%';
    if (d.available <= 0) fill.classList.add('full');
  }

  if (label) {
    label.textContent = d.available > 0
      ? `${d.booked} registered · ${d.available} remaining`
      : 'All slots filled';
  }

  if (d.available <= 0) {
    if (closedBanner) closedBanner.classList.add('show');
    if (registerBtn) {
      registerBtn.textContent = '🚫 Registrations Closed';
      registerBtn.style.opacity = '0.5';
      registerBtn.style.pointerEvents = 'none';
    }
    if (formCard) formCard.style.display = 'none';

    // Update slot mini on register page
    const dot = document.getElementById('slotDot');
    const miniText = document.getElementById('slotMiniText');
    if (dot) dot.classList.add('full');
    if (miniText) miniText.textContent = 'Registrations Closed — All 16 slots filled';
  } else {
    const dot = document.getElementById('slotDot');
    const miniText = document.getElementById('slotMiniText');
    if (dot) dot.classList.remove('full');
    if (miniText) miniText.textContent = `${d.available} of ${d.max} slots available`;
  }
}

// Format date
function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Status badge HTML
function statusBadge(status) {
  const map = {
    pending: '<span class="badge badge-pending">⏳ Pending</span>',
    approved: '<span class="badge badge-approved">✓ Approved</span>',
    rejected: '<span class="badge badge-rejected">✗ Rejected</span>'
  };
  return map[status] || status;
}
