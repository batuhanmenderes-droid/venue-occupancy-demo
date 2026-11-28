import * as THREE from 'three';
import { toWorld, randomSeed } from './geo.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,8,6);
function mesh(parent,geometry,material,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
function line(parent,points,color,opacity){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));parent.add(l);return l;}
function makeWake(parent,length=.45,width=.10){return line(parent,[[0,.016,-.09],[-width,.016,-length],[0,.016,-.09],[width,.016,-length],[-width*.35,.016,-length*.47],[-width*.65,.016,-length*.78],[width*.35,.016,-length*.47],[width*.65,.016,-length*.78]],'#ddf7ef',.65);}

function routeFrom(points){const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));return {points,cumulative,length:cumulative.at(-1)};}
function along(route,d){d=Math.max(0,Math.min(route.length,d));let lo=0,hi=route.cumulative.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(route.cumulative[m]<=d)lo=m;else hi=m;}const a=route.points[lo],b=route.points[hi],t=(d-route.cumulative[lo])/(route.cumulative[hi]-route.cumulative[lo]||1);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function heading(route,d,dir){const a=along(route,d-.055),b=along(route,d+.055);return Math.atan2((b[0]-a[0])*dir,(b[1]-a[1])*dir);}
function safeSegment(a,b,field,clearance=.005){const n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.035));for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(!field.isWater(x,z)||field.shoreDistance(x,z)>-clearance)return false;}return true;}

// Trace navigable sections from the actual rasterized Azmak water polygon. The
// fallback artist geography uses exactly the same route finder, not invented dry-land routes.
export function findRiverRoutes(field){
  const [left,top]=toWorld(28.3281,37.0577),[right,bottom]=toWorld(28.354,37.0467),step=.065,nx=Math.ceil((right-left)/step)+1,nz=Math.ceil((bottom-top)/step)+1,n=nx*nz;
  const wet=new Uint8Array(n),clearance=new Float32Array(n),seen=new Uint8Array(n);
  const at=id=>[left+(id%nx)*step,top+Math.floor(id/nx)*step];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const id=j*nx+i,x=left+i*step,z=top+j*step,d=-field.shoreDistance(x,z);if(field.isWater(x,z)&&d>.012&&d<1.2){wet[id]=1;clearance[id]=d;}}
  const neighbors=id=>{const x=id%nx,z=Math.floor(id/nx),list=[];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const a=x+dx,b=z+dz;if(a<0||a>=nx||b<0||b>=nz)continue;const next=b*nx+a;if(!wet[next])continue;if(dx&&dz&&!wet[z*nx+a]&&!wet[b*nx+x])continue;list.push(next);}return list;};
  const components=[];for(let start=0;start<n;start++){if(!wet[start]||seen[start])continue;const queue=[start];seen[start]=1;let lo=start,hi=start;
    for(let p=0;p<queue.length;p++){const id=queue[p];if(id%nx<lo%nx)lo=id;if(id%nx>hi%nx)hi=id;for(const next of neighbors(id))if(!seen[next]){seen[next]=1;queue.push(next);}}
    if(queue.length>9&&hi%nx-lo%nx>5)components.push({lo,hi,extent:hi%nx-lo%nx,size:queue.length});
  }
  components.sort((a,b)=>b.extent-a.extent||b.size-a.size);
  const routes=[];for(const component of components.slice(0,4)){
    const parent=new Int32Array(n);parent.fill(-1);const queue=[component.lo];parent[component.lo]=component.lo;
    for(let p=0;p<queue.length&&parent[component.hi]<0;p++){const id=queue[p],adj=neighbors(id).sort((a,b)=>clearance[b]-clearance[a]);for(const next of adj)if(parent[next]===-1){parent[next]=id;queue.push(next);}}
    if(parent[component.hi]<0)continue;
    const path=[];for(let id=component.hi;;id=parent[id]){path.push(at(id));if(id===component.lo)break;}path.reverse();
    const points=[path[0]];for(let i=0;i<path.length-1;){let j=Math.min(i+10,path.length-1);while(j>i+1&&!safeSegment(path[i],path[j],field,.009))j--;points.push(path[j]);i=j;}
    const route=routeFrom(points);if(route.length>.35)routes.push(route);
  }
  return routes;
}

function kiteRoutes(field){
  const [x,z]=toWorld(28.3294399,37.037453),r=randomSeed(4052),routes=[];
  for(let i=0;i<480&&routes.length<24;i++){
    const cx=x-1.2-r()*6.5,cz=z+(r()-.5)*6.8,span=5.2+r()*5.7,drift=.4+r()*2.2;
    const a=[cx-drift*.5,cz-span*.5],b=[cx+drift*.5,cz+span*.5];
    if(safeSegment(a,b,field,.23))routes.push(routeFrom([a,b]));
  }
  // Where the shoreline bends sharply, keep a shorter but still extended water-only fallback.
  if(!routes.length)for(let i=0;i<180&&routes.length<24;i++){
    const cx=x-1.2-r()*6.5,cz=z+(r()-.5)*5.8,span=3.5+r()*2.5;
    const a=[cx,cz-span*.5],b=[cx+.5,cz+span*.5];if(safeSegment(a,b,field,.23))routes.push(routeFrom([a,b]));
  }
  return routes;
}

function kiteCanopy(color){
  const colors=[new THREE.Color(color),new THREE.Color('#eef1e3'),new THREE.Color(color).multiplyScalar(.64)],pos=[],rgb=[];
  // Broad swept C-shaped canopy, with individually coloured sail panels.
  const point=(i,inner)=>{const t=i/10*2-1,x=t*.29,y=(1-t*t)*.145-(inner?.096*(1-Math.abs(t)*.65):0),z=(1-t*t)*.065;return [x,y,z];};
  for(let i=0;i<10;i++){const c=colors[i===4||i===5?1:i%3===0?2:0];for(const p of [point(i,false),point(i,true),point(i+1,false),point(i+1,false),point(i,true),point(i+1,true)]){pos.push(...p);rgb.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));g.computeVertexNormals();return g;
}

function makeKiter(color){
  const g=new THREE.Group(),board=mat('#eff2e8'),rider=mat('#273c46'),skin=mat('#cfa284'),suit=mat(color);
  mesh(g,box,board,0,.036,0,.075,.018,.19);mesh(g,box,rider,0,.095,-.025,.043,.104,.058);mesh(g,box,suit,0,.145,-.02,.057,.072,.052);mesh(g,sphere,skin,0,.205,-.02,.028,.033,.028);
  const sail=mesh(g,kiteCanopy(color),mat(0xffffff,{side:THREE.DoubleSide,vertexColors:true,flatShading:true}),.34,.91,.12,1,1,1);sail.rotation.y=-.35;sail.rotation.z=-.16;
  line(g,[[0,.158,-.012],[.06,.86,.12],[0,.158,-.012],[.62,.86,.12]],'#f5f3dc',.76);makeWake(g,.32,.08);return g;
}

function makeBoat(color){
  const g=new THREE.Group(),shape=new THREE.Shape();shape.moveTo(-.085,-.16);shape.lineTo(.085,-.16);shape.lineTo(.09,.06);shape.lineTo(.055,.145);shape.lineTo(0,.195);shape.lineTo(-.055,.145);shape.lineTo(-.09,.06);shape.closePath();
  const hullGeo=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelThickness:.008,bevelSize:.013,bevelSegments:1,steps:1});hullGeo.rotateX(-Math.PI/2);hullGeo.rotateY(Math.PI);mesh(g,hullGeo,mat('#e4e2d1'),0,.008,0,1,1,1);
  mesh(g,box,mat('#a79066'),0,.080,-.012,.135,.018,.276);
  for(const x of [-.061,.061])for(const z of [-.09,.09])mesh(g,box,mat('#b6a78b'),x,.14,z,.013,.12,.013);
  mesh(g,box,mat(color),0,.2,0,.17,.026,.24);
  mesh(g,box,mat('#365568'),0,.114,.104,.13,.04,.018);makeWake(g,.36,.085);return g;
}

export function addWaterActivity(world,field){
  const random=randomSeed(9901),kiterRoutes=kiteRoutes(field),riverRoutes=findRiverRoutes(field),kites=[],boats=[],colors=['#dd5362','#f6c650','#74d2e7','#e8a848','#b8da78','#9879d1'];
  for(let i=0;i<24&&kiterRoutes.length;i++){const route=kiterRoutes[i%kiterRoutes.length],group=makeKiter(colors[i%colors.length]);world.add(group);kites.push({group,route,distance:random()*route.length,dir:random()<.5?1:-1,speed:.30+random()*.16,phase:random()*6.28});}
  for(let i=0;i<8&&riverRoutes.length;i++){const route=riverRoutes[i%riverRoutes.length],group=makeBoat(['#e6e3cc','#80aab8','#c9b58b','#c4d2d6'][i%4]);group.scale.setScalar(.66);world.add(group);boats.push({group,route,distance:(i+.5)/8*route.length,dir:i%2?1:-1,speed:.10+random()*.042,phase:random()*6.28});}
  let kiteCount=16,boatCount=4;
  function move(item,dt,clock){const length=item.route.length;item.distance+=item.dir*dt*item.speed;if(item.distance>length){item.distance=2*length-item.distance;item.dir=-1;}else if(item.distance<0){item.distance=-item.distance;item.dir=1;}
    const [x,z]=along(item.route,item.distance);item.group.position.set(x,.018+Math.sin(clock*2+item.phase)*.012,z);item.group.rotation.y=heading(item.route,item.distance,item.dir);}
  function update(dt,clock){kites.forEach((item,i)=>{item.group.visible=i<kiteCount;if(item.group.visible)move(item,dt,clock);});boats.forEach((item,i)=>{item.group.visible=i<boatCount;if(item.group.visible)move(item,dt,clock);});}
  update(0,0);return{setKites:n=>{kiteCount=n;},setBoats:n=>{boatCount=n;},update,available:{kites:kites.length,boats:boats.length}};
}
