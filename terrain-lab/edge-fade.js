// World-space fog rather than a screen overlay: every clipped edge converges on
// the actual scene background, even while the camera is rotated or zoomed.
export function installEdgeFade(material,{extent,tint,width}){
  if(material.isShaderMaterial||material.userData.edgeFadeInstalled)return;
  material.userData.edgeFadeInstalled=true;
  const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.customProgramCacheKey=()=>`${cacheKey}|world-edge-fade-v1`;
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    if(!shader.vertexShader.includes('#include <worldpos_vertex>')||!shader.fragmentShader.includes('#include <fog_fragment>'))return;
    shader.uniforms.edgeExtent=extent;shader.uniforms.edgeTint=tint;shader.uniforms.edgeWidth=width;
    shader.vertexShader='varying vec2 vBoundaryXZ;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 boundaryPos=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        boundaryPos=instanceMatrix*boundaryPos;
      #endif
      vBoundaryXZ=(modelMatrix*boundaryPos).xz;`);
    shader.fragmentShader='uniform vec2 edgeExtent; uniform vec3 edgeTint; uniform float edgeWidth; varying vec2 vBoundaryXZ;\n'+shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
      float bx=edgeExtent.x*.5-abs(vBoundaryXZ.x);
      float bz=min(edgeExtent.y*.5-vBoundaryXZ.y,vBoundaryXZ.y+edgeExtent.y*.5-7.);
      float bw=max(edgeWidth,.0001);
      float bf=edgeWidth<=0.?1.:smoothstep(0.,bw,bx)*smoothstep(0.,bw,bz);
      gl_FragColor.rgb=mix(edgeTint,gl_FragColor.rgb,bf);`);
  };
  material.needsUpdate=true;
}
