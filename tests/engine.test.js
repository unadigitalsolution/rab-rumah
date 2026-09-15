const assert=require('assert');
const {calc,geometry}=require('../electron/src/engine');
const p={building:{length:6,width:6,floors:1,wallHeight:3,roofPitch:30,overhang:.5,bedrooms:2,bathrooms:1,terraceArea:5,carportArea:12,openings:{doors:4,windows:5,doorWidth:.9,doorHeight:2.1,windowWidth:1.2,windowHeight:1.2}},spec:{wall:'lightbrick',floor:'tile',roofCover:'genteng',ceiling:'gypsum'},rooms:[{type:'bedroom',width:3,height:3},{type:'bedroom',width:3,height:3}],waste:{material:5,tile:7,paint:5,roof:5},extras:{equipment:5,overhead:5,contingency:5,transport:0,profit:0}};
const g=geometry(p);assert(Math.abs(g.floorArea-36)<.001);assert(g.wallNet>0);assert(g.roofArea>36);
const r=calc(p);assert(r.summary.total>0);assert(r.items.length>20);assert(Object.keys(r.materials).length>10);assert(r.summary.costPerM2>0);
const p2=JSON.parse(JSON.stringify(p));p2.building.length=8;p2.building.width=7;const r2=calc(p2);assert(r2.summary.total>r.summary.total);
const p3=JSON.parse(JSON.stringify(p));p3.spec.wall='brick';const r3=calc(p3);assert(r3.summary.material!==r.summary.material);
const p4=JSON.parse(JSON.stringify(p));p4.priceOverrides={cement:100000};const r4=calc(p4);assert(r4.summary.material>r.summary.material);
console.log('RAB Rumahku v2 engine tests: PASS');

const assertMaterial=(r,id)=>r.materialRecap.find(x=>x.materialId===id);
const sem=assertMaterial(r4,'cement');assert(sem);assert(sem.theoreticalQuantity>0);assert(sem.purchaseQuantity>=sem.theoreticalQuantity);assert(Array.isArray(sem.sources)&&sem.sources.length>=2);
const p5=JSON.parse(JSON.stringify(p));p5.materialWaste={cement:10};const r5=calc(p5);const sem5=assertMaterial(r5,'cement');assert(sem5.purchaseQuantity>=sem.theoreticalQuantity);
const p6=JSON.parse(JSON.stringify(p));p6.coefficients={'foundation.cement':0.24};const r6=calc(p6);assert(assertMaterial(r6,'cement').theoreticalQuantity>assertMaterial(r,'cement').theoreticalQuantity);
console.log('Material aggregation, waste, source traceability, and coefficient override tests: PASS');
