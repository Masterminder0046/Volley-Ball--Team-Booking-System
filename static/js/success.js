/* ═══════════════════════════════════════════
   success.js
═══════════════════════════════════════════ */

(function () {
  const reg = JSON.parse(sessionStorage.getItem('vb_registration') || '{}');

  if (!reg.team_id) {
    showToast('No registration data found.', 'error');
    setTimeout(() => window.location.href = '/', 2000);
    return;
  }

  // Fetch latest team info
  fetch(`/api/team/${reg.team_id}`)
    .then(r => r.json())
    .then(team => {
      document.getElementById('confTeamId').textContent = team.team_id;
      document.getElementById('confTeamName').textContent = team.team_name;
      document.getElementById('confCaptain').textContent = team.captain_name;
      document.getElementById('confSize').textContent = `${team.team_size} Players`;
      document.getElementById('confHometown').textContent = team.hometown;
      document.getElementById('remindId').textContent = team.team_id;

      const payBadge = document.getElementById('paymentBadge');
      if (team.payment_screenshot) {
        if (payBadge) payBadge.textContent = 'Uploaded — Pending Review';
      }
    })
    .catch(() => {
      // Fallback to session storage
      document.getElementById('confTeamId').textContent = reg.team_id || '—';
      document.getElementById('confTeamName').textContent = reg.team_name || '—';
      document.getElementById('remindId').textContent = reg.team_id || '—';
    });

  // Payment links
  const payLink = document.getElementById('payNowLink');
  const payBtn = document.getElementById('paymentLinkBtn');
  if (payLink) payLink.href = '/payment';
  if (payBtn) payBtn.href = '/payment';

  // Launch confetti
  launchConfetti();

  function launchConfetti() {
    const wrap = document.getElementById('confettiWrap');
    if (!wrap) return;
    const colors = ['#F4A91F', '#E8531A', '#22c55e', '#60a5fa', '#F5F5F0'];
    for (let i = 0; i < 60; i++) {
      setTimeout(() => {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.cssText = `
          left: ${Math.random() * 100}%;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          width: ${4 + Math.random() * 8}px;
          height: ${4 + Math.random() * 8}px;
          border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
          animation-duration: ${1.5 + Math.random() * 2}s;
          animation-delay: ${Math.random() * 0.5}s;
        `;
        wrap.appendChild(piece);
        piece.addEventListener('animationend', () => piece.remove());
      }, i * 30);
    }
  }
})();
