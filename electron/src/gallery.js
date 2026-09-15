/* gallery.js — Galeri Sketsa & Tampak Real
 * Modul mandiri (tidak mengubah engine.js / main.js).
 *
 * Berisi:
 *  - renderGallery(): entry point, dipanggil dari nav "Galeri" di app.js
 *  - Carousel pemilih tipe rumah populer (21, 36, 45, 60, 72, 90, 120, 200)
 *  - Mode "Galeri Statis": menampilkan assets/tipe/sketsa-{tipe}.png & real-{tipe}.png
 *  - Mode "Editor Sketsa": editor denah interaktif (drag/resize/tambah/hapus ruangan)
 *    yang datanya disimpan sebagai JSON dan disinkronkan otomatis ke tampak real
 *    lewat renderRealHouse(jsonData).
 *  - Pilihan bahan (dinding, lantai, penutup atap — mis. bata merah/bata ringan,
 *    keramik/granit, genteng/baja ringan (spandek)/asbes) yang tersimpan di
 *    JSON sketsa (plan.materials), memengaruhi tampilan tampak real (pola/warna)
 *    dan, saat "Hitung RAB" ditekan, memengaruhi volume & harga material lewat
 *    engine.js (project.materials, kompatibel mundur bila tidak diisi).
 *  - Tombol "Lihat Detail RAB" / "Hitung RAB" memanggil window.api.calc() dengan
 *    data sketsa + bahan terbaru.
 *
 * Catatan desain: index.html membatasi CSP ke script-src 'self' dan aplikasi ini
 * tidak memakai bundler pada renderer, sehingga memuat pustaka 3D eksternal
 * (mis. Three.js via CDN) tidak sesuai dengan batasan tersebut. "Tampak real"
 * karena itu dihasilkan sebagai ilustrasi tampak depan (SVG) yang diprosedurkan
 * dari JSON sketsa (jumlah kamar -> jumlah jendela, bentuk atap -> siluet atap,
 * luas -> lebar bangunan), bukan render 3D penuh. Struktur renderRealHouse()
 * dibuat modular agar mudah diganti dengan renderer Three.js lokal di kemudian
 * hari bila proyek menambahkan langkah build/vendoring.
 */
(function(){
  const GALLERY_TYPES = ['21','36','45','60','72','90','120','200'];
  const ROOM_NAMES = {bedroom:'Kamar Tidur',bathroom:'Kamar Mandi',living:'Ruang Tamu',kitchen:'Dapur',dining:'Ruang Makan',carport:'Carport'};
  const ROOF_TYPES = [
    {id:'pelana',label:'Atap Pelana'},
    {id:'limas',label:'Atap Limas'},
    {id:'datar',label:'Atap Datar'}
  ];
  // fallback statis jika shared/data.json (belum) memuat materialOptions —
  // dijaga sinkron secara isi dengan shared/data.json.materialOptions.
  const MATERIAL_FALLBACK = {
    wall:[{id:'lightbrick',label:'Bata Ringan (Hebel)'},{id:'brick',label:'Bata Merah'}],
    floor:[{id:'tile',label:'Keramik'},{id:'granite',label:'Granit'}],
    roofCover:[{id:'genteng',label:'Genteng'},{id:'metal',label:'Baja Ringan / Spandek'},{id:'asbestos',label:'Asbes Gelombang'}]
  };

  // state modul (tidak menyentuh state proyek utama di app.js)
  const gState = {
    typeId: '36',
    mode: 'static', // 'static' | 'editor'
    viewMode: 'three', // 'three' (Three.js, realistis) | 'svg' (ilustrasi cepat, fallback)
    plans: {},       // typeId -> { area, roofType, rooms:[...] }
    selectedRoom: null,
    dragging: null,
    lastCalc: null
  };

  const gEsc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const gMoney = n => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
  const gUuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'g-' + Date.now() + '-' + Math.random().toString(16).slice(2);

  function materialOptions(kind){
    const opts = (typeof DATA !== 'undefined' && DATA && DATA.materialOptions && DATA.materialOptions[kind]);
    return (opts && opts.length) ? opts : MATERIAL_FALLBACK[kind];
  }

  function materialUnitPrice(materialId){
    const list = (typeof DATA !== 'undefined' && DATA && DATA.materials) || [];
    const m = list.find(x => x[0] === materialId);
    return m ? m[4] : null;
  }

  function typeInfo(typeId){
    // DATA didefinisikan (var/let) oleh app.js; keduanya berbagi realm global yang sama
    // karena dimuat sebagai <script> klasik, jadi identifier ini bisa diakses langsung
    // selama fungsi ini dipanggil setelah app.js selesai memuat data (loadProjects()).
    const list = (typeof DATA !== 'undefined' && DATA && DATA.houseTypes) ? DATA.houseTypes : [];
    return list.find(t => t.id === typeId);
  }

  // --- JSON sketsa: dibuat/diambil per tipe ---------------------------------
  function defaultPlan(typeId){
    const t = typeInfo(typeId) || {area:+typeId || 36, bedrooms:2, bathrooms:1};
    const rooms = [];
    const cols = 3, cw = 130, rh = 100, pad = 15;
    const list = [
      ...Array.from({length:t.bedrooms||1}, () => 'bedroom'),
      ...Array.from({length:t.bathrooms||1}, () => 'bathroom'),
      'living', 'kitchen'
    ];
    list.forEach((type, i) => {
      const n = rooms.filter(r => r.type === type).length + 1;
      rooms.push({
        id: gUuid(), type,
        name: `${ROOM_NAMES[type]}${['bedroom','bathroom'].includes(type) ? ' ' + n : ''}`,
        x: pad + (i % cols) * cw,
        y: pad + Math.floor(i / cols) * rh,
        width: type === 'bathroom' ? 2 : 3,
        height: type === 'bathroom' ? 2 : 3
      });
    });
    return {
      typeId, area: t.area || +typeId,
      roofType: (t.floors >= 2 || t.style === 'Modern') ? 'limas' : 'pelana',
      materials: {wall: 'lightbrick', floor: 'tile', roofCover: 'genteng'},
      rooms
    };
  }

  function getPlan(typeId){
    if(!gState.plans[typeId]) gState.plans[typeId] = defaultPlan(typeId);
    return gState.plans[typeId];
  }

  // --- Render tampak real dari JSON sketsa (fungsi inti sinkronisasi) -------
  function renderRealHouse(jsonData){
    const rooms = jsonData.rooms || [];
    const bedrooms = rooms.filter(r => r.type === 'bedroom').length || 1;
    const hasCarport = rooms.some(r => r.type === 'carport');
    const area = jsonData.area || 36;
    const floors = area > 90 ? 2 : 1;
    const bodyW = Math.max(200, Math.min(340, 160 + area));
    const bodyH = 90 * floors;
    const W = 480, H = 320;
    const bx0 = (W - bodyW) / 2, bx1 = bx0 + bodyW;
    const by1 = H - 50, by0 = by1 - bodyH;
    const mat = Object.assign({wall: 'lightbrick', floor: 'tile', roofCover: 'genteng'}, jsonData.materials || {});
    const uid = 'g' + Math.abs((jsonData.typeId ? String(jsonData.typeId) : 'x').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)); // id pattern unik per instance agar tidak bentrok saat >1 svg di DOM

    // --- dinding: pola berbeda untuk bata merah vs bata ringan -------------
    const wallColor = mat.wall === 'brick' ? '#c0694b' : (floors === 2 ? '#dfe3e6' : '#e8ecef');
    let wallPatternDef = '', wallFill = wallColor;
    if(mat.wall === 'brick'){
      wallPatternDef = `<pattern id="${uid}-brick" width="24" height="12" patternUnits="userSpaceOnUse">
        <rect width="24" height="12" fill="${wallColor}"/>
        <rect width="24" height="12" fill="none" stroke="#8a4a35" stroke-width="1"/>
        <line x1="12" y1="0" x2="12" y2="6" stroke="#8a4a35" stroke-width="1"/>
        <line x1="0" y1="6" x2="24" y2="6" stroke="#8a4a35" stroke-width="1"/>
        <line x1="0" y1="12" x2="0" y2="6" stroke="#8a4a35" stroke-width="1"/>
      </pattern>`;
      wallFill = `url(#${uid}-brick)`;
    }

    // --- atap: warna & motif berbeda per bahan penutup ----------------------
    let roofColor = '#556270', roofPatternDef = '', roofFill = roofColor;
    if(mat.roofCover === 'metal'){
      roofColor = '#8a95a1';
      roofPatternDef = `<pattern id="${uid}-metal" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="14" fill="${roofColor}"/>
        <line x1="0" y1="0" x2="0" y2="14" stroke="#5f6b78" stroke-width="2"/>
      </pattern>`;
      roofFill = `url(#${uid}-metal)`;
    } else if(mat.roofCover === 'asbestos'){
      roofColor = '#b9bfc4';
      roofPatternDef = `<pattern id="${uid}-asb" width="18" height="10" patternUnits="userSpaceOnUse">
        <rect width="18" height="10" fill="${roofColor}"/>
        <line x1="0" y1="9" x2="18" y2="9" stroke="#8f969b" stroke-width="1" stroke-dasharray="3,2"/>
      </pattern>`;
      roofFill = `url(#${uid}-asb)`;
    } else { // genteng
      roofColor = '#a24b3b';
      roofPatternDef = `<pattern id="${uid}-genteng" width="16" height="10" patternUnits="userSpaceOnUse">
        <rect width="16" height="10" fill="${roofColor}"/>
        <path d="M0 10 Q4 4 8 10 Q12 4 16 10" fill="none" stroke="#7d382a" stroke-width="1.4"/>
      </pattern>`;
      roofFill = `url(#${uid}-genteng)`;
    }

    const winCount = Math.max(2, Math.min(bedrooms + 1, 5));
    const winW = 30, winH = 30;
    const gap = (bodyW - winCount * winW) / (winCount + 1);

    let roofSvg = '';
    if(jsonData.roofType === 'limas'){
      const midX = (bx0 + bx1) / 2;
      roofSvg = `<polygon points="${bx0-10},${by0} ${midX},${by0-50} ${bx1+10},${by0}" fill="${roofFill}" stroke="#17202a" stroke-width="2"/>`;
    } else if(jsonData.roofType === 'datar'){
      roofSvg = `<rect x="${bx0-10}" y="${by0-18}" width="${bodyW+20}" height="18" fill="${roofFill}" stroke="#17202a" stroke-width="2"/>`;
    } else {
      roofSvg = `<polygon points="${bx0-15},${by0} ${bx1+15},${by0} ${bx1-8},${by0-55} ${bx0+8},${by0-55}" fill="${roofFill}" stroke="#17202a" stroke-width="2"/>`;
    }

    let windows = '';
    for(let i = 0; i < winCount; i++){
      const wx = bx0 + gap + i * (winW + gap);
      const wy = by1 - 40;
      windows += `<rect x="${wx}" y="${wy}" width="${winW}" height="${winH}" fill="#bfe3f5" stroke="#17202a" stroke-width="2"/>
        <line x1="${wx+winW/2}" y1="${wy}" x2="${wx+winW/2}" y2="${wy+winH}" stroke="#17202a"/>
        <line x1="${wx}" y1="${wy+winH/2}" x2="${wx+winW}" y2="${wy+winH/2}" stroke="#17202a"/>`;
    }

    const doorW = 34, doorH = 55, dx = (bx0 + bx1) / 2 - doorW / 2, dy = by1 - doorH;
    const carport = hasCarport ? `<rect x="${bx1+10}" y="${by1-45}" width="80" height="45" fill="none" stroke="#17202a" stroke-width="2"/>
      <line x1="${bx1+10}" y1="${by1-45}" x2="${bx1+90}" y2="${by1-45}" stroke="#17202a" stroke-width="2"/>` : '';

    // --- teras kecil di depan pintu menampilkan warna lantai terpilih -------
    const floorColor = mat.floor === 'granite' ? '#7a8288' : '#d9c9a3';
    const terrace = `<rect x="${dx-40}" y="${by1}" width="${doorW+80}" height="14" fill="${floorColor}" stroke="#17202a" stroke-width="1.5"/>`;

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tampak real hasil sinkronisasi sketsa">
      <defs>${wallPatternDef}${roofPatternDef}</defs>
      <rect width="${W}" height="${H}" fill="#bfe3f5"/>
      <rect x="0" y="${H-50}" width="${W}" height="50" fill="#a9d18e"/>
      ${roofSvg}
      <rect x="${bx0}" y="${by0}" width="${bodyW}" height="${bodyH}" fill="${wallFill}" stroke="#17202a" stroke-width="2"/>
      ${windows}
      <rect x="${dx}" y="${dy}" width="${doorW}" height="${doorH}" fill="#2b6cb0" stroke="#17202a" stroke-width="2"/>
      ${terrace}
      ${carport}
      <text x="10" y="20" font-family="Inter,Arial" font-size="14" font-weight="700" fill="#17202a">Tampak Real (sinkron otomatis)</text>
    </svg>`;
  }
  window.renderRealHouse = renderRealHouse; // ekspos untuk pengujian/pemakaian lain

  function disposeReal3D(){ if(typeof window.disposeRealHouse3D === 'function') window.disposeRealHouse3D(); }

  // Merender tampak real ke panel yang sedang aktif (Three.js 3D atau SVG 2D),
  // dipanggil setiap kali sketsa/bahan/atap berubah agar keduanya tetap satu sumber data.
  function syncRealHouse(){
    const plan = getPlan(gState.typeId);
    if(gState.viewMode === 'three'){
      const host3d = document.getElementById('realHouseHost3D');
      if(host3d && typeof window.renderRealHouse3D === 'function'){
        window.renderRealHouse3D(host3d, plan);
        return;
      }
      // Three.js belum siap/tidak tersedia -> fallback otomatis ke SVG
      gState.viewMode = 'svg';
      renderGalleryBody();
      return;
    }
    disposeReal3D();
    const svgHost = document.getElementById('realHouseHost');
    if(svgHost) svgHost.innerHTML = renderRealHouse(plan);
  }

  // --- Render utama -----------------------------------------------------------
  function renderGallery(){
    disposeReal3D();
    document.getElementById('title').textContent = 'Galeri Sketsa & Tampak Real';
    document.getElementById('subtitle').textContent = 'Referensi visual per tipe rumah, bukan sumber perhitungan RAB.';
    const appEl = document.getElementById('app');
    const t = typeInfo(gState.typeId) || {name:'Tipe ' + gState.typeId, area:+gState.typeId, bedrooms:'-', bathrooms:'-', floors:'-', style:''};

    appEl.innerHTML = `<div class="container">
      <div class="gallery-carousel">
        ${GALLERY_TYPES.map(id => `<button class="gcarousel-btn ${id === gState.typeId ? 'active' : ''}" data-gtype="${id}">Tipe ${id}</button>`).join('')}
      </div>
      <div class="card">
        <div class="gallery-head">
          <div><h3>${gEsc(t.name || ('Tipe ' + gState.typeId))}</h3>
          <div class="muted">${t.area} m² • ${t.bedrooms} KT • ${t.bathrooms} KM • ${t.floors} lantai • ${gEsc(t.style || '')}</div></div>
          <div class="actions" style="margin:0">
            <button class="secondary" data-gaction="mode" data-garg="static">Galeri Statis</button>
            <button class="secondary" data-gaction="mode" data-garg="editor">Editor Sketsa Interaktif</button>
          </div>
        </div>
        <div id="galleryBody"></div>
      </div>
    </div>`;

    renderGalleryBody();
  }
  window.renderGallery = renderGallery;

  function renderGalleryBody(){
    const body = document.getElementById('galleryBody');
    if(!body) return;
    if(gState.mode !== 'editor') disposeReal3D(); // panel 3D tidak dipakai di mode statis
    body.innerHTML = gState.mode === 'editor' ? editorBodyHtml() : staticBodyHtml();
    if(gState.mode === 'editor') syncRealHouse();
  }

  function staticBodyHtml(){
    const id = gState.typeId;
    return `<div class="gallery-cols">
      <div class="gallery-col">
        <h4>Sketsa</h4>
        <img class="gallery-img" data-gfallback="Sketsa tipe ${id} belum tersedia" src="assets/tipe/sketsa-${id}.png" alt="Sketsa denah tipe ${id}">
      </div>
      <div class="gallery-col">
        <h4>Tampak Real</h4>
        <img class="gallery-img" data-gfallback="Tampak real tipe ${id} belum tersedia" src="assets/tipe/real-${id}.png" alt="Tampak real tipe ${id}">
      </div>
    </div>
    ${calcPanelHtml()}
    <div class="actions"><button class="primary" data-gaction="calc">Lihat Detail RAB</button></div>`;
  }

  function editorBodyHtml(){
    const plan = getPlan(gState.typeId);
    const roomButtons = ['bedroom','bathroom','living','kitchen','dining','carport'];
    const mat = plan.materials || {wall:'lightbrick', floor:'tile', roofCover:'genteng'};
    return `<p class="muted">Seret ruangan untuk memindah, klik untuk mengedit ukuran/nama. Tampak real di kanan otomatis sinkron dengan setiap perubahan sketsa maupun pilihan bahan.</p>
    <div class="plan-toolbar">${roomButtons.map(t => `<button data-gaction="addRoom" data-garg="${t}">＋ ${ROOM_NAMES[t] || t}</button>`).join('')}
      <select data-gaction="roofType" style="margin-left:auto">${ROOF_TYPES.map(r => `<option value="${r.id}" ${plan.roofType===r.id?'selected':''}>${r.label}</option>`).join('')}</select>
    </div>
    ${materialToolbarHtml(mat)}
    <div class="gallery-cols">
      <div class="gallery-col">
        <h4>Editor Sketsa</h4>
        <div class="plan-wrap"><div class="plan gallery-plan" id="gplan">${plan.rooms.map(r => `<div class="room ${gState.selectedRoom===r.id?'selected':''}" data-groom-id="${r.id}" style="left:${r.x}px;top:${r.y}px;width:${Math.max(35,r.width*32)}px;height:${Math.max(35,r.height*32)}px">${gEsc(r.name)}<br>${r.width}×${r.height}m</div>`).join('')}</div></div>
        ${gState.selectedRoom ? roomEditorHtml(plan) : ''}
      </div>
      <div class="gallery-col">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <h4>Tampak Real (live)</h4>
          <div class="actions" style="margin:0">
            <button class="secondary ${gState.viewMode==='three'?'selected':''}" data-gaction="viewMode" data-garg="three" style="${gState.viewMode==='three'?'border-color:#1f6feb':''}">3D</button>
            <button class="secondary ${gState.viewMode==='svg'?'selected':''}" data-gaction="viewMode" data-garg="svg" style="${gState.viewMode==='svg'?'border-color:#1f6feb':''}">2D Cepat</button>
          </div>
        </div>
        ${gState.viewMode === 'three'
          ? `<div id="realHouseHost3D" class="gallery-real-host" style="height:320px"></div><p class="muted">Seret untuk memutar tampilan, scroll untuk zoom.</p>`
          : `<div id="realHouseHost" class="gallery-real-host"></div>`}
        ${mat.roofCover === 'asbestos' ? '<p class="warning">⚠ Atap asbes dipilih. Sebagian daerah membatasi penggunaannya karena aspek kesehatan (serat asbes) — periksa regulasi setempat sebelum menetapkan RAB final.</p>' : ''}
      </div>
    </div>
    ${calcPanelHtml()}
    <div class="actions"><button class="primary" data-gaction="calc">Hitung RAB</button></div>`;
  }

  function materialToolbarHtml(mat){
    const priceHint = id => { const p = materialUnitPrice(id); return p ? ` (${gMoney(p)}/m²)` : ''; };
    const field = (kind, label, selectedId) => `<div class="field">
      <label>${label}</label>
      <select data-gaction="material" data-garg="${kind}">
        ${materialOptions(kind).map(o => `<option value="${o.id}" ${o.id===selectedId?'selected':''}>${gEsc(o.label)}${priceHint(kind==='roofCover'?({genteng:'roof',metal:'roofmetal',asbestos:'roofasbestos'}[o.id]):o.id)}</option>`).join('')}
      </select>
    </div>`;
    return `<div class="card" style="margin-bottom:14px">
      <h3>Pilihan Bahan</h3>
      <div class="formgrid">
        ${field('wall', 'Bahan Dinding', mat.wall)}
        ${field('floor', 'Bahan Lantai', mat.floor)}
        ${field('roofCover', 'Bahan Penutup Atap', mat.roofCover)}
      </div>
      <p class="muted" style="margin-top:8px">Pilihan ini memengaruhi tampilan tampak real dan volume/harga material saat "Hitung RAB" dijalankan.</p>
    </div>`;
  }

  function roomEditorHtml(plan){
    const r = plan.rooms.find(x => x.id === gState.selectedRoom);
    if(!r) return '';
    return `<div class="card" style="margin-top:12px">
      <h3>Edit Ruangan</h3>
      <div class="formgrid">
        <div class="field"><label>Nama</label><input id="grn" value="${gEsc(r.name)}"></div>
        <div class="field"><label>Panjang (m)</label><input id="grw" type="number" min="0.5" step="0.1" value="${r.width}"></div>
        <div class="field"><label>Lebar (m)</label><input id="grh" type="number" min="0.5" step="0.1" value="${r.height}"></div>
      </div>
      <div class="actions">
        <button class="secondary" data-gaction="deleteRoom">Hapus</button>
        <button class="primary" data-gaction="updateRoom">Simpan Ruangan</button>
      </div>
    </div>`;
  }

  function calcPanelHtml(){
    if(!gState.lastCalc) return '';
    const s = gState.lastCalc.summary;
    return `<div class="summary">
      <div class="metric">Material<b>${gMoney(s.material)}</b></div>
      <div class="metric">Tenaga Kerja<b>${gMoney(s.labor)}</b></div>
      <div class="metric">Peralatan<b>${gMoney(s.equipment)}</b></div>
      <div class="metric">Total RAB<b>${gMoney(s.total)}</b></div>
    </div>
    <div class="ok">✓ Estimasi cepat berdasarkan data tipe ${gEsc(gState.typeId)}. Buka "Buat RAB" untuk proyek lengkap dan tersimpan.</div>`;
  }

  // --- Aksi ------------------------------------------------------------------
  function buildProjectStub(){
    const t = typeInfo(gState.typeId) || {area:+gState.typeId, bedrooms:2, bathrooms:1};
    const plan = gState.mode === 'editor' ? getPlan(gState.typeId) : defaultPlan(gState.typeId);
    return {
      schemaVersion: 1, id: gUuid(), name: 'Preview Tipe ' + gState.typeId, owner: '', location: '', note: '',
      land: {length: Math.sqrt(t.area || 36) + 4, width: Math.sqrt(t.area || 36) + 2},
      building: {area: plan.area, length: 0, width: 0, bedrooms: t.bedrooms, bathrooms: t.bathrooms},
      houseType: gState.typeId,
      rooms: plan.rooms.map(r => ({id: r.id, type: r.type, name: r.name, x: r.x, y: r.y, width: r.width, height: r.height})),
      materials: Object.assign({wall: 'lightbrick', floor: 'tile', roofCover: 'genteng'}, plan.materials || {}),
      extras: {overhead: 5, contingency: 5, transport: 0, profit: 0}
    };
  }

  async function handleCalc(){
    const stub = buildProjectStub();
    gState.lastCalc = await window.api.calc(stub);
    renderGalleryBody();
  }

  function selectRoom(id){ gState.selectedRoom = id; renderGalleryBody(); }

  function updateRoom(){
    const plan = getPlan(gState.typeId);
    const r = plan.rooms.find(x => x.id === gState.selectedRoom);
    if(!r) return;
    const w = +document.getElementById('grw').value, h = +document.getElementById('grh').value;
    if(!(w >= 0.5 && h >= 0.5)){ if(window.toast) toast('Ukuran ruangan minimal 0,5 m.'); return; }
    r.name = document.getElementById('grn').value.trim() || r.name;
    r.width = w; r.height = h;
    renderGalleryBody();
  }

  function deleteRoom(){
    const plan = getPlan(gState.typeId);
    plan.rooms = plan.rooms.filter(x => x.id !== gState.selectedRoom);
    gState.selectedRoom = null;
    renderGalleryBody();
  }

  function addRoom(type){
    const plan = getPlan(gState.typeId);
    const n = plan.rooms.filter(r => r.type === type).length + 1;
    plan.rooms.push({
      id: gUuid(), type,
      name: `${ROOM_NAMES[type] || type}${['bedroom','bathroom'].includes(type) ? ' ' + n : ''}`,
      x: 15 + (plan.rooms.length % 3) * 130,
      y: 15 + Math.floor(plan.rooms.length / 3) * 100,
      width: type === 'bathroom' ? 2 : 3,
      height: type === 'bathroom' ? 2 : 3
    });
    renderGalleryBody();
  }

  // drag & drop ruangan pada editor sketsa (mengikuti pola .plan/.room yang sudah ada)
  function onGPlanMouseDown(e){
    const roomEl = e.target.closest('.room');
    if(!roomEl) return;
    const planEl = document.getElementById('gplan');
    if(!planEl || !planEl.contains(roomEl)) return;
    const plan = getPlan(gState.typeId);
    const r = plan.rooms.find(x => x.id === roomEl.dataset.groomId);
    if(!r) return;
    const rect = planEl.getBoundingClientRect();
    gState.dragging = {id: r.id, offsetX: e.clientX - rect.left - r.x, offsetY: e.clientY - rect.top - r.y, moved: false, rect};
    e.preventDefault();
  }

  function onGDocMouseMove(e){
    const d = gState.dragging;
    if(!d) return;
    const plan = getPlan(gState.typeId);
    const r = plan.rooms.find(x => x.id === d.id);
    if(!r) return;
    const roomW = Math.max(35, r.width * 32), roomH = Math.max(35, r.height * 32);
    let nx = e.clientX - d.rect.left - d.offsetX, ny = e.clientY - d.rect.top - d.offsetY;
    nx = Math.max(0, Math.min(nx, Math.max(0, d.rect.width - roomW)));
    ny = Math.max(0, Math.min(ny, Math.max(0, d.rect.height - roomH)));
    if(Math.abs(nx - r.x) > 2 || Math.abs(ny - r.y) > 2) d.moved = true;
    r.x = nx; r.y = ny;
    const el = document.querySelector(`.room[data-groom-id="${r.id}"]`);
    if(el){ el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; }
    // Catatan: posisi x/y ruangan tidak memengaruhi output tampak real (yang
    // dihitung dari agregat: jumlah kamar, luas, bentuk atap, bahan), jadi
    // panel tampak real tidak perlu di-render ulang di setiap gerakan mouse —
    // ini penting terutama untuk mode 3D agar drag tetap mulus (tidak membangun
    // ulang scene Three.js di setiap piksel gerakan).
  }

  function onGDocMouseUp(){
    const d = gState.dragging;
    if(!d) return;
    gState.dragging = null;
    if(d.moved) renderGalleryBody(); else selectRoom(d.id);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('mousemove', onGDocMouseMove);
    document.addEventListener('mouseup', onGDocMouseUp);
  });
  // fallback jika gallery.js dimuat setelah DOMContentLoaded
  document.addEventListener('mousemove', onGDocMouseMove);
  document.addEventListener('mouseup', onGDocMouseUp);

  document.addEventListener('click', e => {
    const gt = e.target.closest('[data-gtype]');
    if(gt){ gState.typeId = gt.dataset.gtype; gState.selectedRoom = null; gState.lastCalc = null; renderGallery(); return; }

    const el = e.target.closest('[data-gaction]');
    if(el){
      const action = el.dataset.gaction, arg = el.dataset.garg;
      if(action === 'mode'){ gState.mode = arg; gState.selectedRoom = null; renderGalleryBody(); }
      else if(action === 'viewMode'){ gState.viewMode = arg; renderGalleryBody(); }
      else if(action === 'calc') handleCalc();
      else if(action === 'addRoom') addRoom(arg);
      else if(action === 'deleteRoom') deleteRoom();
      else if(action === 'updateRoom') updateRoom();
      return;
    }

    const roomEl = e.target.closest('.room');
    if(roomEl && roomEl.dataset.groomId && !gState.dragging) selectRoom(roomEl.dataset.groomId);
  });

  document.addEventListener('change', e => {
    const roofSel = e.target.closest('[data-gaction="roofType"]');
    if(roofSel){
      const plan = getPlan(gState.typeId);
      plan.roofType = e.target.value;
      syncRealHouse();
      return;
    }
    const matSel = e.target.closest('[data-gaction="material"]');
    if(matSel){
      const plan = getPlan(gState.typeId);
      plan.materials = plan.materials || {wall: 'lightbrick', floor: 'tile', roofCover: 'genteng'};
      plan.materials[matSel.dataset.garg] = matSel.value;
      gState.lastCalc = null; // harga lama tidak lagi valid, minta hitung ulang
      renderGalleryBody(); // render ulang penuh: perlu refresh warning asbes & panel harga
    }
  });

  document.addEventListener('mousedown', e => {
    if(e.target.closest('#gplan')) onGPlanMouseDown(e);
  });

  // fallback gambar hilang: 'error' pada <img> tidak bubble, jadi pakai capture phase
  // (dipilih agar tetap patuh pada CSP script-src 'self', tanpa atribut onerror inline)
  document.addEventListener('error', e => {
    const img = e.target;
    if(img.tagName === 'IMG' && img.classList.contains('gallery-img')){
      const div = document.createElement('div');
      div.className = 'gallery-img gallery-img-missing';
      div.textContent = img.dataset.gfallback || 'Gambar tidak tersedia';
      img.replaceWith(div);
    }
  }, true);
})();
