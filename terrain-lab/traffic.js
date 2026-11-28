import * as THREE from 'three';
import { WIDTH, DEPTH, randomSeed } from './geo.js';

const driveable=/^(trunk|trunk_link|motorway|primary|secondary|tertiary|residential|unclassified|living_street|service)$/;
const mainRoad=/trunk|motorway|primary|secondary/;
const key=(p)=>`${Math.round(p[0]*40)},${Math.round(p[1]*40)}`;

// Retain the actual OSM polylines. Split where a road leaves this map (or crosses
// invalid water geometry) and connect only endpoints in the same geographic cell.
export function createRoadNetwork(paths,field){
  const routes=[],nodes=new Map();
  const inside=([x,z])=>Math.abs(x)<WIDTH/2-.15&&Math.abs(z)<DEPTH/2-.15&&!field.isWater(x,z);
  const register=(points,kind)=>{
    if(points.length<2)return;const cumulative=[0];let length=0;
    for(let i=1;i<points.length;i++){length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);cumulative.push(length);}
    if(length<.14)return;
    const route={points,cumulative,length,kind,major:mainRoad.test(kind),start:key(points[0]),end:key(points.at(-1))};routes.push(route);
    for(const [node,dir] of [[route.start,1],[route.end,-1]]){if(!nodes.has(node))nodes.set(node,[]);nodes.get(node).push({route,dir});}
  };
  for(const road of paths){if(!driveable.test(road.kind))continue;let section=[];
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length||length>12){register(section,road.kind);section=[];continue;}
      // Sample long segments to check the exact rendered shoreline, not only endpoints.
      const count=Math.max(1,Math.ceil(length/.14));for(let j=0;j<=count;j++){
        const t=j/count,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        if(!inside(p)){register(section,road.kind);section=[];continue;}
        const prev=section.at(-1);if(!prev||Math.hypot(prev[0]-p[0],prev[1]-p[1])>.001)section.push(p);
      }
    }register(section,road.kind);
  }return {routes,nodes};
}

function pointAt(route,distance){
  const d=Math.max(0,Math.min(route.length,distance));let lo=0,hi=route.cumulative.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(route.cumulative[m]<=d)lo=m;else hi=m;}
  const a=route.points[lo],b=route.points[hi],f=(d-route.cumulative[lo])/(route.cumulative[hi]-route.cumulative[lo]||1);
  return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f};
}

export function addTraffic(world,field,roads){
  const rand=randomSeed(40513),network=createRoadNetwork(roads,field),routes=network.routes.filter(r=>r.length>1.1),cap=50;
  if(!routes.length)return {setCount(){},setSpeed(){},setNight(){},update(){}};
  const major=routes.filter(r=>r.major),palette=['#e7c279','#e2e4dc','#c75b43','#538b9d','#a2b65c','#aab1be','#df9560'];
  const cars=Array.from({length:cap},(_,i)=>{
    const pool=i%3!==2&&major.length?major:routes,route=pool[Math.floor(rand()*pool.length)],dir=rand()>.5?1:-1;
    return {route,dir,distance:rand()*route.length,speed:.18+rand()*.17,color:palette[Math.floor(rand()*palette.length)],size:.84+rand()*.20,angle:undefined};
  });
  const geo=new THREE.BoxGeometry(1,1,1),bodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.78}),glassMat=new THREE.MeshStandardMaterial({color:'#385369',roughness:.45}),tireMat=new THREE.MeshStandardMaterial({color:'#23312c',roughness:1}),lightMat=new THREE.MeshStandardMaterial({color:'#f7e8ae',emissive:'#b9a76c',emissiveIntensity:.32,roughness:.5});
  const parts=[
    {mat:tireMat,x:0,y:.038,z:.072,sx:.146,sy:.055,sz:.057},
    {mat:tireMat,x:0,y:.038,z:-.081,sx:.146,sy:.055,sz:.057},
    {mat:bodyMat,x:0,y:.071,z:0,sx:.144,sy:.072,sz:.302,colored:true},
    {mat:glassMat,x:0,y:.132,z:-.016,sx:.117,sy:.061,sz:.153},
    {mat:bodyMat,x:0,y:.155,z:-.025,sx:.114,sy:.018,sz:.114,colored:true},
    {mat:lightMat,x:-.041,y:.08,z:.153,sx:.035,sy:.021,sz:.012},
    {mat:lightMat,x:.041,y:.08,z:.153,sx:.035,sy:.021,sz:.012},
  ];
  const meshes=parts.map(part=>{
    const m=new THREE.InstancedMesh(geo,part.mat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.receiveShadow=true;m.castShadow=false;m.name='Animated road traffic';
    if(part.colored)cars.forEach((c,i)=>m.setColorAt(i,new THREE.Color(c.color)));world.add(m);return m;
  });
  // Each headlamp projects a soft warm cone over the actual terrain in its travel direction.
  // Dynamic ground-following triangles keep the lights inexpensive even with fifty cars.
  const beamSections=7,verticesPerLamp=(beamSections-1)*12,beamCapacity=cap*2*verticesPerLamp;
  const beamPositions=new Float32Array(beamCapacity*3),beamAlphas=new Float32Array(beamCapacity),beamGeometry=new THREE.BufferGeometry();
  beamGeometry.setAttribute('position',new THREE.BufferAttribute(beamPositions,3).setUsage(THREE.DynamicDrawUsage));beamGeometry.setAttribute('beamAlpha',new THREE.BufferAttribute(beamAlphas,1).setUsage(THREE.DynamicDrawUsage));
  const beamMaterial=new THREE.ShaderMaterial({uniforms:{night:{value:0},tint:{value:new THREE.Color('#ffd078')},extent:{value:new THREE.Vector2(WIDTH,DEPTH)}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:`attribute float beamAlpha;varying float a;varying vec2 worldPos;void main(){a=beamAlpha;worldPos=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float night;uniform vec3 tint;uniform vec2 extent;varying float a;varying vec2 worldPos;void main(){if(abs(worldPos.x)>extent.x*.5||worldPos.y>extent.y*.5||worldPos.y< -extent.y*.5+7.)discard;gl_FragColor=vec4(tint,a*night);}`});
  const beamMesh=new THREE.Mesh(beamGeometry,beamMaterial);beamMesh.name='Night vehicle headlight beams';beamMesh.frustumCulled=false;beamMesh.renderOrder=5;beamMesh.visible=false;world.add(beamMesh);
  let active=26,speedScale=1,night=0;const dummy=new THREE.Object3D();
  function nextRoad(car){
    const endpoint=car.dir>0?car.route.end:car.route.start,links=(network.nodes.get(endpoint)||[]).filter(l=>l.route!==car.route);
    if(links.length){const choice=links[Math.floor(rand()*links.length)];car.route=choice.route;car.dir=choice.dir;car.distance=choice.dir>0?0:choice.route.length;}
    else{car.dir*=-1;car.distance=car.dir>0?0:car.route.length;}
  }
  function advance(car,dt){let remaining=dt*car.speed*speedScale*(car.route.major?1.15:.72),guard=0;
    while(remaining>0&&guard++<16){const available=car.dir>0?car.route.length-car.distance:car.distance;if(remaining<=available){car.distance+=car.dir*remaining;break;}remaining-=available;nextRoad(car);}
    const p=pointAt(car.route,car.distance),one=pointAt(car.route,Math.max(0,car.distance-.09)),two=pointAt(car.route,Math.min(car.route.length,car.distance+.09));
    const dx=(two.x-one.x)*car.dir,dz=(two.z-one.z)*car.dir,angle=Math.atan2(dx,dz);car.angle=angle;
    const lane=car.route.major?.038:.012,x=p.x+Math.cos(angle)*lane,z=p.z-Math.sin(angle)*lane,s=car.size*(car.route.major?1:.80),y=Math.max(.045,field.height(x,z)+.047);
    return {x,y,z,angle,s};
  }
  function update(dt){
    let offset=0;const write=(v)=>{beamPositions[offset*3]=v.x;beamPositions[offset*3+1]=v.y;beamPositions[offset*3+2]=v.z;beamAlphas[offset++]=v.a;};
    function lamp(p,cos,sin,side){const s=p.s,originX=p.x+(.041*side*cos+.155*sin)*s,originZ=p.z+(-.041*side*sin+.155*cos)*s,length=1.04*s;
      const point=(section,edge)=>{const t=section/(beamSections-1),d=t*length,width=(.018+.16*t)*s,lateral=edge*width,x=originX+sin*d+cos*lateral,z=originZ+cos*d-sin*lateral;return{x,y:Math.max(.055,field.height(x,z)+.074),z,a:edge===0?Math.pow(1-t,1.4)*(.65+.35*Math.sin(t*Math.PI))*.60:0};};
      for(let j=0;j<beamSections-1;j++)for(const edge of [-1,0]){const a=point(j,edge),b=point(j,edge+1),c=point(j+1,edge),d=point(j+1,edge+1);write(a);write(c);write(b);write(b);write(c);write(d);}
    }
    for(let i=0;i<active;i++){const p=advance(cars[i],dt),cos=Math.cos(p.angle),sin=Math.sin(p.angle);for(let k=0;k<parts.length;k++){const part=parts[k],s=p.s;dummy.position.set(p.x+(part.x*cos+part.z*sin)*s,p.y+part.y*s,p.z+(-part.x*sin+part.z*cos)*s);dummy.rotation.set(0,p.angle,0);dummy.scale.set(part.sx*s,part.sy*s,part.sz*s);dummy.updateMatrix();meshes[k].setMatrixAt(i,dummy.matrix);}if(night>.005){lamp(p,cos,sin,-1);lamp(p,cos,sin,1);}}
    for(const m of meshes){m.count=active;m.instanceMatrix.needsUpdate=true;}
    beamGeometry.setDrawRange(0,offset);if(night>.005){beamGeometry.attributes.position.needsUpdate=true;beamGeometry.attributes.beamAlpha.needsUpdate=true;}
  }
  update(0);
  return {setCount(n){active=Math.min(cap,Math.max(0,Math.round(n)));update(0);},setSpeed(n){speedScale=Math.max(0,n/100);},setNight(n){night=n;beamMaterial.uniforms.night.value=n;beamMesh.visible=n>.005;lightMat.emissiveIntensity=.10+2.2*n;},update};
}
