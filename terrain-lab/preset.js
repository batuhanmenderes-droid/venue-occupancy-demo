const KEY='akyaka:default-preset:v1';
export async function loadApplicationPreset(){
  let bundled={},local={};
  try{const response=await fetch('./data/default-render-settings.json',{cache:'no-store'});if(response.ok)bundled=await response.json();}catch{}
  try{local=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
  const selected=local.savedAt&&(!bundled.savedAt||local.savedAt>=bundled.savedAt)?local:bundled;
  return {...selected,mode:bundled.mode??selected.mode??'night'};
}
export async function saveApplicationPreset(preset){
  const value={version:1,savedAt:new Date().toISOString(),...preset};
  try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}
  const text=JSON.stringify(value,null,2)+'\n';
  if(typeof window.showSaveFilePicker==='function'){
    try{const handle=await window.showSaveFilePicker({suggestedName:'default-render-settings.json',types:[{description:'Terrain Lab default preset',accept:{'application/json':['.json']}}]});const writer=await handle.createWritable();await writer.write(text);await writer.close();return 'file';}catch(e){if(e.name==='AbortError')return 'local';}
  }
  const file=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='default-render-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return 'download';
}
