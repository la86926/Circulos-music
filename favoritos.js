/* Círculos Music · Mis acordes (favoritos) con nick, sin contraseña
   Los favoritos se guardan siempre en el dispositivo. Si la persona crea un nick, además se guardan en la nube
   y aparecen en cualquier dispositivo donde escriba ese mismo nick.
   Usa el mismo proyecto de Firebase que la app de ajedrez (inicio de sesión anónimo + Firestore).
   Para no mezclar datos, cada nick se guarda en el documento "circulos<nick>" de la colección "progresos". */
'use strict';

const FIREBASE='https://www.gstatic.com/firebasejs/12.18.0/';
const firebaseConfig={
  apiKey:'AIzaSyCGcl98D7288m_iyOWlc_ffTISg85-LVpw',
  authDomain:'chess86926.firebaseapp.com',
  projectId:'chess86926',
  storageBucket:'chess86926.firebasestorage.app',
  messagingSenderId:'341510503521',
  appId:'1:341510503521:web:b2afc3127bcd78326a7e20'
};
const COLLECTION='progresos',DOC_PREFIX='circulos';
const KEY_FAVS='circulos-favs',KEY_NICK='circulos-nick',KEY_CLIENT='circulos-client';
const NICK_RE=/^[A-Za-z0-9]{4,24}$/;

const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const clientId=store.get(KEY_CLIENT)||(()=>{const id=(crypto.randomUUID?crypto.randomUUID():'c'+Date.now().toString(36)+Math.random().toString(36).slice(2));store.set(KEY_CLIENT,id);return id;})();
const lib=()=>window.CirculosChords;
const toast=m=>window.CirculosShell?.toast(m);

let favs=(()=>{try{const v=JSON.parse(store.get(KEY_FAVS)||'[]');return Array.isArray(v)?v.filter(f=>f&&f.id):[];}catch(e){return[];}})();
let nick=store.get(KEY_NICK)||'';
let cloud={state:nick?'busy':'off',text:''};   // off | busy | ok | error

/* ───────── Datos locales ─────────
   Cada favorito es {id, k?, s, t}: id = acorde; k = una sola variación ("g3" posición de guitarra, "p1" forma de piano) */
const keyOf=f=>f.id+(f.k?':'+f.k:'');
const has=key=>favs.some(f=>keyOf(f)===key);
const hasAny=id=>favs.some(f=>f.id===id);
function saveLocal(){store.set(KEY_FAVS,JSON.stringify(favs));refreshAll();}
function toggleKey(key){
  const [id,k]=String(key).split(':'),entry=lib()?.byId(id);if(!entry)return;
  const what=!k?'':k[0]==='p'?'Forma de piano ':'Posición ';
  if(has(key)){favs=favs.filter(f=>keyOf(f)!==key);toast(`${what?what+'quitada':'Quitado'} de Mis acordes`);}
  else{favs=[{id,...(k?{k}:{}),s:entry.s,t:Date.now()},...favs];toast(`${what?what+'guardada':'Guardado'} en Mis acordes`);}
  saveLocal();scheduleUpload();
}
const toggle=entry=>entry&&toggleKey(entry.id);

/* ───────── Nube (Firebase) ───────── */
let fb=null,ref=null,stopSnap=null,uploadTimer=0,lastUpload=0;
async function firebase(){
  if(fb)return fb;
  const [appMod,authMod,fs]=await Promise.all([import(FIREBASE+'firebase-app.js'),import(FIREBASE+'firebase-auth.js'),import(FIREBASE+'firebase-firestore.js')]);
  const app=appMod.initializeApp(firebaseConfig);
  const auth=authMod.getAuth(app);
  await authMod.signInAnonymously(auth);
  fb={db:fs.getFirestore(app),fs};
  return fb;
}
function setCloud(state,text=''){cloud={state,text};refreshSheet();}
function merge(remote,local){
  const out=[...remote],ids=new Set(remote.map(keyOf));
  local.forEach(f=>{if(!ids.has(keyOf(f)))out.push(f);});
  return out;
}
async function connect(name,{silent=false}={}){
  name=String(name||'').trim();
  if(!NICK_RE.test(name))throw new Error('Usa solo letras y números, de 4 a 24 caracteres.');
  setCloud('busy','Conectando…');
  const {db,fs}=await firebase();
  stopSnap?.();
  ref=fs.doc(db,COLLECTION,DOC_PREFIX+name.toLowerCase());
  const snap=await fs.getDoc(ref);
  const remote=snap.exists()&&Array.isArray(snap.data().favoritos)?snap.data().favoritos:[];
  favs=merge(remote,favs);
  nick=name;store.set(KEY_NICK,nick);saveLocal();
  await upload();
  stopSnap=fs.onSnapshot(ref,s=>{
    if(!s.exists())return;
    const d=s.data();
    if(d.updatedBy===clientId&&Date.now()-lastUpload<2500)return;
    if(Array.isArray(d.favoritos)){favs=d.favoritos;saveLocal();}
    setCloud('ok');
  },()=>setCloud('error'));
  setCloud('ok');
  if(!silent)toast(snap.exists()?`¡Hola, ${nick}! Tus acordes ya están aquí.`:`Listo, ${nick}. Tus acordes se guardan en la nube.`);
}
async function upload(){
  if(!ref||!fb)return;
  lastUpload=Date.now();
  await fb.fs.setDoc(ref,{app:'circulos-music',nick,favoritos:favs,timestamp:fb.fs.serverTimestamp(),updatedBy:clientId,schemaVersion:1},{merge:true});
}
function scheduleUpload(){
  if(!nick)return;
  clearTimeout(uploadTimer);
  uploadTimer=setTimeout(()=>{setCloud('busy','Guardando…');upload().then(()=>setCloud('ok')).catch(()=>setCloud('error'));},600);
}
function signOut(){
  stopSnap?.();stopSnap=null;ref=null;nick='';store.del(KEY_NICK);setCloud('off');
  toast('Saliste. Tus acordes siguen en este dispositivo.');
}

/* ───────── Corazones ─────────
   Cualquier botón con data-fav-key guarda o quita ese acorde o variación (las tarjetas los traen ya dibujados). */
document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-fav-key]');if(!b||!b.dataset.favKey)return;
  toggleKey(b.dataset.favKey);b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
});
function markHearts(root=document){
  root.querySelectorAll('[data-fav-key]').forEach(b=>{const on=!!b.dataset.favKey&&has(b.dataset.favKey);
    if(b.classList.contains('is-on')!==on){b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));b.title=on?'Quitar de Mis acordes':'Guardar en Mis acordes';}});
}
let markQueued=false;
new MutationObserver(()=>{if(markQueued)return;markQueued=true;requestAnimationFrame(()=>{markQueued=false;markHearts();markCards();});}).observe(document.documentElement,{childList:true,subtree:true});

const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-7.4-4.5-9.1-9.2C1.8 7.8 3.9 4.6 7.2 4.6c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.4 3.2 4.3 6.4-1.7 4.7-9.1 9.2-9.1 9.2Z"/></svg>';
/* Círculos: corazón del acorde elegido en la rueda y acciones de la inversión de piano */
const circleHead=document.getElementById('chordActions');
if(circleHead){
  const heart=document.createElement('button');heart.type='button';heart.className='act-btn act-fav';heart.innerHTML=HEART;
  heart.setAttribute('aria-label','Guardar este acorde en Mis acordes');circleHead.prepend(heart);
  const pianoBox=document.getElementById('pianoActions');
  const refresh=()=>{
    const c=window.circulosChord,entry=c&&lib()?.findTriad(c.rootPc,c.quality);
    heart.dataset.favKey=entry?entry.id:'';heart.disabled=!entry;
    if(pianoBox){
      const inv=document.querySelector('#pianoPanel [data-inversion].active')?.dataset.inversion||'0';
      pianoBox.innerHTML=entry?lib().actionsHtml(`${entry.id}:p${inv}`,{small:true,what:'esta inversión'}):'';
    }
    markHearts();
  };
  document.addEventListener('circulos:chord',()=>lib()?.load().then(refresh).catch(()=>{}));
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-inversion]'))setTimeout(refresh,0);});
  lib()?.load().then(refresh).catch(()=>{});
}

/* Marca ♥ en las tarjetas de la biblioteca (si se guardó el acorde o alguna de sus variaciones) */
function markCards(root=document){root.querySelectorAll('.chord-catalog-card[data-chord-id]').forEach(c=>c.classList.toggle('is-fav',c.dataset.var?has(c.dataset.chordId+':'+c.dataset.var):hasAny(c.dataset.chordId)));}
const grid=document.getElementById('chordCatalogGrid');

/* ───────── Hoja "Mis acordes" ───────── */
let sheet=null;
function openSheet(){
  if(!sheet){
    sheet=document.createElement('div');sheet.className='app-sheet';sheet.id='favSheet';
    sheet.innerHTML=`<div class="app-sheet-backdrop" data-close></div>
      <section class="app-sheet-card fav-card" role="dialog" aria-modal="true" aria-labelledby="favTitle">
        <button class="app-sheet-close" type="button" data-close aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <h2 id="favTitle">Mis acordes</h2>
        <div class="fav-account" id="favAccount"></div>
        <div class="chord-catalog-grid fav-grid" id="favGrid"></div>
      </section>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click',e=>{
      if(e.target.closest('[data-close]')){sheet.classList.remove('open');document.dispatchEvent(new CustomEvent('circulos:favsheet',{detail:false}));return;}
      const card=e.target.closest('[data-chord-id]');if(card)lib()?.openDetail(card.dataset.chordId,card.dataset.var?{focus:card.dataset.var}:{});
    });
    sheet.addEventListener('submit',async e=>{
      e.preventDefault();const input=sheet.querySelector('#favNick'),msg=sheet.querySelector('.fav-error');
      try{msg.textContent='';await connect(input.value);}catch(err){msg.textContent=err.message||'No se pudo conectar. Revisa tu internet.';setCloud(nick?'error':'off');}
    });
    sheet.addEventListener('click',e=>{if(e.target.closest('[data-signout]'))signOut();});
  }
  refreshSheet();
  lib()?.load().then(refreshSheet).catch(()=>{});
  requestAnimationFrame(()=>{sheet.classList.add('open');document.dispatchEvent(new CustomEvent('circulos:favsheet',{detail:true}));});
}
function refreshSheet(){
  if(!sheet)return;
  const acc=sheet.querySelector('#favAccount');
  if(nick){
    const label={ok:'Sincronizado',busy:cloud.text||'Conectando…',error:'Sin conexión: guardado en este dispositivo',off:''}[cloud.state];
    acc.innerHTML=`<div class="fav-user"><span class="fav-dot is-${cloud.state}"></span><div><strong>${escapeHtml(nick)}</strong><small>${label}</small></div><button type="button" class="fav-link" data-signout>Salir</button></div>`;
  }else if(!acc.querySelector('form')){
    acc.innerHTML=`<form class="fav-form" autocomplete="off"><label for="favNick">Crea o escribe tu nick para tener tus acordes en cualquier dispositivo.</label>
      <div class="fav-row"><input id="favNick" maxlength="24" placeholder="Tu nick" autocapitalize="off" spellcheck="false" inputmode="text"><button type="submit">Entrar</button></div><p class="fav-error" role="alert"></p></form>`;
  }
  const g=sheet.querySelector('#favGrid'),L=lib();
  if(!favs.length){g.innerHTML='<div class="chord-empty"><strong>Aún no tienes acordes</strong><span>Toca ♡ en un acorde, o en una sola posición, para guardarlo aquí.</span></div>';return;}
  g.innerHTML=favs.map(f=>{const e=L?.byId(f.id);return e?(f.k?L.variantCardHtml(e,f.k):L.cardHtml(e)):'';}).join('')||'<div class="chord-empty"><strong>Cargando…</strong></div>';
  markCards(g);
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function refreshAll(){markHearts();markCards();refreshSheet();}

const ICON_FAV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19.5s-6.8-4.1-8.4-8.4C2.6 8.2 4.5 5.3 7.5 5.3c1.8 0 3.3 1 4.5 2.6 1.2-1.6 2.7-2.6 4.5-2.6 3 0 4.9 2.9 3.9 5.8-1.6 4.3-8.4 8.4-8.4 8.4Z"/></svg>';
window.CirculosShell?.addMenuItem({id:'favMenuItem',icon:ICON_FAV,title:'Mis acordes',subtitle:'Tus favoritos, en todos tus dispositivos.',onClick:openSheet});
window.CirculosFavs={open:openSheet,has,toggle,toggleKey,isOpen:()=>!!sheet?.classList.contains('open'),get nick(){return nick;},get count(){return favs.length;}};

/* Si ya tenía nick, se reconecta solo */
if(nick)connect(nick,{silent:true}).catch(()=>setCloud('error'));
