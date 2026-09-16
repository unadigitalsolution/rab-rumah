import 'dart:math' as math;

class RabEngine {
  static double n(dynamic v, [double d = 0]) => double.tryParse('$v') ?? d;
  static double pct(dynamic v) => math.max(0, n(v));

  static const materials = <String, List<dynamic>>{
    'cement': ['Semen 50 kg', 'zak', 75000], 'sand': ['Pasir pasang', 'm3', 275000],
    'split': ['Batu split', 'm3', 325000], 'riverstone': ['Batu kali', 'm3', 300000],
    'rebar10': ['Besi beton 10 mm', 'kg', 16000], 'rebar12': ['Besi beton 12 mm', 'kg', 16500],
    'brick': ['Bata merah', 'pcs', 1400], 'lightbrick': ['Bata ringan 60x20x10', 'pcs', 10500],
    'mortar': ['Mortar instan', 'kg', 3500], 'tile': ['Keramik 60x60', 'm2', 115000],
    'granite': ['Granit 60x60', 'm2', 225000], 'gypsum': ['Papan gypsum 9 mm', 'm2', 95000],
    'grc': ['Papan GRC', 'm2', 115000], 'ceilingframe': ['Rangka plafon hollow', 'm', 32000],
    'roof': ['Genteng beton', 'm2', 85000], 'roofmetal': ['Spandek', 'm2', 115000],
    'lightsteel': ['Rangka baja ringan', 'm2', 175000], 'insulation': ['Insulasi atap', 'm2', 60000],
    'ridge': ['Nok atap', 'm', 50000], 'gutter': ['Talang', 'm', 95000],
    'door': ['Pintu + kusen standar', 'unit', 1900000], 'window': ['Jendela aluminium + kaca', 'unit', 1450000],
    'primer': ['Cat dasar', 'liter', 65000], 'paintin': ['Cat interior', 'liter', 85000], 'paintout': ['Cat eksterior', 'liter', 95000],
    'pvc': ['Pipa PVC', 'm', 30000], 'waterproof': ['Waterproofing', 'kg', 40000],
    'toilet': ['Kloset', 'unit', 1400000], 'sink': ['Wastafel', 'unit', 950000], 'shower': ['Shower', 'unit', 550000], 'drain': ['Floor drain', 'unit', 100000],
    'cable': ['Kabel NYM', 'm', 14500], 'switch': ['Saklar', 'unit', 45000], 'socket': ['Stop kontak', 'unit', 55000], 'lamp': ['Lampu LED', 'unit', 95000],
  };

  static const labor = <String, double>{
    'Persiapan|Pembersihan & persiapan lahan': 18000, 'Persiapan|Pengukuran / bouwplank': 1800000,
    'Tanah|Galian pondasi': 110000, 'Struktur|Beton sloof, kolom & ring balok': 1100000, 'Struktur|Pembesian': 6500,
    'Dinding|Pasangan dinding': 85000, 'Dinding|Plester + aci dua sisi': 65000, 'Lantai|Pasang lantai': 65000,
    'Plafon|Pasang plafon': 55000, 'Atap|Rangka & penutup atap': 90000, 'Kusen/Pintu/Jendela|Pemasangan pintu & jendela': 175000,
    'Pengecatan|Pengecatan interior & eksterior': 42000, 'Sanitasi|Instalasi air & sanitair': 850000, 'Listrik|Instalasi listrik': 95000,
    'Eksterior|Teras': 275000, 'Eksterior|Carport': 325000,
  };

  static double _price(Map<String,dynamic> p, String id) => n((p['priceOverrides'] as Map?)?[id], n(materials[id]?[2]));
  static double _coef(Map<String,dynamic> p, String key, double d) => math.max(0, n((p['coefficients'] as Map?)?[key], d));
  static double _waste(Map<String,dynamic> p, String id) {
    final mw = (p['materialWaste'] as Map?) ?? {};
    if (mw[id] != null) return pct(mw[id]);
    final w = (p['waste'] as Map?) ?? {};
    if (['tile','granite'].contains(id)) return pct(w['tile'] ?? 0);
    if (['paintin','paintout','primer'].contains(id)) return pct(w['paint'] ?? 0);
    if (['roof','roofmetal','lightsteel','insulation'].contains(id)) return pct(w['roof'] ?? 0);
    if (['brick','lightbrick'].contains(id)) return pct(w['brick'] ?? 0);
    return pct(w['material'] ?? 0);
  }

  static Map<String,dynamic> calculate(Map<String,dynamic> p) {
    final b = Map<String,dynamic>.from((p['building'] as Map?) ?? {});
    final o = Map<String,dynamic>.from((b['openings'] as Map?) ?? {});
    final l = math.max(.1, n(b['length'], 6)), w = math.max(.1, n(b['width'], 6));
    final floors = math.max(1, n(b['floors'], 1).round()), h = math.max(2.4, n(b['wallHeight'], 3));
    final area = l*w, perimeter = 2*(l+w);
    final doors = math.max(1, n(o['doors'], 4)), windows = math.max(2, n(o['windows'], 5));
    final doorArea = doors*n(o['doorWidth'], .9)*n(o['doorHeight'], 2.1);
    final windowArea = windows*n(o['windowWidth'], 1.2)*n(o['windowHeight'], 1.2);
    final wallNet = math.max(0, perimeter*h*floors-doorArea-windowArea);
    final pitch = math.max(5, n(b['roofPitch'], 30)), overhang = math.max(0, n(b['overhang'], .5));
    final roofArea = area*(1+2*overhang/math.max(.1, math.min(l,w)))/math.cos(pitch*math.pi/180);
    final floorArea = area*floors, terrace = math.max(0,n(b['terraceArea'],0)), carport = math.max(0,n(b['carportArea'],0));
    final spec = Map<String,dynamic>.from((p['spec'] as Map?) ?? {});
    final wall = '${spec['wall'] ?? 'lightbrick'}', floor = '${spec['floor'] ?? 'tile'}', roof = '${spec['roofCover'] ?? 'genteng'}', ceiling = '${spec['ceiling'] ?? 'gypsum'}';
    final items=<Map<String,dynamic>>[];
    void M(String id,double qty,String unit,String cat){final def=materials[id] ?? [id,unit,0];final purchase=['zak','pcs','unit','batang','box','kaleng'].contains(unit)?(qty*(1+_waste(p,id)/100)).ceilToDouble():qty*(1+_waste(p,id)/100);final q=math.max(0,purchase);final price=_price(p,id);items.add({'kind':'material','materialId':id,'materialName':def[0],'category':cat,'volume':q,'theoreticalVolume':qty,'unit':unit,'unitPrice':price,'amount':q*price});}
    void L(String cat,String desc,double qty,String unit){final key='$cat|$desc';final price=n((p['laborPriceOverrides'] as Map?)?[key],labor[key] ?? 0);items.add({'kind':'labor','category':cat,'description':desc,'volume':qty,'unit':unit,'unitPrice':price,'amount':qty*price});}
    final trench=perimeter*.55*.7;
    L('Persiapan','Pembersihan & persiapan lahan',area,'m2'); L('Persiapan','Pengukuran / bouwplank',1,'ls'); L('Tanah','Galian pondasi',trench,'m3');
    M('riverstone',trench*_coef(p,'foundation.riverstone',.75),'m3','Pondasi'); M('sand',trench*_coef(p,'foundation.sand',.12),'m3','Pondasi'); M('cement',trench*_coef(p,'foundation.cement',.12),'zak','Pondasi');
    final concrete=area*floors*_coef(p,'structure.concrete',.055), rebar=area*floors*_coef(p,'structure.rebar',10.5);
    M('cement',concrete*_coef(p,'structure.cement',7.2),'zak','Struktur'); M('sand',concrete*.55,'m3','Struktur'); M('split',concrete*.75,'m3','Struktur'); M('rebar10',rebar*.55,'kg','Struktur'); M('rebar12',rebar*.45,'kg','Struktur'); L('Struktur','Beton sloof, kolom & ring balok',concrete,'m3'); L('Struktur','Pembesian',rebar,'kg');
    final wc=wall=='brick'?65:8.5; M(wall=='brick'?'brick':'lightbrick',wallNet*wc,'pcs','Dinding'); M('mortar',wallNet*(wall=='brick'?.20:.15),'kg','Dinding'); L('Dinding','Pasangan dinding',wallNet,'m2'); L('Dinding','Plester + aci dua sisi',wallNet*2,'m2');
    M(floor=='granite'?'granite':'tile',floorArea,'m2','Lantai'); M('cement',floorArea*.12,'zak','Lantai'); L('Lantai','Pasang lantai',floorArea,'m2');
    M(ceiling=='grc'?'grc':'gypsum',floorArea,'m2','Plafon'); M('ceilingframe',floorArea*3.2,'m','Plafon'); L('Plafon','Pasang plafon',floorArea,'m2');
    final cover=roof=='metal'?'roofmetal':'roof'; M(cover,roofArea,'m2','Atap'); M('lightsteel',roofArea,'m2','Atap'); if(roof=='genteng')M('insulation',roofArea,'m2','Atap'); M('ridge',l*.9,'m','Atap'); M('gutter',perimeter*.35,'m','Atap'); L('Atap','Rangka & penutup atap',roofArea,'m2');
    M('door',doors,'unit','Kusen/Pintu/Jendela'); M('window',windows,'unit','Kusen/Pintu/Jendela'); L('Kusen/Pintu/Jendela','Pemasangan pintu & jendela',doors+windows,'unit');
    final paintArea=wallNet*2+floorArea; M('primer',paintArea*.12,'liter','Pengecatan'); M('paintin',wallNet*.18,'liter','Pengecatan'); M('paintout',wallNet*.10,'liter','Pengecatan'); L('Pengecatan','Pengecatan interior & eksterior',paintArea,'m2');
    final bathrooms=math.max(1,n(b['bathrooms'],1)); M('pvc',perimeter*bathrooms*.55,'m','Sanitasi'); M('waterproof',bathrooms*8,'kg','Sanitasi'); M('toilet',bathrooms,'unit','Sanitasi'); M('sink',bathrooms,'unit','Sanitasi'); M('shower',bathrooms,'unit','Sanitasi'); M('drain',bathrooms,'unit','Sanitasi'); L('Sanitasi','Instalasi air & sanitair',bathrooms,'unit');
    final points=math.max(8,(floorArea/5).ceil()); M('cable',points*7,'m','Listrik'); M('switch',(points*.45).ceilToDouble(),'unit','Listrik'); M('socket',(points*.55).ceilToDouble(),'unit','Listrik'); M('lamp',(points*.65).ceilToDouble(),'unit','Listrik'); L('Listrik','Instalasi listrik',points,'titik');
    if(terrace>0)L('Eksterior','Teras',terrace,'m2'); if(carport>0)L('Eksterior','Carport',carport,'m2');
    final material=items.where((x)=>x['kind']=='material').fold<double>(0,(a,x)=>a+n(x['amount'])); final laborCost=items.where((x)=>x['kind']=='labor').fold<double>(0,(a,x)=>a+n(x['amount']));
    final extras=Map<String,dynamic>.from((p['extras'] as Map?) ?? {}); final equipment=laborCost*pct(extras['equipment']??5)/100; final direct=material+laborCost+equipment; final overhead=direct*pct(extras['overhead']??5)/100; final contingency=direct*pct(extras['contingency']??5)/100; final transport=n(extras['transport']); final profit=(direct+overhead+contingency+transport)*pct(extras['profit'])/100; final total=direct+overhead+contingency+transport+profit;
    return {'items':items,'geometry':{'length':l,'width':w,'floors':floors,'area':area,'floorArea':floorArea,'wallNet':wallNet,'roofArea':roofArea,'perimeter':perimeter},'summary':{'material':material,'labor':laborCost,'equipment':equipment,'direct':direct,'overhead':overhead,'contingency':contingency,'transport':transport,'profit':profit,'total':total,'area':floorArea,'costPerM2':floorArea>0?total/floorArea:0}};
  }
}
