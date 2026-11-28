import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { WIDTH, DEPTH, toWorld, loadElevation, loadGeography, loadLocalMaps, previewElevation, previewGeography, randomSeed } from './geo.js';
import { makeField, addTerrain, addWater, addRoads, addVillage, addNature, addClouds, makeShoreTexture } from './world.js';
import { createRenderSettings } from './render-settings.js';
import { addTraffic } from './traffic.js';
import { addWaterActivity } from './water-activity.js';
import { addVillageDetails, addChimneySmoke } from './village-details.js';
import { installEdgeFade } from './edge-fade.js';
import { loadApplicationPreset, saveApplicationPreset } from './preset.js';

const $=id=>document.getElementById(id);
const embedded=new URLSearchParams(location.search).get('embedded')==='1'&&window.parent!==window;
if(embedded)document.body.classList.add('embedded');
let embeddedActive=true,pendingVenueData=null,embeddedReady=false;
const notifyParent=(type,data={})=>{if(embedded)window.parent.postMessage({type:`venue-map:${type}`,...data},location.origin);};
const applicationPreset=await loadApplicationPreset();
const root=$('scene'),labelRoot=$('labels'),mobile=matchMedia('(max-width: 680px)').matches;
const preferReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,embedded?(mobile?1.15:1.5):mobile?1.7:2.25));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.localClippingEnabled=true;
root.appendChild(renderer.domElement);

const scene=new THREE.Scene();scene.background=new THREE.Color('#bacbb2');scene.fog=new THREE.Fog('#bdcdb7',115,190);
const edgeFadeUniforms={extent:{value:new THREE.Vector2(WIDTH,DEPTH)},tint:{value:scene.background},width:{value:8}};
const hemisphere=new THREE.HemisphereLight('#e4f4dd','#72734e',1.44),ambient=new THREE.AmbientLight('#e4f4dd',.31);scene.add(hemisphere,ambient);
const sun=new THREE.DirectionalLight('#ffd08a',2.5);sun.position.set(-43,74,42);sun.target.position.set(0,0,0);sun.castShadow=true;
sun.shadow.mapSize.set(mobile?2048:3072,mobile?2048:3072);sun.shadow.camera.left=-63;sun.shadow.camera.right=63;sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;sun.shadow.camera.near=.5;sun.shadow.camera.far=220;sun.shadow.bias=-.00015;sun.shadow.normalBias=.055;sun.shadow.radius=3;sun.shadow.autoUpdate=false;
scene.add(sun,sun.target);
// Moonlight on land (night only): a cool light from the north, the same side as the moon path on the bay, so
// slopes, trees and bushes facing the viewer catch a silver sheen; the matte materials turn a little glossy at night.
const moonLight=new THREE.DirectionalLight('#bcd0ff',0);moonLight.position.set(-18,46,-80);moonLight.target.position.set(0,0,0);scene.add(moonLight,moonLight.target);
const moonSheen=[];

const camera=new THREE.OrthographicCamera(-55,55,42,-42,.1,320);
const gl=renderer.getContext();
const floatTarget=!!gl.getExtension('EXT_color_buffer_float');
let maxSamples=0;
try { const supported=gl.getInternalformatParameter(gl.RENDERBUFFER,floatTarget?gl.RGBA16F:gl.RGBA8,gl.SAMPLES);maxSamples=Math.min(gl.getParameter(gl.MAX_SAMPLES),Math.max(0,...supported)); } catch {}
const renderTarget=new THREE.WebGLRenderTarget(1,1,{type:floatTarget?THREE.HalfFloatType:THREE.UnsignedByteType,samples:0});
const composer=new EffectComposer(renderer,renderTarget);
composer.addPass(new RenderPass(scene,camera));composer.addPass(new OutputPass());
const fxaa=new ShaderPass(FXAAShader);fxaa.enabled=false;composer.addPass(fxaa);
renderer.info.autoReset=false;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.085;controls.enablePan=true;controls.enableZoom=true;controls.enableRotate=true;controls.rotateSpeed=.58;controls.zoomSpeed=.82;controls.panSpeed=.83;
controls.screenSpacePanning=false;controls.minPolarAngle=.38;controls.maxPolarAngle=1.04;controls.minAzimuthAngle=-Math.PI*.68;controls.maxAzimuthAngle=Math.PI*.68;controls.minZoom=1;controls.maxZoom=10;
controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};
if(embedded){controls.enableRotate=false;controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};}

const DEFAULT_VIEW={position:[-72,72,70.2],target:[0,0,-1.8],zoom:1};
const LOCK_KEY='akyaka:locked-view:v1';
function readLockedView(){const valid=s=>s&&s.position?.length===3&&s.target?.length===3&&[...s.position,...s.target,s.zoom].every(Number.isFinite)&&s.zoom>=1&&s.zoom<=10;try{const saved=JSON.parse(localStorage.getItem(LOCK_KEY)||'null');if(valid(saved))return saved;}catch{}return valid(applicationPreset.view)?structuredClone(applicationPreset.view):{...DEFAULT_VIEW};}
// In the app the map always faces north: the preset's tilt and zoom, turned so the camera looks due north.
// Seen more from above than the lab's preset: 35° from straight down, same distance.
let APP_TILT=60*Math.PI/180;  // set by the app's Map tilt setting (degrees from straight down)
function northView(v){const o=v.position.map((n,i)=>n-v.target[i]),d=Math.hypot(...o);return {position:[v.target[0],v.target[1]+d*Math.cos(APP_TILT),v.target[2]+d*Math.sin(APP_TILT)],target:[...v.target],zoom:v.zoom};}
let lockedView=embedded?northView(structuredClone(applicationPreset.view?.position?applicationPreset.view:DEFAULT_VIEW)):readLockedView(),viewReference=null,targetZoom=lockedView.zoom;
function groundFootprint(cam,u,v){cam.updateMatrixWorld(true);const dir=cam.getWorldDirection(new THREE.Vector3()),bounds={u0:Infinity,u1:-Infinity,v0:Infinity,v1:-Infinity};for(const a of [-1,1])for(const b of [-1,1]){const p=new THREE.Vector3(a,b,0).unproject(cam);p.addScaledVector(dir,-p.y/dir.y);const q=u.x*p.x+u.z*p.z,r=v.x*p.x+v.z*p.z;bounds.u0=Math.min(bounds.u0,q);bounds.u1=Math.max(bounds.u1,q);bounds.v0=Math.min(bounds.v0,r);bounds.v1=Math.max(bounds.v1,r);}return bounds;}
function persistLock(){if(embedded)return;try{localStorage.setItem(LOCK_KEY,JSON.stringify(lockedView));}catch{}}
function rebuildLock(){const ref=camera.clone();ref.position.fromArray(lockedView.position);ref.zoom=lockedView.zoom;ref.lookAt(new THREE.Vector3(...lockedView.target));ref.updateProjectionMatrix();ref.updateMatrixWorld(true);const u=new THREE.Vector3(1,0,0).applyQuaternion(ref.quaternion);u.y=0;u.normalize();const v=new THREE.Vector3(-u.z,0,u.x);const bounds=lockedView.bounds&&['u0','u1','v0','v1'].every(k=>Number.isFinite(lockedView.bounds[k]))?lockedView.bounds:groundFootprint(ref,u,v);lockedView.bounds=bounds;
// In the app the whole map can be panned to, up to the cloud banks at its edges.
const EDGE=6;viewReference=embedded?{u,v,u0:-WIDTH/2+EDGE,u1:WIDTH/2-EDGE,v0:-DEPTH/2+EDGE+4,v1:DEPTH/2-EDGE}:{u,v,...bounds};controls.minZoom=lockedView.zoom;persistLock();}
function configureCamera(){
  const aspect=innerWidth/Math.max(1,innerHeight),span=Math.max(69,Math.min(155,95/aspect));
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  // App: start zoomed in just enough that the map fills the screen (no sky or cloud bank around it).
  if(embedded){const inner=12;lockedView.zoom=Math.max(1,span/Math.cos(APP_TILT)/(DEPTH-inner-4),span*aspect/(WIDTH-inner));delete lockedView.bounds;}
  rebuildLock();
  // App: you can zoom out past the screen-filling view (to 60% of it) and see the whole bay with the clouds around it.
  if(embedded)controls.minZoom=lockedView.zoom*.6;
}
configureCamera();
if(embedded){const o=new THREE.Vector3(...lockedView.position).sub(new THREE.Vector3(...lockedView.target)),polar=Math.acos(o.y/o.length());controls.minAzimuthAngle=controls.maxAzimuthAngle=0;controls.minPolarAngle=controls.maxPolarAngle=polar;}
// Equal X/Y/Z default offset gives the classic 35.264° isometric elevation.
function resetView(){camera.position.fromArray(lockedView.position);controls.target.fromArray(lockedView.target);camera.zoom=lockedView.zoom;targetZoom=lockedView.zoom;camera.updateProjectionMatrix();controls.update();}
function lockCurrentView(){lockedView={position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom};rebuildLock();targetZoom=camera.zoom;const btn=$('lock-view');btn.title='Görünüm kaydedildi · Shift tık: varsayılan sınır';btn.setAttribute('aria-label','Görünüm sınırı kaydedildi');btn.classList.add('locked-flash');setTimeout(()=>btn.classList.remove('locked-flash'),900);}
resetView();
controls.addEventListener('start',()=>{targetZoom=camera.zoom;});

const clouds=addClouds(scene);
let world=null,field=null,waterMaterial=null,local=null,venuePins=[],placeLabels=[],showVenues=embedded,dusk=applicationPreset.mode==='night',terrainMesh=null,particleSystem=null,traffic=null,waterActivity=null,chimneySmoke=null,grassMesh=null,windowLights=[];
let waterClock=0,shadowClock=0,smokeClock=0,nightMix=dusk?1:0;
const cloudBounds=[new THREE.Plane(new THREE.Vector3(1,0,0),WIDTH/2),new THREE.Plane(new THREE.Vector3(-1,0,0),WIDTH/2),new THREE.Plane(new THREE.Vector3(0,0,1),DEPTH/2-7),new THREE.Plane(new THREE.Vector3(0,0,-1),DEPTH/2)];
let worldDem=null,worldGeo=null,shoreTimer=0;
const projectVec=new THREE.Vector3();
const colorDay={sky:new THREE.Color('#c5cfb0'),fog:new THREE.Color('#d0cfb3'),sun:new THREE.Color('#ffd08a'),hemi:new THREE.Color('#fff0ce'),ground:new THREE.Color('#927951'),deep:new THREE.Color('#2e7184'),ocean:new THREE.Color('#42989c'),shallows:new THREE.Color('#8ec5a7'),foam:new THREE.Color('#e5ebc5')};
const colorDusk={sky:new THREE.Color('#243858'),fog:new THREE.Color('#415c82'),sun:new THREE.Color('#d0e4ff'),hemi:new THREE.Color('#81a9ee'),ground:new THREE.Color('#283b66'),deep:new THREE.Color('#10234b'),ocean:new THREE.Color('#214d80'),shallows:new THREE.Color('#507da7'),foam:new THREE.Color('#b4d5f1')};
if(dusk){scene.background.copy(colorDusk.sky);scene.fog.color.copy(colorDusk.fog);sun.color.copy(colorDusk.sun);hemisphere.color.copy(colorDusk.hemi);hemisphere.groundColor.copy(colorDusk.ground);ambient.color.copy(colorDusk.hemi);}
function updateLightPosition(v){const a=(v.azimuth+(dusk?135:0))*Math.PI/180,e=(dusk?Math.min(76,v.elevation+12):v.elevation)*Math.PI/180,r=95;sun.position.set(Math.sin(a)*Math.cos(e)*r,Math.sin(e)*r,-Math.cos(a)*Math.cos(e)*r);sun.shadow.needsUpdate=true;}

function disposeWorld(group,keep){
  if(!group)return;const shared=new Set();keep?.traverse(o=>{if(o.geometry)shared.add(o.geometry);});const seen=new Set();
  group.traverse(o=>{if(o.geometry&&!shared.has(o.geometry)&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(seen.has(material))continue;seen.add(material);for(const value of [...Object.values(material),...Object.values(material.userData||{})])if(value?.isTexture&&!seen.has(value)){seen.add(value);value.dispose();}for(const u of Object.values(material.uniforms||{}))if(u?.value?.isTexture&&!seen.has(u.value)){seen.add(u.value);u.value.dispose();}material.dispose();}});
  scene.remove(group);
}

function buildWorld(dem,geo){
  worldDem=dem;worldGeo=geo.radiusMeters===settings.values.shoreRadius?geo:geo.withShoreRadius(settings.values.shoreRadius);geo=worldGeo;
  const newField=makeField(dem,geo,embedded?(mobile?260:360):mobile?320:460),group=new THREE.Group();
  const shore=makeShoreTexture(geo),terrain=addTerrain(group,newField,shore);const water=addWater(group,newField,shore);addRoads(group,newField,local.roads);
  const houses=addVillage(group,newField,local),reservations=addVillageDetails(group,newField,local,houses),nature=addNature(group,newField,local,houses,mobile,reservations);
  chimneySmoke=addChimneySmoke(group,houses);grassMesh=nature.grassMesh;windowLights=[];
  const previous=world;world=group;field=newField;waterMaterial=water;terrainMesh=terrain;particleSystem=addParticles(group,newField);traffic=addTraffic(group,newField,local.roads);waterActivity=addWaterActivity(group,newField);
  // Nothing behind the cloud boundary participates in the playable world's draw.
  group.traverse(o=>{for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(mat.isMeshStandardMaterial&&mat.roughness>=.8&&!moonSheen.some(m=>m.mat===mat))moonSheen.push({mat,base:mat.roughness});if(mat.userData.nightWindows&&!windowLights.includes(mat))windowLights.push(mat);if(!mat.isShaderMaterial){mat.clippingPlanes=cloudBounds;mat.clipShadows=true;installEdgeFade(mat,edgeFadeUniforms);mat.needsUpdate=true;if(o.isMesh&&!mat.transparent){o.castShadow=o!==grassMesh;o.receiveShadow=true;}}}});
  scene.add(world);disposeWorld(previous,world);sun.shadow.needsUpdate=true;
  settings.applyAll();
  setLabelHeights();
  return {houses:houses.length,trees:nature.trees,reeds:nature.reeds,bushes:nature.bushes};
}

function addParticles(group,field){
  const capacity=1800,rand=randomSeed(3432),positions=new Float32Array(capacity*3),seeds=new Float32Array(capacity);let i=0;
  for(let attempt=0;i<capacity&&attempt<capacity*20;attempt++){const x=(rand()-.5)*WIDTH*.91,z=(rand()-.5)*DEPTH*.91;if(z< -DEPTH/2+7||field.isWater(x,z))continue;positions.set([x,Math.max(.1,field.height(x,z))+.65+rand()*1.6,z],i*3);seeds[i++]=rand();}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},size:{value:1},pixelRatio:{value:1},zoom:{value:1},tint:{value:new THREE.Color('#fff0b6')}},vertexShader:`attribute float seed;uniform float time,size,pixelRatio,zoom;varying float opacity;void main(){vec3 p=position;float phase=seed*62.83;p.x+=sin(time*.24+phase)*.18;p.z+=cos(time*.19+phase)*.14;p.y+=sin(time*.33+phase)*.12;opacity=.14+.21*(.5+.5*sin(time*.65+phase));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((1.2+seed*1.8)*pixelRatio*size*sqrt(zoom),1.,14.);}`,fragmentShader:`uniform vec3 tint;varying float opacity;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,d))*opacity;if(a<.006)discard;gl_FragColor=vec4(tint,a);}`});
  const points=new THREE.Points(geometry,material);group.add(points);return {points,capacity:i};
}

const drawSize=new THREE.Vector2();
function resizeRendering(scale){const ratio=Math.min((devicePixelRatio||1)*(scale/100),embedded?(mobile?1.25:1.6):mobile?2.4:3);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);renderer.getDrawingBufferSize(drawSize);fxaa.material.uniforms.resolution.value.set(1/Math.max(1,drawSize.x),1/Math.max(1,drawSize.y));}
function refreshShadow(){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapPass?.dispose();sun.shadow.mapPass=null;sun.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;world?.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}
function setSamples(samples){for(const rt of [composer.renderTarget1,composer.renderTarget2])if(rt.samples!==samples){rt.samples=samples;rt.dispose();}}
function applyRenderSetting(key,value,v){
  if(key==='particles'&&particleSystem){particleSystem.points.geometry.setDrawRange(0,Math.round(particleSystem.capacity*value/100));particleSystem.points.visible=value>0;}
  if(key==='particleSize'&&particleSystem)particleSystem.points.material.uniforms.size.value=value;
  if(key==='clouds')for(const c of clouds)c.sprite.visible=c.phase/(Math.PI*2)<value/100;
  if(key==='fog'){document.querySelector('.edge-fog').style.opacity=value/100;scene.fog.near=115+(75-value)*.65;scene.fog.far=value===0?100000:scene.fog.near+75*75/value;}
  if(key==='edgeFade'){edgeFadeUniforms.width.value=value;if(waterMaterial)waterMaterial.uniforms.edgeWidth.value=value;}
  if(key==='azimuth'||key==='elevation')updateLightPosition(v);
  if(key==='shading'&&terrainMesh){terrainMesh.material.flatShading=value==='flat';terrainMesh.material.wireframe=value==='wire';terrainMesh.material.needsUpdate=true;}
  if(key==='shadow'){renderer.shadowMap.enabled=value!=='off';sun.castShadow=value!=='off';if(value!=='off')sun.shadow.mapSize.set(Number(value),Number(value));refreshShadow();}
  if(key==='filter'){renderer.shadowMap.type=value==='hard'?THREE.BasicShadowMap:value==='pcf'?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;refreshShadow();}
  if(key==='aa'){fxaa.enabled=value==='fxaa';setSamples(value.startsWith('msaa')?Math.min(maxSamples,Number(value.slice(4))):0);}
  if(key==='scale')resizeRendering(value);
  if(key==='waves'&&waterMaterial)waterMaterial.uniforms.waveStrength.value=value/100;
  if(key==='foam'&&waterMaterial)waterMaterial.uniforms.foamStrength.value=value/100;
  if(key==='cars'&&traffic)traffic.setCount(value);
  if(key==='carSpeed'&&traffic)traffic.setSpeed(value);
  if(key==='kites'&&waterActivity)waterActivity.setKites(value);
  if(key==='boats'&&waterActivity)waterActivity.setBoats(value);
  if(key==='smoke'&&chimneySmoke){chimneySmoke.material.uniforms.opacity.value=value/100;chimneySmoke.visible=value>0;}
  if(key==='grassDensity'){if(terrainMesh)terrainMesh.material.userData.grassDensity.value=value/100;if(grassMesh){grassMesh.count=Math.round(grassMesh.userData.capacity*value/200);grassMesh.visible=value>0;}}
  if(key==='shoreRadius'&&worldGeo&&value!==worldGeo.radiusMeters){clearTimeout(shoreTimer);shoreTimer=setTimeout(()=>{if(worldDem&&worldGeo&&settings.values.shoreRadius!==worldGeo.radiusMeters)buildWorld(worldDem,worldGeo);},400);}
}
const settings=createRenderSettings({mobile,maxSamples,onChange:applyRenderSetting,presetDefaults:applicationPreset.render,onSavePreset:render=>saveApplicationPreset({render,view:structuredClone(lockedView),mode:dusk?'night':'day'})});settings.applyAll();

function makeLabel(text,lon,lat,cls='',subtitle=''){
  const [x,z]=toWorld(lon,lat),el=document.createElement('div');el.className=`world-label ${cls}`;el.textContent=text;
  if(subtitle){const s=document.createElement('small');s.textContent=subtitle;el.appendChild(s);}
  labelRoot.appendChild(el);const label={el,x,z,y:0,water:cls.includes('water-label')};placeLabels.push(label);return label;
}
makeLabel('AKYAKA',28.325,37.058,'','Kıyı köyü');
makeLabel('Gökova Körfezi',28.309,37.025,'water-label');
makeLabel('AKÇAPINAR',28.359,37.022,'','');
makeLabel('Azmak',28.3379,37.0505,'local-label');
makeLabel('Gökova',28.372,37.055,'local-label');
function setLabelHeights(){if(!field)return;for(const label of [...placeLabels,...venuePins]){label.y=label.water?.04:Math.max(.1,field.height(label.x,label.z))+(label.venue?.75:.6);}}
function addVenuePins(venues=local?.venues||[]){
  const popup=$('venue-popup');
  for(const old of venuePins){old.el.remove();old.heat?.remove();}venuePins=[];
  for(const v of venues){if(!v.location||!Number.isFinite(v.location.lon)||!Number.isFinite(v.location.lat))continue;const [x,z]=toWorld(v.location.lon,v.location.lat),el=document.createElement('button');el.type='button';el.className=embedded?`venue-pin venue-pin-live${v.isYou?' venue-pin-you':''}${v.closed?' venue-pin-closed':''}`:'venue-pin';el.title=v.name;el.setAttribute('aria-label',`${v.name}${embedded&&v.count!=null?` · ${v.count} kişi`:''}`);el.hidden=true;
    if(v.logo){const image=document.createElement('img');image.src=v.logo;image.alt='';el.appendChild(image);}else el.textContent=v.name.slice(0,1);
    let heat=null;if(embedded&&!v.isYou){el.style.setProperty('--venue-color',v.color||'#747b80');const count=document.createElement('span');count.className='venue-pin-count';count.textContent=v.closed?'🔒':v.count==null?'—':String(v.count);el.appendChild(count);const name=document.createElement('span');name.className='venue-pin-name';name.textContent=v.name;el.appendChild(name);if(!v.closed&&v.count!=null){heat=document.createElement('div');heat.className='venue-heat';heat.style.setProperty('--heat-color',v.color||'#747b80');heat.hidden=true;labelRoot.appendChild(heat);}}
    el.addEventListener('click',()=>{if(embedded){if(!v.isYou)notifyParent('open',{id:v.id});return;}popup.replaceChildren();const title=document.createElement('b'),subtitle=document.createElement('small');title.textContent=v.name;subtitle.textContent=v.type||'Akyaka';popup.append(title,subtitle);popup.hidden=false;setTimeout(()=>popup.hidden=true,2800);});
    labelRoot.appendChild(el);venuePins.push({el,heat,x,z,y:0,venue:v,water:false});
  }setLabelHeights();
  // App: the first time the venues arrive, the starting view is centred on them (as the 2D map is).
  const real=venuePins.filter(p=>!p.venue.isYou);
  if(embedded&&!centredOnVenues&&real.length){centredOnVenues=true;const [cx,cz]=toWorld(APP_START.lon,APP_START.lat),o=new THREE.Vector3(...lockedView.position).sub(new THREE.Vector3(...lockedView.target));
    lockedView.target=[cx,lockedView.target[1],cz];lockedView.position=[cx+o.x,lockedView.target[1]+o.y,cz+o.z];resetView();
    // zoom so a metre is APP_START.ppm pixels across, the same detail on every screen
    camera.updateMatrixWorld();const [x1,z1]=toWorld(APP_START.lon+.01,APP_START.lat),a=new THREE.Vector3(cx,0,cz).project(camera),b=new THREE.Vector3(x1,0,z1).project(camera),ppm=Math.abs(a.x-b.x)*.5*innerWidth/(1113.2*Math.cos(APP_START.lat*Math.PI/180));
    if(ppm>0){camera.zoom=Math.min(controls.maxZoom,Math.max(controls.minZoom,camera.zoom*APP_START.ppm/ppm));targetZoom=camera.zoom;camera.updateProjectionMatrix();}clampCamera();}
}
// The app opens here: centre of the view and its scale (pixels per metre), set from the chosen start view.
const APP_START={lat:37.0430,lon:28.3230,ppm:.191};
let centredOnVenues=false;
function updateLabels(){
  for(const label of placeLabels){const {el,x,y,z}=label;projectVec.set(x,y,z).project(camera);const visible=projectVec.z>-1&&projectVec.z<1&&Math.abs(projectVec.x)<1.08&&Math.abs(projectVec.y)<1.08;el.style.visibility=visible?'visible':'hidden';if(visible){el.style.left=`${(projectVec.x*.5+.5)*innerWidth}px`;el.style.top=`${(-projectVec.y*.5+.5)*innerHeight}px`;el.style.opacity=label.el.classList.contains('local-label')&&camera.zoom<1.25?.7:1;}}
  const packed=[];
  for(const label of venuePins){const {el,heat,x,y,z,venue}=label;if(!showVenues){el.hidden=true;if(heat)heat.hidden=true;continue;}projectVec.set(x,y,z).project(camera);const visible=projectVec.z>-1&&projectVec.z<1&&Math.abs(projectVec.x)<1.04&&Math.abs(projectVec.y)<1.04;el.hidden=!visible;if(heat)heat.hidden=!visible;if(visible){const sx=(projectVec.x*.5+.5)*innerWidth,sy=(-projectVec.y*.5+.5)*innerHeight;let px=sx,py=sy;
      if(embedded){const gap=mobile?42:50;const clear=(a,b)=>packed.every(p=>Math.hypot(p[0]-a,p[1]-b)>gap);if(!clear(px,py)){let found=false;for(let ring=1;ring<=4&&!found;ring++){for(let i=0;i<ring*6;i++){const a=i/(ring*6)*Math.PI*2,qx=sx+Math.cos(a)*gap*ring,qy=sy+Math.sin(a)*gap*ring;if(clear(qx,qy)){px=qx;py=qy;found=true;break;}}}}packed.push([px,py]);if(heat){const size=Math.max(66,Math.min(180,66+Math.min(venue.count||0,100)*.74+camera.zoom*7));heat.style.left=`${sx}px`;heat.style.top=`${sy}px`;heat.style.width=heat.style.height=`${size}px`;heat.style.opacity=String(Math.min(.8,.28+(venue.count||0)*.005));}}
      el.style.left=`${px}px`;el.style.top=`${py}px`;
    }
    // Embedded: the app draws its own pins and heat clouds at these spots, so only the user's own marker stays here.
    if(embedded&&!venue.isYou){el.hidden=true;if(heat)heat.hidden=true;if(projectVec.z>-1&&projectVec.z<1)reported.push({id:venue.id,x:Math.round((projectVec.x*.5+.5)*innerWidth*10)/10,y:Math.round((-projectVec.y*.5+.5)*innerHeight*10)/10});}
  }
  if(embedded)reportView();
}
// Screen spots of the venues and how many pixels a metre is, posted to the app whenever they change.
let lastReport='';const reported=[];
function reportView(){const c=venuePins.find(p=>!p.venue.isYou);if(!c)return;const {lon,lat}=c.venue.location,at=(o,a)=>{const [x,z]=toWorld(lon+o,lat+a),q=new THREE.Vector3(x,c.y,z).project(camera);return [(q.x*.5+.5)*innerWidth,(-q.y*.5+.5)*innerHeight];};
  // ground → screen as an affine map of lon/lat around the first venue, and pixels per metre east-west
  const s0=at(0,0),s1=at(.01,0),s2=at(0,.01),affine={lon0:lon,lat0:lat,ax:[s0[0],(s1[0]-s0[0])/.01,(s2[0]-s0[0])/.01],ay:[s0[1],(s1[1]-s0[1])/.01,(s2[1]-s0[1])/.01]};
  const ppm=Math.hypot(s1[0]-s0[0],s1[1]-s0[1])/(1113.2*Math.cos(lat*Math.PI/180));
  const pts=showVenues?reported.splice(0):(reported.length=0,[]);const msg=JSON.stringify([pts,affine.ax,affine.ay]);if(msg!==lastReport){lastReport=msg;notifyParent('view',{pts,ppm,affine,w:innerWidth,h:innerHeight});}}

if(embedded)window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent)return;if(event.data?.type==='venue-map:zoom'){$(event.data.dir>0?'zoom-in':'zoom-out').click();return;}if(event.data?.type!=='venue-map:state')return;lastReport='';if(event.data.theme)useAppTheme(event.data.theme);if(Number.isFinite(event.data.tilt))setAppTilt(event.data.tilt);embeddedActive=event.data.active!==false;showVenues=event.data.showPins!==false;const incoming=Array.isArray(event.data.venues)?event.data.venues:[];pendingVenueData=event.data.you?[event.data.you,...incoming]:incoming;if(embeddedReady)addVenuePins(pendingVenueData);if(!showVenues)for(const v of venuePins){v.el.hidden=true;if(v.heat)v.heat.hidden=true;}});

function updateScale(){const worldWidth=(camera.right-camera.left)/camera.zoom,metersPerPixel=worldWidth*100/innerWidth;const desired=metersPerPixel*70;const steps=[50,100,200,500,1000,2000];let best=steps[0];for(const m of steps)if(Math.abs(m-desired)<Math.abs(best-desired))best=m;$('scale-text').textContent=best>=1000?`${best/1000} km`:`${best} m`;document.querySelector('.scale span').style.width=`${best/metersPerPixel}px`;}
function updateCompass(){const angle=controls.getAzimuthalAngle();$('compass').querySelector('svg').style.transform=`rotate(${angle*180/Math.PI}deg)`;}
function clampCamera(){if(!viewReference)return;const ref=viewReference;let view=groundFootprint(camera,ref.u,ref.v);const fit=embedded?1:Math.max(1,(view.u1-view.u0)/Math.max(.001,ref.u1-ref.u0),(view.v1-view.v0)/Math.max(.001,ref.v1-ref.v0));if(fit>1.00001){camera.zoom=Math.min(controls.maxZoom,camera.zoom*fit);targetZoom=Math.max(targetZoom,camera.zoom);camera.updateProjectionMatrix();view=groundFootprint(camera,ref.u,ref.v);}const shift=(lo,hi,a,b)=>hi-lo>b-a?(a+b-lo-hi)/2:Math.max(a-lo,Math.min(b-hi,0));const du=shift(view.u0,view.u1,ref.u0,ref.u1),dv=shift(view.v0,view.v1,ref.v0,ref.v1);if(Math.abs(du)+Math.abs(dv)>.00001){const dx=ref.u.x*du+ref.v.x*dv,dz=ref.u.z*du+ref.v.z*dv;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;}}

$('zoom-in').addEventListener('click',()=>{targetZoom=Math.min(controls.maxZoom,Math.max(targetZoom,camera.zoom)*1.36);});
$('zoom-out').addEventListener('click',()=>{targetZoom=Math.max(controls.minZoom,Math.min(targetZoom,camera.zoom)/1.36);});
$('reset').addEventListener('click',resetView);
$('lock-view').addEventListener('click',e=>{if(e.shiftKey){lockedView={...DEFAULT_VIEW};rebuildLock();resetView();}else lockCurrentView();});
$('places').addEventListener('click',()=>{showVenues=!showVenues;$('places').setAttribute('aria-pressed',String(showVenues));$('venue-popup').hidden=true;});
function setLightingMode(mode,persist=false){dusk=mode==='night';document.body.classList.toggle('dusk',dusk);$('lighting').setAttribute('aria-pressed',String(dusk));$('lighting').querySelector('span').textContent=dusk?'Gece':'Gündüz';updateLightPosition(settings.values);if(persist)try{localStorage.setItem('akyaka:lighting-mode:v1',mode);}catch{}}
$('lighting').addEventListener('click',()=>setLightingMode(dusk?'day':'night',true));
if(!embedded){window.addEventListener('storage',e=>{if(e.key==='akyaka:lighting-mode:v1'&&['day','night'].includes(e.newValue))setLightingMode(e.newValue);});
try{const mode=localStorage.getItem('akyaka:lighting-mode:v1');if(['day','night'].includes(mode))setLightingMode(mode);}catch{}}
// In the app the theme picks the lighting: light = day with the day preset, dark = night with the night preset.
let appMode=null;
// The app's Map tilt slider: the camera keeps its spot and distance and swings to that angle from straight down.
function setAppTilt(deg){const t=Math.max(.5,Math.min(70,deg))*Math.PI/180;if(Math.abs(t-APP_TILT)<1e-4)return;APP_TILT=t;
  const swing=(pos,target)=>{const d=new THREE.Vector3(...pos).distanceTo(new THREE.Vector3(...target));return [target[0],target[1]+d*Math.cos(t),target[2]+d*Math.sin(t)];};
  lockedView.position=swing(lockedView.position,lockedView.target);
  const d=camera.position.distanceTo(controls.target);camera.position.set(controls.target.x,controls.target.y+d*Math.cos(t),controls.target.z+d*Math.sin(t));
  controls.minPolarAngle=controls.maxPolarAngle=t;const z=camera.zoom;configureCamera();camera.zoom=Math.max(controls.minZoom,z);targetZoom=camera.zoom;camera.updateProjectionMatrix();controls.update();clampCamera();}
function useAppTheme(theme){const mode=theme==='light'?'day':'night';if(mode===appMode)return;appMode=mode;setLightingMode(mode);const values=mode==='day'?applicationPreset.dayRender:applicationPreset.render;if(values)settings.setAll(values);}
if(dusk){document.body.classList.add('dusk');$('lighting').setAttribute('aria-pressed','true');$('lighting').querySelector('span').textContent='Gece';}
window.addEventListener('resize',()=>{configureCamera();resizeRendering(settings.values.scale);updateScale();});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

// A programmatic zoom only animates when the zoom buttons initiated it; OrbitControls remains in
// charge of wheel and touch gestures. A new gesture cancels any button animation.
let buttonZoom=false,zoomStart=camera.zoom;
for(const id of ['zoom-in','zoom-out'])$(id).addEventListener('click',()=>{buttonZoom=true;zoomStart=camera.zoom;});
controls.addEventListener('start',()=>{buttonZoom=false;});
let frameCount=0,lastTime=performance.now(),statTime=lastTime,statFrames=0;
function frame(now){
  requestAnimationFrame(frame);const t=now*.001,dt=Math.min(.1,(now-lastTime)*.001);lastTime=now;
  if(embedded&&!embeddedActive)return;
  if(buttonZoom){camera.zoom=THREE.MathUtils.lerp(camera.zoom,targetZoom,preferReduced?1:.17);if(Math.abs(camera.zoom-targetZoom)<.005){camera.zoom=targetZoom;buttonZoom=false;}camera.updateProjectionMatrix();}
  controls.update();clampCamera();
  const v=settings.values,palette=dusk?colorDusk:colorDay,fill=v.ambient*(dusk?.49:1);nightMix=THREE.MathUtils.lerp(nightMix,dusk?1:0,.065);scene.background.lerp(palette.sky,.035);scene.fog.color.lerp(palette.fog,.035);sun.color.lerp(palette.sun,.035);hemisphere.color.lerp(palette.hemi,.035);hemisphere.groundColor.lerp(palette.ground,.035);ambient.color.lerp(palette.hemi,.035);sun.intensity=THREE.MathUtils.lerp(sun.intensity,v.sun*(dusk?.43:1),.12);hemisphere.intensity=THREE.MathUtils.lerp(hemisphere.intensity,fill*.82,.12);ambient.intensity=THREE.MathUtils.lerp(ambient.intensity,fill*.18,.12);renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,v.exposure*(dusk?.79:1),.12);
  for(const m of windowLights)m.emissiveIntensity=nightMix*1.65;
  moonLight.intensity=nightMix*.75;for(const m of moonSheen)m.mat.roughness=m.base-nightMix*.2;
  if(waterMaterial){if(!preferReduced)waterClock+=dt*v.waveSpeed/100;const u=waterMaterial.uniforms;u.time.value=waterClock;u.moon.value=nightMix;u.moonX.value=(placeLabels.find(l=>l.water)?.x??controls.target.x);u.sun.value=THREE.MathUtils.lerp(u.sun.value,dusk?.70:1,.025);u.lightDirection.value.copy(sun.position).normalize();u.lightColor.value.copy(sun.color);u.skyColor.value.copy(scene.background);for(const k of ['deep','ocean','shallows','foam'])u[k].value.lerp(palette[k],.035);}
  for(const cloud of clouds){cloud.sprite.position.x=cloud.x+(preferReduced?0:Math.sin(t*.045+cloud.phase)*.8);cloud.sprite.position.z=cloud.z+(preferReduced?0:Math.cos(t*.032+cloud.phase)*.5);cloud.sprite.material.color.lerp(dusk?duskCloud:dayCloud,.02);}
  if(particleSystem){const u=particleSystem.points.material.uniforms;u.time.value=preferReduced?0:t;u.pixelRatio.value=renderer.getPixelRatio();u.zoom.value=camera.zoom;}
  if(chimneySmoke){if(!preferReduced)smokeClock+=dt;const u=chimneySmoke.material.uniforms;u.time.value=smokeClock;u.pixelRatio.value=renderer.getPixelRatio();u.zoom.value=camera.zoom;u.tint.value.lerp(dusk?smokeDusk:smokeDay,.035);}
  traffic?.setNight(nightMix);traffic?.update(preferReduced?0:dt);
  waterActivity?.update(preferReduced?0:dt,waterClock);
  // All solid props cast/receive shadows; refresh the moving-object shadow map
  // periodically, instead of rendering several hundred thousand shadow triangles every frame.
  if(renderer.shadowMap.enabled&&!preferReduced){shadowClock+=dt;if(shadowClock>(embedded?(camera.zoom>2?.8:2.4):(camera.zoom>2?.38:1.25))){sun.shadow.needsUpdate=true;shadowClock=0;}}
  camera.updateMatrixWorld();updateLabels();if(frameCount++%9===0){updateScale();updateCompass();}renderer.info.reset();composer.render(dt);
  statFrames++;if(now-statTime>550){$('metric-fps').textContent=Math.round(statFrames*1000/(now-statTime));$('metric-triangles').textContent=Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(renderer.info.render.triangles);renderer.getDrawingBufferSize(drawSize);$('metric-resolution').textContent=`${drawSize.x}×${drawSize.y}`;statTime=now;statFrames=0;}
}
const dayCloud=new THREE.Color('#ffffff'),duskCloud=new THREE.Color('#829fc8'),smokeDay=new THREE.Color('#f6eed9'),smokeDusk=new THREE.Color('#9ab6df');

async function init(){
  // First paint uses an explicitly labelled artist layout. Native elevation and vector geography
  // replace it as soon as the browser's public data requests finish; never block the initial render.
  $('load-message').textContent='Arazi, su ve ormanlar oluşturuluyor…';
  const realDem=loadElevation(),realGeo=loadGeography();
  local=await loadLocalMaps();embeddedReady=true;addVenuePins(embedded?(pendingVenueData||[]):local.venues);
  let counts=buildWorld(previewElevation(),previewGeography());
  $('data-state').textContent='Sanatsal arazi önizlemesi';$('data-detail').textContent='Canlı coğrafya verileri bekleniyor · OSM yolları yerel kopyadan';
  $('loading').classList.add('ready');requestAnimationFrame(frame);notifyParent('ready');
  const [dem,geo]=await Promise.all([realDem,realGeo]);
  if(dem.loaded||geo.complete)counts=buildWorld(dem,geo);
  const real=dem.complete&&geo.complete;
  $('status-dot').classList.toggle('live',real);$('data-state').textContent=real?'Gerçek Akyaka coğrafyası':dem.complete?'Gerçek yükseklik · sanatsal kıyı':geo.complete?'Gerçek kıyı · sanatsal yükseklik':dem.loaded?'Kısmi DEM · sanatsal kıyı':'Sanatsal arazi önizlemesi';
  $('data-detail').textContent=real?`30 m DEM · OSM coğrafyası · ${counts.trees.toLocaleString('tr-TR')} ağaç`:dem.loaded||geo.complete?'Eksik harita verileri için sanatsal yedek kullanılıyor.':'Coğrafya servisi erişilemedi; temsili dağlar ve kıyı kullanılıyor.';
}
init().catch(e=>{console.error(e);$('load-message').textContent='Dünya yüklenemedi. Sayfayı yenileyip tekrar dene.';$('data-state').textContent='Yükleme hatası';notifyParent('error');});
