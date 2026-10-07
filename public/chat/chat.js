/* Academy Fi integration of the supplied Discord clone's server/channel/chat flow. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const paths = {
    hash: '<path d="M4 9h16M3 15h16M10 3 8 21M16 3l-2 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 21l2.2-5.2A8.5 8.5 0 1 1 21 11.5Z"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 .6-10A7 7 0 0 1 21 11a3.5 3.5 0 0 1-1 7H7Z"/>',
    home: '<path d="m3 10 9-7 9 7v10H3ZM9 20v-8h6v8"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.8"/><circle cx="9" cy="7" r="4"/><path d="M16 3.2a4 4 0 0 1 0 7.6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/>',
    send: '<path d="m22 2-7 20-4-9-9-4ZM22 2 11 13"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 15h8M8 18h5"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-2 2 1 3-2-1-3 2-2-2-3-3-1-1-3Z"/>',
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key,value);
    svg.innerHTML = paths[name] || paths.chat;
    return svg;
  }
  function applyIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon))); }
  function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
  function button(label, className, action, symbol) { const element = node('button',className); element.type='button'; if(symbol) element.append(icon(symbol)); if(label) element.append(document.createTextNode(label)); element.addEventListener('click',event => { try { Promise.resolve(action(event)).catch(error => notify(error.message)); } catch(error) { notify(error.message); } }); return element; }
  function initials(name) { return String(name).trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase(); }
  function avatar(name, small = false, online = false) { return node('span',`avatar${small?' small':''}${online?' online-avatar':''}`,initials(name)); }
  function notify(message) { $('toast').textContent=message; $('toast').hidden=false; clearTimeout(notify.timer); notify.timer=setTimeout(() => { $('toast').hidden=true; },5000); }
  const roles = {ADMIN:'Inhaber',MODERATOR:'Moderator',GUEST:'Mitglied'};
  let profile = null, csrf = '', iceServers = [], events = null, onlineStorage = false;
  let data = {servers:[],channels:[],members:[],directs:[]};
  let serverId = 'academy-fi', channelId = 'allgemein', directId = null, activeMessages = [], hasMore = false;
  let attachment = null, uploading = false, sending = false, generation = 0, messageSignature = '', refreshing = false, refreshAgain = false, membersOpen = innerWidth > 1200;
  const destination = () => directId ? {memberId:directId} : {channelId};
  const selectedServer = () => data.servers.find(server => server.id===serverId);
  const selectedChannel = () => data.channels.find(channel => channel.id===channelId);
  const selectedMember = () => data.members.find(member => member.id===directId);
  const myRole = () => selectedServer()?.role || 'GUEST';
  async function api(action, payload, extra = {}) {
    const query = new URLSearchParams({action,...extra});
    const response = await fetch(`/api/chat?${query}`, payload === undefined ? {credentials:'same-origin',cache:'no-store'} : {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-chat-csrf':csrf},body:JSON.stringify(payload)});
    let result; try { result=await response.json(); } catch { throw new Error('Der Chat ist gerade nicht erreichbar.'); }
    if(response.status===401) { await showGate(); throw new Error(result.error); }
    if(!response.ok || !result.ok) throw new Error(result.error || 'Die Aktion ist fehlgeschlagen.');
    return result;
  }
  async function showGate(message = 'Melde dich mit deinem bestehenden Website-Konto an, um den Chat zu nutzen.') {
    events?.close(); events=null; await leaveMedia(); profile=null;
    $('chatShell').hidden=true; $('loginGate').hidden=false; $('gateMessage').textContent=message; $('signInLink').hidden=false;
  }
  async function start() {
    $('retrySession').hidden=true;
    try {
      const session = await api('session');
      if(!session.profile) { await showGate(); return; }
      profile=session.profile; csrf=session.csrf; iceServers=session.iceServers; onlineStorage=Boolean(session.onlineStorage);
      $('selfAvatar').textContent=initials(profile.name); $('selfName').textContent=profile.name;
      $('loginGate').hidden=true; $('chatShell').hidden=false;
      $('membersPanel').hidden=!membersOpen; $('chatShell').classList.toggle('members-hidden',!membersOpen); $('toggleMembers').setAttribute('aria-expanded',String(membersOpen));
      await refresh();
      const invite = new URLSearchParams(location.search).get('invite');
      if(invite) {
        const joined=await api('join-server',{invite}); serverId=joined.result.id; channelId=null; directId=null; await refresh();
        history.replaceState(null,'',location.pathname);
        notify('Du bist dem Server beigetreten.');
      }
      connectEvents();
    } catch(error) { $('gateMessage').textContent=error.message; $('retrySession').hidden=false; }
  }
  function connectEvents() {
    events?.close(); events=new EventSource('/api/chat?action=events');
    events.onopen=() => { $('connectionStatus').textContent='Live verbunden'; $('connectionStatus').classList.add('connected'); };
    events.onmessage=() => refresh().catch(error => notify(error.message));
    events.onerror=() => { $('connectionStatus').textContent='Verbindung wird erneuert…'; $('connectionStatus').classList.remove('connected'); };
  }
  async function refresh() {
    if(!profile) return;
    if(refreshing) { refreshAgain=true; return; }
    refreshing=true;
    try {
      do {
        refreshAgain=false;
        const snapshot=await api('state'); if(!profile) return; data=snapshot;
        if(!selectedServer()) { serverId=data.servers[0]?.id; channelId=null; directId=null; activeMessages=[]; messageSignature=''; generation++; await leaveMedia(); }
        if(!directId && !selectedChannel()) { channelId=data.channels.find(channel => channel.serverId===serverId)?.id; activeMessages=[]; messageSignature=''; generation++; }
        if(directId && !selectedMember()) { directId=null; channelId=data.channels.find(channel => channel.serverId===serverId)?.id; activeMessages=[]; messageSignature=''; generation++; await leaveMedia(); }
        renderNavigation(); renderHeader();
        if(channelId || directId) {
          const expected=generation;
          const result=await api('messages',undefined,destination());
          if(expected!==generation) { refreshAgain=true; continue; }
          const first=result.messages[0]?.seq || Infinity;
          activeMessages=[...activeMessages.filter(message => message.seq<first),...result.messages];
          if(activeMessages.length===result.messages.length) hasMore=result.hasMore;
          renderMessages();
        }
      } while(refreshAgain && profile);
    } finally { refreshing=false; }
  }
  function renderNavigation() {
    const server=selectedServer(); $('serverName').textContent=server?.name || 'Academy Fi';
    $('serverList').replaceChildren(...data.servers.map(item => {
      const element=button(initials(item.name),`server-circle${item.id===serverId?' active':''}`,() => chooseServer(item.id)); element.setAttribute('aria-label',`Server ${item.name}`); element.title=item.name; element.setAttribute('aria-pressed',String(item.id===serverId)); return element;
    }));
    const search=$('sidebarSearch').value.toLowerCase(); const groups=[];
    for(const [type,label,symbol] of [['TEXT','Textkanäle','hash'],['AUDIO','Sprachkanäle','mic'],['VIDEO','Videokanäle','video']]) {
      const heading=node('div','section-heading'); heading.append(node('span','',label));
      if(server?.ownerId===null || myRole()!=='GUEST') { const add=button('','',() => channelDialog(type),'plus'); add.setAttribute('aria-label',`${label}: Kanal erstellen`); heading.append(add); }
      groups.push(heading);
      for(const channel of data.channels.filter(item => item.serverId===serverId && item.type===type && item.name.toLowerCase().includes(search))) {
        const row=node('div',`channel-row${!directId && channel.id===channelId?' active':''}`);
        const select=button('','',() => chooseChannel(channel.id),symbol); select.append(node('span','',channel.name)); select.setAttribute('aria-label',`${label}: ${channel.name}`); select.setAttribute('aria-pressed',String(!directId && channel.id===channelId)); row.append(select);
        if(channel.creatorId && (myRole()!=='GUEST' || channel.creatorId===profile.id)) { const settings=button('','channel-settings',() => channelSettings(channel),'settings'); settings.setAttribute('aria-label',`Kanal ${channel.name} verwalten`); row.append(settings); }
        groups.push(row);
      }
    }
    $('channelList').replaceChildren(...groups);
    const directRows=data.directs.filter(member => member.name.toLowerCase().includes(search)).map(member => {
      const element=button(' ',`direct-row${directId===member.id?' active':''}`,() => chooseDirect(member.id)); element.prepend(avatar(member.name,true)); element.append(node('span','',member.name)); return element;
    });
    $('directList').replaceChildren(...directRows); $('directHint').hidden=directRows.length>0;
    const members=data.members.filter(member => member.serverId===serverId && member.name.toLowerCase().includes(search));
    $('memberList').replaceChildren(...members.map(member => {
      const element=button('','member-button',() => { if(member.id!==profile.id) chooseDirect(member.id); });
      const online=Date.now()-member.lastSeen<45_000;
      element.append(avatar(member.name,true,online)); const label=node('span'); label.append(node('strong','',`${member.name}${member.id===profile.id?' (du)':''}`),node('small','',`${roles[member.role]} · ${online?'Online':'Offline'}`)); element.append(label); element.setAttribute('aria-label',member.id===profile.id?`Dein Konto: ${member.name}`:`Direktnachricht an ${member.name}`); return element;
    }));
  }
  function renderHeader() {
    const channel=selectedChannel(); const member=selectedMember();
    const name=directId?(member?.name || 'Direktnachricht'):(channel?.name || 'Chat');
    const symbol=directId?'chat':channel?.type==='AUDIO'?'mic':channel?.type==='VIDEO'?'video':'hash';
    $('chatName').textContent=name; $('chatIcon').replaceChildren(icon(symbol));
    $('chatSubtitle').textContent=directId?'Private Direktnachricht':channel?.type==='TEXT'?'Der gemeinsame Chat für Academy Fi':channel?.type==='VIDEO'?'Gemeinsam sehen und sprechen':'Gemeinsam sprechen';
    $('welcomeTitle').textContent=directId?`Chat mit ${name}`:`Willkommen in #${name}`;
    $('welcomeText').textContent=directId?'Diese Nachrichten können nur ihr beide lesen.':'Hier beginnt euer Austausch. Nachrichten und Dateien bleiben in diesem Kanal gespeichert.';
    $('chatWelcome').querySelector('.welcome-icon').replaceChildren(icon(symbol));
    $('messageInput').placeholder=directId?`Nachricht an ${name}`:`Nachricht an #${name}`;
    const media=(!directId && channel?.type!=='TEXT') || Boolean(callState);
    $('mediaPanel').hidden=!media; $('messageScroll').hidden=media; $('messageForm').hidden=media;
    $('audioCall').hidden=!directId || Boolean(callState); $('videoCall').hidden=!directId || Boolean(callState);
    $('mediaTitle').textContent=directId?`Anruf mit ${name}`:name;
    const video=channel?.type==='VIDEO'; $('mediaIcon').replaceChildren(icon(video?'video':'mic'));
    $('mediaDescription').textContent=video?'Tritt dem Raum bei, um gemeinsam zu sprechen und die Kamera zu nutzen.':'Tritt dem Raum bei, um mit den anderen zu sprechen.';
  }
  function closeSidebar() { $('channelSidebar').classList.remove('mobile-open'); $('mobileMenu').setAttribute('aria-expanded','false'); }
  async function changeTarget() { await leaveMedia(); generation++; activeMessages=[]; hasMore=false; messageSignature=''; clearAttachment(); $('messageInput').value=''; closeSidebar(); await refresh(); }
  async function chooseServer(id) { if(id===serverId && !directId) { closeSidebar(); return; } serverId=id; channelId=data.channels.find(item => item.serverId===id)?.id; directId=null; await changeTarget(); }
  async function chooseChannel(id) { if(id===channelId && !directId) { closeSidebar(); return; } channelId=id; directId=null; await changeTarget(); }
  async function chooseDirect(id) { if(id===profile.id || id===directId) return; directId=id; await changeTarget(); }
  function renderMessages(force = false) {
    const signature=JSON.stringify(activeMessages); if(!force && signature===messageSignature) return; messageSignature=signature;
    const scroll=$('messageScroll'); const atBottom=scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<120 || scroll.scrollTop===0;
    const result=activeMessages.map(message => {
      const item=node('article','message'); item.dataset.messageId=message.id; item.append(avatar(message.authorName));
      const body=node('div','message-body'); const meta=node('div','message-meta');
      meta.append(button(message.authorName,'author-button',() => { if(message.authorId!==profile.id) chooseDirect(message.authorId); }));
      const member=data.members.find(person => person.id===message.authorId && person.serverId===serverId);
      if(!directId && member?.role!=='GUEST' && member?.role) meta.append(node('span','role-badge',roles[member.role]));
      const time=node('time','',new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(message.createdAt)); time.dateTime=new Date(message.createdAt).toISOString(); meta.append(time); body.append(meta);
      const text=node('p',`message-content${message.deleted?' deleted':''}`,message.deleted?'Diese Nachricht wurde gelöscht.':message.content); if(message.editedAt && !message.deleted) text.append(node('span','edited','(bearbeitet)')); body.append(text);
      if(message.attachmentId && !message.deleted) {
        const href=`/api/chat?action=attachment&id=${encodeURIComponent(message.attachmentId)}`;
        const link=node('a','file-card'); link.href=href; link.target='_blank'; link.rel='noopener noreferrer'; link.append(icon('file')); const label=node('span','',message.fileName); label.append(node('small','',`${(message.fileSize/1024).toFixed(1)} KB · Öffnen / herunterladen`)); link.append(label); body.append(link);
        if(['image/png','image/jpeg','image/gif','image/webp'].includes(message.fileMime)) { const image=node('img','message-image'); image.src=href; image.alt=message.fileName; image.loading='lazy'; body.append(image); }
      }
      item.append(body);
      if(!message.deleted) {
        const own=message.authorId===profile.id; const actions=node('div','message-actions');
        if(own) { const edit=button('','icon-button',() => editDialog(message),'edit'); edit.setAttribute('aria-label','Nachricht bearbeiten'); actions.append(edit); }
        if(own || (!directId && myRole()!=='GUEST')) { const remove=button('','icon-button',() => confirmDialog('Nachricht löschen','Die Nachricht wird für alle als gelöscht angezeigt.',async () => { await api('delete-message',{id:message.id}); await refresh(); }),'trash'); remove.setAttribute('aria-label','Nachricht löschen'); actions.append(remove); }
        if(actions.children.length) item.append(actions);
      }
      return item;
    });
    $('messageList').replaceChildren(...result); $('loadOlder').hidden=!hasMore;
    if(atBottom) scroll.scrollTop=scroll.scrollHeight;
  }
  async function loadOlder() {
    if(!activeMessages.length) return;
    const expected=generation; const scroll=$('messageScroll'),height=scroll.scrollHeight,top=scroll.scrollTop;
    $('loadOlder').disabled=true;
    try { const result=await api('messages',undefined,{...destination(),before:String(activeMessages[0].seq)}); if(expected!==generation)return; activeMessages=[...result.messages,...activeMessages]; hasMore=result.hasMore; renderMessages(true); scroll.scrollTop=top+scroll.scrollHeight-height; }
    catch(error) { notify(error.message); } finally { $('loadOlder').disabled=false; }
  }
  function clearAttachment() { attachment=null; $('attachmentInput').value=''; $('pendingAttachment').hidden=true; }
  async function uploadFile(file) {
    if(!file || uploading) return;
    if(file.size>25*1024*1024 || !file.size) { notify('Wähle eine Datei zwischen 1 Byte und 25 MB.'); return; }
    const expected=generation; const form=new FormData(); form.append('file',file); Object.entries(destination()).forEach(([key,value])=>form.append(key,value));
    uploading=true; $('sendButton').disabled=true; $('pendingAttachment').hidden=false; $('pendingName').textContent=`${file.name} wird hochgeladen…`;
    try {
      let result;
      if(onlineStorage) result=await window.AcademyFileUpload({endpoint:'/api/chat',csrfHeader:'x-chat-csrf',csrf,file,metadata:destination()});
      else {
        const response=await fetch('/api/chat?action=upload',{method:'POST',credentials:'same-origin',headers:{'x-chat-csrf':csrf},body:form}); result=await response.json();
        if(!response.ok || !result.ok) throw new Error(result.error || 'Der Upload ist fehlgeschlagen.');
      }
      if(expected!==generation) return;
      attachment=result.attachment; $('pendingName').textContent=attachment.name;
    } catch(error) { clearAttachment(); notify(error.message); }
    finally { uploading=false; $('sendButton').disabled=false; }
  }
  async function sendMessage(event) {
    event.preventDefault(); if(sending || uploading) return;
    const value=$('messageInput').value.trim(); if(!value && !attachment) return;
    const expected=generation; sending=true; $('sendButton').disabled=true;
    try { await api('send',{...destination(),content:value,attachmentId:attachment?.id}); if(expected===generation) { $('messageInput').value=''; $('messageInput').style.height=''; clearAttachment(); } await refresh(); $('messageScroll').scrollTop=$('messageScroll').scrollHeight; }
    catch(error) { notify(error.message); } finally { sending=false; $('sendButton').disabled=uploading; $('messageInput').focus(); }
  }
  let submitAction=null;
  function openDialog(title, elements, callback, submitText='Speichern') {
    if($('actionDialog').open) $('actionDialog').close();
    $('dialogTitle').textContent=title; $('dialogContent').replaceChildren(...elements); $('dialogError').hidden=true; $('submitDialog').textContent=submitText; $('submitDialog').hidden=!callback; $('cancelDialog').textContent=callback?'Abbrechen':'Schließen'; submitAction=callback; $('actionDialog').showModal();
  }
  function field(name,label,value='',type='text',options=[]) {
    const wrapper=node('label','form-field'); wrapper.append(node('span','',label));
    const input=node(type==='select'?'select':type==='textarea'?'textarea':'input'); input.name=name; if(type==='text') input.type='text'; input.value=value;
    if(type==='select') { options.forEach(([key,text]) => { const option=node('option','',text); option.value=key; input.append(option); }); input.value=value; }
    else { input.maxLength=type==='textarea'?4000:128; input.required=true; }
    wrapper.append(input); return wrapper;
  }
  function confirmDialog(title,text,callback) { openDialog(title,[node('p','dialog-note',text)],callback,'Löschen'); $('submitDialog').classList.add('danger'); }
  $('actionDialog').addEventListener('close',() => $('submitDialog').classList.remove('danger'));
  $('actionForm').addEventListener('submit',async event => {
    event.preventDefault(); if(!submitAction) return; $('submitDialog').disabled=true;
    try { await submitAction(Object.fromEntries(new FormData($('actionForm')))); $('actionDialog').close(); }
    catch(error) { $('dialogError').textContent=error.message; $('dialogError').hidden=false; }
    finally { $('submitDialog').disabled=false; }
  });
  function channelDialog(type='TEXT') { openDialog('Kanal erstellen',[field('name','Kanalname'),field('type','Kanaltyp',type,'select',[['TEXT','Textkanal'],['AUDIO','Sprachraum'],['VIDEO','Videoraum']])],async values => { const result=await api('create-channel',{serverId,...values}); channelId=result.result.id; directId=null; await changeTarget(); },'Erstellen'); }
  function channelSettings(channel) {
    const elements=[field('name','Kanalname',channel.name)];
    elements.push(button('Kanal löschen','danger',() => confirmDialog('Kanal löschen',`Der Kanal „${channel.name}“ und seine Nachrichten werden gelöscht.`,async()=>{ await api('channel',{id:channel.id,remove:true}); await refresh(); }),'trash'));
    openDialog('Kanal verwalten',elements,async values=>{ await api('channel',{id:channel.id,name:values.name}); await refresh(); });
  }
  function editDialog(message) { openDialog('Nachricht bearbeiten',[field('content','Nachricht',message.content,'textarea')],async values=>{ await api('edit-message',{id:message.id,content:values.content}); await refresh(); }); }
  function inviteDialog() {
    const server=selectedServer(); const link=new URL('/chat/index.html',location.origin); link.searchParams.set('invite',server.inviteCode);
    const input=field('invite','Einladungslink',link.href); input.querySelector('input').readOnly=true;
    const copy=button('Link kopieren','primary',async()=>{ try { await navigator.clipboard.writeText(link.href); notify('Einladungslink kopiert.'); } catch { input.querySelector('input').select(); } });
    const elements=[node('p','dialog-note','Mit diesem Link können angemeldete Website-Nutzer deinem Server beitreten.'),input,copy];
    if(myRole()==='ADMIN') elements.push(button('Neuen Einladungslink erzeugen','',async()=>{ try { await api('server',{id:serverId,operation:'invite'}); await refresh(); inviteDialog(); } catch(error){notify(error.message);} }));
    openDialog('Personen einladen',elements,null);
  }
  function manageMembers() {
    const rows=data.members.filter(member=>member.serverId===serverId && member.id!==profile.id).map(member=>{
      const row=node('div','member-management'); row.append(node('span','',member.name)); const select=node('select'); select.setAttribute('aria-label',`Rolle von ${member.name}`);
      for(const [value,label] of [['GUEST','Mitglied'],['MODERATOR','Moderator'],['REMOVE','Entfernen']]) { const option=node('option','',label); option.value=value; select.append(option); } select.value=member.role;
      select.addEventListener('change',async()=>{ if(select.value==='REMOVE') { select.value=member.role; confirmDialog('Mitglied entfernen',`${member.name} wird aus diesem Server entfernt.`,async()=>{await api('member',{serverId,memberId:member.id,role:'REMOVE'});await refresh();});return; } try {await api('member',{serverId,memberId:member.id,role:select.value}); await refresh();}catch(error){notify(error.message);select.value=member.role;} });row.append(select);return row;
    });
    openDialog('Mitglieder verwalten',rows.length?rows:[node('p','dialog-note','Noch keine weiteren Mitglieder.')],null);
  }
  function serverMenu() {
    const server=selectedServer(); if(!server)return;
    const menu=node('div','menu-list'); menu.append(button('Personen einladen','',inviteDialog,'users'));
    if(server.ownerId===null || myRole()!=='GUEST') menu.append(button('Kanal erstellen','',()=>channelDialog(),'plus'));
    if(myRole()==='ADMIN') {
      menu.append(button('Server umbenennen','',()=>openDialog('Server umbenennen',[field('name','Servername',server.name)],async values=>{await api('server',{id:serverId,operation:'rename',name:values.name});await refresh();}),'edit'),button('Mitglieder verwalten','',manageMembers,'users'),button('Server löschen','danger',()=>confirmDialog('Server löschen',`Der Server „${server.name}“ und alle seine Kanäle und Nachrichten werden gelöscht.`,async()=>{await api('server',{id:serverId,operation:'delete'});await refresh();}),'trash'));
    } else if(server.id!=='academy-fi') menu.append(button('Server verlassen','',()=>openDialog('Server verlassen',[node('p','dialog-note','Du kannst über eine Einladung erneut beitreten.')],async()=>{await api('server',{id:serverId,operation:'leave'});await refresh();},'Verlassen')));
    openDialog(server.name,[menu],null);
  }
  // Small peer-to-peer rooms keep the website's login and need no separate account.
  let callState=null;
  function peerKey(peer) { return `${peer.profileId}:${peer.clientId}`; }
  function selfKey(call) { return `${profile.id}:${call.clientId}`; }
  function mediaTile(name,stream,video,own,key) {
    const tile=node('div','call-tile'); tile.dataset.peer=key;
    if(video) { const media=node('video'); media.autoplay=true; media.playsInline=true; media.muted=own; media.srcObject=stream; tile.append(media); media.play().catch(()=>{}); }
    else { tile.append(avatar(name)); if(!own) { const audio=node('audio'); audio.autoplay=true; audio.srcObject=stream; tile.append(audio); audio.play().catch(()=>notify('Klicke im Raum, um den Ton zu aktivieren.')); } }
    tile.append(node('span','call-label',`${name}${own?' (du)':''}`)); return tile;
  }
  async function signalTo(call,peer,payload) { if(callState!==call)return; await api('signal',{...call.target,clientId:call.clientId,recipientId:peer.profileId,recipientClient:peer.clientId,payload}); }
  function createPeer(call,peer) {
    const key=peerKey(peer); if(call.peers.has(key))return call.peers.get(key);
    const connection=new RTCPeerConnection({iceServers}); const entry={peer,connection,candidates:[],started:false}; call.peers.set(key,entry);
    call.stream.getTracks().forEach(track=>connection.addTrack(track,call.stream));
    connection.onicecandidate=event=>{ if(event.candidate)signalTo(call,peer,{type:'candidate',candidate:event.candidate.toJSON()}).catch(()=>{}); };
    connection.ontrack=event=>{
      if(callState!==call)return;
      const existing=[...$('callGrid').children].find(tile=>tile.dataset.peer===key); existing?.remove();
      $('callGrid').append(mediaTile(peer.name,event.streams[0] || new MediaStream([event.track]),call.video,false,key));
    };
    connection.onconnectionstatechange=()=>{ if(connection.connectionState==='failed') notify('Die Verbindung konnte nicht hergestellt werden. Prüfe die Netzwerkverbindung.'); };
    return entry;
  }
  async function handleSignal(call,signal) {
    const peer=call.latestPeers.find(item=>item.profileId===signal.senderId && item.clientId===signal.senderClient); if(!peer)return;
    const entry=createPeer(call,peer), connection=entry.connection, payload=signal.payload;
    if(payload.type==='offer') { await connection.setRemoteDescription({type:'offer',sdp:payload.sdp}); for(const candidate of entry.candidates.splice(0))await connection.addIceCandidate(candidate); await connection.setLocalDescription(await connection.createAnswer()); await signalTo(call,peer,{type:'answer',sdp:connection.localDescription.sdp}); entry.started=true; }
    else if(payload.type==='answer') { await connection.setRemoteDescription({type:'answer',sdp:payload.sdp}); for(const candidate of entry.candidates.splice(0))await connection.addIceCandidate(candidate); }
    else if(payload.type==='candidate') { if(connection.remoteDescription)await connection.addIceCandidate(payload.candidate);else if(entry.candidates.length<100)entry.candidates.push(payload.candidate); }
  }
  async function pollCall(call) {
    if(callState!==call || call.polling)return;call.polling=true;
    try {
      const result=(await api('call',{...call.target,clientId:call.clientId,operation:'heartbeat',after:call.cursor})).result; if(callState!==call)return;
      call.latestPeers=result.peers;
      for(const [key,entry] of call.peers)if(!result.peers.some(peer=>peerKey(peer)===key)){entry.connection.close();call.peers.delete(key);[...$('callGrid').children].find(tile=>tile.dataset.peer===key)?.remove();}
      for(const signal of result.signals) { await handleSignal(call,signal); call.cursor=Math.max(call.cursor,signal.seq); }
      for(const peer of result.peers) {
        const entry=createPeer(call,peer);
        if(!entry.started && selfKey(call)<peerKey(peer)) { entry.started=true; await entry.connection.setLocalDescription(await entry.connection.createOffer()); await signalTo(call,peer,{type:'offer',sdp:entry.connection.localDescription.sdp}); }
      }
      $('callStatus').textContent=result.peers.length?`${result.peers.length+1} im Raum`:'Du bist im Raum · warte auf andere';
    } catch(error) { if(callState===call) { $('callStatus').textContent='Verbindung unterbrochen'; notify(error.message); } }
    finally { call.polling=false; }
  }
  let joiningCall=false;
  async function joinMedia(video) {
    if(callState || joiningCall)return;joiningCall=true;$('joinCall').disabled=true;
    let stream; const expected=generation; const callTarget=destination();
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Mikrofon und Kamera benötigen localhost oder eine sichere HTTPS-Verbindung.');
      stream=await navigator.mediaDevices.getUserMedia({audio:true,video});
      if(expected!==generation || !profile) { stream.getTracks().forEach(track=>track.stop()); return; }
      const call={target:callTarget,clientId:crypto.randomUUID(),stream,video,peers:new Map(),latestPeers:[],cursor:0,polling:false,timer:null};
      await api('call',{...call.target,clientId:call.clientId,operation:'join'});
      if(expected!==generation || !profile) { stream.getTracks().forEach(track=>track.stop()); api('call',{...call.target,clientId:call.clientId,operation:'leave'}).catch(()=>{}); return; }
      callState=call;
      $('callGrid').replaceChildren(mediaTile(profile.name,stream,video,true,selfKey(call)));$('callGrid').hidden=false;$('mediaIntro').hidden=true;$('callControls').hidden=false;$('toggleCamera').hidden=!video;
      $('toggleMic').classList.remove('off');$('toggleCamera').classList.remove('off');renderHeader();
      await pollCall(call);call.timer=setInterval(()=>pollCall(call),1200);
    } catch(error) { stream?.getTracks().forEach(track=>track.stop()); notify(error.name==='NotAllowedError'?'Der Zugriff auf Mikrofon oder Kamera wurde nicht erlaubt.':error.message); }
    finally { joiningCall=false;$('joinCall').disabled=false; }
  }
  async function leaveMedia() {
    const call=callState; if(!call)return;callState=null;clearInterval(call.timer);call.stream.getTracks().forEach(track=>track.stop());call.peers.forEach(entry=>entry.connection.close());
    $('callGrid').replaceChildren();$('callGrid').hidden=true;$('mediaIntro').hidden=false;$('callControls').hidden=true;
    try { await api('call',{...call.target,clientId:call.clientId,operation:'leave'}); } catch {} if(profile)renderHeader();
  }
  $('createServer').addEventListener('click',()=>openDialog('Server erstellen',[field('name','Servername')],async values=>{const result=await api('create-server',values);serverId=result.result.id;channelId=null;directId=null;await changeTarget();},'Erstellen'));
  $('joinServer').addEventListener('click',()=>openDialog('Server beitreten',[field('invite','Einladungslink oder Einladungscode')],async values=>{let invite=values.invite.trim();try{invite=new URL(invite).searchParams.get('invite') || invite;}catch{}const result=await api('join-server',{invite});serverId=result.result.id;channelId=null;directId=null;await changeTarget();},'Beitreten'));
  $('serverMenu').addEventListener('click',serverMenu);$('sidebarSearch').addEventListener('input',renderNavigation);
  $('messageForm').addEventListener('submit',sendMessage);$('messageInput').addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing){event.preventDefault();$('messageForm').requestSubmit();}});
  $('messageInput').addEventListener('input',()=>{$('messageInput').style.height='auto';$('messageInput').style.height=`${Math.min(130,$('messageInput').scrollHeight)}px`;});
  $('attachFile').addEventListener('click',()=>$('attachmentInput').click());$('attachmentInput').addEventListener('change',()=>uploadFile($('attachmentInput').files[0]));$('removeAttachment').addEventListener('click',clearAttachment);
  $('loadOlder').addEventListener('click',loadOlder);$('cancelDialog').addEventListener('click',()=>$('actionDialog').close());$('closeDialog').addEventListener('click',()=>$('actionDialog').close());
  $('retrySession').addEventListener('click',start);$('mobileMenu').addEventListener('click',()=>{const open=$('channelSidebar').classList.toggle('mobile-open');$('mobileMenu').setAttribute('aria-expanded',String(open));});$('closeMobileSidebar').addEventListener('click',closeSidebar);
  $('toggleMembers').addEventListener('click',()=>{membersOpen=!membersOpen;$('membersPanel').hidden=!membersOpen;$('chatShell').classList.toggle('members-hidden',!membersOpen);$('toggleMembers').setAttribute('aria-expanded',String(membersOpen));});
  $('emojiPicker').replaceChildren(...['😀','😊','😂','😍','🥳','😎','🤔','🙌','👍','👎','👏','🙏','💚','❤️','🎉','🚀','💡','✅','🔥','💪','👀','☕','📚','💻','🐛','✨','🎯','📌','🛠️','🤝'].map(emoji=>button(emoji,'',()=>{$('messageInput').value+=emoji;$('messageInput').focus();$('emojiPicker').hidden=true;$('emojiButton').setAttribute('aria-expanded','false');})));
  $('emojiButton').addEventListener('click',()=>{$('emojiPicker').hidden=!$('emojiPicker').hidden;$('emojiButton').setAttribute('aria-expanded',String(!$('emojiPicker').hidden));});
  document.addEventListener('click',event=>{if(!event.target.closest('#emojiPicker,#emojiButton')){$('emojiPicker').hidden=true;$('emojiButton').setAttribute('aria-expanded','false');}});
  $('joinCall').addEventListener('click',()=>joinMedia(selectedChannel()?.type==='VIDEO'));$('audioCall').addEventListener('click',()=>joinMedia(false));$('videoCall').addEventListener('click',()=>joinMedia(true));$('leaveCall').addEventListener('click',leaveMedia);
  $('toggleMic').addEventListener('click',()=>{if(!callState)return;const tracks=callState.stream.getAudioTracks();const enabled=!tracks[0]?.enabled;tracks.forEach(track=>track.enabled=enabled);$('toggleMic').classList.toggle('off',!enabled);$('toggleMic').setAttribute('aria-label',enabled?'Mikrofon stummschalten':'Mikrofon einschalten');});
  $('toggleCamera').addEventListener('click',()=>{if(!callState)return;const tracks=callState.stream.getVideoTracks();const enabled=!tracks[0]?.enabled;tracks.forEach(track=>track.enabled=enabled);$('toggleCamera').classList.toggle('off',!enabled);$('toggleCamera').setAttribute('aria-label',enabled?'Kamera ausschalten':'Kamera einschalten');});
  addEventListener('pagehide',()=>{events?.close();if(callState){callState.stream.getTracks().forEach(track=>track.stop());fetch('/api/chat?action=call',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','x-chat-csrf':csrf},body:JSON.stringify({...callState.target,clientId:callState.clientId,operation:'leave'})}).catch(()=>{});}});
  setInterval(async()=>{if(!profile)return;try{const session=await api('session');if(!session.profile){await showGate();return;}csrf=session.csrf;await refresh();}catch{}},30_000);
  applyIcons();start();
})();
