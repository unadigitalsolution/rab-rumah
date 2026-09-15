// RAB Rumahku Pro — quantity takeoff + material aggregation engine.
// Angka koefisien dan harga adalah estimasi referensi; pengguna dapat menimpa per proyek.

const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const money=n=> 'Rp'+Math.round(n||0).toLocaleString('id-ID');
const pct=v=>Math.max(0,n(v));
const ceilPurchase=(v,unit)=>['zak','pcs','unit','batang','box','kaleng'].includes(String(unit).toLowerCase())?Math.ceil(Math.max(0,v)):Math.max(0,v);

function geometry(project){
  const b=project.building||{}, rooms=project.rooms||[];
  const L=Math.max(.1,n(b.length,6)), W=Math.max(.1,n(b.width,6));
  const floors=Math.max(1,Math.round(n(b.floors,1))), h=Math.max(2.4,n(b.wallHeight,3));
  const area=Math.max(.1,L*W), footprint=area, perimeter=2*(L+W);
  const openings=b.openings||{};
  const doors=Math.max(1,n(openings.doors,n(b.bedrooms,2)+2)), windows=Math.max(2,n(openings.windows,n(b.bedrooms,2)+2));
  const doorArea=doors*Math.max(.5,n(openings.doorWidth,.9))*Math.max(1.8,n(openings.doorHeight,2.1));
  const windowArea=windows*Math.max(.4,n(openings.windowWidth,1.2))*Math.max(.5,n(openings.windowHeight,1.2));
  const grossWall=perimeter*h*floors, wallNet=Math.max(0,grossWall-doorArea-windowArea);
  const roofPitch=Math.max(5,n(b.roofPitch,30)), overhang=Math.max(0,n(b.overhang,.5));
  const roofFactor=(1+2*overhang/Math.max(.1,Math.min(L,W)))/Math.cos(roofPitch*Math.PI/180);
  const roofArea=footprint*roofFactor, floorArea=footprint*floors, ceilingArea=floorArea;
  const terrace=Math.max(0,n(b.terraceArea,Math.min(12,footprint*.12))), carport=Math.max(0,n(b.carportArea,0));
  return {L,W,floors,h,area,footprint,perimeter,doors,windows,doorArea,windowArea,grossWall,wallNet,roofPitch,overhang,roofArea,floorArea,ceilingArea,terrace,carport,rooms};
}

const MATERIALS={
 cement:['Semen 50 kg','zak',75000], sand:['Pasir pasang','m3',275000], split:['Batu split','m3',325000], riverstone:['Batu kali','m3',300000],
 rebar10:['Besi beton 10 mm','kg',16000], rebar12:['Besi beton 12 mm','kg',16500], rebar16:['Besi beton 16 mm','kg',17500], wiremesh:['Wiremesh M8','kg',18000],
 lightbrick:['Bata ringan 60x20x10','pcs',10500], brick:['Bata merah','pcs',1400], mortar:['Mortar instan','kg',3500],
 tile:['Keramik 60x60','m2',115000], granite:['Granit 60x60','m2',225000], adhesive:['Perekat keramik','kg',14000],
 paintin:['Cat interior','liter',85000], paintout:['Cat eksterior','liter',95000], primer:['Cat dasar','liter',65000],
 gypsum:['Papan gypsum 9 mm','m2',95000], grc:['Papan GRC','m2',115000], ceilingframe:['Rangka plafon hollow','m',32000],
 roof:['Genteng beton','m2',85000], roofmetal:['Spandek','m2',115000], lightsteel:['Rangka baja ringan','m2',175000], insulation:['Insulasi atap','m2',60000], ridge:['Nok atap','m',50000], gutter:['Talang','m',95000],
 alframe:['Kusen aluminium','m',190000], door:['Pintu + kusen standar','unit',1900000], window:['Jendela aluminium + kaca','unit',1450000], glass:['Kaca','m2',300000],
 pvc:['Pipa PVC','m',30000], waterproof:['Waterproofing','kg',40000], toilet:['Kloset','unit',1400000], sink:['Wastafel','unit',950000], shower:['Shower','unit',550000], drain:['Floor drain','unit',100000],
 cable:['Kabel NYM','m',14500], switch:['Saklar','unit',45000], socket:['Stop kontak','unit',55000], lamp:['Lampu LED','unit',95000], nail:['Paku','kg',28000], screw:['Sekrup','box',50000]
};

// Koefisien material default. Ini referensi estimasi, bukan AHSP resmi.
const COEFFICIENTS={
 'foundation.riverstone':.75,'foundation.sand':.12,'foundation.cement':.12,
 'structure.cement':7.2,'structure.sand':.55,'structure.split':.75,'structure.rebar10':.55,'structure.rebar12':.45,
 'wall.brick':65,'wall.lightbrick':8.5,'wall.mortar.brick':.20,'wall.mortar.lightbrick':.15,
 'floor.adhesive':3,'ceiling.frame':3.2,'roof.ridge':.9,'roof.gutter':.35,
 'paint.primer':.12,'paint.interior':.18,'paint.exterior':.10,'sanitary.pvc':.55,'electrical.cable':7,
 'structure.concrete':.055,'structure.rebar':10.5
};
const coef=(project,key,fallback)=>Math.max(0,n(project.coefficients?.[key],COEFFICIENTS[key]??fallback));

function price(project,id){return project.priceOverrides&&project.priceOverrides[id]!=null?n(project.priceOverrides[id]):MATERIALS[id]?.[2]||0;}
function laborPrice(project,key,def){return project.laborPriceOverrides&&project.laborPriceOverrides[key]!=null?n(project.laborPriceOverrides[key]):def;}
function L(cat,desc,vol,unit,price,priceKey){const unitPrice=price;return {kind:'labor',category:cat,description:desc,volume:vol,unit,unitPrice,amount:vol*unitPrice,priceKey:priceKey||desc};}
function wasteFor(project,id,category,fallback=0){
  const mw=project.materialWaste||{};
  if(mw[id]!=null)return pct(mw[id]);
  const w=project.waste||{};
  if(id==='tile'||id==='granite'||id==='adhesive')return pct(w.tile??fallback);
  if(['paintin','paintout','primer'].includes(id))return pct(w.paint??fallback);
  if(['roof','roofmetal','lightsteel'].includes(id))return pct(w.roof??fallback);
  if(['brick','lightbrick'].includes(id))return pct(w.brick??fallback);
  return pct(w.material??fallback);
}
function M(id,theoretical,unit,cat,project){
  const def=MATERIALS[id]||[id,unit||'unit',0], u=unit||def[1], w=wasteFor(project,id,cat,0);
  const base=Math.max(0,n(theoretical)), purchaseRaw=base*(1+w/100), purchase=ceilPurchase(purchaseRaw,u), unitPrice=price(project,id);
  return {kind:'material',materialId:id,materialName:def[0],category:cat,description:def[0],theoreticalVolume:base,purchaseVolume:purchase,volume:purchase,unit:u,unitPrice,amount:purchase*unitPrice,waste:w,sourceJob:cat,sourceComponent:def[0],priceKey:id};
}


function calc(project){
  const g=geometry(project), s=project.spec||{}, wall=s.wall||'lightbrick', floor=s.floor||'tile', roof=s.roofCover||'genteng', ceiling=s.ceiling||'gypsum';
  const items=[], add=x=>items.push(x);
  add(L('Persiapan','Pembersihan & persiapan lahan',g.footprint,'m2',laborPrice(project,'Persiapan|Pembersihan & persiapan lahan',18000),'Persiapan|Pembersihan & persiapan lahan'));
  add(L('Persiapan','Pengukuran / bouwplank',1,'ls',laborPrice(project,'Persiapan|Pengukuran / bouwplank',1800000),'Persiapan|Pengukuran / bouwplank'));
  const trench=g.perimeter*.55*.7;
  add(L('Tanah','Galian pondasi',trench,'m3',laborPrice(project,'Tanah|Galian pondasi',110000),'Tanah|Galian pondasi'));
  add(M('riverstone',trench*coef(project,'foundation.riverstone',.75),'m3','Pondasi',project));
  add(M('sand',trench*coef(project,'foundation.sand',.12),'m3','Pondasi',project));
  add(M('cement',trench*coef(project,'foundation.cement',.12),'zak','Pondasi',project));

  const col=g.perimeter/3.5*Math.max(1,g.floors);
  const concrete=g.footprint*g.floors*coef(project,'structure.concrete',.055);
  const rebarKg=g.footprint*g.floors*coef(project,'structure.rebar',10.5);
  add(M('cement',concrete*coef(project,'structure.cement',7.2),'zak','Struktur',project));
  add(M('sand',concrete*coef(project,'structure.sand',.55),'m3','Struktur',project));
  add(M('split',concrete*coef(project,'structure.split',.75),'m3','Struktur',project));
  add(M('rebar10',rebarKg*coef(project,'structure.rebar10',.55),'kg','Struktur',project));
  add(M('rebar12',rebarKg*coef(project,'structure.rebar12',.45),'kg','Struktur',project));
  add(L('Struktur','Beton sloof, kolom & ring balok',concrete,'m3',laborPrice(project,'Struktur|Beton sloof, kolom & ring balok',1100000),'Struktur|Beton sloof, kolom & ring balok'));
  add(L('Struktur','Pembesian',rebarKg,'kg',laborPrice(project,'Struktur|Pembesian',6500),'Struktur|Pembesian'));

  const wallCoeff=wall==='brick'?coef(project,'wall.brick',65):coef(project,'wall.lightbrick',8.5);
  add(M(wall,g.wallNet*wallCoeff,'pcs','Dinding',project));
  const mortarCoeff=wall==='brick'?coef(project,'wall.mortar.brick',.20):coef(project,'wall.mortar.lightbrick',.15);
  add(M('mortar',g.wallNet*mortarCoeff,'kg','Dinding',project));
  add(L('Dinding','Pasangan dinding',g.wallNet,'m2',laborPrice(project,'Dinding|Pasangan dinding',wall==='brick'?95000:85000),'Dinding|Pasangan dinding'));
  add(L('Dinding','Plester + aci dua sisi',g.wallNet*2,'m2',laborPrice(project,'Dinding|Plester + aci dua sisi',65000),'Dinding|Plester + aci dua sisi'));

  add(M(floor,g.floorArea,'m2','Lantai',project));
  add(M('adhesive',g.floorArea*coef(project,'floor.adhesive',3),'kg','Lantai',project));
  add(L('Lantai','Pasang lantai',g.floorArea,'m2',laborPrice(project,'Lantai|Pasang lantai',65000),'Lantai|Pasang lantai'));

  add(M(ceiling,g.ceilingArea,'m2','Plafon',project));
  add(M('ceilingframe',g.ceilingArea*coef(project,'ceiling.frame',3.2),'m','Plafon',project));
  add(L('Plafon','Pasang plafon',g.ceilingArea,'m2',laborPrice(project,'Plafon|Pasang plafon',55000),'Plafon|Pasang plafon'));

  const cover=roof==='metal'?'roofmetal':'roof';
  add(M(cover,g.roofArea,'m2','Atap',project));
  add(M('lightsteel',g.roofArea,'m2','Atap',project));
  if(roof==='genteng')add(M('insulation',g.roofArea,'m2','Atap',project));
  add(M('ridge',g.L*coef(project,'roof.ridge',.9),'m','Atap',project));
  add(M('gutter',g.perimeter*coef(project,'roof.gutter',.35),'m','Atap',project));
  add(L('Atap','Rangka & penutup atap',g.roofArea,'m2',laborPrice(project,'Atap|Rangka & penutup atap',90000),'Atap|Rangka & penutup atap'));

  add(M('door',g.doors,'unit','Kusen/Pintu/Jendela',project));
  add(M('window',g.windows,'unit','Kusen/Pintu/Jendela',project));
  add(L('Kusen/Pintu/Jendela','Pemasangan pintu & jendela',g.doors+g.windows,'unit',laborPrice(project,'Kusen/Pintu/Jendela|Pemasangan pintu & jendela',175000),'Kusen/Pintu/Jendela|Pemasangan pintu & jendela'));

  const paintArea=g.wallNet*2+g.ceilingArea;
  add(M('primer',paintArea*coef(project,'paint.primer',.12),'liter','Pengecatan',project));
  add(M('paintin',g.wallNet*coef(project,'paint.interior',.18),'liter','Pengecatan',project));
  add(M('paintout',g.wallNet*coef(project,'paint.exterior',.10),'liter','Pengecatan',project));
  add(L('Pengecatan','Pengecatan interior & eksterior',paintArea,'m2',laborPrice(project,'Pengecatan|Pengecatan interior & eksterior',42000),'Pengecatan|Pengecatan interior & eksterior'));

  const bathrooms=Math.max(1,n(project.building?.bathrooms,1));
  add(M('pvc',g.perimeter*bathrooms*coef(project,'sanitary.pvc',.55),'m','Sanitasi',project));
  add(M('waterproof',bathrooms*8,'kg','Sanitasi',project));
  add(M('toilet',bathrooms,'unit','Sanitasi',project));
  add(M('sink',bathrooms,'unit','Sanitasi',project));
  add(M('shower',bathrooms,'unit','Sanitasi',project));
  add(M('drain',bathrooms,'unit','Sanitasi',project));
  add(L('Sanitasi','Instalasi air & sanitair',bathrooms,'unit',laborPrice(project,'Sanitasi|Instalasi air & sanitair',850000),'Sanitasi|Instalasi air & sanitair'));

  const points=Math.max(8,Math.ceil(g.floorArea/5));
  add(M('cable',points*coef(project,'electrical.cable',7),'m','Listrik',project));
  add(M('switch',Math.ceil(points*.45),'unit','Listrik',project));
  add(M('socket',Math.ceil(points*.55),'unit','Listrik',project));
  add(M('lamp',Math.ceil(points*.65),'unit','Listrik',project));
  add(L('Listrik','Instalasi listrik',points,'titik',laborPrice(project,'Listrik|Instalasi listrik',95000),'Listrik|Instalasi listrik'));

  if(g.terrace>0)add(L('Eksterior','Teras',g.terrace,'m2',laborPrice(project,'Eksterior|Teras',275000),'Eksterior|Teras'));
  if(g.carport>0)add(L('Eksterior','Carport',g.carport,'m2',laborPrice(project,'Eksterior|Carport',325000),'Eksterior|Carport'));

  const material=items.filter(x=>x.kind==='material').reduce((a,x)=>a+x.amount,0);
  const labor=items.filter(x=>x.kind==='labor').reduce((a,x)=>a+x.amount,0);
  const equipment=labor*pct(project.extras?.equipment??5)/100, direct=material+labor+equipment;
  const overhead=direct*pct(project.extras?.overhead??5)/100, contingency=direct*pct(project.extras?.contingency??5)/100;
  const transport=n(project.extras?.transport,0), profit=(direct+overhead+contingency+transport)*pct(project.extras?.profit??0)/100;
  const total=direct+overhead+contingency+transport+profit;
  const groups={};items.forEach(x=>(groups[x.category]??=[]).push(x));

  const materialMap={};
  for(const x of items.filter(x=>x.kind==='material')){
    const k=x.materialId;
    if(!materialMap[k])materialMap[k]={materialId:k,materialName:x.materialName,category:x.category,unit:x.unit,theoreticalQuantity:0,purchaseQuantity:0,unitPrice:x.unitPrice,totalCost:0,sources:[]};
    const m=materialMap[k];m.theoreticalQuantity+=x.theoreticalVolume;m.purchaseQuantity+=x.purchaseVolume;m.totalCost+=x.amount;
    m.sources.push({job:x.sourceJob,component:x.sourceComponent,theoreticalQuantity:x.theoreticalVolume,purchaseQuantity:x.purchaseVolume,unit:x.unit,waste:x.waste});
  }
  const materialRecap=Object.values(materialMap).map(m=>({...m,sourceCount:m.sources.length}));
  const materials=Object.fromEntries(materialRecap.map(m=>[m.materialId,m.purchaseQuantity]));
  const budget=project.budget||{}, available=Math.max(0,n(budget.availableFunds,0)), enabled=budget.mode==='available'&&available>0;
  const suggestions=[];
  if(enabled){
    const reducible=[
      {label:'Profit',saving:profit,note:'Dapat dihilangkan jika RAB dipakai sebagai anggaran biaya pelaksanaan.'},
      {label:'Contingency',saving:contingency,note:'Dapat diperkecil, tetapi jangan dihapus tanpa memahami risiko pekerjaan.'},
      {label:'Overhead',saving:overhead,note:'Bisa ditekan dengan efisiensi pengelolaan proyek.'},
      {label:'Transportasi',saving:transport,note:'Bandingkan supplier lokal atau pengiriman bertahap.'},
      {label:'Peralatan',saving:equipment,note:'Optimalkan metode kerja/sewa alat bila memungkinkan.'}
    ].filter(x=>x.saving>0).sort((a,b)=>b.saving-a.saving);
    suggestions.push(...reducible);
    const removableExterior=(g.terrace>0?g.terrace*laborPrice(project,'Eksterior|Teras',275000):0)+(g.carport>0?g.carport*laborPrice(project,'Eksterior|Carport',325000):0);
    if(removableExterior>0)suggestions.push({label:'Teras / carport',saving:removableExterior,note:'Pertimbangkan dikerjakan tahap berikutnya jika dana utama terbatas.'});
  }
  const totalAfterBasics=Math.max(0,total-suggestions.reduce((a,x)=>a+x.saving,0));
  const gap=enabled?available-total:0;
  const budgetPlan=enabled?{enabled:true,availableFunds:available,gap,feasible:available>=total,message:available>=total?'Dana tersedia mencukupi RAB normal. Saran di bawah hanya opsi penghematan.':`Masih kurang ${money(total-available)}. Mulai dari saran penghematan prioritas, lalu sesuaikan spesifikasi secara sadar.`,suggestions:suggestions.filter(x=>x.saving>0).slice(0,6),minimumSuggestedTotal:totalAfterBasics}: {enabled:false,availableFunds:0,gap:0,feasible:false,message:'',suggestions:[],minimumSuggestedTotal:total};

  return {items,groups,materials,materialRecap,geometry:g,summary:{material,labor,equipment,direct,overhead,contingency,transport,profit,total,area:g.floorArea,costPerM2:total/g.floorArea},budgetPlan,assumptions:{wall,floor,roof,ceiling,waste:project.waste||{},materialWaste:project.materialWaste||{},coefficients:project.coefficients||{}}};
}
module.exports={calc,geometry,MATERIALS,COEFFICIENTS,ceilPurchase};
