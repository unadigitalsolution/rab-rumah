# RAB-Rumahku Pro 3.0.0 — Final Upgrade Audit

## 1. Audit awal
Source v2.1.1 mempertahankan Electron, Three.js lokal, SQLite/better-sqlite3, RAB engine, material aggregation, export, project model, dan Phase 1 interactive wall/room editor. Tidak dilakukan penggantian stack.

## 2. Phase 1 dipertahankan
Select wall, drag wall, axis constraint, snap, grid, property panel, room adjustment, luas, undo/redo, save, reload, dan metadata object tetap dipertahankan.

## 3. Fitur baru
- Kamera adaptif berbasis ukuran bangunan.
- Preset Depan, Belakang, Kiri, Kanan, Atas, 3/4, Jauh, 3/4 Jauh, Fit Building.
- Default view 3/4 Jauh.
- Lingkungan ringan: tanah/rumput, jalan, pagar, pohon.
- Warna visual per elemen dan preset Minimalis/Natural/Modern/Elegan/Tropical.
- Persistensi konfigurasi warna pada project.
- Reset warna.
- Pemisahan visualColor dari spesifikasi material konstruksi.
- Metadata pintu, jendela, lantai, atap, dinding, teras, pagar/landscape.
- Panel objek 3D menampilkan dimensi dan relasi RAB yang tersedia.

## 4. Sistem 3D
Three.js tetap digunakan. Geometry dibuat dari `project.building` dan `project.rooms`; dekorasi lingkungan tidak dimasukkan ke RAB.

## 5. Sistem kamera
Jarak kamera dihitung dari dimensi model, bukan satu nilai tetap. Preset jauh memakai multiplier tambahan. Fit Building dan zoom memiliki batas adaptif.

## 6. Sistem warna
Konfigurasi disimpan pada `project.visual.colors`. Perubahan warna hanya memengaruhi visual. Spesifikasi konstruksi tetap berada pada `project.spec`.

## 7. Sistem material
Material aggregation existing dipertahankan. Normalisasi memakai `materialId`, waste dan pembulatan pembelian tetap ditangani engine.

## 8. Traceability
`materialRecap.sources` existing tetap digunakan untuk menelusuri sumber material per pekerjaan/komponen.

## 9. Sinkronisasi RAB
Engine RAB tetap sumber perhitungan. Perubahan envelope bangunan melalui editor memperbarui `building.length`, `building.width`, dan `building.area`, lalu kalkulasi RAB dijalankan ulang. Tidak ada koefisien baru yang dibuat.

**Batas penting:** engine existing belum memiliki formula per-pekerjaan berbasis setiap room individual. Karena itu perubahan ukuran room internal tidak boleh dipalsukan sebagai perubahan RAB jika tidak ada formula yang mendukungnya. Perubahan dimensi envelope bangunan memang mengubah RAB karena geometry engine menghitung ulang berdasarkan panjang/lebar aktual.

## 10. Database
Schema database lama tidak di-reset. Konfigurasi visual berada di JSON project sehingga tidak membutuhkan migration database baru.

## 11. Testing
- JavaScript syntax: PASS
- Existing engine test: PASS
- Material aggregation/waste/source traceability/coefficient override: PASS
- Electron GUI runtime: NOT TESTED (ZIP source tidak menyertakan node_modules/native build)
- Drag mouse aktual pada Electron: NOT TESTED
- Save/reload GUI aktual: NOT TESTED
- WebGL visual runtime: NOT TESTED

Tidak ada klaim PASS untuk pengujian yang belum dijalankan secara runtime.

## 12. Known limitations
1. RAB masih menggunakan formula estimasi existing; tidak dibuat AHSP/koefisien baru.
2. Room individual belum mempunyai job/material formula spesifik sendiri, sehingga resize room internal belum secara otomatis mengubah RAB secara semantik per-room.
3. Pintu/jendela editor penuh (drag sepanjang dinding) belum diimplementasikan sebagai editor terpisah; metadata dan ukuran visual sudah disiapkan.
4. Cutaway/interior khusus belum menjadi sistem section plane; mode Atas Tanpa Genteng tetap menggunakan visibility roof.
5. Native SQLite/Electron harus di-install/rebuild pada mesin target.

## 13. Cara menjalankan
```bash
cd electron
npm install
npm start
```
Untuk pengujian engine:
```bash
cd electron
npm test
```
Build Windows:
```bash
npm run dist
```

## 14. File utama yang diubah
- `electron/package.json` — versi 3.0.0
- `electron/src/index.html` — branding/version
- `electron/src/app.js` — visual configuration, camera/editor UI, color presets, persistence hooks, wall sync
- `electron/src/render3d.js` — adaptive 3D, camera presets, environment, visual colors, metadata, performance cleanup
- `electron/src/engine.js` — footprint/area mengikuti dimensi building aktual saat kalkulasi

## 15. Prinsip integritas
Tidak dibuat aplikasi baru, tidak diganti stack, tidak dihapus database, tidak dibuat engine RAB kedua, tidak dibuat koefisien fiktif, dan tidak mengklaim pengujian GUI yang belum dilakukan.
