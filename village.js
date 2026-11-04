/* A small, fixed village scene. No tile sampling, screen-space scattering or zoom sizing. */
const VILLAGE_DEFAULTS = {
  houses: 20, trees: 60, cars: 3, houseSize: 26, treeSize: 19, carSize: 16, spacing: 8, speed: 12,
  light: { roof:'#db803b', wall:'#eee0bd', wood:'#805437', leaves:'#79a458', trunk:'#886344', car1:'#ee6651', car2:'#27b9ac', car3:'#edb72f' },
  dark: { roof:'#80553f', wall:'#6f818b', wood:'#3a4851', leaves:'#30564c', trunk:'#48534f', car1:'#d7776e', car2:'#5ba5ad', car3:'#cfb477' },
};
const VILLAGE_LIMITS = {houses:[0,100],trees:[0,400],cars:[0,4],houseSize:[18,36],treeSize:[12,28],carSize:[10,24],spacing:[0,20],speed:[0,30]};
function villageSettings(raw) {
  const s=structuredClone(VILLAGE_DEFAULTS);
  for(const [k,[min,max]] of Object.entries(VILLAGE_LIMITS)) if(Number.isFinite(raw?.[k])) s[k]=Math.min(max,Math.max(min,Math.round(raw[k])));
  for(const theme of ['light','dark']) for(const k of Object.keys(s[theme])) if(/^#[0-9a-f]{6}$/i.test(raw?.[theme]?.[k])) s[theme][k]=raw[theme][k];
  // Upgrade only untouched values from the former daylight-like dark palette.
  const legacy={roof:'#bb6537',wall:'#b5ad99',wood:'#624b3b',leaves:'#507c64',trunk:'#795d4c',car1:'#ff8979',car2:'#60c9c0',car3:'#f5ce70'};
  for(const [key,color] of Object.entries(legacy))if(s.dark[key]===color)s.dark[key]=VILLAGE_DEFAULTS.dark[key];
  return s;
}
function readVillage(key, fallback) { try { return villageSettings(JSON.parse(localStorage.getItem(key)) || fallback); } catch { return villageSettings(fallback); } }
// Authored inland anchors, spread well outside the busiest pin clusters. Order is permanent.
const VILLAGE_HOMES = [
  [37.0601,28.3298],[37.0579,28.3448],[37.0328,28.3638],[37.0251,28.3503],
  [37.0627,28.3381],[37.0294,28.3537],[37.0591,28.3538],[37.0359,28.3583],
  [37.0648,28.3261],[37.0231,28.3635],[37.0321,28.3732],[37.0617,28.3611],
  [37.0675,28.3381],[37.0207,28.3521],
];
const VILLAGE_TREES = [
  [37.0643,28.3191],[37.0669,28.3246],[37.0634,28.3482],[37.0667,28.3545],
  [37.0389,28.3709],[37.0354,28.3795],[37.0291,28.3787],[37.0218,28.3441],
  [37.0578,28.3596],[37.0701,28.3356],[37.0263,28.3698],[37.0403,28.3607],
  [37.0681,28.3154],[37.0708,28.3457],[37.0631,28.3697],[37.0433,28.3781],
  [37.0358,28.3891],[37.0223,28.3768],[37.0173,28.3572],[37.0308,28.3441],
  [37.0687,28.3646],[37.0741,28.3271],[37.0462,28.3705],[37.0189,28.3675],
];
// Stable inland candidates are generated once, never from the viewport or zoom.
function villageCandidates(zones,step) {
  const out=[];
  for(const [zone,[south,west,north,east]] of zones.entries()) {
    let row=0;
    for(let lat=south;lat<=north;lat+=step,row++) {
      let col=0;
      for(let lon=west;lon<=east;lon+=step*1.25,col++) {
        const seed=zone*100003+row*997+col*47;
        const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
        out.push({at:[lat+(noise(seed)-.5)*step*.4,lon+(noise(seed+1)-.5)*step*.4],rank:noise(seed+2)});
      }
    }
  }
  return out.sort((a,b)=>a.rank-b.rank).map(p=>p.at);
}
const VILLAGE_EXTRA_HOMES=villageCandidates([[37.058,28.32,37.073,28.378],[37.021,28.348,37.043,28.39]],.00085);
const VILLAGE_EXTRA_TREES=villageCandidates([[37.06,28.309,37.078,28.39],[37.017,28.348,37.047,28.39]],.00065);
function villageWorldPoint(at) {
  const p=L.CRS.EPSG3857.latLngToPoint(L.latLng(at),14);
  return {x:p.x,y:p.y*.5};
}
// Segment/rectangle intersection, including the roof's full visible footprint.
function villageSegmentHits(a,b,r) {
  let enter=0,leave=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]) {
    if(Math.abs(delta)<1e-9) {if(start<min||start>max)return false;continue;}
    const x=(min-start)/delta,y=(max-start)/delta;
    enter=Math.max(enter,Math.min(x,y));leave=Math.min(leave,Math.max(x,y));
    if(enter>leave)return false;
  }
  return true;
}
function villageRoadIndex(roads) {
  const grid=new Map(), cell=32;
  for(const road of roads) for(let i=1;i<road.points.length;i++) {
    const a=villageWorldPoint(road.points[i-1]),b=villageWorldPoint(road.points[i]);
    const segment={a,b};
    for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)
      for(let y=Math.floor(Math.min(a.y,b.y)/cell);y<=Math.floor(Math.max(a.y,b.y)/cell);y++) {
        const key=`${x}:${y}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(segment);
      }
  }
  return {clear(at,width) {
    const p=villageWorldPoint(at),buffer=5;
    const r={x:p.x-width*.5-buffer,y:p.y-width*.88-buffer,w:width+buffer*2,h:width+buffer*2},seen=new Set();
    for(let x=Math.floor(r.x/cell);x<=Math.floor((r.x+r.w)/cell);x++)
      for(let y=Math.floor(r.y/cell);y<=Math.floor((r.y+r.h)/cell);y++)
        for(const s of grid.get(`${x}:${y}`)||[]) {
          if(seen.has(s))continue;seen.add(s);
          if(villageSegmentHits(s.a,s.b,r))return false;
        }
    return true;
  }};
}
function villageLayout(s,roadIndex) {
  if(!roadIndex)return [];
  const occupied=[], out=[];
  for(const [kind,points,count,width] of [['house',[...VILLAGE_HOMES,...VILLAGE_EXTRA_HOMES],s.houses,s.houseSize],['tree',[...VILLAGE_TREES,...VILLAGE_EXTRA_TREES],s.trees,s.treeSize]]) {
    let added=0;
    for(const [i,at] of points.entries()) {
      if(added>=count) break;
      const p=villageWorldPoint(at);
      const box={x:p.x,y:p.y-width*.38,w:width+s.spacing,h:width+s.spacing};
      if(occupied.some(b=>Math.abs(b.x-box.x)<(b.w+box.w)/2 && Math.abs(b.y-box.y)<(b.h+box.h)/2)) continue;
      if(!roadIndex.clear(at,width))continue;
      occupied.push(box);out.push({id:`${kind}-${i}`,kind,at,width,variant:i%3});added++;
    }
  }
  return out;
}
// Rotate the model on its ground plane before projecting it. Wheels and side faces
// stay upright even when the car turns; the whole sprite is never rotated flat.
function villageCarSvg(p,variant=0,direction=0,night=false) {
  const angle=direction*Math.PI/8,dx=Math.cos(angle),dy=Math.sin(angle);
  const yaw=Math.atan2(dy-dx/Math.sqrt(3),dy+dx/Math.sqrt(3));
  const cos=Math.cos(yaw),sin=Math.sin(yaw),paint=p[`car${variant%3+1}`];
  const rotate=([x,y,z])=>[x*cos-y*sin,x*sin+y*cos,z];
  const project=v=>{const [x,y,z]=rotate(v);return [32+(x-y)*.9,37+(x+y)*.48-z*1.2];};
  const tint=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(c=>Math.round(Math.max(0,Math.min(255,parseInt(c,16)+amount))).toString(16).padStart(2,'0')).join('');
  const faces=[];
  const face=(vertices,color,normal=null)=> {
    if(normal){const n=rotate(normal);if(n[0]+n[1]+n[2]<=0)return;}
    faces.push({vertices,color,depth:vertices.reduce((d,v)=>{const q=rotate(v);return d+q[0]+q[1]+q[2]*1.6;},0)/vertices.length});
  };
  // Four low-poly wheels, upright in the car's local X/Z plane.
  for(const x of [-9,9])for(const y of [-7.4,7.4]) {
    face(Array.from({length:8},(_,i)=>[x+Math.cos(i*Math.PI/4)*2.8,y,3.2+Math.sin(i*Math.PI/4)*2.8]),'#17232d',[0,Math.sign(y),0]);
  }
  const x0=-14,x1=14,y0=-7,y1=7,z0=4,z1=9;
  face([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],tint(paint,16),[0,0,1]);
  face([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],tint(paint,-28),[0,-1,0]);
  face([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],tint(paint,-10),[0,1,0]);
  face([[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]],tint(paint,-25),[-1,0,0]);
  face([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],paint,[1,0,0]);
  // Sloping windscreens, side glass and an elevated painted roof.
  const glass=night?'#304a60':'#83a6b5';
  face([[-8,-6,9],[8,-6,9],[4,-5,16],[-4,-5,16]],glass,[0,-1,0]);
  face([[-8,6,9],[8,6,9],[4,5,16],[-4,5,16]],tint(glass,-12),[0,1,0]);
  face([[8,-6,9],[8,6,9],[4,5,16],[4,-5,16]],glass,[1,0,.6]);
  face([[-8,-6,9],[-8,6,9],[-4,5,16],[-4,-5,16]],tint(glass,-16),[-1,0,.6]);
  face([[-4,-5,16],[4,-5,16],[4,5,16],[-4,5,16]],tint(paint,28),[0,0,1]);
  for(const y of [-4.5,4.5]) {
    face([[14.1,y-1.4,6],[14.1,y+1.4,6],[14.1,y+1.4,8],[14.1,y-1.4,8]],night?'#fff1c1':'#e5f4f0',[1,0,0]);
    face([[-14.1,y-1.4,6],[-14.1,y+1.4,6],[-14.1,y+1.4,7.5],[-14.1,y-1.4,7.5]],'#eb665b',[-1,0,0]);
  }
  const polygon=(vertices,fill,extra='')=>`<polygon points="${vertices.map(v=>project(v).map(n=>n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  const beams=night?polygon([[15,-5,0],[29,-10,0],[29,10,0],[15,5,0]],'#ffe3a1','opacity=".14"'):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="33" cy="40" rx="21" ry="10" fill="#020a14" opacity=".25"/>${beams}${faces.sort((a,b)=>a.depth-b.depth).map(f=>polygon(f.vertices,f.color)).join('')}</svg>`;
}

function villageSvg(kind,p,variant=0,night=false) {
  const start='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">', end='</svg>';
  const windows='m22 42 5 2v6l-5-2zm27-4 5-3v6l-5 3z';
  if(kind==='house') return start+`
    <ellipse cx="34" cy="53" rx="27" ry="7" fill="#283b2c" opacity=".16"/>
    <path d="m8 30 25 13v16L8 46zM33 43l24-13v16L33 59z" fill="${p.wall}"/>
    <path d="m8 30 25 13v16L8 46z" fill="#000" opacity=".14"/>
    <path d="m5 29 19-18 36 18-27 16z" fill="${p.roof}"/>
    <path d="m5 29 19-18 9 34z" fill="#000" opacity=".15"/>
    <path d="m24 11 9 18 27 0" fill="#fff" opacity=".12"/>
    <g fill="none" stroke="${p.wood}" stroke-width="2.1" stroke-linejoin="round">
      <path d="M9 34v12l24 12 23-12V33M33 44v14M18 38v13M46 38v14M9 43l24 12 23-12M9 34l9 17 9-8"/>
    </g><path d="m36 45 6-3v12l-6 3z" fill="${p.wood}"/>
    ${night?`<defs><filter id="lamplight" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2"/></filter></defs><path d="${windows}" fill="#ffb753" filter="url(#lamplight)" opacity=".8"/>`:''}
    <path d="${windows}" fill="${night?'#ffdc96':variant===1?'#f6ce77':'#719a9a'}"/>
    <path d="m48 23 0-12 5-3 0 18" fill="${p.wall}"/><path d="m48 11 5-3 4 2-5 3z" fill="${p.wood}"/>`+end;
  if(kind==='tree') return start+`<ellipse cx="33" cy="57" rx="19" ry="5" fill="#283b2c" opacity=".15"/>
    <path d="M29 34h6v23h-6z" fill="${p.trunk}"/>`+(variant===1 ? `
    <path d="m32 3 14 21-7-1 14 18-10-1 12 12-23 5L9 52l12-12-10 1 14-18-7 1z" fill="${p.leaves}"/>
    <path d="m32 3 0 54L9 52l12-12-10 1 14-18-7 1z" fill="#000" opacity=".11"/>
    <path d="m32 3 14 21-14-3 10 16-10-2z" fill="#fff" opacity=".13"/>` : `
    <path d="m31 4 16 5 11 16-5 16-20 7-21-8-7-14L14 9z" fill="${p.leaves}"/>
    <path d="m31 4-4 18L14 9 5 26l22-4 6 26 20-7 5-16-23 5z" fill="#000" opacity=".11"/>
    <path d="m31 4 16 5-12 21-8-8L14 9z" fill="#fff" opacity=".15"/>`)+end;
  return villageCarSvg(p,variant,0,night);
}
const VILLAGE_ROADS = [ [[37.0610,28.3265],[37.0230,28.3570]], [[37.0534,28.3258],[37.0550,28.3420]] ];
function validVillageRoad(points) {
  return Array.isArray(points) && points.length>2 && points.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>37&&p[0]<37.1&&p[1]>28.3&&p[1]<28.4);
}
async function villageRoads() {
  return Promise.all(VILLAGE_ROADS.map(async ([a,b],index)=> {
    const key=`villageRoad:v1:${index}`;
    try { const cached=JSON.parse(localStorage.getItem(key)); if(validVillageRoad(cached)) return cached; } catch {}
    try {
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
      let json; try { json=await (await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`,{signal:controller.signal})).json(); } finally { clearTimeout(timer); }
      const points=json.routes?.[0]?.geometry?.coordinates?.map(([lon,lat])=>[lat,lon]);
      if(!validVillageRoad(points)) return null;
      try { localStorage.setItem(key,JSON.stringify(points)); } catch {}
      return points;
    } catch { return null; }
  }));
}

function addVillageScene(m) {
  let settings=readVillage('villageScene:v1',readVillage('villageDefaults:v1',VILLAGE_DEFAULTS));
  let roadIndex=null, placementError=false;
  // One-time upgrade increases the existing scene without discarding its sizes or palettes.
  try { if(!localStorage.getItem('villageDensityUpgrade:v2')) { settings.houses=Math.max(settings.houses,20);settings.trees=Math.max(settings.trees,60);localStorage.setItem('villageDensityUpgrade:v2','1'); } } catch {}
  let layout=[], sprites={}, imageRevision=0, roads=[], traffic=[], tween=null, frame=0, lastTime=performance.now();
  const pane=m.createPane('villageScene'); pane.style.zIndex=350; pane.style.pointerEvents='none';
  const canvas=L.DomUtil.create('canvas','village-canvas',pane), ctx=canvas.getContext('2d'); canvas.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
  const loadSprites=async()=> {
    const revision=++imageRevision, night=theme()==='dark', palette={...settings[theme()]};
    const jobs=['house','tree'].flatMap(kind=>[0,1,2].map(variant=>({key:`${kind}-${variant}`,svg:villageSvg(kind,palette,variant,night)})));
    for(let variant=0;variant<3;variant++) for(let direction=0;direction<16;direction++)
      jobs.push({key:`car-${variant}-${direction}`,svg:villageCarSvg(palette,variant,direction,night)});
    const entries=await Promise.all(jobs.map(async ({key,svg})=> {
      const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
      await image.decode();return [key,image];
    }));
    if(revision!==imageRevision) return;
    sprites=Object.fromEntries(entries); invalidate();
  };
  const screenAt=(at,zoom,center)=>m.project(L.latLng(at),zoom).subtract(m.project(center,zoom)).add(m.getSize().divideBy(2));
  // Same easing as Leaflet's zoom CSS. Sprites interpolate position, never size or membership.
  const ease=t=> { let lo=0,hi=1,u=t; for(let i=0;i<14;i++){u=(lo+hi)/2; const x=.75*u*u*(1-u)+u*u*u; if(x<t)lo=u;else hi=u;} return 3*u*u*(1-u)+u*u*u; };
  const point=at=> {
    let p;
    if(tween) {
      const f=ease(Math.min(1,(performance.now()-tween.start)/250));
      const a=screenAt(at,tween.fromZoom,tween.fromCenter), b=screenAt(at,tween.zoom,tween.center);
      p=L.point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);
      if(tiltOn()) { const [x,y]=tiltForward(p.x,p.y); p=L.point(x,y); }
    } else p=m.latLngToContainerPoint(at);
    return p;
  };
  const routeAt=(road,distance)=> {
    let i=road.cum.findIndex(d=>d>distance); if(i<1)i=road.points.length-1;
    const a=road.points[i-1],b=road.points[i], f=(distance-road.cum[i-1])/(road.cum[i]-road.cum[i-1]||1);
    return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
  };
  const visible=()=>document.body.classList.contains('mapmode')&&!document.body.classList.contains('routing')&&!document.hidden;
  function draw(now=performance.now()) {
    frame=0;
    const dt=Math.min(.1,(now-lastTime)/1000); lastTime=now;
    if(visible()) {
      const size=m.getSize(), dpr=Math.min(devicePixelRatio||1,2);
      L.DomUtil.setPosition(canvas,m.containerPointToLayerPoint([0,0]));
      if(canvas.width!==Math.round(size.x*dpr)||canvas.height!==Math.round(size.y*dpr)) {
        canvas.width=Math.round(size.x*dpr); canvas.height=Math.round(size.y*dpr); canvas.style.width=`${size.x}px`; canvas.style.height=`${size.y}px`;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,size.x,size.y);
      const items=layout.map(item=>({...item,p:point(item.at)}));
      for(const [i,car] of traffic.slice(0,settings.cars).entries()) {
        if(!reduced.matches&&!tween) {
          car.distance+=dt*settings.speed*car.dir;
          if(car.distance>car.road.length){car.distance=2*car.road.length-car.distance;car.dir=-1;}
          if(car.distance<0){car.distance=-car.distance;car.dir=1;}
        }
        const p=point(routeAt(car.road,car.distance));
        const q=point(routeAt(car.road,Math.max(0,Math.min(car.road.length,car.distance+car.dir*8))));
        items.push({kind:'car',variant:i%3,width:settings.carSize,p,direction:(Math.round(Math.atan2(q.y-p.y,q.x-p.x)*8/Math.PI)+16)%16});
      }
      items.sort((a,b)=>a.p.y-b.p.y);
      for(const item of items) {
        const {p,width,kind,variant}=item, image=sprites[kind==='car'?`car-${variant}-${item.direction}`:`${kind}-${variant}`];
        if(!image||p.x < -50||p.y < -50||p.x > size.x+50||p.y > size.y+50)continue;
        ctx.save(); ctx.translate(p.x,p.y);
        if(kind==='car') ctx.drawImage(image,-width/2,-width/2,width,width);
        else ctx.drawImage(image,-width/2,-width*.88,width,width);
        ctx.restore();
      }
    }
    if(visible() && (tween||(!reduced.matches&&settings.speed>0&&settings.cars>0&&traffic.length))) frame=requestAnimationFrame(draw);
  }
  function invalidate() { if(!frame)frame=requestAnimationFrame(draw); }
  m.on('move zoom resize viewreset',invalidate);
  m.on('zoomanim',e=> { tween={fromZoom:m.getZoom(),fromCenter:m.getCenter(),zoom:e.zoom,center:e.center,start:performance.now()}; invalidate(); });
  m.on('zoomend',()=> { tween=null; invalidate(); });
  document.addEventListener('visibilitychange',()=>{lastTime=performance.now();invalidate();});
  reduced.addEventListener('change',invalidate);
  const observer=new MutationObserver(invalidate); observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  const apply=(geometry=true)=> {
    try { localStorage.setItem('villageScene:v1',JSON.stringify(settings)); } catch {}
    if(geometry) { layout=villageLayout(settings,roadIndex); canvas.dataset.anchors=JSON.stringify(layout.map(({id,at,width})=>({id,at,width}))); }
    invalidate(); sync();
  };
  let statusText='Loading road routes…';
  const controls=L.control({position:'topright'});
  controls.onAdd=()=> {
    const box=L.DomUtil.create('div','zoompanel villagepanel');
    L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
    const range=(k,label,unit='')=>`<label>${label}<span><input aria-label="${label}" type="range" data-village="${k}" min="${VILLAGE_LIMITS[k][0]}" max="${VILLAGE_LIMITS[k][1]}" step="1"><output data-village-out="${k}"></output><small>${unit}</small></span></label>`;
    box.innerHTML=`<button class="zp-toggle" aria-label="Village scenery" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H3zM9 20v-7h6v7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button><div class="zp-body" hidden>
      <h4>Houses & trees</h4><div class="village-ranges">${range('houses','House count')}${range('trees','Tree count')}${range('houseSize','House size','px')}${range('treeSize','Tree size','px')}${range('spacing','Extra spacing','px')}</div>
      <p class="village-note">Sizes stay fixed while zooming. Spacing and road clearance may limit the number placed.</p><p class="village-placement-status" role="status"></p>
      <h4>Road traffic</h4><div class="village-ranges">${range('cars','Car count')}${range('carSize','Car size','px')}${range('speed','Driving speed','m/s')}</div>
      <p class="village-road-status" role="status"></p><button class="village-retry" type="button">Reload roads</button>
      <h4>Colors</h4><div class="village-theme"><button data-village-theme="light">Light mode</button><button data-village-theme="dark">Dark mode</button></div>
      <p class="village-note">Each mode keeps its own palette.</p><div class="village-colors">${Object.entries({roof:'Orange roofs',wall:'House walls',wood:'Timber',leaves:'Tree foliage',trunk:'Tree trunks',car1:'Car · coral',car2:'Car · teal',car3:'Car · gold'}).map(([k,label])=>`<label>${label}<input aria-label="${label}" type="color" data-village-color="${k}"></label>`).join('')}</div>
      <div class="village-actions"><button data-village-save>Save as defaults</button><button data-village-reset>Reset to defaults</button></div><p class="village-status" role="status">Saved in this browser.</p></div>`;
    box.querySelector('.zp-toggle').onclick=e=> { const body=box.querySelector('.zp-body'); body.hidden=!body.hidden; e.currentTarget.setAttribute('aria-expanded',!body.hidden); };
    box.querySelectorAll('[data-village]').forEach(i=>i.oninput=()=> { settings[i.dataset.village]=+i.value; apply(!['cars','carSize','speed'].includes(i.dataset.village)); });
    box.querySelectorAll('[data-village-color]').forEach(i=>i.oninput=()=> { settings[theme()][i.dataset.villageColor]=i.value; apply(false); loadSprites(); });
    box.querySelectorAll('[data-village-theme]').forEach(b=>b.onclick=()=> { try {localStorage.setItem('themePref',b.dataset.villageTheme);}catch{} applyTheme();syncSettings(); });
    box.querySelector('[data-village-save]').onclick=()=> { try {localStorage.setItem('villageDefaults:v1',JSON.stringify(settings));box.querySelector('.village-status').textContent='Both palettes and scene defaults saved in this browser.';}catch{box.querySelector('.village-status').textContent='Browser storage is unavailable.';} };
    box.querySelector('[data-village-reset]').onclick=()=> { settings=readVillage('villageDefaults:v1',VILLAGE_DEFAULTS);apply();loadSprites();box.querySelector('.village-status').textContent='Defaults restored.'; };
    box.querySelector('.village-retry').onclick=loadRoads;
    return box;
  };
  function sync() {
    const box=controls.getContainer(); if(!box)return;
    box.querySelectorAll('[data-village]').forEach(i=>{i.value=settings[i.dataset.village];box.querySelector(`[data-village-out="${i.dataset.village}"]`).textContent=i.value;});
    box.querySelectorAll('[data-village-color]').forEach(i=>i.value=settings[theme()][i.dataset.villageColor]);
    box.querySelectorAll('[data-village-theme]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.villageTheme===theme()));
    box.querySelector('.village-road-status').textContent=statusText;
    box.querySelector('.village-placement-status').textContent=roadIndex ? `${layout.filter(p=>p.kind==='house').length} houses · ${layout.filter(p=>p.kind==='tree').length} trees placed` : placementError ? 'Scenery unavailable: road outlines could not be loaded.' : 'Checking safe placement areas…';
  }
  async function loadRoads() {
    controls.getContainer().querySelector('.village-retry').disabled=true;
    const loaded=await villageRoads(); roads=loaded.filter(Boolean).map(points=> {
      const cum=[0]; for(let i=1;i<points.length;i++)cum.push(cum[i-1]+m.distance(points[i-1],points[i]));
      return {points,cum,length:cum.at(-1)};
    });
    traffic=roads.length?Array.from({length:4},(_,i)=> {const road=roads[i%roads.length];return {road,dir:i%2?-1:1,distance:road.length*(.12+i*.23)%road.length};}):[];
    statusText=roads.length===2?'Cars follow road routes.':roads.length?'One road route is available.':'Road routes unavailable. Cars are hidden.';
    controls.getContainer().querySelector('.village-retry').disabled=false;sync();invalidate();
  }
  controls.addTo(m); apply(); loadSprites(); loadRoads();
  fetch('data/map-roads.json').then(r=>{if(!r.ok)throw new Error('Road geometry unavailable');return r.json();}).then(data=> {
    if(!Array.isArray(data.roads)||!data.roads.length)throw new Error('No road outlines');
    roadIndex=villageRoadIndex(data.roads);apply();
  }).catch(()=>{placementError=true;sync();});
  document.addEventListener('themechange',()=>{sync();loadSprites();});
}
