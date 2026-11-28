import * as THREE from 'three';
import { WIDTH, DEPTH, worldUV, toWorld, noise, fbm, randomSeed } from './geo.js';

const C = hex => new THREE.Color(hex);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{let x=clamp((v-a)/(b-a),0,1);return x*x*(3-2*x);};

// A single high-resolution heightfield is shared by terrain, shorelines, roads and
// every prop. Elevation is exaggerated artistically, but coordinates never drift.
export function makeField(dem, geo, resolution=340) {
  const nx=resolution,nz=Math.round(resolution*DEPTH/WIDTH),count=(nx+1)*(nz+1),stride=nx+1;
  const heights=new Float32Array(count), raw=new Float32Array(count), water=new Uint8Array(count),forest=new Uint8Array(count),wetland=new Uint8Array(count);
  const xAt=i=>(i/nx-.5)*WIDTH,zAt=j=>(j/nz-.5)*DEPTH;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const k=j*stride+i,x=xAt(i),z=zAt(j),h=dem.sample(x,z);
    raw[k]=Math.max(0,Number.isFinite(h)?h:0);water[k]=geo.water(x,z)?1:0;forest[k]=geo.forest(x,z)?1:0;wetland[k]=geo.wetland(x,z)?1:0;
  }
  // Distance fields make beaches, shallow turquoise lagoons and reeds follow coastlines.
  function distance(target){
    const d=new Float32Array(count);for(let k=0;k<count;k++)d[k]=water[k]===target?0:10000;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const k=j*stride+i;if(i)d[k]=Math.min(d[k],d[k-1]+1);if(j)d[k]=Math.min(d[k],d[k-stride]+1);if(i&&j)d[k]=Math.min(d[k],d[k-stride-1]+1.414);}
    for(let j=nz;j>=0;j--)for(let i=nx;i>=0;i--){const k=j*stride+i;if(i<nx)d[k]=Math.min(d[k],d[k+1]+1);if(j<nz)d[k]=Math.min(d[k],d[k+stride]+1);if(i<nx&&j<nz)d[k]=Math.min(d[k],d[k+stride+1]+1.414);}
    return d;
  }
  const coast=distance(1),offshore=distance(0),spacing=WIDTH/nx;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const k=j*stride+i,x=xAt(i),z=zAt(j);
    const signed=geo.signedDistance?geo.signedDistance(x,z):(water[k]?-offshore[k]:coast[k])*spacing;
    coast[k]=Math.max(0,signed/spacing);offshore[k]=Math.max(0,-signed/spacing);
    if(water[k])heights[k]=Math.max(-1.6,Math.min(-.024,signed*.55-.025));
    else {
      const h=raw[k]*.0155; // approximately 1.55× vertical exaggeration
      const shore=smooth(0,.58,Math.max(0,signed));
      // Coast remains at sea level, never flooded by minor DEM registration errors.
      heights[k]=Math.max(.014,mix(Math.min(h,Math.max(.014,signed*.54)),h,shore));
      if(raw[k]>4)heights[k]+=Math.max(0,fbm(x*.55,z*.55)-.45)*.14*shore;
    }
  }
  function sample(field,x,z,nearest=false){const [u,v]=worldUV(x,z),fx=clamp(u*nx,0,nx),fz=clamp(v*nz,0,nz),i=Math.floor(fx),j=Math.floor(fz),i2=Math.min(nx,i+1),j2=Math.min(nz,j+1);if(nearest)return field[Math.round(fz)*stride+Math.round(fx)];const p=fx-i,q=fz-j;return mix(mix(field[j*stride+i],field[j*stride+i2],p),mix(field[j2*stride+i],field[j2*stride+i2],p),q);}
  const height=(x,z)=>sample(heights,x,z);
  return {nx,nz,stride,count,heights,raw,water,forest,wetland,coast,offshore,xAt,zAt,height,elevation:(x,z)=>sample(raw,x,z),isWater:(x,z)=>geo.water(x,z),isForest:(x,z)=>!!sample(forest,x,z,true),isWetland:(x,z)=>!!sample(wetland,x,z,true),shoreDistance:(x,z)=>geo.signedDistance?geo.signedDistance(x,z):(sample(coast,x,z)-sample(offshore,x,z))*spacing,distance:(x,z)=>geo.signedDistance?Math.max(0,geo.signedDistance(x,z)/spacing):sample(coast,x,z),slope:(x,z)=>Math.hypot(height(x+.35,z)-height(x-.35,z),height(x,z+.35)-height(x,z-.35))/.7};
}

function groundTexture() {
  const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(size,size),r=randomSeed(593);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const n=.81+noise(x*.065,y*.065)*.14+noise(x*.19,y*.19)*.045+r()*.025,k=(y*size+x)*4;
    img.data[k]=img.data[k+1]=img.data[k+2]=Math.round(n*255);img.data[k+3]=255;
  }
  ctx.putImageData(img,0,0);const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(12,11);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
}

// Seamless, hand-painted lawn detail. Neutral tonal strokes inherit the terrain's
// biome colours, so grass stays green in daylight and cool blue-green at night.
function grassDetailTexture(){
  const n=512,canvas=document.createElement('canvas');canvas.width=canvas.height=n;const ctx=canvas.getContext('2d'),r=randomSeed(67092),img=ctx.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const a=(x/n)*Math.PI*2,b=(y/n)*Math.PI*2;
    const broad=(Math.sin(a*3+Math.cos(b*2)*1.6)+Math.cos(b*4+Math.sin(a*3)*1.8))*.5;
    const v=Math.round(201+broad*13+(r()-.5)*11),k=(y*n+x)*4;img.data[k]=img.data[k+1]=img.data[k+2]=v;img.data[k+3]=255;
  }ctx.putImageData(img,0,0);ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<850;i++){
    const x=r()*n,y=r()*n,size=5+r()*10,lean=(r()-.48)*.68,blades=3+Math.floor(r()*4);
    const strokes=Array.from({length:blades},()=>({dx:(r()-.5)*size*.65,h:size*(.48+r()*.65),bend:(r()-.5)*size*.8,tone:75+Math.floor(r()*125),w:.7+r()*1.5}));
    for(const ox of [-n,0,n])for(const oy of [-n,0,n]){
      if(x+ox<-20||x+ox>n+20||y+oy<-20||y+oy>n+20)continue;
      for(const s of strokes){const bx=x+ox+s.dx,by=y+oy;ctx.lineWidth=s.w+.65;ctx.strokeStyle='rgba(56,56,56,.27)';ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+lean*s.h*.6,by-s.h*.56,bx+s.bend+lean*s.h,by-s.h);ctx.stroke();ctx.lineWidth=s.w;ctx.strokeStyle=`rgba(${s.tone},${s.tone},${s.tone},.64)`;ctx.stroke();
        ctx.lineWidth=.7;ctx.strokeStyle='rgba(251,251,251,.24)';ctx.beginPath();ctx.moveTo(bx+.65,by-1);ctx.quadraticCurveTo(bx+lean*s.h*.6+.5,by-s.h*.56,bx+s.bend+lean*s.h,by-s.h);ctx.stroke();}
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.NoColorSpace;tex.anisotropy=8;return tex;
}

// Tileable limestone: irregular rock faces, mineral bands and thin dark fissures.
// Triplanar sampling below lets the same paint follow vertical cliffs without stretching.
function rockDetailTexture(){
  const n=512,grid=7,canvas=document.createElement('canvas');canvas.width=canvas.height=n;
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(n,n),r=randomSeed(315914),cells=Array.from({length:grid*grid},()=>({x:.15+r()*.7,y:.15+r()*.7,tone:r()}));
  const wrap=v=>((v%grid)+grid)%grid;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n,a=u*Math.PI*2,b=v*Math.PI*2;
    const px=u*grid+.19*Math.sin(b*3+a*2)+.08*Math.sin(a*7-b*4),py=v*grid+.22*Math.sin(a*2-b*3)+.09*Math.cos(b*7+a*3),ix=Math.floor(px),iy=Math.floor(py);
    let first=100,second=100,tone=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const cx=ix+dx,cy=iy+dy,cell=cells[wrap(cy)*grid+wrap(cx)],dd=(px-cx-cell.x)**2+(py-cy-cell.y)**2;
      if(dd<first){second=first;first=dd;tone=cell.tone;}else if(dd<second)second=dd;
    }
    const edge=Math.sqrt(second)-Math.sqrt(first),crack=1-smooth(.005,.058,edge),rim=smooth(.045,.105,edge)*(1-smooth(.105,.19,edge));
    const bands=.5+.5*Math.sin(b*12+a*3+1.5*Math.sin(a*4-b*2)+tone*2.1),strata=.5+.5*Math.sin(b*31+a*7+Math.sin(a*9-b*3)*1.1);
    const mineral=.5+.5*Math.sin(a*13+b*11+Math.cos(b*9-a*5)*2.3);
    const value=clamp(.68+(tone-.5)*.21+(bands-.5)*.17+(strata-.5)*.075+(mineral-.5)*.055-crack*.35+rim*.105+(r()-.5)*.035,.24,.98);
    const i=(y*n+x)*4;img.data[i]=img.data[i+1]=img.data[i+2]=Math.round(value*255);img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.NoColorSpace;tex.anisotropy=8;return tex;
}

export function makeShoreTexture(geo){const tex=new THREE.CanvasTexture(geo.waterCanvas);tex.flipY=false;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;return tex;}

export function addTerrain(scene,field,shoreTexture) {
  const {nx,nz,stride,count,heights,water,coast,raw,forest,wetland,xAt,zAt}=field;
  const vertices=new Float32Array(count*3),colors=new Float32Array(count*3),uvs=new Float32Array(count*2),grassWeights=new Float32Array(count),rockWeights=new Float32Array(count),indices=new Uint32Array(nx*nz*6);
  const meadow=C('#a9bd70'),olive=C('#79984d'),forestShade=C('#5f7945'),pineShade=C('#547340'),dry=C('#b5a975'),wet=C('#8d9d5f'),sand=C('#d7c18b'),limestone=C('#a7a48c'),rockDark=C('#848d72'),grass=new THREE.Color(),scratch=new THREE.Color();
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const k=j*stride+i,x=xAt(i),z=zAt(j),y=heights[k],h=raw[k];vertices.set([x,y,z],k*3);uvs.set([i/nx,j/nz],k*2);
    const macro=fbm(x*.115,z*.115),fine=fbm(x*.58,z*.58),slope=field.slope(x,z);
    grass.copy(meadow).lerp(olive,smooth(.25,.76,macro));
    if(forest[k]||h>110)grass.lerp(forestShade,smooth(.18,.78,macro)*.74+.16).lerp(pineShade,smooth(160,700,h)*.22);
    if(h<40&&!forest[k])grass.lerp(dry,smooth(.48,.79,macro)*.65);
    if(wetland[k])grass.lerp(wet,.65);
    const stone=smooth(.3,.9,slope)*smooth(100,280,h)*(.65+fine*.35);
    scratch.copy(limestone).lerp(rockDark,noise(x*.37,z*.32)*.63);grass.lerp(scratch,stone);
    if(!water[k]&&coast[k]<2.8&&!wetland[k])grass.lerp(sand,(1-smooth(.85,2.8,coast[k]))*.94);
    if(water[k])grass.copy(sand).multiplyScalar(.64);
    grassWeights[k]=water[k]?0:clamp((1-stone)*(forest[k]?.55:wetland[k]?.48:1)*smooth(.2,3.2,coast[k]),0,1);
    rockWeights[k]=water[k]?0:clamp(stone*1.45,0,1);
    grass.multiplyScalar(.94+fine*.13);colors.set([grass.r,grass.g,grass.b],k*3);
  }
  let o=0;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;indices.set([a,c,b,b,c,d],o);o+=6;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setAttribute('grassWeight',new THREE.BufferAttribute(grassWeights,1));geometry.setAttribute('rockWeight',new THREE.BufferAttribute(rockWeights,1));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,map:groundTexture(),roughness:1,metalness:0});
  const grassTexture=grassDetailTexture(),rockTexture=rockDetailTexture();material.userData.grassTexture=grassTexture;material.userData.rockTexture=rockTexture;material.userData.grassDensity={value:1.5};
  material.onBeforeCompile=shader=>{
    shader.uniforms.shorelineMask={value:shoreTexture};shader.uniforms.grassDetail={value:grassTexture};shader.uniforms.rockDetail={value:rockTexture};shader.uniforms.grassDensity=material.userData.grassDensity;
    shader.vertexShader='attribute float grassWeight,rockWeight; varying float vGrassWeight,vRockWeight; varying vec2 vShoreUV; varying vec3 vRockPosition,vRockNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvShoreUV=uv;vGrassWeight=grassWeight;vRockWeight=rockWeight;vRockPosition=position;vRockNormal=normal;');
    shader.fragmentShader='uniform sampler2D shorelineMask,grassDetail,rockDetail; uniform float grassDensity; varying vec2 vShoreUV; varying float vGrassWeight,vRockWeight; varying vec3 vRockPosition,vRockNormal;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(texture2D(shorelineMask,vShoreUV).a>=0.43137)discard;').replace('#include <map_fragment>',`#include <map_fragment>
      vec2 guv=vShoreUV*vec2(23.,20.)*(.72+grassDensity*.34);float g1=texture2D(grassDetail,guv).r;float g2=texture2D(grassDetail,mat2(.82,-.57,.57,.82)*guv*2.31).r;float grassTone=.43+.74*(g1*.72+g2*.28);diffuseColor.rgb*=mix(1.,grassTone,clamp(vGrassWeight*grassDensity,0.,1.));
      vec3 rv=vRockPosition*.38;vec3 blend=pow(abs(normalize(vRockNormal)),vec3(4.));blend/=max(dot(blend,vec3(1.)),.0001);
      float rockTone=texture2D(rockDetail,rv.yz).r*blend.x+texture2D(rockDetail,rv.xz).r*blend.y+texture2D(rockDetail,rv.xy).r*blend.z;
      diffuseColor.rgb*=mix(1.,.43+rockTone*.91,vRockWeight);`);
  };
  const terrain=new THREE.Mesh(geometry,material);terrain.castShadow=true;terrain.receiveShadow=true;terrain.name='Georeferenced terrain';scene.add(terrain);return terrain;
}

function depthTexture(field){
  // A finely sampled distance-to-shore field lets wave fronts follow every bay and
  // bend. Blue stores offshore exposure, so narrow Azmak canals do not break like surf.
  const w=768,h=Math.round(w*DEPTH/WIDTH),dist=new Float32Array(w*h),bytes=new Uint8Array(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)dist[j*w+i]=clamp(-field.shoreDistance((i/(w-1)-.5)*WIDTH,(j/(h-1)-.5)*DEPTH),0,16);
  const step=Math.round(1.65/WIDTH*w),sample=(x,z)=>dist[clamp(z,0,h-1)*w+clamp(x,0,w-1)];
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const k=j*w+i,d=dist[k],encoded=Math.round(d/16*65535),fetch=Math.max(d,sample(i-step,j),sample(i+step,j),sample(i,j-step),sample(i,j+step),sample(i-step,j-step),sample(i+step,j-step),sample(i-step,j+step),sample(i+step,j+step));
    bytes[k*4]=encoded>>8;bytes[k*4+1]=encoded&255;bytes[k*4+2]=Math.round(smooth(.24,.95,fetch)*255);bytes[k*4+3]=255;
  }
  const tex=new THREE.DataTexture(bytes,w,h);tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;
}

export function addWater(scene,field,shoreTexture){
  const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},moon:{value:0},moonX:{value:0},moonColor:{value:C('#d6e4ff')},edgeWidth:{value:8},waveStrength:{value:1},foamStrength:{value:1},shorelineMask:{value:shoreTexture},depthMap:{value:depthTexture(field)},extent:{value:new THREE.Vector2(WIDTH,DEPTH)},deep:{value:C('#2e7184')},ocean:{value:C('#42989c')},shallows:{value:C('#8ec5a7')},foam:{value:C('#d7ebc3')},sun:{value:1},lightDirection:{value:new THREE.Vector3(-.4,.8,.4)},lightColor:{value:C('#ffd08a')},skyColor:{value:C('#bacbb2')}},vertexShader:`
    uniform float time,waveStrength;varying vec3 wpos;
    vec3 gerstner(vec2 p,vec2 direction,float amplitude,float wavelength,float speed,float steepness){vec2 d=normalize(direction);float k=6.2831853/wavelength,phase=k*dot(d,p)+time*speed;return vec3(d.x*amplitude*steepness*cos(phase),amplitude*sin(phase),d.y*amplitude*steepness*cos(phase));}
    void main(){vec4 w=modelMatrix*vec4(position,1.);vec2 p=w.xz;w.xyz+=waveStrength*(gerstner(p,vec2(.81,.59),.018,2.05,.89,.55)+gerstner(p,vec2(-.88,.47),.009,1.15,-.66,.48)+gerstner(p,vec2(.82,.57),.004,.53,1.5,.35));wpos=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}
  `,fragmentShader:`
    uniform float time,waveStrength,foamStrength,moon,edgeWidth,moonX;uniform vec3 moonColor;uniform sampler2D depthMap,shorelineMask;uniform vec2 extent;uniform vec3 deep,ocean,shallows,foam,lightDirection,lightColor,skyColor;uniform float sun;varying vec3 wpos;
    const float TAU=6.2831853;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float shoreDistance(vec2 uv){vec2 rg=texture2D(depthMap,clamp(uv,0.,1.)).rg;return dot(rg,vec2(65280.,255.))*(16./65535.);}
    void main(){
      vec2 p=wpos.xz,uv=p/extent+.5;bool outside=any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)));
      if(abs(p.x)>extent.x*.5||p.y>extent.y*.5||p.y< -extent.y*.5+7.)discard;
      if(!outside&&texture2D(shorelineMask,uv).a<.43137)discard;
      vec3 data=texture2D(depthMap,clamp(uv,0.,1.)).rgb;
      float shoreDist=outside?16.:dot(data.rg,vec2(65280.,255.))*(16./65535.);float exposure=outside?1.:data.b;
      float d=smoothstep(.02,4.5,shoreDist),slow=noise(p*.17+vec2(time*.018,-time*.011));
      float a=dot(p,vec2(3.5,2.4))+time*.89+noise(p*.21)*2.1,b=dot(p,vec2(-5.8,3.1))-time*.66+noise(p*.44)*2.5,c=dot(p,vec2(9.7,6.6))+time*1.5;
      vec2 slope=(vec2(3.5,2.4)*cos(a)*.020+vec2(-5.8,3.1)*cos(b)*.012+vec2(9.7,6.6)*cos(c)*.0045)*waveStrength;
      float coastEnergy=exposure*exp(-shoreDist*.64);
      // A positive advancing phase causes the contour to travel toward distance=0.
      float phase=TAU*(shoreDist/.60+time*.34+noise(p*.48)*.22+noise(p*1.65)*.045);
      float crest=pow(.5+.5*cos(phase),13.);float swell=cos(phase-.95);
      if(coastEnergy>.025){vec2 dp=vec2(.13)/extent;vec2 grad=vec2(shoreDistance(uv+vec2(dp.x,0.))-shoreDistance(uv-vec2(dp.x,0.)),shoreDistance(uv+vec2(0.,dp.y))-shoreDistance(uv-vec2(0.,dp.y)));slope+=normalize(grad+vec2(.0001))*swell*.105*coastEnergy*waveStrength;}
      vec3 N=normalize(vec3(-slope.x,1.,-slope.y));vec3 V=normalize(cameraPosition-wpos),L=normalize(lightDirection),H=normalize(V+L);
      float fresnel=pow(1.-clamp(dot(N,V),0.,1.),3.4),spec=pow(max(dot(N,H),0.),35.);
      vec3 col=mix(shallows,ocean,smoothstep(.015,.64,d));col=mix(col,deep,smoothstep(.58,1.,d)*.76);
      float caustics=pow(.5+.5*sin(p.x*18.+sin(p.y*11.+time*.65)*1.6)*sin(p.y*16.+time*.44),7.);
      col*=.92+.15*slow+(sin(a)*.57+sin(b)*.43)*.027*waveStrength+swell*.075*coastEnergy*waveStrength;
      col=mix(col,foam,caustics*(1.-d)*.042);col=mix(col,skyColor,.11+fresnel*.27);col+=lightColor*(spec*.14+moon*pow(max(dot(N,H),0.),17.)*.20)*sun*waveStrength;
      // Moonlight (night): a shimmering path running north from the middle of the view, broken up by the waves,
      // and small glints that flash on and off across the bay.
      if(moon>.01){
        float wob=(noise(vec2(p.y*.35,time*.12))-.5)*2.2+(sin(a)*.6+sin(b)*.4)*.35;
        float lane=exp(-pow((p.x-moonX-wob)/(2.4+1.2*noise(vec2(p.y*.21,1.7))),2.));
        float ripple=pow(.5+.5*sin(a*1.3+b*.9+noise(p*2.3)*3.),6.);
        vec2 cell=floor(p*vec2(22.,34.));float g=hash(cell+floor(time*2.6+hash(cell)*7.));
        float spark=smoothstep(.965,1.,g)*(.55+.45*sin(time*9.+hash(cell)*TAU));
        col+=moonColor*moon*(lane*(.10+ripple*.45+spark*1.8)+spark*.38*(.35+.65*d));
      }
      float broken=smoothstep(.22,.65,noise(p*4.4+vec2(time*.025,-time*.034)));
      float band=crest*coastEnergy*(1.-smoothstep(2.2,3.6,shoreDist))*(.32+.68*broken);
      float trail=pow(.5+.5*cos(phase+.75),6.)*coastEnergy*broken*.20;
      float wash=(1.-smoothstep(.018,.115,shoreDist))*exposure*(.35+.65*pow(.5+.5*cos(time*2.1+noise(p*1.3)*TAU),2.));
      // White aerated crests develop in shallows, then disperse at the wet shoreline.
      float white=clamp((band*.78+trail+wash*.85)*foamStrength*waveStrength,0.,.92);
      col=mix(col,foam,white);col*=sun;
      float bx=extent.x*.5-abs(p.x),bz=min(extent.y*.5-p.y,p.y+extent.y*.5-7.),bw=max(edgeWidth,.0001);
      float borderFade=edgeWidth<=0.?1.:smoothstep(0.,bw,bx)*smoothstep(0.,bw,bz);col=mix(skyColor,col,borderFade);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,DEPTH,260,Math.round(260*DEPTH/WIDTH)),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=-.015;mesh.name='Animated Gulf of Gökova';scene.add(mesh);return material;
}

function roadMesh(field,paths,major,edge=false){
  const verts=[],ids=[];let index=0;
  for(const road of paths){const big=/trunk|primary|secondary|motorway/.test(road.kind);if(big!==major)continue;const width=(big?.105:.052)*(edge?1.65:1);
    for(let k=1;k<road.points.length;k++){
      const [ax,az]=road.points[k-1],[bx,bz]=road.points[k],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(!len||len>12)continue;
      const segments=Math.max(1,Math.ceil(len/.23)),nx=-dz/len*width,nz=dx/len*width;
      for(let j=0;j<segments;j++){
        const a=j/segments,b=(j+1)/segments,x1=ax+dx*a,z1=az+dz*a,x2=ax+dx*b,z2=az+dz*b;
        if(Math.abs(x1)>WIDTH/2||Math.abs(x2)>WIDTH/2||Math.abs(z1)>DEPTH/2||Math.abs(z2)>DEPTH/2)continue;
        if(field.isWater(x1,z1)&&field.isWater(x2,z2))continue;
        const yy=(x,z)=>Math.max(.045,field.height(x,z)+(edge?.034:.045));
        for(const [x,z] of [[x1+nx,z1+nz],[x1-nx,z1-nz],[x2+nx,z2+nz],[x2-nx,z2-nz]])verts.push(x,yy(x,z),z);
        ids.push(index,index+2,index+1,index+1,index+2,index+3);index+=4;
      }
    }
  }
  if(!verts.length)return null;
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setIndex(ids);geom.computeVertexNormals();
  const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:edge?(major?'#989665':'#b4ad78'):(major?'#e7d4a2':'#d3c28f'),roughness:1,side:THREE.DoubleSide}));mesh.receiveShadow=true;return mesh;
}
export function addRoads(scene,field,roads){for(const major of [false,true])for(const edge of [true,false]){const m=roadMesh(field,roads,major,edge);if(m)scene.add(m);}}

const std = (extra={}) => new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,...extra});
function instances(scene,geometry,items,{cast=true,receive=true,material=std()}={}){
  if(!items.length)return null;const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D(),color=new THREE.Color();
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.r||0,p.rz||0);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(p.c)mesh.setColorAt(i,color.set(p.c));});
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=cast;mesh.receiveShadow=receive;mesh.computeBoundingSphere();scene.add(mesh);return mesh;
}

const BOX=new THREE.BoxGeometry(1,1,1);
const ROUND=new THREE.IcosahedronGeometry(1,1);
function roofGeometry(gabled=false){
  // Hipped, terracotta roof with a broad eave and central ridgeline.
  const ridge=gabled?.59:.32,peak=gabled?.47:.40,p=[[-.57,0,-.59],[.57,0,-.59],[.57,0,.59],[-.57,0,.59],[0,peak,-ridge],[0,peak,ridge]];
  const faces=[[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4],[3,4,0]];const v=[];for(const tri of faces)for(const i of tri)v.push(...p[i]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;
}
function polarOffset(h,dx,dz){return [h.x+dx*Math.cos(h.r)+dz*Math.sin(h.r),h.z-dx*Math.sin(h.r)+dz*Math.cos(h.r)];}
function part(h,dx,dy,dz,sx,sy,sz,c){const [x,z]=polarOffset(h,dx*h.s,dz*h.s);return{x,y:h.y+dy*h.s,z,sx:sx*h.s,sy:sy*h.s,sz:sz*h.s,r:h.r,c};}
export function addVillage(scene,field,local){
  const random=randomSeed(802),houses=[],sites=[{at:toWorld(28.3266,37.0541),rx:3.3,rz:2.3,n:68},{at:toWorld(28.3411,37.0551),rx:3.1,rz:2.0,n:40},{at:toWorld(28.3576,37.0267),rx:3,rz:2.5,n:55},{at:toWorld(28.309,37.053),rx:2.4,rz:1.5,n:17},{at:toWorld(28.369,37.054),rx:2.6,rz:2.4,n:26},
    {at:toWorld(28.3208,37.0607),rx:2.9,rz:2.1,n:29,north:true},{at:toWorld(28.3315,37.0616),rx:3.2,rz:2.4,n:38,north:true},{at:toWorld(28.3418,37.0622),rx:3.1,rz:2.1,n:27,north:true},{at:toWorld(28.3505,37.0605),rx:2.4,rz:1.8,n:20,north:true}];
  for(const site of sites){let placed=0;for(let attempt=0;attempt<site.n*22&&placed<site.n;attempt++){
    const angle=random()*Math.PI*2,rad=Math.sqrt(random()),x=site.at[0]+Math.cos(angle)*site.rx*rad,z=site.at[1]+Math.sin(angle)*site.rz*rad,size=.34+random()*.30+(random()<.10?.12:0);
    if(field.isWater(x,z)||field.distance(x,z)<1||field.slope(x,z)>(site.north?.43:.28)||field.elevation(x,z)>(site.north?320:180)||local.roadMask(x,z)||houses.some(h=>Math.hypot(h.x-x,h.z-z)<(h.s+size)*.55+.07))continue;
    const near=local.roadMask(x+.45,z)||local.roadMask(x-.45,z)||local.roadMask(x,z+.45)||local.roadMask(x,z-.45);if(!near&&random()<(site.north?.57:.78))continue;
    houses.push({x,z,y:field.height(x,z),r:(Math.floor(random()*4)*Math.PI/2)+(random()-.5)*.28,s:size,gabled:random()<.43,roof:['#d97c35','#c66a30','#e38f42','#bd632f','#d17c36','#d78941'][Math.floor(random()*6)],wall:['#e9d6ac','#e3c294','#fff1ca','#d9c19f','#d8b78d','#e6cc9f'][Math.floor(random()*6)]});placed++;
  }}
  const walls=[],roofs=[],gabledRoofs=[],timber=[],windows=[],litWindows=[],doors=[],chimneys=[],footings=[],shutters=[];
  for(const h of houses){const corners=[[-.49,-.5],[.49,-.5],[-.49,.5],[.49,.5]].map(([x,z])=>polarOffset(h,x*h.s,z*h.s)),low=Math.min(h.y,...corners.map(([x,z])=>field.height(x,z))),foundation=Math.max(.10,(h.y-low)/h.s+.10);footings.push(part(h,0,.085-foundation*.5,0,1.05,foundation,1.06,'#b5a389'));walls.push(part(h,0,.25,0,.94,.46,.98,h.wall));(h.gabled?gabledRoofs:roofs).push(part(h,0,.49,0,1,1,1,h.roof));
    timber.push(part(h,0,.13,.501,.94,.055,.035,'#936244'),part(h,0,.37,.501,.94,.05,.035,'#8a5939'),part(h,-.43,.25,.501,.055,.38,.04,'#835a3c'),part(h,.43,.25,.501,.055,.38,.04,'#835a3c'));
    // Traditional Akyaka timber frames on all sides, with deep wooden shutters.
    for(const side of [-1,1]){
      for(const y of [.11,.37])timber.push(part(h,side*.479,y,0,.035,.055,.99,'#795033'));
      for(const z of [-.44,0,.44])timber.push(part(h,side*.479,.245,z,.04,.42,.046,'#825538'));
      timber.push(part(h,0,.13,side*.501,.95,.052,.035,'#936244'),part(h,0,.37,side*.501,.95,.05,.035,'#8a5939'));
    }
    const target=random()<.75?litWindows:windows;
    target.push(part(h,-.24,.29,.523,.15,.16,.025,'#66828a'),part(h,.24,.29,.523,.15,.16,.025,'#66828a'),part(h,-.481,.29,-.20,.025,.15,.16,'#66828a'),part(h,.481,.29,-.20,.025,.15,.16,'#66828a'),part(h,.20,.29,-.523,.14,.16,.025,'#66828a'));
    doors.push(part(h,0,.145,.521,.15,.23,.025,'#79553e'));
    for(const x of [-.24,.24]){shutters.push(part(h,x-.105,.29,.532,.045,.18,.028,'#795033'),part(h,x+.105,.29,.532,.045,.18,.028,'#795033'));}
    chimneys.push(part(h,.26,.75,-.17,.13,.25,.13,'#efe1b8'),part(h,.26,.89,-.17,.17,.055,.17,'#af6a3c'));
  }
  const windowLight=std({emissive:'#ffb544',emissiveIntensity:0});windowLight.userData.nightWindows=true;
  instances(scene,BOX,footings);instances(scene,BOX,walls);instances(scene,roofGeometry(),roofs,{material:std({flatShading:true,side:THREE.DoubleSide})});instances(scene,roofGeometry(true),gabledRoofs,{material:std({flatShading:true,side:THREE.DoubleSide})});instances(scene,BOX,timber);instances(scene,BOX,windows);instances(scene,BOX,litWindows,{material:windowLight});instances(scene,BOX,doors);instances(scene,BOX,shutters);instances(scene,BOX,chimneys);
  return houses;
}

function reedgeometry(){const v=[],r=randomSeed(817);for(let i=0;i<15;i++){const a=r()*Math.PI*2,bx=Math.cos(a)*r()*.12,bz=Math.sin(a)*r()*.12,x=Math.cos(a)*(.12+r()*.20),z=Math.sin(a)*(.12+r()*.20),h=.37+r()*.36,w=.012+r()*.018;v.push(bx-w,0,bz,bx+w,0,bz,x,h,z,bx-w,0,bz,x,h,z,x*.64,h*.53,z*.64+.04);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;}

function grassTuftGeometry(){const r=randomSeed(359),v=[];for(let i=0;i<7;i++){const a=r()*6.283,dx=Math.cos(a),dz=Math.sin(a),x=(r()-.5)*.08,z=(r()-.5)*.08,h=.10+r()*.14,bend=.04+r()*.07,w=.012+r()*.009;v.push(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,x+dx*bend,h,z+dz*bend);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;}

export function addNature(scene,field,local,houses,lowPower=false,reservations=[]){
  const random=randomSeed(1913),pine=[],pine2=[],pine3=[],trunks=[],umbrellas=[],oaks=[],cypress=[],bushes=[],rocks=[],reeds=[],reedHeads=[],grassTufts=[];
  const greens=['#527a49','#66894d','#6b9254','#82a06a','#486e55','#60815b','#71945d'];
  const nearHouse=(x,z)=>houses.some(h=>Math.abs(h.x-x)<.6&&Math.abs(h.z-z)<.6);
  const good=(x,z)=>!field.isWater(x,z)&&!local.roadMask(x,z)&&!nearHouse(x,z)&&!reservations.some(p=>Math.hypot(x-p.x,z-p.z)<p.r);
  const step=lowPower?.91:.68;
  for(let z=-DEPTH/2+.4;z<DEPTH/2-.3;z+=step)for(let x=-WIDTH/2+.3;x<WIDTH/2-.3;x+=step){
    const px=x+(random()-.5)*step*.9,pz=z+(random()-.5)*step*.9;
    if(!good(px,pz))continue;const h=field.elevation(px,pz),slope=field.slope(px,pz),wet=field.isWetland(px,pz),wood=field.isForest(px,pz),coast=field.distance(px,pz);
    if(wet||(h<7&&coast<2.2))continue;
    const patch=fbm(px*.22,pz*.22);let probability=wood?.73:h>100?.46:patch>.64?.19:.065;
    probability*=smooth(.23,.55,patch)*1.15;if(slope>.7)probability*=.16;if(coast<1.8)probability*=.15;
    if(random()>probability)continue;
    const y=field.height(px,pz),size=(.54+random()*.56)*(h>450?.82:1),r=random()*Math.PI*2,c=greens[Math.floor(random()*greens.length)],kind=random(),p={x:px,z:pz,r,c};
    trunks.push({...p,y:y+size*.17,sx:size*.051,sy:size*.34,sz:size*.051,c:'#795d3b',rz:(random()-.5)*.13});
    if(kind<.13){cypress.push({...p,y:y+size*.54,sx:size*.12,sy:size*.95,sz:size*.13,c:'#3c693c'});}
    else if(kind<.33){umbrellas.push({...p,y:y+size*.56,sx:size*.32,sy:size*.24,sz:size*.29},{...p,x:px+size*.12,y:y+size*.44,z:pz+size*.09,sx:size*.21,sy:size*.19,sz:size*.21,c:greens[Math.floor(random()*greens.length)]});}
    else if(kind<.53){const oakColors=['#78945b','#91a76a','#65834c','#83a369'];oaks.push({...p,y:y+size*.55,sx:size*.33,sy:size*.31,sz:size*.32,c:oakColors[Math.floor(random()*4)]});for(let k=0;k<4;k++){const a=r+k*Math.PI/2;oaks.push({...p,x:px+Math.cos(a)*size*.20,z:pz+Math.sin(a)*size*.20,y:y+size*(.41+random()*.18),sx:size*.23,sy:size*.25,sz:size*.22,c:oakColors[Math.floor(random()*4)]});}}
    else {pine.push({...p,y:y+size*.36,sx:size*.31,sy:size*.48,sz:size*.31});pine2.push({...p,y:y+size*.58,sx:size*.245,sy:size*.43,sz:size*.245,c:greens[Math.floor(random()*greens.length)]});pine3.push({...p,y:y+size*.77,sx:size*.16,sy:size*.35,sz:size*.16,c:greens[Math.floor(random()*greens.length)]});}
  }
  const foliageMat=std({flatShading:true});const cone=new THREE.ConeGeometry(1,1,7,1),trunk=new THREE.CylinderGeometry(.65,1,1,5);
  instances(scene,trunk,trunks);instances(scene,cone,pine,{material:foliageMat});instances(scene,cone,pine2,{material:foliageMat});instances(scene,cone,pine3,{material:foliageMat});instances(scene,ROUND,umbrellas,{material:foliageMat});instances(scene,new THREE.IcosahedronGeometry(1,0),oaks,{material:foliageMat});instances(scene,cone,cypress,{material:foliageMat});
  // Ground-level scatter uses stable seed values and actual wetland/woodland masks.
  const groundStep=lowPower?.78:.53;
  for(let z=-DEPTH/2+.3;z<DEPTH/2;z+=groundStep)for(let x=-WIDTH/2+.3;x<WIDTH/2;x+=groundStep){
    const px=x+(random()-.5)*.45,pz=z+(random()-.5)*.45;if(!good(px,pz))continue;
    const h=field.elevation(px,pz),y=field.height(px,pz),slope=field.slope(px,pz),wet=field.isWetland(px,pz),coast=field.distance(px,pz),patch=fbm(px*.61,pz*.61),r=random()*Math.PI*2;
    if(wet||(coast<4.1&&h<12&&px>-17))continue;
    if(h>120&&slope>.33&&random()<slope*.11){const s=.09+random()*.26;rocks.push({x:px,y:y+s*.18,z:pz,sx:s*(.9+random()*.7),sy:s*.62,sz:s,r,c:['#a8a38d','#b3ab96','#8d927b','#bfb7a1'][Math.floor(random()*4)]});}
    else if(coast>1.5&&patch>.50&&random()<.18){const s=.12+random()*.23,c=['#78924c','#6f8944','#9daa5b','#60823f'][Math.floor(random()*4)];bushes.push({x:px,y:y+s*.37,z:pz,sx:s,sy:s*.57,sz:s*.89,r,c},{x:px+s*.52,y:y+s*.18,z:pz+s*.35,sx:s*.58,sy:s*.44,sz:s*.65,r,c});}
  }
  // Wetlands get their own much finer scatter grid: thick continuous reed banks,
  // with naturally irregular gaps and a mixture of green blades and gold seed heads.
  const reedStep=lowPower?.43:.29,reedRandom=randomSeed(11109);
  for(let z=-DEPTH/2+.25;z<DEPTH/2-.2;z+=reedStep)for(let x=-WIDTH/2+.25;x<WIDTH/2-.2;x+=reedStep){
    const px=x+(reedRandom()-.5)*reedStep*.88,pz=z+(reedRandom()-.5)*reedStep*.88;
    if(!good(px,pz))continue;
    const h=field.elevation(px,pz),coast=field.distance(px,pz),wet=field.isWetland(px,pz),patch=fbm(px*.52,pz*.52);
    if(!(wet||(coast<4.8&&h<14&&px>-17))||h>30||field.slope(px,pz)>.39)continue;
    const chance=wet?.92:mix(.93,.40,smooth(1.5,4.8,coast));if(reedRandom()>chance*mix(.55,1,smooth(.18,.58,patch)))continue;
    const y=Math.max(.03,field.height(px,pz)),s=.66+reedRandom()*.63,r=reedRandom()*6.28,c=['#a7a85c','#969648','#6c8b46','#bbad60','#7f934e'][Math.floor(reedRandom()*5)];
    reeds.push({x:px,y,z:pz,sx:s,sy:s*(.9+reedRandom()*.23),sz:s,r,c});
    if(reedRandom()<.78)for(let k=0;k<2;k++){const angle=reedRandom()*6.28;reedHeads.push({x:px+Math.sin(angle)*.095*s,y:y+(.49+reedRandom()*.18)*s,z:pz+Math.cos(angle)*.095*s,sx:.026*s,sy:.15*s,sz:.026*s,r,c:reedRandom()<.5?'#a99249':'#c2ae67'});}
  }
  // Fine 3D grass is scattered independently of the painted texture, with
  // natural clumps and species tint variation. A stable shuffle makes density uniform.
  const grassRand=randomSeed(51443),grassStep=lowPower?.65:.43;
  for(let z=-DEPTH/2+7;z<DEPTH/2-.2;z+=grassStep)for(let x=-WIDTH/2+.2;x<WIDTH/2-.2;x+=grassStep){
    const px=x+(grassRand()-.5)*grassStep,pz=z+(grassRand()-.5)*grassStep;
    if(field.isWater(px,pz)||field.isWetland(px,pz)||field.distance(px,pz)<2.8||field.slope(px,pz)>.45)continue;
    const patch=fbm(px*.56,pz*.56),wood=field.isForest(px,pz);if(grassRand()>mix(.25,.85,smooth(.15,.70,patch))*(wood?.38:1)||!good(px,pz))continue;
    const scale=.75+grassRand()*1.0;grassTufts.push({x:px,y:field.height(px,pz)+.012,z:pz,sx:scale,sy:scale*.92,sz:scale,r:grassRand()*6.283,c:['#849f4d','#95ad56','#769849','#b0b968','#6f8f43'][Math.floor(grassRand()*5)]});
  }
  for(let i=grassTufts.length-1;i>0;i--){const j=Math.floor(grassRand()*(i+1));[grassTufts[i],grassTufts[j]]=[grassTufts[j],grassTufts[i]];}
  const grassMesh=instances(scene,grassTuftGeometry(),grassTufts,{cast:false,material:std({side:THREE.DoubleSide,flatShading:true})});if(grassMesh){grassMesh.name='Fine meadow grass';grassMesh.userData.capacity=grassTufts.length;}
  instances(scene,ROUND,bushes,{cast:false,material:foliageMat});instances(scene,new THREE.IcosahedronGeometry(1,0),rocks,{material:std({flatShading:true})});instances(scene,reedgeometry(),reeds,{cast:false,material:std({side:THREE.DoubleSide,flatShading:true})});instances(scene,new THREE.CylinderGeometry(1,1,1,5),reedHeads,{cast:false});
  return {trees:trunks.length,reeds:reeds.length,bushes:bushes.length,grassMesh};
}

function cloudTexture(seed){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const ctx=canvas.getContext('2d'),r=randomSeed(seed);
  for(let i=0;i<34;i++){const a=r()*6.28,dist=Math.sqrt(r()),x=256+Math.cos(a)*dist*154,y=160+Math.sin(a)*dist*74,rad=44+r()*75,g=ctx.createRadialGradient(x,y,rad*.08,x,y,rad);g.addColorStop(0,'rgba(253,254,238,.25)');g.addColorStop(.36,'rgba(244,248,235,.20)');g.addColorStop(.72,'rgba(226,238,224,.075)');g.addColorStop(1,'rgba(224,239,229,0)');ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export function addClouds(scene){
  const clouds=[],r=randomSeed(383),textures=[cloudTexture(571),cloudTexture(911),cloudTexture(291)];
  function add(x,z,size,y,overNorth=false){const mat=new THREE.SpriteMaterial({map:textures[Math.floor(r()*textures.length)],transparent:true,depthWrite:false,depthTest:!overNorth,opacity:overNorth?.46+r()*.24:.67+r()*.26,rotation:(r()-.5)*.35,fog:false,color:0xffffff});const sprite=new THREE.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.set(size,size*.62,1);sprite.renderOrder=overNorth?15:10;scene.add(sprite);clouds.push({sprite,x,z,phase:r()*Math.PI*2});}
  // Bring the northern cloud bank over the mountain ridges, with translucent edges
  // extending into the playable map, rather than hiding behind the raised terrain.
  for(let x=-WIDTH/2-5;x<WIDTH/2+10;x+=8.8){add(x,-DEPTH/2+9+r()*4,19+r()*10,9+r()*3,true);add(x,DEPTH/2+2+r()*5,16+r()*12,3+r()*3);}
  for(let z=-DEPTH/2+4;z<DEPTH/2+4;z+=8.2){add(-WIDTH/2-2-r()*5,z,17+r()*10,4+r()*5);add(WIDTH/2+2+r()*5,z,17+r()*10,4+r()*6);}
  return clouds;
}
