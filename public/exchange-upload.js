/* Small requests keep file transfers within the hosting provider's upload limit. */
window.AcademyFileUpload = async function({endpoint,csrfHeader,csrf,file,metadata={},onProgress=()=>{},signal}) {
  const queryKey=endpoint.includes('/cloud') ? 'api' : 'action';
  const url=(action,extra={})=>`${endpoint}?${new URLSearchParams({[queryKey]:action,...extra})}`;
  async function parse(response) {
    let data;
    try {data=await response.json();} catch {throw new Error('Der Upload-Dienst ist gerade nicht erreichbar.');}
    if(!response.ok || !data.ok) throw new Error(data.error || 'Die Datei konnte nicht gespeichert werden.');
    return data;
  }
  const json=(action,data,abortSignal=signal)=>fetch(url(action),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',[csrfHeader]:csrf},body:JSON.stringify(data),signal:abortSignal}).then(parse);
  let pending;
  try {
    pending=await json('upload-begin',{...metadata,name:file.name,size:file.size});
    for(let offset=0;offset<file.size;offset+=pending.chunkBytes) {
      await parse(await fetch(url('upload-chunk',{id:pending.id,part:offset/pending.chunkBytes}),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream',[csrfHeader]:csrf},body:file.slice(offset,offset+pending.chunkBytes),signal}));
      onProgress({lengthComputable:true,loaded:Math.min(file.size,offset+pending.chunkBytes),total:file.size});
    }
    return await json('upload-finish',{id:pending.id});
  } catch(error) {
    if(pending) await json('upload-cancel',{id:pending.id},null).catch(()=>{});
    throw error;
  }
};
