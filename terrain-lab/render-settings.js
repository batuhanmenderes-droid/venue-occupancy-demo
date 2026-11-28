const $=id=>document.getElementById(id);

// Artist-facing controls; all values are visible, persisted locally and applied live.
export function createRenderSettings({mobile,maxSamples,onChange,presetDefaults={},onSavePreset}){
  const defaults={particles:35,particleSize:1,clouds:100,fog:75,edgeFade:8,smoke:100,grassDensity:150,sun:2.5,ambient:1.75,exposure:1.03,azimuth:225,elevation:51,shading:'smooth',shadow:mobile?'2048':'3072',filter:'soft',aa:maxSamples>=4?'msaa4':maxSamples>=2?'msaa2':'fxaa',scale:100,waves:100,waveSpeed:100,foam:100,shoreRadius:20,cars:mobile?20:32,carSpeed:100,kites:16,boats:4};
  const groups=[
    {title:'Atmosphere',controls:[
      {key:'particles',label:'Particle density',min:0,max:100,step:1,format:v=>`${v}%`},
      {key:'particleSize',label:'Particle size',min:.4,max:2.5,step:.1,format:v=>`${v.toFixed(1)}×`},
      {key:'clouds',label:'Cloud density',min:0,max:100,step:1,format:v=>`${v}%`},
      {key:'fog',label:'Edge fog / fade',min:0,max:100,step:1,format:v=>`${v}%`},
      {key:'edgeFade',label:'Map edge fade',min:0,max:15,step:.5,format:v=>`${Math.round(v*100)} m`},
      {key:'smoke',label:'Chimney smoke',min:0,max:100,step:5,format:v=>`${v}%`},
      {key:'grassDensity',label:'Grass density',min:0,max:200,step:5,format:v=>`${v}%`},
    ]},
    {title:'Lighting',controls:[
      {key:'sun',label:'Sun intensity',min:0,max:5,step:.05,format:v=>v.toFixed(2)},
      {key:'ambient',label:'Ambient / fill',min:0,max:4,step:.05,format:v=>v.toFixed(2)},
      {key:'exposure',label:'Exposure',min:.4,max:2,step:.02,format:v=>`${v.toFixed(2)}×`},
      {key:'azimuth',label:'Sun direction',min:0,max:359,step:1,format:v=>`${v}°`},
      {key:'elevation',label:'Sun elevation',min:10,max:85,step:1,format:v=>`${v}°`},
    ]},
    {title:'Shading & quality',controls:[
      {key:'shading',label:'Terrain shading',options:[['smooth','Smooth'],['flat','Faceted'],['wire','Wireframe']]},
      {key:'shadow',label:'Shadow resolution',options:[['off','Off'],['1024','1024 × 1024'],['2048','2048 × 2048'],['3072','3072 × 3072'],['4096','4096 × 4096']]},
      {key:'filter',label:'Shadow filtering',options:[['soft','Soft PCF'],['pcf','PCF'],['hard','Hard']]},
      {key:'aa',label:'Anti-aliasing',options:[['off','Off'],['fxaa','FXAA'],['msaa2','MSAA 2×',maxSamples<2],['msaa4','MSAA 4×',maxSamples<4],['msaa8','MSAA 8×',maxSamples<8]],note:`GPU multisampling: up to ${maxSamples}×`},
      {key:'scale',label:'Render scale',min:50,max:150,step:5,format:v=>`${v}%`},
    ]},
    {title:'Water',controls:[{key:'waves',label:'Wave strength',min:0,max:200,step:5,format:v=>`${v}%`},{key:'waveSpeed',label:'Wave speed',min:0,max:200,step:5,format:v=>`${v}%`},{key:'foam',label:'Shore foam',min:0,max:200,step:5,format:v=>`${v}%`},{key:'shoreRadius',label:'Shoreline radius',min:0,max:50,step:5,format:v=>`${v} m`,note:'Deniz kıyıları ve Azmak kıvrımlarını yumuşatır.'},{key:'kites',label:'Kitesurfers',min:0,max:24,step:1,format:v=>String(v)},{key:'boats',label:'Azmak boats',min:0,max:8,step:1,format:v=>String(v)}]},
    {title:'Traffic',controls:[{key:'cars',label:'Car count',min:0,max:50,step:1,format:v=>String(v)},{key:'carSpeed',label:'Traffic speed',min:0,max:200,step:5,format:v=>`${v}%`}]},
  ];
  const merge=(target,source)=>{for(const group of groups)for(const c of group.controls){const v=source[c.key];if(c.options){if(c.options.some(o=>o[0]===v&&!o[2]))target[c.key]=v;}else if(Number.isFinite(v))target[c.key]=Math.max(c.min,Math.min(c.max,v));}};
  merge(defaults,presetDefaults||{});
  const values={...defaults};try{const saved=JSON.parse(localStorage.getItem('akyaka:render-settings:v1')||'{}');if(!saved.kiteDensityV2&&Number.isFinite(saved.kites))saved.kites=Math.min(24,saved.kites*2);merge(values,saved);}catch{}
  const controls=new Map();
  const store=()=>{try{localStorage.setItem('akyaka:render-settings:v1',JSON.stringify({...values,kiteDensityV2:true}));}catch{}};store();
  function applyControl(c,value,notify=true){values[c.key]=value;const {input,output}=controls.get(c.key);input.value=String(value);if(output)output.textContent=c.format(value);if(notify){onChange(c.key,value,values);store();}}
  for(const group of groups){const el=document.createElement('section');el.className='render-group';const title=document.createElement('h3');title.textContent=group.title;el.append(title);
    for(const c of group.controls){const row=document.createElement('div');row.className='render-control';const label=document.createElement('label');label.textContent=c.label;label.htmlFor=`render-${c.key}`;row.append(label);let input,output;
      if(c.options){input=document.createElement('select');for(const [value,text,disabled] of c.options){const opt=document.createElement('option');opt.value=value;opt.textContent=text;opt.disabled=!!disabled;input.append(opt);}row.append(input);}
      else{output=document.createElement('output');row.append(output);input=document.createElement('input');input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;row.append(input);}
      input.id=`render-${c.key}`;controls.set(c.key,{input,output});applyControl(c,values[c.key],false);
      input.addEventListener('input',()=>applyControl(c,c.options?input.value:Number(input.value)));
      if(c.note){const note=document.createElement('div');note.className='render-note';note.textContent=c.note;row.append(note);}el.append(row);
    }$('render-controls').append(el);
  }
  function openPanel(open){$('render-panel').hidden=!open;$('render-settings').setAttribute('aria-expanded',String(open));}
  $('render-settings').addEventListener('click',()=>openPanel($('render-panel').hidden));$('render-close').addEventListener('click',()=>openPanel(false));$('render-reset').addEventListener('click',()=>{for(const group of groups)for(const c of group.controls)applyControl(c,defaults[c.key]);});
  $('render-save-defaults').addEventListener('click',async()=>{Object.assign(defaults,values);const status=$('preset-status');status.textContent='Varsayılanlar kaydediliyor…';try{const result=await onSavePreset({...values});status.textContent=result==='file'?'JSON preset kaydedildi':result==='download'?'Preset indirildi · data klasörüne taşı':'Tarayıcı varsayılanı kaydedildi';}catch{status.textContent='Tarayıcı varsayılanı kaydedildi';}});
  openPanel(!document.body.classList.contains('embedded'));
  return {values,applyAll(){Object.keys(values).forEach(key=>onChange(key,values[key],values));},
    setAll(next){const v={...values};merge(v,next||{});for(const group of groups)for(const c of group.controls)if(v[c.key]!==values[c.key])applyControl(c,v[c.key]);}};
}
