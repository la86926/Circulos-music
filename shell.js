/* Círculos Music · lo común a todas las páginas
   Tema claro/oscuro, logo según el tema, menú lateral, aviso breve (toast),
   modo sin internet (service worker) y la opción opcional de instalar como app. */
(()=>{
'use strict';
const root=document.documentElement,media=matchMedia('(prefers-color-scheme: dark)');
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const LOGO={light:'logo.svg?v=3',dark:'logo-dark.svg?v=3'};

/* ───────── Tema ───────── */
const currentTheme=()=>store.get('circulos-theme')||'system';
function paintTheme(choice=currentTheme()){
  const resolved=choice==='system'?(media.matches?'dark':'light'):choice;
  root.dataset.theme=resolved;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=resolved==='dark'?'#0e1116':'#f4f6f9';
  document.querySelectorAll('img[data-logo]').forEach(img=>{const src=LOGO[resolved];if(!img.src.endsWith(src))img.src=src;});
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===choice));
}
document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{store.set('circulos-theme',b.dataset.themeChoice);paintTheme(b.dataset.themeChoice);}));
media.addEventListener?.('change',()=>{if(currentTheme()==='system')paintTheme('system');});
paintTheme();

/* ───────── Menú lateral ───────── */
const menu=document.getElementById('sideMenu'),backdrop=document.getElementById('menuBackdrop'),menuBtn=document.getElementById('menuBtn'),closeBtn=document.getElementById('menuCloseBtn');
function toggleMenu(open){
  document.body.classList.toggle('menu-open',open);
  menu?.classList.toggle('open',open);backdrop?.classList.toggle('open',open);
  menu?.setAttribute('aria-hidden',String(!open));backdrop?.setAttribute('aria-hidden',String(!open));
  menuBtn?.setAttribute('aria-expanded',String(open));
}
menuBtn?.addEventListener('click',()=>toggleMenu(true));
closeBtn?.addEventListener('click',()=>toggleMenu(false));
backdrop?.addEventListener('click',()=>toggleMenu(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleMenu(false);});

/* Agrega una opción al menú (la usan favoritos, tutorial e instalar) */
function addMenuItem({id,icon,title,subtitle,onClick,before}){
  const picker=document.querySelector('.app-picker');if(!picker||document.getElementById(id))return null;
  const item=document.createElement('button');item.type='button';item.id=id;item.className='app-choice app-extra';
  item.innerHTML=`<span class="app-choice-icon">${icon}</span><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}`;
  item.addEventListener('click',()=>{toggleMenu(false);setTimeout(onClick,280);});
  const ref=before?picker.querySelector(before):null;
  ref?picker.insertBefore(item,ref):picker.appendChild(item);
  return item;
}

/* ───────── Aviso breve ───────── */
let toastTimer=0;
function toast(message){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ───────── Sin internet: la web queda guardada en el dispositivo ───────── */
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

/* ───────── Instalar como app (solo si la persona quiere) ───────── */
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ICON_INSTALL='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 8v6.5M9.2 11.8 12 14.6l2.8-2.8"/></svg>';
let deferredPrompt=null;
addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  addMenuItem({id:'installItem',icon:ICON_INSTALL,title:'Instalar app',subtitle:'Úsala desde tu pantalla de inicio.',onClick:async()=>{
    if(!deferredPrompt)return;deferredPrompt.prompt();const choice=await deferredPrompt.userChoice.catch(()=>null);
    if(choice?.outcome==='accepted')document.getElementById('installItem')?.remove();deferredPrompt=null;
  }});
});
addEventListener('appinstalled',()=>{document.getElementById('installItem')?.remove();toast('¡Listo! Ya está en tu pantalla de inicio.');});
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function iosHelp(){
  let sheet=document.getElementById('installSheet');
  if(!sheet){
    sheet=document.createElement('div');sheet.id='installSheet';sheet.className='app-sheet';
    sheet.innerHTML=`<div class="app-sheet-backdrop" data-close></div><section class="app-sheet-card" role="dialog" aria-modal="true" aria-labelledby="installTitle">
      <button class="app-sheet-close" type="button" data-close aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <h2 id="installTitle">Instalar en tu iPhone</h2>
      <ol class="install-steps"><li>Toca el botón <b>Compartir</b> <svg class="ios-share" viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/></svg> de Safari.</li><li>Elige <b>Agregar a inicio</b>.</li><li>Toca <b>Agregar</b>. Se abrirá como una app, también sin internet.</li></ol>
    </section>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click',e=>{if(e.target.closest('[data-close]'))sheet.classList.remove('open');});
  }
  requestAnimationFrame(()=>sheet.classList.add('open'));
}
if(isIOS&&!standalone)addEventListener('DOMContentLoaded',()=>setTimeout(()=>addMenuItem({id:'installItem',icon:ICON_INSTALL,title:'Instalar app',subtitle:'Úsala desde tu pantalla de inicio.',onClick:iosHelp}),0));

window.CirculosShell={toast,addMenuItem,toggleMenu,paintTheme};
})();
