import * as THREE from './vendor/three.module.js';

let current=null, selectedMesh=null, autoRotate=false;
const orbit={theta:.72,phi:1.02,radius:18,target:new THREE.Vector3(0,1.3,0),drag:false,lx:0,ly:0,update:null,dom:null};
const editor={enabled:false,dragging:false,wall:null,partition:null,opening:null,mesh:null,startX:0,startZ:0,startLength:0,startWidth:0,pendingLength:0,pendingWidth:0,pendingX:0,pendingZ:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const snap=(v)=>{const el=document.getElementById('snapStep');const s=Number(el?.value||.1);return s>0?Math.round(v/s)*s:v;};
const visualDefaults={wall:'#E8E4DC',roof:'#8E4436',door:'#5B4030',trim:'#4D4037',window:'#77B8D0',floor:'#D9C9AD',fence:'#5B5148',terrace:'#C9B69A'};

function readVisual(project){return {...visualDefaults,...(project.visual?.colors||{})};}
function hex(v,fallback){try{return new THREE.Color(v).getHex();}catch{return new THREE.Color(fallback).getHex();}}
function mat(color,rough=.68,metal=0,map=null){const m=new THREE.MeshStandardMaterial({color:hex(color,'#ffffff'),roughness:rough,metalness:metal,map});return m;}
function canvasTexture(draw,w=256,h=256,repeatX=1,repeatY=1){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.colorSpace=THREE.SRGBColorSpace;return t;}
const textures={
 grass:canvasTexture((c,w,h)=>{c.fillStyle='#71945e';c.fillRect(0,0,w,h);for(let i=0;i<800;i++){c.fillStyle=Math.random()>.5?'#789d64':'#638652';c.fillRect(Math.random()*w,Math.random()*h,1,4);}},256,256,8,8),
 wall:canvasTexture((c,w,h)=>{c.fillStyle='#e8e4dc';c.fillRect(0,0,w,h);for(let i=0;i<500;i++){const v=205+Math.random()*38;c.fillStyle=`rgb(${v},${v-3},${v-8})`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}},256,256,3,3),
 roof:canvasTexture((c,w,h)=>{c.fillStyle='#8e4436';c.fillRect(0,0,w,h);for(let y=-20;y<h+30;y+=24)for(let x=-20;x<w+30;x+=34){c.fillStyle=(x/34+y/24)%2?'#a85240':'#7d392f';c.beginPath();c.arc(x,y,20,Math.PI,0);c.fill();c.strokeStyle='#c47b69';c.stroke();}},256,256,3,3),
 tile:canvasTexture((c,w,h)=>{c.fillStyle='#8c8f94';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){c.strokeStyle='#b7bbc0';c.strokeRect(x+1,y+1,30,30);}},256,256,4,4)
};
function disposeMaterial(m){if(!m)return;if(Array.isArray(m))m.forEach(disposeMaterial);else{if(m.map&&m.map!==textures.wall&&m.map!==textures.roof&&m.map!==textures.grass&&m.map!==textures.tile)m.map.dispose();m.dispose?.();}}
function box(group,w,h,d,x,y,z,m,meta={}){const o=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.001,w),Math.max(.001,h),Math.max(.001,d)),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;Object.assign(o.userData,meta);group.add(o);return o;}
function cylinder(group,r,h,x,y,z,m,segments=16,meta={}){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;Object.assign(o.userData,meta);group.add(o);return o;}
function windowUnit(g,x,y,z,rot=0,spec={},meta={}){const frame=mat(spec.trim,.5),glass=mat(spec.window,.18,.12);const u=new THREE.Group();u.rotation.y=rot;u.position.set(x,y,z);u.userData={objectType:'window',objectId:meta.objectId||'window-'+Math.random().toString(16).slice(2),objectName:'Jendela',width:meta.width||1.2,height:meta.height||1.2,sillHeight:meta.sillHeight??1.0,wallId:meta.wallId||null,offset:meta.offset??0,rotation:meta.rotation??rot};g.add(u);const w=u.userData.width,h=u.userData.height;box(u,w,h,.07,0,0,0,frame);box(u,Math.max(.1,w-.16),Math.max(.1,h-.16),.08,0,0,.01,glass);box(u,.06,h-.16,.10,0,0,.07,frame);box(u,w-.16,.06,.10,0,0,.07,frame);return u;}
function doorUnit(g,x,y,z,rot=0,spec={},meta={}){const u=new THREE.Group();u.rotation.y=rot;u.position.set(x,y,z);u.userData={objectType:'door',objectId:meta.objectId||'door-'+Math.random().toString(16).slice(2),objectName:'Pintu',width:meta.width||.9,height:meta.height||2.1,wallId:meta.wallId||null,offset:meta.offset||0};g.add(u);const m=mat(spec.door,.48),trim=mat(spec.trim,.5);box(u,u.userData.width,u.userData.height,.09,0,u.userData.height/2,0,m);box(u,u.userData.width+.08,.10,.13,0,u.userData.height+.05,0,trim);box(u,.08,.08,.13,u.userData.width*.32,u.userData.height*.48,.10,mat('#D5AA55',.25,.65));return u;}
function furniture(group,r,baseX,baseZ){const cx=baseX+r.x+r.width/2,cz=baseZ+r.y+r.height/2,c=r.type;if(c==='bedroom'){box(group,Math.min(1.8,r.width*.68),.32,Math.min(1.9,r.height*.58),cx,.25,cz,mat('#B98962'));box(group,Math.min(1.8,r.width*.68),.42,.12,cx,.58,cz-Math.min(1.9,r.height*.58)/2+.08,mat('#F0EEE7'));}if(c==='living'||c==='family'){box(group,Math.min(2.3,r.width*.68),.42,.75,cx,.30,cz,mat('#6E7882'));box(group,.9,.30,.55,cx,.22,cz+.70,mat('#927052'));}if(c==='kitchen'){box(group,Math.min(2.4,r.width*.72),.82,.55,cx,.48,cz+r.height*.25,mat('#8B9299',.55));box(group,Math.min(2.2,r.width*.68),.04,.58,cx,.91,cz+r.height*.25,mat('#626A71',.3,.25));}if(c==='dining'){cylinder(group,.38,.78,cx,.45,cz,mat('#805C40'),20);box(group,1.4,.10,.9,cx,.82,cz,mat('#9B7652'));}if(c==='bathroom'){box(group,.75,.55,.75,cx,.28,cz,mat('#E5E8EB',.55));cylinder(group,.25,.05,cx,.58,cz,mat('#FFFFFF',.35),20);}}
function addTree(g,x,z,s=1){const trunk=mat('#6F4A32',.9),leaf=mat('#4F7F48',.9);cylinder(g,.12*s,1*s,x,.5*s,z,trunk,10,{objectType:'landscape',objectName:'Pohon'});cylinder(g,.48*s,.75*s,x,1.35*s,z,leaf,12,{objectType:'landscape',objectName:'Pohon'});}
function addEnvironment(scene,L,W,far=false,spec={}){const size=Math.max(40,Math.max(L,W)*4);box(scene,size,.06,size,0,-.03,0,mat('#71945e',.95,0,textures.grass),{objectType:'ground',objectName:'Tanah'});if(!far)return;const roadW=Math.max(3,W*.32);box(scene,size,.035,roadW,0,.015,-W/2-roadW*.65,mat('#666B70',.95),{objectType:'landscape',objectName:'Jalan'});const fence=mat(spec.fence,.7);const fx=L/2+1.2;for(let z=-W/2-2;z<=W/2+2;z+=2.2)box(scene,.10,1.1,.10,fx,0.55,z,fence,{objectType:'fence',objectName:'Pagar'});for(let z=-W/2-2;z<=W/2+2;z+=2.2)box(scene,.10,1.1,.10,-fx,0.55,z,fence,{objectType:'fence',objectName:'Pagar'});for(const [x,z,s] of [[-L/2-3,-W/2-3,1.1],[L/2+3,W/2+3,1.2],[L/2+3,-W/2-3,.9],[-L/2-3,W/2+3,1]])addTree(scene,x,z,s);}
function wallDefs(L,W){
 return [
  {id:'wall-front',name:'Dinding depan',axis:'width',x:0,z:-W/2,length:L},
  {id:'wall-back',name:'Dinding belakang',axis:'width',x:0,z:W/2,length:L},
  {id:'wall-left',name:'Dinding kiri',axis:'length',x:-L/2,z:0,length:W},
  {id:'wall-right',name:'Dinding kanan',axis:'length',x:L/2,z:0,length:W}
 ];
}
function openingDefaults(project){
 const b=project.building||{}, o=b.openings||{};
 const walls=wallDefs(+b.length||6,+b.width||6);
 const mk=(type,i,wallId,offset,width,height,sillHeight=1)=>({id:`${type}-${String(i+1).padStart(3,'0')}`,type,wallId,offset,width,height,sillHeight,rotation:0});
 const doors=Array.isArray(project.doors)&&project.doors.length?project.doors: Array.from({length:Math.max(1,+o.doors||1)},(_,i)=>mk('door',i,'wall-front',(+b.length||6)/2+(i-Math.max(0,(+o.doors||1)-1)/2)*1.25,+o.doorWidth||.9,+o.doorHeight||2.1,0));
 const windows=Array.isArray(project.windows)&&project.windows.length?project.windows: Array.from({length:Math.max(2,+o.windows||2)},(_,i)=>mk('window',i,'wall-front',(+b.length||6)*(i+1)/(Math.max(2,+o.windows||2)+1),+o.windowWidth||1.2,+o.windowHeight||1.2,1));
 return {walls,doors,windows};
}
function build(project){
 const b=project.building||{},g=new THREE.Group(),spec={...visualDefaults,...readVisual(project)};
 const L=Math.max(3,+b.length||6),W=Math.max(3,+b.width||6),H=Math.max(2.4,+b.wallHeight||3),floors=Math.max(1,+b.floors||1),totalH=H*floors,t=.16;
 const baseX=-L/2,baseZ=-W/2;
 const wallM=mat(spec.wall,.82,0,textures.wall),floorM=mat(spec.floor,.92),roofM=mat(spec.roof,.78,0,textures.roof),trim=mat(spec.trim,.55),terraceM=mat(spec.terrace,.92);
 box(g,L,.18,W,0,.09,0,floorM,{objectType:'floor',objectId:'floor-001',objectName:'Lantai',materialType:project.spec?.floor||'tile'});
 for(const w of wallDefs(L,W)){
   const isX=w.axis==='width';
   box(g,isX?L:t,totalH,isX?t:W,w.x,totalH/2,w.z,wallM,{objectType:'wall',objectId:w.id,objectName:w.name,axis:w.axis,wallLength:w.length,height:totalH,thickness:t,materialType:project.spec?.wall||'lightbrick'});
 }
 for(const [x,z] of [[-L/2,-W/2],[-L/2,W/2],[L/2,-W/2],[L/2,W/2]])box(g,.24,totalH,.24,x,totalH/2,z,trim,{objectType:'column',objectId:'column-'+x+'-'+z,objectName:'Kolom'});
 for(let f=1;f<floors;f++)box(g,L+.06,.13,W+.06,0,f*H,0,mat('#B0B0B0',.88),{objectType:'floor-slab',objectName:'Plat lantai'});
 (project.rooms||[]).forEach(r=>{
   const x=baseX+r.x+r.width/2,z=baseZ+r.y+r.height/2,pm=mat('#D2D4D6',.92);
   if(r.width<L*.82)box(g,r.width,.95,.075,x,.48,baseZ+r.y,pm,{objectType:'room',objectId:r.id,roomId:r.id,objectName:r.name,width:r.width,height:r.height});
   if(r.height<W*.82)box(g,.075,.95,r.height,baseX+r.x,.48,z,pm,{objectType:'room',objectId:r.id,roomId:r.id,objectName:r.name,width:r.width,height:r.height});
   furniture(g,r,baseX,baseZ);
 });
 const opening=openingDefaults(project);
 const wallById=Object.fromEntries(opening.walls.map(w=>[w.id,w]));
 const place=(item)=>{
   const w=wallById[item.wallId]||opening.walls[0], horizontal=w.axis==='width';
   const off=clamp(+item.offset||0,Math.max(.15,(+item.width||1)/2),Math.max(.15,w.length-(+item.width||1)/2));
   item.offset=off;
   const x=horizontal?-L/2+off:w.x+(w.id==='wall-left'?-t/2:t/2);
   const z=horizontal?w.z+(w.id==='wall-front'?-t/2:t/2):-W/2+off;
   const rot=horizontal?0:Math.PI/2;
   const fn=item.type==='door'?doorUnit:windowUnit;
   return fn(g,x,item.type==='door'?0:1+(+item.height||1.2)/2,z,rot,spec,{objectId:item.id,width:+item.width||.9,height:+item.height||(item.type==='door'?2.1:1.2),sillHeight:+item.sillHeight||1,wallId:w.id,offset:off,rotation:rot});
 };
 (opening.doors||[]).forEach(place);(opening.windows||[]).forEach(place);
 (project.partitions||[]).forEach((q,i)=>{
   const x=baseX+(+q.x||0),z=baseZ+(+q.y||0),len=Math.max(.6,+q.length||2),vertical=q.axis==='y';
   box(g,vertical?.10:len,.95,vertical?len:.10,x,.48,z,mat('#D2D4D6',.92),{objectType:'partition',objectId:q.id||`partition-${i+1}`,objectName:q.name||'Sekat',axis:q.axis||'x',length:len,roomA:q.roomA||null,roomB:q.roomB||null});
 });
 const over=Math.max(.05,+b.overhang||.5),pitch=clamp((+b.roofPitch||25)/45,.20,.8);
 const roofMeta={objectType:'roof',objectId:'roof-001',objectName:`Atap ${project.roofType==='limas'?'limas':project.roofType==='datar'?'datar':'pelana'}`,materialType:project.spec?.roofCover||'genteng',overhang:over,pitch:+b.roofPitch||25};
 if(project.roofType==='datar'){
   box(g,L+over*2,.24,W+over*2,0,totalH+.14,0,roofM,roofMeta);
 }else if(project.roofType==='limas'){
   const y0=totalH+.15, ridge=Math.max(.8,Math.min(L,W)*pitch*.65), h=Math.max(1.1,Math.min(L,W)*pitch);
   const verts=new Float32Array([
    -L/2-over,y0,-W/2-over, L/2+over,y0,-W/2-over, L/2+over,y0,W/2+over, -L/2-over,y0,W/2+over,
    0,y0+h,-W/2+ridge/2, 0,y0+h,W/2-ridge/2
   ]);
   const idx=[0,1,4,1,2,5,2,3,5,3,0,4,0,4,5,0,5,3,1,5,4,1,2,5];
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
   const roof=new THREE.Mesh(geo,roofM);roof.castShadow=true;roof.userData=roofMeta;g.add(roof);
 }else{
   const rise=Math.max(1.1,W*pitch*.55),shape=new THREE.Shape();
   shape.moveTo(-L/2-over,0);shape.lineTo(0,rise);shape.lineTo(L/2+over,0);shape.lineTo(-L/2-over,0);
   const geo=new THREE.ExtrudeGeometry(shape,{depth:W+over*2,bevelEnabled:false});
   const roof=new THREE.Mesh(geo,roofM);roof.position.set(0,totalH,-(W+over*2)/2);roof.castShadow=true;roof.userData=roofMeta;g.add(roof);
 }
 if(+b.terraceArea>0){const a=+b.terraceArea,tw=Math.min(L*.7,Math.max(1.5,Math.sqrt(a)*1.6)),td=Math.max(1.2,a/tw);box(g,tw,.09,td,0,.045,-W/2-td/2,terraceM,{objectType:'terrace',objectId:'terrace-001',objectName:'Teras'});}
 if(+b.carportArea>0){const a=+b.carportArea,cw=Math.min(3.3,Math.max(2.3,Math.sqrt(a)*1.15)),cd=Math.max(2.5,a/cw),x=L/2+cw/2+.45,z=-W/2+cd/2,metal=mat('#59636B',.35,.55);box(g,cw,.10,cd,x,2.6,z,metal,{objectType:'carport',objectName:'Carport'});for(const [dx,dz] of [[-cw/2+.12,-cd/2+.12],[cw/2-.12,-cd/2+.12],[-cw/2+.12,cd/2-.12],[cw/2-.12,cd/2-.12]])box(g,.09,2.6,.09,x+dx,1.30,z+dz,metal,{objectType:'carport-post',objectName:'Tiang carport'});}
 return {g,L,W,totalH,walls:opening.walls};
}
function updateCameraForView(view,house,far=false){const size=Math.max(house.L,house.W,house.totalH),base=Math.max(8,size*1.7);orbit.target.set(0,house.totalH*.35,0);orbit.radius=base*(far?1.75:1);if(view==='front'){orbit.theta=0;orbit.phi=.98;}else if(view==='right'){orbit.theta=Math.PI/2;orbit.phi=.98;}else if(view==='back'){orbit.theta=Math.PI;orbit.phi=.98;}else if(view==='left'){orbit.theta=-Math.PI/2;orbit.phi=.98;}else if(view==='top'){orbit.theta=.7;orbit.phi=.32;}else if(view==='top-interior'){orbit.theta=.7;orbit.phi=.38;}else if(view==='far34'){orbit.theta=.68;orbit.phi=.86;}else{orbit.theta=.68;orbit.phi=.86;}}
window.setHouseView=v=>{if(!current)return;const far=v==='far';updateCameraForView(v==='far34'?'far34':v,current.house,far);window.setHouseRoofVisible?.(v!=='top-interior');orbit.update?.();};
window.fitHouseToView=()=>{if(!current)return;updateCameraForView('perspective',current.house,false);orbit.radius=Math.max(8,Math.max(current.house.L,current.house.W,current.house.totalH)*1.9);orbit.update?.();};
window.setHouseRoofVisible=visible=>{current?.house?.g?.traverse(o=>{if(o.userData?.objectType==='roof')o.visible=visible;});};
window.rotateHouse3D=dir=>{orbit.theta+=dir==='left'?-Math.PI/8:Math.PI/8;orbit.update?.();};
window.toggleAutoRotate3D=()=>{autoRotate=!autoRotate;window.onHouseAutoRotate?.(autoRotate);return autoRotate;};
window.togglePresentation3D=async()=>{const el=document.getElementById('threeHost');if(!el)return;if(document.fullscreenElement)await document.exitFullscreen?.();else await el.requestFullscreen?.();};
function clearSelection(){if(selectedMesh){if(selectedMesh.userData?.originalMaterial){if(selectedMesh.material&&selectedMesh.material!==selectedMesh.userData.originalMaterial)selectedMesh.material.dispose?.();selectedMesh.material=selectedMesh.userData.originalMaterial;delete selectedMesh.userData.originalMaterial;}selectedMesh=null;}window.onHouseObjectSelected?.(null);}
function selectMesh(mesh){clearSelection();if(!mesh)return;let target=mesh;if(!target.material){target=target.children?.find(c=>c.isMesh&&c.material)||target;}if(!target?.isMesh||!target.material){window.onHouseObjectSelected?.(mesh.userData||null);return;}selectedMesh=target;selectedMesh.userData.originalMaterial=selectedMesh.material;selectedMesh.material=selectedMesh.material.clone();if(selectedMesh.material.emissive)selectedMesh.material.emissive.setHex(0x4f8cff);window.onHouseObjectSelected?.(mesh.userData||target.userData);}
function disposeCurrent(){if(!current)return;cancelAnimationFrame(current.raf);current.ro?.disconnect();current.listeners?.forEach(([el,ev,fn])=>el.removeEventListener(ev,fn));current.house?.g?.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material!==textures)o.material.dispose?.();});current.renderer?.dispose();current.contextMenu?.remove();current=null;selectedMesh=null;orbit.update=null;orbit.dom=null;editor.dragging=false;editor.wall=null;editor.partition=null;editor.opening=null;editor.kind=null;}
window.disposeRealHouse3D=disposeCurrent;
function applyPreview(length,width){if(!current)return;const L=Math.max(3,length),W=Math.max(3,width);current.house.g.traverse(o=>{if(o.userData?.objectType!=='wall')return;if(o.userData.axis==='width'){o.scale.x=L/o.geometry.parameters.width;o.position.z=o.userData.objectId==='wall-front'?-W/2:W/2;o.userData.wallLength=L;}else{o.scale.z=W/o.geometry.parameters.depth;o.position.x=o.userData.objectId==='wall-left'?-L/2:L/2;o.userData.wallLength=W;}});window.onHousePreviewDimensions?.({length:L,width:W});}
window.setHouse3DEditMode=enabled=>{editor.enabled=!!enabled;editor.dragging=false;editor.wall=null;editor.partition=null;editor.opening=null;if(current?.grid)current.grid.visible=editor.enabled&&(document.getElementById('gridEnabled')?.checked!==false);if(current?.renderer)current.renderer.domElement.style.cursor=editor.enabled?'crosshair':'grab';window.onHouseEditorState?.(editor.enabled);};window.getHouse3DEditMode=()=>editor.enabled;window.setHouse3DEditOptions=()=>{if(current?.grid)current.grid.visible=editor.enabled&&(document.getElementById('gridEnabled')?.checked!==false);};
export function renderRealHouse3D(container,project){disposeCurrent();if(!container)return;container.innerHTML='';let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){container.innerHTML='<div class="warning"><b>WebGL tidak tersedia.</b><br>Gunakan denah 2D dan RAB. Maket 3D tidak dapat dirender pada perangkat ini.</div>';return;}
 renderer.setSize(container.clientWidth||800,container.clientHeight||540);renderer.setPixelRatio(Math.min(1.75,window.devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);renderer.domElement.style.display='block';renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;const scene=new THREE.Scene();scene.background=new THREE.Color('#CFE3F1');scene.fog=new THREE.Fog('#CFE3F1',35,90);const camera=new THREE.PerspectiveCamera(38,(container.clientWidth||800)/(container.clientHeight||540),.1,500);
 const hemi=new THREE.HemisphereLight('#FFFFFF','#65715D',1.5);scene.add(hemi);const sun=new THREE.DirectionalLight('#FFF4DC',2.1);sun.position.set(18,24,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);let house;try{house=build(project);scene.add(house.g);}catch(e){console.error('RAB Rumahku 3D build failed',e);container.innerHTML='<div class="warning"><b>Maket 3D gagal dibuat.</b><br>Periksa data proyek/console untuk detail error.</div>';renderer.dispose();return;}addEnvironment(scene,house.L,house.W,true,readVisual(project));const grid=new THREE.GridHelper(Math.max(30,Math.max(house.L,house.W)*3),Math.max(30,Math.ceil(Math.max(house.L,house.W)*6)),0x8aa0b5,0xd5dee7);grid.position.y=.012;grid.visible=false;scene.add(grid);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const getPointer=e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;};
 const pick=e=>{getPointer(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(house.g.children,true);let obj=hits[0]?.object;while(obj&&obj!==house.g&&!obj.userData?.objectType)obj=obj.parent;if(obj)selectMesh(obj);else clearSelection();};
 const findPick=e=>{getPointer(e);raycaster.setFromCamera(pointer,camera);let obj=raycaster.intersectObjects(house.g.children,true)[0]?.object;while(obj&&obj!==house.g&&!obj.userData?.objectType)obj=obj.parent;return obj;};
 const contextMenu=document.createElement('div');contextMenu.className='house-context-menu';contextMenu.style.display='none';document.body.appendChild(contextMenu);
 const contextMenuHandler=e=>{e.preventDefault();const obj=findPick(e);if(obj)selectMesh(obj);showContextMenu(e,obj);};
 const hideContextMenu=()=>{contextMenu.style.display='none';contextMenu.innerHTML='';};
 const showContextMenu=(e,obj)=>{if(!obj)return;const info=obj.userData||{};const deletable=['door','window','partition','room'].includes(info.objectType);contextMenu.innerHTML=`<button data-cm='properties'>⚙ Tampilkan Properties</button>${deletable?`<button data-cm='delete' class='danger'>🗑 Hapus</button>`:''}`;contextMenu.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';contextMenu.style.top=Math.min(e.clientY,window.innerHeight-110)+'px';contextMenu.style.display='block';contextMenu.querySelector('[data-cm=properties]')?.addEventListener('click',()=>{selectMesh(obj);hideContextMenu();});contextMenu.querySelector('[data-cm=delete]')?.addEventListener('click',()=>{window.onHouseObjectDelete?.(info);hideContextMenu();});};
 const down=e=>{const obj=findPick(e);if(obj)selectMesh(obj);if(editor.enabled&&obj){
   if(obj.userData?.objectType==='wall'){const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-house.totalH*.45),pt=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,pt)){Object.assign(editor,{dragging:true,kind:'wall',wall:{...obj.userData},mesh:obj,startX:pt.x,startZ:pt.z,startLength:+project.building.length||house.L,startWidth:+project.building.width||house.W,pendingLength:+project.building.length||house.L,pendingWidth:+project.building.width||house.W});selectMesh(obj);e.preventDefault();return;}}
   if(obj.userData?.objectType==='door'||obj.userData?.objectType==='window'){const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(obj.userData.objectType==='door'?1.05:1.5));const pt=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,pt)){Object.assign(editor,{dragging:true,kind:'opening',opening:{...obj.userData},mesh:obj,startX:pt.x,startZ:pt.z,pendingOffset:+obj.userData.offset||0});selectMesh(obj);e.preventDefault();return;}}
   if(obj.userData?.objectType==='partition'){const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.48),pt=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,pt)){Object.assign(editor,{dragging:true,kind:'partition',partition:{...obj.userData},mesh:obj,pendingX:pt.x,pendingZ:pt.z});selectMesh(obj);e.preventDefault();return;}}
 }
 orbit.drag=true;orbit.lx=e.clientX;orbit.ly=e.clientY;};
 const move=e=>{if(editor.dragging){getPointer(e);raycaster.setFromCamera(pointer,camera);if(editor.kind==='wall'){const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-house.totalH*.45),pt=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,pt)){let L=editor.startLength,W=editor.startWidth;if(editor.wall.axis==='width'){const dz=pt.z-editor.startZ;W=editor.wall.objectId==='wall-front'?editor.startWidth-2*dz:editor.startWidth+2*dz;}else{const dx=pt.x-editor.startX;L=editor.wall.objectId==='wall-left'?editor.startLength-2*dx:editor.startLength+2*dx;}L=snap(clamp(L,3,100));W=snap(clamp(W,3,100));editor.pendingLength=L;editor.pendingWidth=W;applyPreview(L,W);}}else if(editor.kind==='partition'){const q=editor.partition,vertical=q.axis==='y',pt=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.48);if(raycaster.ray.intersectPlane(plane,pt)){const x=clamp(snap(pt.x),-house.L/2+0.3,house.L/2-0.3),z=clamp(snap(pt.z),-house.W/2+0.3,house.W/2-0.3);editor.pendingX=x;editor.pendingZ=z;editor.mesh.position.x=x;editor.mesh.position.z=z;}}else if(editor.kind==='opening'){const wall=house.walls.find(w=>w.id===editor.opening.wallId)||house.walls[0],horizontal=wall.axis==='width';const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(editor.opening.type==='door'?1.05:1.5));const pt=new THREE.Vector3();if(raycaster.ray.intersectPlane(plane,pt)){const openingWidth=Math.min(Math.max(.4,+editor.opening.width||1),Math.max(.4,wall.length-.02));let off=horizontal?pt.x+house.L/2:pt.z+house.W/2;off=snap(clamp(off,openingWidth/2,wall.length-openingWidth/2));editor.pendingOffset=off;editor.mesh.position.x=horizontal?-house.L/2+off:(wall.id==='wall-left'?-house.L/2-.08:house.L/2+.08);editor.mesh.position.z=horizontal?(wall.id==='wall-front'?-house.W/2-.08:house.W/2+.08):-house.W/2+off;editor.mesh.rotation.y=horizontal?0:Math.PI/2;}}return;}if(!orbit.drag)return;orbit.theta-=(e.clientX-orbit.lx)*.008;orbit.phi=clamp(orbit.phi-(e.clientY-orbit.ly)*.008,.22,1.48);orbit.lx=e.clientX;orbit.ly=e.clientY;orbit.update?.();};
 const up=()=>{orbit.drag=false;if(editor.dragging){editor.dragging=false;editor.mesh=null;if(editor.kind==='wall')window.onHouseWallCommit?.({length:editor.pendingLength,width:editor.pendingWidth,wall:editor.wall});else if(editor.kind==='opening')window.onHouseOpeningCommit?.({objectType:editor.opening.type,objectId:editor.opening.objectId,wallId:editor.opening.wallId,offset:editor.pendingOffset});else if(editor.kind==='partition')window.onHousePartitionCommit?.({objectId:editor.partition.objectId,x:editor.pendingX,z:editor.pendingZ});editor.wall=null;editor.partition=null;editor.opening=null;editor.kind=null;}};
 const wheel=e=>{orbit.radius=clamp(orbit.radius*(1+Math.sign(e.deltaY)*.08),Math.max(5,Math.max(house.L,house.W)*.7),Math.max(40,Math.max(house.L,house.W)*12));orbit.update?.();};
 updateCameraForView('far34',house,true);orbit.update=()=>{camera.position.x=orbit.target.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta);camera.position.z=orbit.target.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta);camera.position.y=orbit.target.y+orbit.radius*Math.cos(orbit.phi);camera.lookAt(orbit.target);};orbit.update();orbit.dom=renderer.domElement;renderer.domElement.style.cursor=editor.enabled?'crosshair':'grab';current={renderer,scene,camera,house,grid,raf:0,ro:null,contextMenu,listeners:[[renderer.domElement,'click',pick],[renderer.domElement,'mousedown',down],[renderer.domElement,'contextmenu',contextMenuHandler],[document,'click',hideContextMenu],[renderer.domElement,'wheel',wheel],[window,'mousemove',move],[window,'mouseup',up]]};current.listeners.forEach(([el,ev,fn])=>el.addEventListener(ev,fn));current.ro=new ResizeObserver(()=>{const w=container.clientWidth||800,h=container.clientHeight||540;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});current.ro.observe(container);
 const animate=()=>{current.raf=requestAnimationFrame(animate);if(autoRotate){orbit.theta+=.0035;orbit.update();}renderer.render(scene,camera);};animate();
}

// Bridge ES module renderer to the legacy app.js event/UI layer.
window.renderRealHouse3D=renderRealHouse3D;
