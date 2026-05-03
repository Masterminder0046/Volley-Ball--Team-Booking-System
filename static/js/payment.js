/* ═══════════════════════════════════════════
   payment.js
═══════════════════════════════════════════ */

(function () {
  const reg = JSON.parse(sessionStorage.getItem('vb_registration') || '{}');

  if (!reg.team_id) {
    showToast('No registration found. Please register first.', 'error');
    setTimeout(() => window.location.href = '/register', 2000);
    return;
  }

  // Populate team summary
  document.getElementById('sumTeamId').textContent = reg.team_id || '—';
  document.getElementById('sumTeamName').textContent = reg.team_name || '—';

  // Fetch full team details
  fetch(`/api/team/${reg.team_id}`)
    .then(r => r.json())
    .then(team => {
      document.getElementById('sumCaptain').textContent = team.captain_name || '—';
    })
    .catch(() => {});

  // UPI deep link with team info
  const upiPayBtn = document.getElementById('upiPayBtn');
  if (upiPayBtn) {
    const upiUrl = `upi://pay?pa=sshamu46@okhdfcbank&pn=VB%20Tournament%202026&am=200&cu=INR-${reg.team_id}`;
    upiPayBtn.href = upiUrl;
  }

  // Simple QR code placeholder (real app would use a QR library)
  generateQR();

  // File drop zone
  const fileDrop = document.getElementById('fileDrop');
  const fileInput = document.getElementById('screenshotFile');
  const filePreview = document.getElementById('filePreview');
  const previewImg = document.getElementById('previewImg');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadError = document.getElementById('uploadError');

  fileDrop?.addEventListener('click', () => fileInput.click());

  fileDrop?.addEventListener('dragover', e => {
    e.preventDefault();
    fileDrop.classList.add('drag-over');
  });

  fileDrop?.addEventListener('dragleave', () => {
    fileDrop.classList.remove('drag-over');
  });

  fileDrop?.addEventListener('drop', e => {
    e.preventDefault();
    fileDrop.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', function () {
    if (this.files.length) handleFile(this.files[0]);
  });

  function handleFile(file) {
    uploadError.style.display = 'none';

    if (!file.type.startsWith('image/')) {
      uploadError.textContent = 'Only image files are allowed';
      uploadError.style.display = 'block';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      uploadError.textContent = 'File size must be under 5MB';
      uploadError.style.display = 'block';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      filePreview.style.display = 'block';
      uploadBtn.disabled = false;
      fileDrop.style.borderColor = 'var(--success)';
    };
    reader.readAsDataURL(file);
  }

  // Upload submit
  uploadBtn?.addEventListener('click', async function () {
    const file = fileInput.files[0];
    if (!file) return;

    this.disabled = true;
    this.innerHTML = '<span class="spinner"></span> Uploading…';

    const formData = new FormData();
    formData.append('team_id', reg.team_id);
    formData.append('screenshot', file);

    try {
      const res = await fetch('/api/upload-payment', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Payment screenshot uploaded!', 'success');
        setTimeout(() => window.location.href = '/success', 1200);
      } else {
        showToast(data.error || 'Upload failed', 'error');
        this.disabled = false;
        this.innerHTML = 'Submit Payment Proof →';
      }
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error');
      this.disabled = false;
      this.innerHTML = 'Submit Payment Proof →';
    }
  });

  function generateQR() {
    const qrContainer = document.getElementById('qrContainer');
    if (!qrContainer) return;

    // Draw a simple SVG QR placeholder
    // In production, use qrcode.js library
    const upiData = `upi://pay?pa=sshamu46@okhdfcbank&pn=VB%20Tournament%202026&am=200&cu=INR`;
    qrContainer.innerHTML = `
      <div style="text-align:center;padding:8px;width:120px;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
        <div style="font-size:0.55rem;color:#333;font-weight:700;line-height:1.2;">Scan to Pay</div>
        <svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
          ${generateQRSVGPattern()}
        </svg>
        <div style="font-size:0.5rem;color:#666;">₹200 · UPI</div>
      </div>
    `;
  }

  function generateQRSVGPattern() {
    // Simple decorative QR-like pattern (not real QR, just visual)
    let cells = '';
    const size = 9;
    const cellSize = 8;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Finder patterns (corners)
        const inCorner =
          (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);
        const onEdge =
          (r === 0 || r === size - 1 || c === 0 || c === size - 1);
        const centerDot = (r >= 1 && r <= 1 && c >= 1 && c <= 1) ||
          (r >= 1 && r <= 1 && c >= size - 2 && c <= size - 2) ||
          (r >= size - 2 && r <= size - 2 && c >= 1 && c <= 1);

        let fill = '#333';
        let show = false;
        if (inCorner && onEdge) show = true;
        else if (centerDot) show = true;
        else if ((r + c) % 3 === 0 && Math.random() > 0.4) show = true;

        if (show) {
          cells += `<rect x="${c * cellSize + 2}" y="${r * cellSize + 2}" width="${cellSize - 1}" height="${cellSize - 1}" fill="${fill}" rx="1"/>`;
        }
      }
    }
    return cells;
  }
})();
