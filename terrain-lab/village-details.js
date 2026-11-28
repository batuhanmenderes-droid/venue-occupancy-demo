import * as THREE from 'three';
import { toWorld, randomSeed } from './geo.js';
import { findRiverRoutes } from './water-activity.js';

const box=new THREE.BoxGeometry(1,1,1),stoneGeo=new THREE.CylinderGeometry(1,1,1,7,1),postGeo=new THREE.CylinderGeometry(1,1,1,6,1);
const wood=['#8b6349','#ae8960','#bd9b72','#a67a53'],stones=['#c5c1ac','#adab9c','#d2c8ae','#b7b4a3'];
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const along=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

function batch(scene,geometry,items,name){if(!items.length)return;const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),mesh=new THREE.InstancedMesh(geometry,material,items.length),d=new THREE.Object3D(),c=new THREE.Color();
  items.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.rx||0,p.r||0,p.rz||0);d.scale.set(p.sx,p.sy,p.sz);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);mesh.setColorAt(i,c.set(p.c));});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;scene.add(mesh);}
const item=(x,y,z,sx,sy,sz,c,r=0)=>({x,y,z,sx,sy,sz,c,r});
function localPoint(h,x,z){return[h.x+(x*Math.cos(h.r)+z*Math.sin(h.r))*h.s,h.z+(-x*Math.sin(h.r)+z*Math.cos(h.r))*h.s];}
function beam(out,a,b,y,width,height,color){const length=distance(a,b);if(length>.001)out.push(item((a[0]+b[0])/2,y,(a[1]+b[1])/2,width,height,length,color,Math.atan2(b[0]-a[0],b[1]-a[1])));}

// Examine the real roads for a narrow land-water-land crossing. This preserves
// the actual Azmak alignment instead of drawing a bridge across arbitrary terrain.
function bridgeCrossings(field,roads){
  const [left,top]=toWorld(28.3265,37.0585),[right,bottom]=toWorld(28.357,37.046),crossings=[];
  const near=([x,z])=>x>=left&&x<=right&&z>=top&&z<=bottom;
  for(const road of roads){if(!/^(trunk|trunk_link|primary|secondary|tertiary|residential|unclassified|service|living_street|pedestrian|footway|path)$/.test(road.kind))continue;
    let lastDry=null,waterStart=null;
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],len=distance(a,b);if(len>7){lastDry=null;waterStart=null;continue;}
      const n=Math.max(1,Math.ceil(len/.045));for(let j=0;j<=n;j++){
        const p=along(a,b,j/n);if(!near(p)){lastDry=null;waterStart=null;continue;}
        if(field.isWater(...p)){if(lastDry&&!waterStart)waterStart=lastDry;continue;}
        if(waterStart){const length=distance(waterStart,p),center=along(waterStart,p,.5);if(length>=.09&&length<=1.25&&field.isWater(...center)&&crossings.every(c=>distance(c.center,center)>.95))crossings.push({a:waterStart,b:p,center});waterStart=null;}
        lastDry=p;
      }
    }
  }
  // Some map sources omit minor pedestrian crossings. In that case, add one
  // explicitly decorative footbridge over a navigable river segment with two dry banks.
  if(!crossings.length){for(const route of findRiverRoutes(field).slice(0,2)){
    const p=route.points[Math.floor(route.points.length*.42)],q=route.points[Math.min(route.points.length-1,Math.floor(route.points.length*.42)+1)];if(!p||!q)continue;
    const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
    const bank=sign=>{for(let d=.045;d<.85;d+=.045){const a=[p[0]+nx*d*sign,p[1]+nz*d*sign];if(!field.isWater(...a))return a;}return null;};
    const a=bank(-1),b=bank(1);if(a&&b&&distance(a,b)>.09)crossings.push({a,b,center:p});
  }}return crossings.slice(0,3);
}

export function addVillageDetails(scene,field,local,houses){
  const random=randomSeed(87231),boards=[],posts=[],pavers=[],rounds=[],roofPieces=[],reservations=[];
  const dry=(p)=>!field.isWater(...p),clear=(p)=>dry(p)&&!local.roadMask(...p)&&field.slope(...p)<.35;
  const houseNear=(p,h,margin=.26)=>houses.some(other=>other!==h&&Math.hypot(other.x-p[0],other.z-p[1])<other.s*.52+margin);
  const yAt=p=>Math.max(.014,field.height(...p));
  function cobble(p,s=.07){if(!dry(p))return;const y=yAt(p);pavers.push(item(p[0],y+.039,p[1],s,.038,s*(.7+random()*.35),pick(random,stones),random()*6.28));}
  // Small courtyards and stone paths, linked to nearby geographic streets.
  for(const h of houses){
    const entrance=localPoint(h,0,.53),endpoints=[];for(let d=.26;d<1.0;d+=.13)for(let a=0;a<8;a++){const t=a*Math.PI/4,p=[entrance[0]+Math.cos(t)*d,entrance[1]+Math.sin(t)*d];if(local.roadMask(...p)&&dry(p))endpoints.push(p);}
    const end=endpoints[0]||localPoint(h,0,1.02),n=Math.min(14,Math.max(2,Math.ceil(distance(entrance,end)/.095)));
    for(let i=0;i<=n;i++){const p=along(entrance,end,i/n);if(!houseNear(p,h,.04))cobble(p,.055+random()*.018);}
    // Low picket fences surround selected houses, but never intersect nearby roads or water.
    if(random()>.58)continue;
    const corners=[localPoint(h,-.82,-.80),localPoint(h,.82,-.80),localPoint(h,.82,.88),localPoint(h,-.82,.88)];
    for(let i=0;i<4;i++){
      const a=corners[i],b=corners[(i+1)%4],segments=Math.max(2,Math.ceil(distance(a,b)/.115));
      for(let j=0;j<segments;j++){
        const p=along(a,b,j/segments),q=along(a,b,(j+1)/segments);if(i===2&&Math.abs(j/segments-.5)<.19)continue;
        if(!clear(p)||!clear(q)||houseNear(p,h,.055)||houseNear(q,h,.055))continue;
        const y=(yAt(p)+yAt(q))/2;posts.push(item(p[0],yAt(p)+.105,p[1],.035,.22,.035,pick(random,wood)));
        beam(boards,p,q,y+.13,.027,.032,'#b08c66');beam(boards,p,q,y+.062,.025,.025,'#9c7957');
      }
    }
  }
  for(const cross of bridgeCrossings(field,local.roads)){
    const dx=cross.b[0]-cross.a[0],dz=cross.b[1]-cross.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,angle=Math.atan2(dx,dz);
    const start=[cross.a[0]-dx/len*.09,cross.a[1]-dz/len*.09],end=[cross.b[0]+dx/len*.09,cross.b[1]+dz/len*.09],length=distance(start,end),width=.28,n=Math.max(5,Math.ceil(length/.062));
    const base=Math.max(.13,yAt(start),yAt(end)),deck=t=>base+.11*Math.sin(Math.PI*t);
    reservations.push({x:cross.center[0],z:cross.center[1],r:length*.5+.22});
    for(let i=0;i<n;i++){
      const t=(i+.5)/n,p=along(start,end,t),y=deck(t);boards.push(item(p[0],y,p[1],width,.048,length/n*.96,pick(random,wood),angle));
      if(i%3===0||i===n-1)for(const sign of [-1,1]){const q=[p[0]+nx*width*.43*sign,p[1]+nz*width*.43*sign];posts.push(item(q[0],y+.085,q[1],.036,.17,.036,'#795b47'));}
      if(i<n-1)for(const sign of [-1,1]){const a=along(start,end,i/n),b=along(start,end,(i+1)/n),q=[a[0]+nx*width*.44*sign,a[1]+nz*width*.44*sign],r=[b[0]+nx*width*.44*sign,b[1]+nz*width*.44*sign];beam(boards,q,r,deck(t)+.15,.027,.032,'#ae8862');}
    }
    for(const t of [.22,.78]){const p=along(start,end,t);for(const side of [-1,1]){const x=p[0]+nx*.10*side,z=p[1]+nz*.10*side,h=deck(t)+.10;posts.push(item(x,h*.50-.015,z,.038,h,.038,'#755644'));}}
  }
  // A few small hand-built village-square wells. Place on open, flat dry ground,
  // away from buildings, roads and shorelines; they are scenic set dressing.
  const wellSites=[toWorld(28.3265,37.0539),toWorld(28.341,37.055),toWorld(28.3579,37.0268)];
  for(const center of wellSites){let spot=null;
    for(let i=0;i<340;i++){const a=random()*Math.PI*2,d=.25+Math.sqrt(random())*2.5,p=[center[0]+Math.cos(a)*d,center[1]+Math.sin(a)*d];if(!clear(p)||houseNear(p,null,.47)||field.distance(...p)<1.8||field.slope(...p)>.17)continue;spot=p;break;}
    if(!spot)continue;const [x,z]=spot,y=yAt(spot),radius=.18;reservations.push({x,z,r:.70});
    for(let r=.28;r<.65;r+=.115){const count=Math.round(r*38);for(let i=0;i<count;i++){const a=i/count*6.283,c=[x+Math.cos(a)*r,z+Math.sin(a)*r];if(clear(c)&&!houseNear(c,null,.08))cobble(c,.075);}}
    // Individual stone masonry blocks, a dark opening, two timbers and a pitched wooden canopy.
    for(let row=0;row<3;row++)for(let i=0;i<12;i++){const a=(i+(row%2)*.5)/12*6.283;boards.push(item(x+Math.cos(a)*radius,y+.04+row*.07,z+Math.sin(a)*radius,.086,.065,.104,pick(random,stones),-a));}
    rounds.push(item(x,y+.025,z,.137,.035,.137,'#354e4e'));
    for(const side of [-1,1])posts.push(item(x+side*.20,y+.265,z,.043,.40,.043,'#83644b'));
    beam(boards,[x-.22,z],[x+.22,z],y+.39,.046,.048,'#987856');
    for(const side of [-1,1]){const p=item(x,y+.53,z+side*.099,.53,.035,.25,'#bd8162');p.rx=side*.48;roofPieces.push(p);}
    rounds.push(item(x+.29,y+.075,z+.06,.075,.13,.075,'#967655'));
    for(const side of [-1,1]){const a=[x-.19,z+side*.48],b=[x+.19,z+side*.48];if(clear(a)&&clear(b)){beam(boards,a,b,y+.10,.10,.05,'#ad8b62');for(const p of [a,b])posts.push(item(p[0],y+.045,p[1],.045,.09,.045,'#846247'));}}
  }
  batch(scene,box,boards,'Village fences, stone masonry and timber bridges');batch(scene,postGeo,posts,'Village timber posts');batch(scene,stoneGeo,pavers,'Village hand-laid paving');batch(scene,stoneGeo,rounds,'Village wells and barrels');batch(scene,box,roofPieces,'Well roof');
  return reservations;
}

export function addChimneySmoke(scene,houses){
  const random=randomSeed(833),positions=[],phases=[],sizes=[];
  for(const h of houses){if(random()>.26)continue;const [x,z]=localPoint(h,.26,-.17);for(let i=0;i<5;i++){positions.push(x,h.y+h.s*.94,z);phases.push((i+random()*.6)/5);sizes.push(.75+random()*.65);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));geometry.setAttribute('puffSize',new THREE.Float32BufferAttribute(sizes,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},pixelRatio:{value:1},zoom:{value:1},tint:{value:new THREE.Color('#f6eed9')},opacity:{value:1}},vertexShader:`attribute float phase,puffSize;uniform float time,pixelRatio,zoom,opacity;varying float alpha;void main(){float age=fract(phase+time*.25);vec3 p=position;p.x+=age*.49+sin(age*7.+phase*17.)*.045;p.z+=age*.18;p.y+=age*.84;alpha=sin(age*3.14159)*.26*opacity;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((3.5+age*13.)*puffSize*pixelRatio*sqrt(zoom),2.,35.);}`,fragmentShader:`uniform vec3 tint;varying float alpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.02,.5,d))*alpha;if(a<.006)discard;gl_FragColor=vec4(tint,a);}`});
  const smoke=new THREE.Points(geometry,material);smoke.name='Animated chimney smoke';scene.add(smoke);return smoke;
}
