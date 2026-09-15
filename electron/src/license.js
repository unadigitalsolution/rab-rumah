// ════════════════════════════════════════════════════════════════════
// SISTEM LISENSI — RAB RUMAHKU PRO
// Copyright © 2026 UNA DIGITAL SOLUTION
//
// Trial 7 hari (server-authoritative bila online, fallback ke catatan
// lokal bila offline — aplikasi ini "Offline-first"), lalu lisensi
// tahunan Rp 500.000/tahun. Menggunakan infrastruktur Cloud Functions
// yang sama dengan produk UNA lainnya (index.js backend):
//   - getRabTrialStatus  → status trial 7 hari per device
//   - verifyLicense      → verifikasi/aktivasi license key (paket_id: 'rab_yearly')
//
// PENTING: sesuaikan API_HOST di bawah dengan Cloud Functions project
// UNA Digital Solution yang sebenarnya setelah kedua fungsi di atas
// (lihat backend index.js) selesai di-deploy.
// ════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const API_HOST = 'asia-southeast2-simtrenpro.cloudfunctions.net';
const TRIAL_DAYS = 7;
const PRODUCT_ID = 'rab_yearly';
const HARGA_TAHUNAN = 500000;
let APP_VERSION = '3.0.2';
try { APP_VERSION = require('../package.json').version || APP_VERSION; } catch (e) {}

function stateFile() {
  return path.join(app.getPath('userData'), 'license-state.json');
}
function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) || {}; } catch (e) { return {}; }
}
function writeState(s) {
  try { fs.mkdirSync(path.dirname(stateFile()), { recursive: true }); fs.writeFileSync(stateFile(), JSON.stringify(s, null, 2)); } catch (e) {}
}

// Device fingerprint kasar — bertahan setelah uninstall/install ulang
// APLIKASI (tapi tidak setelah install ulang OS), supaya trial tidak
// trivial direset hanya dengan uninstall/reinstall aplikasi.
function getDeviceId() {
  var cpuModel = (os.cpus() && os.cpus()[0] && os.cpus()[0].model) || '';
  var raw = [os.hostname(), os.platform(), os.arch(), cpuModel, (os.userInfo().username || '')].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function postJSON(fnName, payload) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(payload);
    var req = https.request({
      hostname: API_HOST,
      path: '/' + fnName,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000,
    }, function (res) {
      var body = '';
      res.on('data', function (c) { body += c; });
      res.on('end', function () {
        try { resolve({ statusCode: res.statusCode, json: JSON.parse(body || '{}') }); }
        catch (e) { reject(e); }
      });
    });
    req.on('timeout', function () { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── TRIAL 7 HARI ────────────────────────────────────────────────────
async function checkTrial() {
  var deviceId = getDeviceId();
  var state = readState();
  var now = Date.now();

  // Catat mulai trial secara lokal sekali saja — supaya trial tetap
  // jalan walau device belum pernah online sama sekali.
  if (!state.trialStartLocal) {
    state.trialStartLocal = now;
    state.deviceId = deviceId;
    writeState(state);
  }

  try {
    var resp = await postJSON('getRabTrialStatus', { deviceId: deviceId, appVersion: APP_VERSION });
    if (resp.json && resp.json.success) {
      state.trialServer = resp.json;
      state.lastSyncAt = now;
      writeState(state);
      return {
        active: !!resp.json.active,
        daysLeft: Math.max(0, Math.ceil((resp.json.remainingMs || 0) / 86400000)),
        trialEnd: resp.json.trialEnd,
        source: 'server',
      };
    }
  } catch (e) {
    // Offline / server bermasalah → pakai catatan lokal (fallback offline-first)
  }

  var cachedEnd = state.trialServer && state.trialServer.trialEnd ? new Date(state.trialServer.trialEnd).getTime() : null;
  var localEnd = state.trialStartLocal + TRIAL_DAYS * 86400000;
  var end = cachedEnd || localEnd;
  var remaining = Math.max(0, end - now);
  return {
    active: remaining > 0,
    daysLeft: Math.ceil(remaining / 86400000),
    trialEnd: new Date(end).toISOString(),
    source: cachedEnd ? 'cache' : 'local',
  };
}

// ── AKTIVASI / VERIFIKASI LICENSE KEY ──────────────────────────────
// Memakai endpoint verifyLicense yang sama dipakai produk UNA lainnya;
// key RAB Rumahku Pro tersimpan di koleksi `licenses` dengan
// paket_id: 'rab_yearly'.
async function activateLicense(licenseKey) {
  if (!licenseKey || !String(licenseKey).trim()) return { ok: false, message: 'License key kosong.' };
  var deviceId = getDeviceId();
  var resp = await postJSON('verifyLicense', {
    licenseKey: String(licenseKey).toUpperCase().trim(),
    installId: deviceId,
    appVersion: APP_VERSION,
  });
  var j = resp.json || {};
  if (j.success && j.valid !== false) {
    var state = readState();
    state.license = { key: String(licenseKey).toUpperCase().trim(), lastVerified: Date.now(), data: j };
    writeState(state);
    return { ok: true, status: j.status, trialEnd: j.trialEnd, message: j.message || 'Lisensi berhasil diaktifkan.' };
  }
  return { ok: false, message: j.message || 'License key tidak valid atau tidak ditemukan.' };
}

function getCachedLicense() {
  return readState().license || null;
}

// ── STATUS GABUNGAN — dipanggil main.js setelah jendela utama terbuka ──
async function getLicenseStatus() {
  var cached = getCachedLicense();
  if (cached && cached.key) {
    var offlineDays = (cached.data && cached.data.status === 'active') ? 45 : 10;
    var elapsedDays = (Date.now() - (cached.lastVerified || 0)) / 86400000;
    try {
      var fresh = await activateLicense(cached.key);
      if (fresh.ok) return { licensed: true, mode: 'licensed', message: fresh.message };
      if (elapsedDays <= offlineDays) return { licensed: true, mode: 'licensed-offline', message: 'Lisensi aktif (mode offline).' };
      return { licensed: false, mode: 'expired', message: fresh.message };
    } catch (e) {
      if (elapsedDays <= offlineDays) return { licensed: true, mode: 'licensed-offline', message: 'Lisensi aktif (mode offline).' };
      return { licensed: false, mode: 'offline-grace-habis', message: 'Tidak dapat memverifikasi lisensi. Sambungkan ke internet.' };
    }
  }

  var trial = await checkTrial();
  return {
    licensed: trial.active,
    mode: trial.active ? 'trial' : 'trial-habis',
    daysLeft: trial.daysLeft,
    trialEnd: trial.trialEnd,
    hargaTahunan: HARGA_TAHUNAN,
    message: trial.active
      ? 'Masa trial ' + trial.daysLeft + ' hari lagi.'
      : 'Masa trial 7 hari telah berakhir. Silakan aktivasi lisensi tahunan (Rp ' + HARGA_TAHUNAN.toLocaleString('id-ID') + '/tahun).',
  };
}

module.exports = {
  PRODUCT_ID, TRIAL_DAYS, HARGA_TAHUNAN,
  getDeviceId, checkTrial, activateLicense, getLicenseStatus, getCachedLicense,
};
