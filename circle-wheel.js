(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
const viewport=document.querySelector('meta[name="viewport"]');
if(viewport) viewport.setAttribute('content','width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

/* Corrección específica para el espacio inferior de Chrome en iPhone */
const isChromeIOS=/CriOS/i.test(navigator.userAgent);
const root=document.documentElement;
function syncChromeViewport(){
  const height=Math.round(window.visualViewport?.height||window.innerHeight);
  root.style.setProperty('--app-viewport-height',`${height}px`);
}
if(isChromeIOS){
  root.classList.add('chrome-ios');
  syncChromeViewport();
  window.visualViewport?.addEventListener('resize',syncChromeViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncChromeViewport,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(syncChromeViewport,180),{passive:true});
  requestAnimationFrame(()=>window.scrollTo(0,0));
}

const uiStyle=document.createElement('style');
uiStyle.textContent=`
*{-webkit-tap-highlight-color:transparent}
html,body{touch-action:pan-x pan-y!important;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
#escala,#circlesView>#acordes,#circlesView>#instrumento,#circlesView>#progresion,#bottomNav{display:none!important}
#circlesView .hero-copy,#circlesView .hero-status{display:none!important}
#circlesView .hero{grid-template-columns:1fr;margin-bottom:22px}
#circlesView>.toolbar{display:block;margin-bottom:18px}
#circlesView>.toolbar .control-card{width:100%}
#circlesView>.toolbar .control-card:nth-child(2){display:none!important}
#circlesView>.toolbar .segmented{max-width:420px;margin:0 auto}
.minimal-scale-control{position:relative;display:inline-flex;align-items:center;min-width:142px}
.minimal-scale-select{width:100%;height:38px;appearance:none;-webkit-appearance:none;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--text);padding:0 34px 0 13px;font-size:12px;font-weight:760;cursor:pointer}
.minimal-scale-arrow{position:absolute;right:12px;pointer-events:none;color:var(--muted);font-size:12px}
.white-key.voicing-tone{background:#86d8a4!important;color:#102017!important;box-shadow:inset 0 0 0 3px rgba(31,109,74,.35)}
.white-key.root-tone{background:#1f6d4a!important;color:#fff!important;box-shadow:inset 0 0 0 3px #0d3b28!important}
.black-key.voicing-tone{background:#4fa974!important;color:#fff!important;box-shadow:inset 0 0 0 2px #9be5b6}
.black-key.root-tone{background:#bff3d0!important;color:#0c2d1e!important;box-shadow:inset 0 0 0 3px #2b7d55!important}
html[data-theme="dark"] .white-key.voicing-tone{background:#6fc893!important;color:#07160e!important}
html[data-theme="dark"] .white-key.root-tone{background:#b8efca!important;color:#092015!important;box-shadow:inset 0 0 0 3px #397c58!important}
html[data-theme="dark"] .black-key.voicing-tone{background:#3e8f61!important;color:#fff!important}
html[data-theme="dark"] .black-key.root-tone{background:#d1f8dd!important;color:#0b2116!important}

html.chrome-ios,html.chrome-ios body{height:var(--app-viewport-height)!important;min-height:0!important;max-height:var(--app-viewport-height)!important;overflow:hidden!important;overscroll-behavior:none!important}
html.chrome-ios body{position:fixed!important;inset:0!important;width:100%!important;padding:0!important}
html.chrome-ios .app-header{position:relative!important;top:auto!important}
html.chrome-ios #circlesView,html.chrome-ios #chordsView{height:calc(var(--app-viewport-height) - 72px)!important;min-height:0!important;max-height:calc(var(--app-viewport-height) - 72px)!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch;padding-bottom:max(6px,env(safe-area-inset-bottom))!important}
html.chrome-ios #circlesView .harmony-wheel-panel{margin-bottom:0!important}
@media(max-width:700px){#selector .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.minimal-scale-control{min-width:128px}}
@media(max-width:500px){#selector .panel-head{display:grid;grid-template-columns:1fr auto;align-items:center}.minimal-scale-select{height:36px}.minimal-scale-control{min-width:120px}}
`;
document.head.appendChild(uiStyle);

for(const eventName of ['gesturestart','gesturechange','gestureend']) document.addEventListener(eventName,event=>event.preventDefault(),{passive:false});
document.addEventListener('touchmove',event=>{if(event.touches?.length>1)event.preventDefault();},{passive:false});
document.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)event.preventDefault();},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key))event.preventDefault();});
let lastTouchEnd=0;
document.addEventListener('touchend',event=>{const now=Date.now();if(now-lastTouchEnd<320)event.preventDefault();lastTouchEnd=now;},{passive:false});

/* Nomenclatura visible, primero Inglés y activo por defecto. */
const mainToolbar=document.querySelector('#circlesView>.toolbar');
if(mainToolbar){
  const notationCard=mainToolbar.querySelector('.control-card:first-child');
  const segment=notationCard?.querySelector('.segmented');
  const english=segment?.querySelector('[data-nomenclature="english"]');
  const latin=segment?.querySelector('[data-nomenclature="latin"]');
  if(english&&latin){
    english.textContent='Inglés';
    latin.textContent='Latina';
    segment.append(english,latin);
    if(!english.classList.contains('active')) english.click();
  }
}

/* Escala como selector pequeño. */
const selectorHead=document.querySelector('#selector .panel-head');
const originalModeButtons=[...document.querySelectorAll('#escala [data-mode]')];
if(selectorHead&&originalModeButtons.length&&!document.getElementById('minimalScaleSelect')){
  const control=document.createElement('label');
  control.className='minimal-scale-control';
  control.innerHTML='<select class="minimal-scale-select" id="minimalScaleSelect" aria-label="Tipo de escala"><option value="major">Mayor</option><option value="minor">Menor natural</option></select><span class="minimal-scale-arrow" aria-hidden="true">⌄</span>';
  selectorHead.appendChild(control);
  const select=control.querySelector('select');
  const sync=()=>{const active=originalModeButtons.find(button=>button.classList.contains('active'));if(active)select.value=active.dataset.mode;};
  select.addEventListener('change',()=>originalModeButtons.find(button=>button.dataset.mode===select.value)?.click());
  originalModeButtons.forEach(button=>new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:['class']}));
  sync();
}

if(!document.querySelector('link[href*="circle-wheel.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='circle-wheel.css?v=4';
  document.head.appendChild(link);
}

if(!document.querySelector('link[href*="ui-refinement.css"]')){
  const refinementLink=document.createElement('link');
  refinementLink.rel='stylesheet';
  refinementLink.href='ui-refinement.css?v=1';
  document.head.appendChild(refinementLink);
}

/* Menú lateral simplificado y dedicatoria sorpresa. */
const menuChoices=[...document.querySelectorAll('[data-app-view]')];
const circlesChoice=menuChoices.find(button=>button.dataset.appView==='circles');
const chordsChoice=menuChoices.find(button=>button.dataset.appView==='chords');
if(circlesChoice){
  const description=circlesChoice.querySelector('small');
  if(description)description.textContent='Tonalidades, escalas y sus 7 acordes en un círculo armónico.';
}
if(chordsChoice){
  const description=chordsChoice.querySelector('small');
  if(description)description.textContent='Acordes de guitarra y sus posiciones más conocidas en el diapasón.';
}

const sideNote=document.querySelector('.side-menu-note');
if(sideNote){
  sideNote.className='side-menu-gift';
  sideNote.tabIndex=0;
  sideNote.setAttribute('role','button');
  sideNote.setAttribute('aria-label','Abrir regalo de José Huancas Rico');
  sideNote.innerHTML='<img src="gift.svg" alt=""><span><strong>Un regalo para ti</strong><small>Descubre quién preparó todo esto.</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  const giftModal=document.createElement('div');
  giftModal.className='gift-modal';
  giftModal.setAttribute('aria-hidden','true');
  giftModal.innerHTML='<div class="gift-modal-backdrop" data-gift-close></div><section class="gift-card" role="dialog" aria-modal="true" aria-labelledby="giftTitle"><button class="gift-close" type="button" data-gift-close aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><img class="gift-card-icon" src="gift.svg" alt=""><p class="gift-kicker">UN REGALO MUSICAL PARA TI</p><h2 id="giftTitle">Hecho para compartir la música.</h2><p class="gift-message">Todo lo que encuentras aquí fue preparado con dedicación para que explorar los acordes sea sencillo, claro y especial.</p><p class="gift-signature">Por José Huancas Rico</p></section>';
  document.body.appendChild(giftModal);
  const openGift=()=>{giftModal.classList.add('open');giftModal.setAttribute('aria-hidden','false');document.body.classList.add('gift-open');giftModal.querySelector('.gift-close')?.focus();};
  const closeGift=()=>{giftModal.classList.remove('open');giftModal.setAttribute('aria-hidden','true');document.body.classList.remove('gift-open');sideNote.focus();};
  sideNote.addEventListener('click',openGift);
  sideNote.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openGift();}});
  giftModal.querySelectorAll('[data-gift-close]').forEach(element=>element.addEventListener('click',closeGift));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&giftModal.classList.contains('open'))closeGift();});
}

/* La biblioteca de acordes adopta la misma estructura limpia de Círculos. */
const chordsView=document.getElementById('chordsView');
if(chordsView){
  const hero=chordsView.querySelector('.library-hero');
  const heroTitle=hero?.querySelector('h1');
  if(heroTitle)heroTitle.textContent='Acordes de guitarra.';

  const toolbar=chordsView.querySelector(':scope>.toolbar');
  const notationCard=toolbar?.querySelector('.control-card:first-child');
  const notationSegment=notationCard?.querySelector('.segmented');
  const english=notationSegment?.querySelector('[data-library-notation="english"]');
  const latin=notationSegment?.querySelector('[data-library-notation="latin"]');
  if(english&&latin){
    english.textContent='Inglés';
    latin.textContent='Latina';
    notationSegment.append(english,latin);
    if(!english.classList.contains('active'))english.click();
  }

  const panels=[...chordsView.querySelectorAll(':scope>.panel')];
  const selectorPanel=panels[0];
  const selectorTitle=selectorPanel?.querySelector('.panel-title');
  const selectorSubtitle=selectorPanel?.querySelector('.panel-subtitle');
  if(selectorTitle)selectorTitle.textContent='Acorde principal';
  if(selectorSubtitle)selectorSubtitle.textContent='Selecciona la tónica.';

  const selectorPanelHead=selectorPanel?.querySelector('.panel-head');
  if(selectorPanelHead&&!document.getElementById('libraryQualitySelect')){
    const compact=document.createElement('label');
    compact.className='minimal-library-quality';
    compact.innerHTML='<select id="libraryQualitySelect" aria-label="Tipo de acorde"><option value="major">Mayor</option><option value="minor">Menor</option><option value="dominant7">Séptima</option><option value="major7">Mayor 7</option><option value="minor7">Menor 7</option><option value="diminished">Disminuido</option></select><span aria-hidden="true">⌄</span>';
    selectorPanelHead.appendChild(compact);
    const select=compact.querySelector('select');
    const sync=()=>{const active=document.querySelector('#libraryQualities [data-library-quality].active');if(active)select.value=active.dataset.libraryQuality;};
    select.addEventListener('change',()=>document.querySelector(`#libraryQualities [data-library-quality="${select.value}"]`)?.click());
    const qualityHost=document.getElementById('libraryQualities');
    if(qualityHost)new MutationObserver(sync).observe(qualityHost,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    sync();
  }
}

const chordsSection=document.getElementById('acordes');
if(!chordsSection)return;
let section=document.getElementById('circuloArmonico');
if(!section){
  section=document.createElement('section');
  chordsSection.parentNode.insertBefore(section,chordsSection);
}
section.className='panel harmony-wheel-panel';
section.id='circuloArmonico';
section.innerHTML='<div class="harmony-wheel-wrap"><div class="harmony-wheel-stage" id="harmonyWheel"></div><aside class="harmony-wheel-info"><div><h4>Distribución armónica</h4><p id="harmonyWheelSummary">3 mayores · 3 menores · 1 disminuido</p></div><div class="harmony-wheel-legend"><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot major"></span><span>Mayor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot minor"></span><span>Menor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot diminished"></span><span>Disminuido</span></div></div></aside></div>';

const grid=document.getElementById('diatonicGrid');
const host=document.getElementById('harmonyWheel');
const summary=document.getElementById('harmonyWheelSummary');
if(!grid||!host)return;
let pending=false;
function svgEl(name,attrs={}){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
function qualityClass(text){const value=(text||'').toLowerCase();if(value.includes('dismin'))return'diminished';if(value.includes('menor'))return'minor';return'major';}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();});}
function addText(group,cls,x,y,value){const text=svgEl('text',{class:cls,x,y});text.textContent=value;group.appendChild(text);}
function nodeGroup(item,x,y,r,isCenter=false){
  const type=qualityClass(item.quality);
  const group=svgEl('g',{class:`harmony-wheel-node ${type}${item.active?' active':''}${isCenter?' harmony-wheel-center-node':''}`,role:'button','aria-label':`${item.degree}, ${item.name}, ${item.functionName}, notas ${item.notes}`,'data-wheel-index':item.index,focusable:'false'});
  group.appendChild(svgEl('circle',{class:'harmony-wheel-node-bg',cx:x,cy:y,r}));
  if(isCenter){
    addText(group,'harmony-wheel-degree',x,y-50,item.degree);
    addText(group,'harmony-wheel-name',x,y-18,item.name);
    addText(group,'harmony-wheel-function',x,y+18,item.functionName);
    addText(group,'harmony-wheel-notes',x,y+50,item.notes);
  }else{
    addText(group,'harmony-wheel-degree',x,y-43,item.degree);
    addText(group,'harmony-wheel-name',x,y-13,item.name);
    addText(group,'harmony-wheel-function',x,y+21,item.functionName);
    addText(group,'harmony-wheel-notes',x,y+49,item.notes);
  }
  const activate=()=>{
    item.card?.click();
    setTimeout(()=>document.activeElement?.blur?.(),0);
  };
  group.addEventListener('pointerdown',event=>event.preventDefault());
  group.addEventListener('click',activate);
  return group;
}
function render(){
  const cards=[...grid.querySelectorAll('.chord-card')];
  if(cards.length!==7)return;
  const data=cards.map((card,index)=>({
    index,card,
    degree:card.querySelector('.badge,.degree-badge')?.textContent?.trim()||String(index+1),
    name:card.querySelector('.chord-name,.chord-card-name')?.textContent?.trim()||'',
    quality:card.querySelector('.chord-quality')?.textContent?.trim()||'',
    functionName:card.querySelector('.chord-function')?.textContent?.trim()||'',
    notes:card.querySelector('.chord-notes,.chord-card-notes')?.textContent?.trim()||'',
    active:card.classList.contains('active')
  }));
  const svg=svgEl('svg',{class:'harmony-wheel-svg',viewBox:'0 0 720 720',role:'group','aria-label':'Círculo armónico de seis acordes alrededor de la tónica'});
  const cx=360,cy=360,radius=268,outerRadius=78,centerRadius=105;
  svg.appendChild(svgEl('circle',{class:'harmony-wheel-ring',cx,cy,r:radius}));
  const outer=data.slice(1);
  outer.forEach((item,index)=>{
    const angle=(-90+index*60)*Math.PI/180;
    const x=cx+Math.cos(angle)*radius;
    const y=cy+Math.sin(angle)*radius;
    svg.appendChild(svgEl('line',{class:'harmony-wheel-spoke',x1:cx,y1:cy,x2:x,y2:y}));
    svg.appendChild(nodeGroup(item,x,y,outerRadius,false));
  });
  svg.appendChild(nodeGroup(data[0],cx,cy,centerRadius,true));
  host.replaceChildren(svg);
  const counts=data.reduce((acc,item)=>{acc[qualityClass(item.quality)]++;return acc;},{major:0,minor:0,diminished:0});
  if(summary)summary.textContent=`${counts.major} mayores · ${counts.minor} menores · ${counts.diminished} disminuido${counts.diminished===1?'':'s'}`;
}
new MutationObserver(schedule).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('DOMContentLoaded',schedule);
schedule();
})();
