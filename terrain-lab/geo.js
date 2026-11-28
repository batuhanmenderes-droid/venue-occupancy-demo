import { decodeTile } from './vector-reader.js';

// All geometry, vegetation, roads and points use the same Web Mercator coordinates.
export const BOUNDS = { west: 28.285, east: 28.393, south: 37.008, north: 37.083 };
export const WIDTH = 96;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
export const mercator = (lon,lat) => [ (lon+180)/360, (1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2 ];
const [left,top] = mercator(BOUNDS.west,BOUNDS.north);
const [right,bottom] = mercator(BOUNDS.east,BOUNDS.south);
export const DEPTH = WIDTH * (bottom-top)/(right-left);
export function toWorld(lon,lat) { const [u,v] = mercator(lon,lat); return [((u-left)/(right-left)-.5)*WIDTH, ((v-top)/(bottom-top)-.5)*DEPTH]; }
export function worldUV(x,z) { return [x/WIDTH+.5,z/DEPTH+.5]; }
function uvMerc(x,z) { const [u,v]=worldUV(x,z); return [left+u*(right-left),top+v*(bottom-top)]; }
export function randomSeed(seed=761) { let t=seed|0; return () => { t+=0x6D2B79F5; let r=Math.imul(t^t>>>15,t|1);r^=r+Math.imul(r^r>>>7,r|61);return ((r^r>>>14)>>>0)/4294967296; }; }
const fract = n => n-Math.floor(n);
const hash = (x,z) => fract(Math.sin(x*127.1+z*311.7+13.7)*43758.5453123);
const smooth = x => x*x*(3-2*x);
export function noise(x,z) { const ix=Math.floor(x),iz=Math.floor(z),u=smooth(x-ix),v=smooth(z-iz); return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v; }
export function fbm(x,z) { return noise(x,z)*.55+noise(x*2.03,z*2.03)*.27+noise(x*4.06,z*4.06)*.13+noise(x*8.12,z*8.12)*.05; }

function tilesIn(z) { const n=2**z, list=[]; for(let y=Math.floor(top*n);y<=Math.floor(bottom*n);y++) for(let x=Math.floor(left*n);x<=Math.floor(right*n);x++) list.push({x,y,z});return list; }
async function fetchTimeout(url,ms=14000) { const ct=new AbortController(),timer=setTimeout(()=>ct.abort(),ms);try{const res=await fetch(url,{signal:ct.signal});if(!res.ok)throw new Error(`${res.status}: ${url}`);return res;}finally{clearTimeout(timer);} }

// Real Terrarium-encoded DEM. The fallback is explicitly labelled as an artistic approximation.
// The global Mapterhorn archive includes z0–12 (30 m native elevation in Turkey).
const ELEVATION_Z = 12;
export async function loadElevation() {
  const tiles = new Map(), jobs=tilesIn(ELEVATION_Z);
  await Promise.allSettled(jobs.map(async ({x,y,z}) => {
    const response=await fetchTimeout(`https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`);
    const bitmap=await createImageBitmap(await response.blob());
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
    const data=ctx.getImageData(0,0,canvas.width,canvas.height);
    const height=new Float32Array(data.width*data.height);
    for(let i=0,j=0;i<data.data.length;i+=4,j++)height[j]=data.data[i]*256+data.data[i+1]+data.data[i+2]/256-32768;
    tiles.set(`${x}/${y}`,{height,w:data.width,h:data.height});
  }));
  const sample=(x,z) => {
    const [u,v]=uvMerc(x,z),n=2**ELEVATION_Z,tx=u*n,ty=v*n,ix=Math.floor(tx),iy=Math.floor(ty),tile=tiles.get(`${ix}/${iy}`);
    if(!tile)return approximateElevation(x,z);
    const sx=clamp((tx-ix)*tile.w-.5,0,tile.w-1),sy=clamp((ty-iy)*tile.h-.5,0,tile.h-1),a=Math.floor(sx),b=Math.floor(sy),c=Math.min(tile.w-1,a+1),d=Math.min(tile.h-1,b+1),fx=sx-a,fy=sy-b,h=tile.height;
    return (h[b*tile.w+a]*(1-fx)+h[b*tile.w+c]*fx)*(1-fy)+(h[d*tile.w+a]*(1-fx)+h[d*tile.w+c]*fx)*fy;
  };
  return {sample, complete:tiles.size===jobs.length, loaded:tiles.size,total:jobs.length};
}
function approximateElevation(x,z) {
  // No invented claim of accurate elevations: just a coastal basin and northern ridges.
  const bump=(cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
  const base=bump(-24,-32,28,12,580)+bump(12,-37,22,15,720)+bump(43,-28,19,18,410)+bump(52,27,18,23,370)+bump(23,44,24,15,160);
  const ridge=.68+fbm(x*.16,z*.19)*.6+Math.abs(noise(x*.32,z*.3)-.5)*.3;
  return Math.max(1,base*ridge+(fbm(x*.22,z*.22)-.3)*Math.min(28,base*.1));
}
export const previewElevation = () => ({sample:approximateElevation,complete:false,loaded:0,total:0});

const MASK=1536;
function canvasMask() { const c=document.createElement('canvas');c.width=c.height=MASK;return c; }
function pathGeo(ctx,coordinates,close=true) { ctx.beginPath();for(const ring of coordinates){ring.forEach(([lon,lat],i)=>{const [x,z]=toWorld(lon,lat),[u,v]=worldUV(x,z);if(i)ctx.lineTo(u*MASK,v*MASK);else ctx.moveTo(u*MASK,v*MASK);});if(close)ctx.closePath();} }
function fillGeo(canvas,ring){const c=canvas.getContext('2d');c.fillStyle='#fff';pathGeo(c,[ring]);c.fill('evenodd');}
function fallbackMasks() {
  const water=canvasMask(),forest=canvasMask(),wetland=canvasMask();
  // Approximate geographically oriented shoreline, used only when vector tiles are unavailable.
  fillGeo(water,[[28.28,37.008],[28.28,37.046],[28.292,37.0488],[28.303,37.0491],[28.312,37.0504],[28.324,37.0501],[28.328,37.047],[28.3302,37.0405],[28.3314,37.0367],[28.3336,37.032],[28.3378,37.026],[28.3425,37.019],[28.3463,37.012],[28.350,37.005]]);
  const ctx=water.getContext('2d');ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
  pathGeo(ctx,[[[28.3276,37.0495],[28.332,37.051],[28.337,37.052],[28.342,37.051],[28.346,37.053],[28.352,37.055]]],false);ctx.stroke();
  ctx.lineWidth=4;pathGeo(ctx,[[[28.332,37.033],[28.343,37.0335],[28.347,37.0347],[28.353,37.0327],[28.36,37.0338],[28.369,37.0361]]],false);ctx.stroke();
  fillGeo(forest,[[28.282,37.055],[28.305,37.058],[28.328,37.06],[28.349,37.063],[28.37,37.059],[28.4,37.052],[28.4,37.09],[28.282,37.09]]);
  fillGeo(forest,[[28.37,37.008],[28.4,37.008],[28.4,37.048],[28.38,37.041],[28.372,37.025]]);
  fillGeo(wetland,[[28.329,37.046],[28.342,37.046],[28.35,37.039],[28.357,37.035],[28.349,37.024],[28.342,37.024],[28.333,37.036]]);
  return {water,forest,wetland};
}
function tileRect({x,y,z}) { const n=2**z;return [(x/n-left)/(right-left)*MASK,(y/n-top)/(bottom-top)*MASK,MASK/(n*(right-left)),MASK/(n*(bottom-top))]; }
function paintFeature(canvas,feature,tile,stroke=0) {
  if(!feature.extent)return; const ctx=canvas.getContext('2d'),[ax,ay,w,h]=tileRect(tile),geometry=feature.loadGeometry();
  ctx.save();ctx.beginPath();ctx.rect(ax,ay,w,h);ctx.clip();ctx.beginPath();
  for(const ring of geometry){ring.forEach((p,i)=>{const x=ax+p.x/feature.extent*w,y=ay+p.y/feature.extent*h;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});if(!stroke)ctx.closePath();}
  ctx.fillStyle=ctx.strokeStyle='#fff';ctx.lineJoin=ctx.lineCap='round';
  if(stroke){ctx.lineWidth=stroke;ctx.stroke();}else ctx.fill('evenodd');ctx.restore();
}
function maskSampler(canvas){const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,MASK,MASK).data;return (x,z)=>{const [u,v]=worldUV(x,z);if(u<0||v<0||u>1||v>1)return false;return pixels[(clamp(Math.floor(v*(MASK-1)),0,MASK-1)*MASK+clamp(Math.floor(u*(MASK-1)),0,MASK-1))*4+3]>100;};}
// The shoreline is rendered from this independently sampled, rounded high-resolution mask,
// rather than the much coarser DEM mesh. A small original-mask contribution retains narrow rivers.
function smoothWaterGeometry(original,radiusMeters){
  const canvas=canvasMask(),ctx=canvas.getContext('2d',{willReadFrequently:true}),radius=radiusMeters/(WIDTH*100/MASK);ctx.filter=radius>0?`blur(${radius}px)`:'none';ctx.drawImage(original,0,0);ctx.filter='none';
  const blurred=ctx.getImageData(0,0,MASK,MASK),source=original.getContext('2d').getImageData(0,0,MASK,MASK);
  for(let i=3;i<blurred.data.length;i+=4)blurred.data[i]=Math.round(blurred.data[i]*.76+source.data[i]*.24);
  ctx.putImageData(blurred,0,0);
  const threshold=110,pixels=blurred.data;
  const water=(x,z)=>{const [u,v]=worldUV(x,z);if(u<0||v<0||u>1||v>1)return false;return pixels[(Math.round(v*(MASK-1))*MASK+Math.round(u*(MASK-1)))*4+3]>=threshold;};
  // Continuous signed distance: below water is negative, above water positive. Sampling
  // this field before triangulation eases the physical shore slope on both sides.
  const n=768,small=document.createElement('canvas');small.width=small.height=n;const sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(canvas,0,0,n,n);const data=sc.getImageData(0,0,n,n).data,wet=new Uint8Array(n*n),landDist=new Float32Array(n*n),waterDist=new Float32Array(n*n);
  for(let i=0;i<wet.length;i++){wet[i]=data[i*4+3]>=threshold?1:0;landDist[i]=wet[i]?1e6:0;waterDist[i]=wet[i]?0:1e6;}
  const relax=(d)=>{for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;if(i)d[k]=Math.min(d[k],d[k-1]+1);if(j){d[k]=Math.min(d[k],d[k-n]+1);if(i)d[k]=Math.min(d[k],d[k-n-1]+1.414);if(i<n-1)d[k]=Math.min(d[k],d[k-n+1]+1.414);}}
    for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;if(i<n-1)d[k]=Math.min(d[k],d[k+1]+1);if(j<n-1){d[k]=Math.min(d[k],d[k+n]+1);if(i<n-1)d[k]=Math.min(d[k],d[k+n+1]+1.414);if(i)d[k]=Math.min(d[k],d[k+n-1]+1.414);}}};
  relax(landDist);relax(waterDist);
  const sdf=new Float32Array(n*n);for(let i=0;i<sdf.length;i++)sdf[i]=(wet[i]?-(landDist[i]-.5):(waterDist[i]-.5))*WIDTH/n;
  const signedDistance=(x,z)=>{const[u,v]=worldUV(x,z),fx=clamp(u*(n-1),0,n-1),fy=clamp(v*(n-1),0,n-1),a=Math.floor(fx),b=Math.floor(fy),c=Math.min(n-1,a+1),d=Math.min(n-1,b+1),tx=fx-a,ty=fy-b;return (sdf[b*n+a]*(1-tx)+sdf[b*n+c]*tx)*(1-ty)+(sdf[d*n+a]*(1-tx)+sdf[d*n+c]*tx)*ty;};
  return {water,waterCanvas:canvas,signedDistance};
}
function geographyFromMasks(masks,complete,radiusMeters=20){return {...smoothWaterGeometry(masks.water,radiusMeters),forest:maskSampler(masks.forest),wetland:maskSampler(masks.wetland),complete,radiusMeters,withShoreRadius:meters=>geographyFromMasks(masks,complete,meters)};}
export function previewGeography(){return geographyFromMasks(fallbackMasks(),false);}
export async function loadGeography() {
  let masks=fallbackMasks(),complete=false,waterFeatures=0;
  try {
    const style=await (await fetchTimeout('https://tiles.openfreemap.org/styles/liberty')).json();
    const source=Object.values(style.sources).find(s=>s.type==='vector');
    if(!source)throw new Error('No vector source');
    const json=source.url?await (await fetchTimeout(source.url)).json():source;
    const z=Math.min(13,json.maxzoom??13),jobs=tilesIn(z),template=json.tiles[0];
    const next={water:canvasMask(),forest:canvasMask(),wetland:canvasMask()};
    const results=await Promise.allSettled(jobs.map(async tile=>{
      const url=template.replace('{z}',tile.z).replace('{x}',tile.x).replace('{y}',tile.y);
      const tileData=decodeTile(await (await fetchTimeout(url)).arrayBuffer());
      for(const [name,layer] of Object.entries(tileData.layers)) {
        if(!['water','waterway','landcover','landuse'].includes(name))continue;
        for(let i=0;i<layer.length;i++){
          const f=layer.feature(i),kind=String(f.properties.class||f.properties.subclass||'');
          if(name==='water'&&f.type===3){paintFeature(next.water,f,tile);waterFeatures++;}
          else if(name==='waterway'&&f.type===2&&/river|canal/.test(kind))paintFeature(next.water,f,tile,kind==='river'?4:2);
          else if(f.type===3&&/wood|forest/.test(kind))paintFeature(next.forest,f,tile);
          else if(f.type===3&&/wetland|marsh|reed/.test(kind))paintFeature(next.wetland,f,tile);
        }
      }
    }));
    if(results.every(r=>r.status==='fulfilled')&&waterFeatures>0){masks=next;complete=true;}
  }catch(e){console.info('OpenFreeMap fallback:',e.message);}
  return geographyFromMasks(masks,complete);
}

export async function loadLocalMaps() {
  const [roads,venues]=await Promise.all([fetch('./data/map-roads.json').then(r=>r.json()),fetch('./data/venues.json').then(r=>r.json())]);
  const mask=canvasMask(),ctx=mask.getContext('2d');ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#fff';
  const paths=roads.roads.map(r=>({kind:r.kind,points:r.points.map(([lat,lon])=>toWorld(lon,lat))}));
  for(const road of paths){ctx.beginPath();road.points.forEach(([x,z],i)=>{const[u,v]=worldUV(x,z);if(i)ctx.lineTo(u*MASK,v*MASK);else ctx.moveTo(u*MASK,v*MASK);});ctx.lineWidth=/trunk|primary|secondary/.test(road.kind)?6:3.4;ctx.stroke();}
  return {roads:paths,roadMask:maskSampler(mask),venues:venues.venues.filter(v=>v.location)};
}
