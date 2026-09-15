// ════════════════════════════════════════════════════════════════════
// LICENSE UI — RAB RUMAHKU PRO
// Copyright © 2026 UNA DIGITAL SOLUTION
// File terpisah dari app.js supaya tidak menyentuh logika aplikasi
// yang sudah ada. Ditampilkan sebagai overlay (trial habis = blocking,
// trial aktif/lisensi aktif = badge kecil non-blocking).
// ════════════════════════════════════════════════════════════════════
(function () {
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch (e) { return '-'; }
  }
  function fmtRp(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'); }

  function ensureOverlay() {
    var ov = document.getElementById('licenseOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'licenseOverlay';
      ov.className = 'license-overlay';
      ov.hidden = true;
      document.body.appendChild(ov);
    }
    return ov;
  }
  function ensureBadge() {
    var b = document.getElementById('licenseBadge');
    if (!b) {
      b = document.createElement('div');
      b.id = 'licenseBadge';
      b.className = 'license-badge';
      document.body.appendChild(b);
    }
    return b;
  }

  function renderOverlay(status, opts) {
    var ov = ensureOverlay();
    var expired = !status.licensed;
    var harga = fmtRp(status.hargaTahunan || 500000);
    ov.innerHTML =
      '<div class="license-box">' +
        '<div class="license-brand">🏠 RAB Rumahku Pro</div>' +
        (expired
          ? '<h2>Masa Trial Berakhir</h2><p>Masa trial 7 hari RAB Rumahku Pro sudah habis. Aktifkan lisensi tahunan untuk terus menggunakan aplikasi.</p>'
          : (status.mode === 'trial'
              ? '<h2>Trial Aktif</h2><p>Sisa masa trial: <b>' + (status.daysLeft != null ? status.daysLeft : '-') + ' hari</b> (sampai ' + fmtDate(status.trialEnd) + ').</p>'
              : '<h2>Lisensi Aktif</h2><p>' + (status.message || 'Lisensi RAB Rumahku Pro Anda aktif.') + '</p>')) +
        '<div class="license-price">Lisensi Tahunan — ' + harga + '/tahun</div>' +
        (expired || status.mode === 'trial'
          ? '<input id="licKeyInput" placeholder="Masukkan License Key" class="license-input" autocomplete="off">' +
            '<div class="license-actions">' +
              '<button id="licActivateBtn" class="primary full">Aktifkan Lisensi</button>' +
              '<button id="licBuyBtn" class="secondary full">Beli Lisensi (' + harga + '/tahun)</button>' +
              (expired ? '' : '<button id="licContinueBtn" class="secondary full">Lanjutkan Trial</button>') +
            '</div>' +
            '<div id="licMsg" class="license-msg"></div>'
          : '<div class="license-actions"><button id="licCloseBtn" class="secondary full">Tutup</button></div>') +
        '<div class="license-copyright">Copyright © 2026 UNA Digital Solution</div>' +
      '</div>';
    ov.hidden = false;

    var activateBtn = document.getElementById('licActivateBtn');
    if (activateBtn) activateBtn.onclick = async function () {
      var input = document.getElementById('licKeyInput');
      var key = (input && input.value || '').trim();
      var msg = document.getElementById('licMsg');
      if (!key) { if (msg) msg.textContent = 'Masukkan license key terlebih dahulu.'; return; }
      if (msg) msg.textContent = 'Memverifikasi license key...';
      try {
        var r = await window.api.license.activate(key);
        if (msg) msg.textContent = r.message || (r.ok ? 'Lisensi aktif!' : 'Gagal aktivasi.');
        if (r.ok) {
          setTimeout(async function () {
            var fresh = await window.api.license.status();
            updateAll(fresh);
          }, 900);
        }
      } catch (e) {
        if (msg) msg.textContent = 'Gagal menghubungi server lisensi. Periksa koneksi internet.';
      }
    };
    var buyBtn = document.getElementById('licBuyBtn');
    if (buyBtn) buyBtn.onclick = function () { window.api.license.openPurchase(); };
    var contBtn = document.getElementById('licContinueBtn');
    if (contBtn) contBtn.onclick = function () { ov.hidden = true; };
    var closeBtn = document.getElementById('licCloseBtn');
    if (closeBtn) closeBtn.onclick = function () { ov.hidden = true; };
  }

  function renderBadge(status) {
    var b = ensureBadge();
    if (status.mode === 'licensed' || status.mode === 'licensed-offline') {
      b.textContent = '✔ Lisensi Aktif' + (status.mode === 'licensed-offline' ? ' (offline)' : '');
      b.className = 'license-badge active';
    } else if (status.mode === 'trial') {
      b.textContent = '⏳ Trial: ' + status.daysLeft + ' hari lagi';
      b.className = 'license-badge trial';
    } else {
      b.textContent = '⛔ Trial berakhir';
      b.className = 'license-badge expired';
    }
    b.onclick = function () { renderOverlay(status); };
  }

  function updateAll(status) {
    renderBadge(status);
    // Blocking hanya kalau tidak licensed sama sekali (trial habis / lisensi
    // expired tanpa toleransi offline tersisa). Selain itu cukup badge saja.
    if (!status.licensed) renderOverlay(status);
  }

  if (window.api && window.api.license) {
    window.api.license.onInit(function (status) { updateAll(status); });
  }
})();
