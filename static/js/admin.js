/* ═══════════════════════════════════════════
   admin.js
═══════════════════════════════════════════ */

let allTeams = [];
let currentFilter = 'all';
let currentPage = 1;
const PAGE_SIZE = 10;

// ── Auth ─────────────────────────────────────────────────

async function checkAuth() {
  const res = await fetch('/api/admin/check');
  const d = await res.json();
  if (d.authenticated) showAdminPanel();
}

document.getElementById('loginBtn')?.addEventListener('click', async function () {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span>';

  const result = await apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (result.ok) {
    errEl.style.display = 'none';
    showAdminPanel();
  } else {
    errEl.style.display = 'block';
    this.disabled = false;
    this.innerHTML = 'Enter Admin Panel →';
  }
});

document.getElementById('loginPass')?.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('logoutBtn')?.addEventListener('click', async function () {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.reload();
});

function showAdminPanel() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadDashboard();
  loadAllTeams();
}

// ── Navigation ────────────────────────────────────────────

function showSection(name) {
  document.getElementById('sectionDashboard').style.display = name === 'dashboard' ? 'block' : 'none';
  document.getElementById('sectionTeams').style.display = name === 'teams' ? 'block' : 'none';
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  event?.target?.classList.add('active');
}

// ── Dashboard ─────────────────────────────────────────────

async function loadDashboard() {
  const result = await apiFetch('/api/admin/dashboard');
  if (!result.ok) return;
  const d = result.data;

  document.getElementById('statTotal').textContent = d.total;
  document.getElementById('statApproved').textContent = d.approved;
  document.getElementById('statPending').textContent = d.pending;
  document.getElementById('statRemaining').textContent = d.slots_remaining;

  // Sidebar
  document.getElementById('sbTotal').textContent = d.total;
  document.getElementById('sbApproved').textContent = d.approved;
  document.getElementById('sbPending').textContent = d.pending;

  // Slot bar
  const pct = (d.total / d.max_teams * 100).toFixed(1);
  const fill = document.getElementById('dashSlotFill');
  if (fill) fill.style.width = pct + '%';
  document.getElementById('slotFraction').textContent = `${d.total} / ${d.max_teams}`;

  document.getElementById('lastRefresh').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN');
}

// ── Teams ─────────────────────────────────────────────────

async function loadAllTeams() {
  const result = await apiFetch('/api/teams');
  if (!result.ok) { showToast('Failed to load teams', 'error'); return; }
  allTeams = result.data;
  renderTeams();
  renderRecentTeams();
}

function renderRecentTeams() {
  const tbody = document.getElementById('recentTeamsTbody');
  if (!tbody) return;
  const recent = allTeams.slice(0, 5);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--white-dim);padding:20px;">No teams yet</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(t => `
    <tr>
      <td class="team-id-cell">${t.team_id}</td>
      <td>${t.team_name}</td>
      <td>${t.captain_name}</td>
      <td>${statusBadge(t.payment_status)}</td>
      <td style="font-size:0.78rem;color:var(--white-dim);">${fmtDate(t.created_at)}</td>
    </tr>
  `).join('');
}

function getFilteredTeams() {
  const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
  return allTeams.filter(t => {
    const matchFilter = currentFilter === 'all' || t.payment_status === currentFilter;
    const matchSearch = !q ||
      t.team_name.toLowerCase().includes(q) ||
      t.captain_name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.team_id.toLowerCase().includes(q) ||
      t.hometown.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function renderTeams() {
  const filtered = getFilteredTeams();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('allTeamsTbody');
  const noTeams = document.getElementById('noTeams');
  const table = document.getElementById('allTeamsTable');

  if (!page.length) {
    if (table) table.style.display = 'none';
    if (noTeams) noTeams.style.display = 'block';
    renderPagination(0, 0);
    return;
  }

  if (table) table.style.display = 'table';
  if (noTeams) noTeams.style.display = 'none';

  tbody.innerHTML = page.map(t => `
    <tr>
      <td class="team-id-cell">${t.team_id}</td>
      <td style="font-weight:500;">${t.team_name}</td>
      <td>${t.captain_name}</td>
      <td class="text-mono" style="font-size:0.82rem;">${t.phone}</td>
      <td style="text-align:center;">${t.team_size}</td>
      <td style="font-size:0.82rem;color:var(--white-dim);">${t.hometown}</td>
      <td>${statusBadge(t.payment_status)}</td>
      <td>
        <div class="actions-cell">
          ${t.payment_screenshot ? `<button class="action-btn view-ss" onclick="viewScreenshot('${t.payment_screenshot}','${t.team_id} · ${t.team_name}')">📸</button>` : ''}
          ${t.payment_status !== 'approved' ? `<button class="action-btn approve" onclick="updateStatus('${t.team_id}','approved')">✓</button>` : ''}
          ${t.payment_status !== 'rejected' ? `<button class="action-btn reject" onclick="updateStatus('${t.team_id}','rejected')">✗</button>` : ''}
          <button class="action-btn delete" onclick="deleteTeam('${t.team_id}','${t.team_name}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination(totalPages, filtered.length);
}

function renderPagination(totalPages, total) {
  const pg = document.getElementById('pagination');
  if (!pg) return;
  if (totalPages <= 1) { pg.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  pg.innerHTML = html;
}

function goPage(n) {
  currentPage = n;
  renderTeams();
}

// Search & filter
document.getElementById('searchInput')?.addEventListener('input', () => {
  currentPage = 1;
  renderTeams();
});

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    currentPage = 1;
    renderTeams();
  });
});

// ── Actions ───────────────────────────────────────────────

async function updateStatus(teamId, status) {
  const result = await apiFetch('/api/admin/update-status', {
    method: 'POST',
    body: JSON.stringify({ team_id: teamId, status })
  });
  if (result.ok) {
    showToast(`Status updated to ${status}`, 'success');
    await loadAllTeams();
    await loadDashboard();
  } else {
    showToast(result.error || 'Update failed', 'error');
  }
}

async function deleteTeam(teamId, teamName) {
  if (!confirm(`Delete team "${teamName}" (${teamId})?\n\nThis action cannot be undone.`)) return;
  const result = await apiFetch(`/api/admin/delete-team/${teamId}`, { method: 'DELETE' });
  if (result.ok) {
    showToast(`${teamName} deleted`, 'success');
    await loadAllTeams();
    await loadDashboard();
  } else {
    showToast(result.error || 'Delete failed', 'error');
  }
}

// ── Screenshot modal ──────────────────────────────────────

function viewScreenshot(filename, label) {
  const modal = document.getElementById('ssModal');
  const img = document.getElementById('modalImg');
  const info = document.getElementById('modalTeamInfo');
  img.src = `/uploads/${filename}`;
  info.textContent = label;
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('ssModal').classList.remove('open');
}

document.getElementById('ssModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// ── Init ─────────────────────────────────────────────────

checkAuth();

// Auto-refresh every 30s
setInterval(() => {
  if (document.getElementById('adminPanel')?.style.display !== 'none') {
    loadDashboard();
    loadAllTeams();
  }
}, 30000);
