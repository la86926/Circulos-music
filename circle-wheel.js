(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';

/* Bloqueo de zoom dentro de la aplicación */
const viewport=document.querySelector('meta[name="viewport"]');
if(viewport)viewport.setAttribute('content','width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
const uiStyle=document.createElement('style');
uiStyle.textContent=`
html,body{touch-action:pan-x pan-y!important;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
#escala,#circlesView>.toolbar,#circlesView>#acordes{display:none!important}
.compact-mode-picker{display:flex;align-items:center;gap:10px;min-width:250px}
.compact-mode-label{color:var(--muted);font-size:11px;font-weight:760;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap}
.compact-mode-segment{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;flex:1;padding:4px;border-radius:999px;background:var(--surface2)}
.compact-mode-btn{min-height:38px;border:0;border-radius:999px;background:transparent;color:var(--muted);padding:0 13px;cursor:pointer;font-size:12px;font-weight:760;white-space:nowrap}
.compact-mode-btn.active{background:var(--accent);color:var(--contrast)}
.quick-controls{display:flex;justify-content:center;align-items:center;gap:7px;width:max-content;max-width:100%;margin:0 auto 18px;padding:6px;border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--surface) 92%,transparent);box-shadow:0 8px 26px rgba(0,0,0,.055);backdrop-filter:blur(12px)}
.quick-control-group{display:flex;align-items:center;gap:4px}.quick-control-divider{width:1px;height:26px;background:var(--line);margin:0 2px}.quick-control{width:40px;height:40px;border:0;border-radius:12px;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:background .16s ease,color .16s ease,transform .16s ease}.quick-control:hover{color:var(--text);background:var(--surface2)}.quick-control:active{transform:scale(.94)}.quick-control.active{background:var(--accent);color:var(--contrast)}.quick-control svg{width:20px;height:20px}.quick-control-glyph{font-size:12px;font-weight:840;letter-spacing:-.04em}
@media(max-width:700px){#selector .panel-head{display:grid;grid-template-columns:1fr;align-items:flex-start}.compact-mode-picker{width:100%;min-width:0}.compact-mode-segment{width:100%}.quick-controls{margin-bottom:14px}.quick-control{width:38px;height:38px}}
`;
document.head.appendChild(uiStyle);

document.addEventListener('gesturestart',event=>event.preventDefault(),{passive:false});
document.addEventListener('gesturechange',event=>event.preventDefault(),{passive:false});
document.addEventListener('gestureend',event=>event.preventDefault(),{passive:false});
document.addEventListener('touchmove',event=>{if(event.touches&&event.touches.length>1)event.preventDefault();},{passive:false});
document.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)event.preventDefault();},{passive:false});
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key))event.preventDefault();});
let lastTouchEnd=0;
document.addEventListener('touchend',event=>{const now=Date.now();if(now-lastTouchEnd<320)event.preventDefault();lastTouchEnd=now;},{passive:false});

/* Selector compacto Mayor / Menor natural */
const scaleSection=document.getElementById('escala');
const selectorHead=document.querySelector('#selector .panel-head');
const originalModeButtons=[...document.querySelectorAll('#escala [data-mode]')];
if(selectorHead&&originalModeButtons.length&&!document.querySelector('.compact-mode-picker')){
  const compact=document.createElement('div');
  compact.className='compact-mode-picker';
  compact.innerHTML=`<span class="compact-mode-label">Escala</span><div class="compact-mode-segment"><button class="compact-mode-btn" data-compact-mode="major" type="button">Mayor</button><button class="compact-mode-btn" data-compact-mode="minor" type="button">Menor natural</button></div>`;
  selectorHead.appendChild(compact);
  const compactButtons=[...compact.querySelectorAll('[data-compact-mode]')];
  const syncModes=()=>compactButtons.forEach(button=>{const original=originalModeButtons.find(item=>item.dataset.mode===button.dataset.compactMode);button.classList.toggle('active',!!original?.classList.contains('active'));});
  compactButtons.forEach(button=>button.addEventListener('click',()=>originalModeButtons.find(item=>item.dataset.mode===button.dataset.compactMode)?.click()));
  originalModeButtons.forEach(button=>new MutationObserver(syncModes).observe(button,{attributes:true,attributeFilter:['class']}));
  syncModes();
}
if(scaleSection)scaleSection.setAttribute('aria-hidden','true');

/* Nomenclatura e instrumento como controles de símbolos */
const originalToolbar=document.querySelector('#circlesView>.toolbar');
const selectorSection=document.getElementById('selector');
if(originalToolbar&&selectorSection&&!document.getElementById('quickControls')){
  originalToolbar.setAttribute('aria-hidden','true');
  const notationButtons=[...originalToolbar.querySelectorAll('[data-nomenclature]')];
  const instrumentButtons=[...originalToolbar.querySelectorAll('[data-instrument]')];
  const dock=document.createElement('div');
  dock.className='quick-controls';
  dock.id='quickControls';
  dock.setAttribute('aria-label','Nomenclatura e instrumento');
  dock.innerHTML=`
    <div class="quick-control-group" role="group" aria-label="Nomenclatura">
      <button class="quick-control" data-quick-nomenclature="latin" type="button" aria-label="Nomenclatura latina" title="Nomenclatura latina"><span class="quick-control-glyph">DO</span></button>
      <button class="quick-control" data-quick-nomenclature="english" type="button" aria-label="Nomenclatura inglesa" title="Nomenclatura inglesa"><span class="quick-control-glyph">C</span></button>
    </div>
    <span class="quick-control-divider" aria-hidden="true"></span>
    <div class="quick-control-group" role="group" aria-label="Instrumento">
      <button class="quick-control" data-quick-instrument="piano" type="button" aria-label="Piano" title="Piano"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v9M11 5v9M15 5v9M19 5v9M5 14h14"/><path d="M8.5 5v6M12.5 5v6M16.5 5v6" stroke-width="3"/></svg></button>
      <button class="quick-control" data-quick-instrument="guitar" type="button" aria-label="Guitarra" title="Guitarra"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 4.5 4-2 3 3-2 4-2-2-5.7 5.7"/><path d="M12.8 12.2c1.5 2.2.9 5.3-1.3 6.8s-5.3.9-6.8-1.3-.9-5.3 1.3-6.8c1.5-1 3.4-1.1 4.9-.3l1.9 1.6Z"/><circle cx="8.5" cy="15" r="1.5"/></svg></button>
    </div>`;
  selectorSection.parentNode.insertBefore(dock,selectorSection);
  const quickNotation=[...dock.querySelectorAll('[data-quick-nomenclature]')];
  const quickInstrument=[...dock.querySelectorAll('[data-quick-instrument]')];
  const syncQuick=()=>{
    quickNotation.forEach(button=>button.classList.toggle('active',!!notationButtons.find(item=>item.dataset.nomenclature===button.dataset.quickNomenclature)?.classList.contains('active')));
    quickInstrument.forEach(button=>button.classList.toggle('active',!!instrumentButtons.find(item=>item.dataset.instrument===button.dataset.quickInstrument)?.classList.contains('active')));
  };
  quickNotation.forEach(button=>button.addEventListener('click',()=>notationButtons.find(item=>item.dataset.nomenclature===button.dataset.quickNomenclature)?.click()));
  quickInstrument.forEach(button=>button.addEventListener('click',()=>instrumentButtons.find(item=>item.dataset.instrument===button.dataset.quickInstrument)?.click()));
  [...notationButtons,...instrumentButtons].forEach(button=>new MutationObserver(syncQuick).observe(button,{attributes:true,attributeFilter:['class']}));
  syncQuick();
}

if(!document.querySelector('link[href*="circle-wheel.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='circle-wheel.css?v=2';document.head.appendChild(link);}
let section=document.getElementById('circuloArmonico');
if(!section){const chordsSection=document.getElementById('acordes');if(!chordsSection)return;section=document.createElement('section');section.className='panel';section.id='circuloArmonico';section.innerHTML=`<div class="panel-head"><div><h3 class="panel-title">Círculo de los 7 acordes</h3><p class="panel-subtitle">Grado, función armónica y notas de cada acorde en una sola vista.</p></div></div><div class="harmony-wheel-wrap"><div class="harmony-wheel-stage" id="harmonyWheel"></div><aside class="harmony-wheel-info"><div><h4>Distribución armónica</h4><p id="harmonyWheelSummary">3 mayores · 3 menores · 1 disminuido</p></div><div class="harmony-wheel-legend"><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot major"></span><span>Mayor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot minor"></span><span>Menor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot diminished"></span><span>Disminuido</span></div></div><p class="harmony-wheel-tip">Pulsa cualquier círculo para seleccionar y escuchar ese acorde. Las tres notas inferiores muestran cómo está construida su triada.</p></aside></div>`;chordsSection.parentNode.insertBefore(section,chordsSection);}
const grid=document.getElementById('diatonicGrid');
const host=document.getElementById('harmonyWheel');
const summary=document.getElementById('harmonyWheelSummary');
const scaleTitle=document.getElementById('scaleTitle');
const chordsSection=document.getElementById('acordes');
if(chordsSection)chordsSection.setAttribute('aria-hidden','true');
const chordNav=document.querySelector('.nav-btn[data-target="acordes"]');
if(chordNav){chordNav.dataset.target='circuloArmonico';const label=chordNav.querySelector('span');if(label)label.textContent='Círculo';}
if(!grid||!host)return;
let pending=false;
function svgEl(name,attrs={}){const node=document.createElementNS(NS,name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));return node;}
function qualityClass(text){const value=(text||'').toLowerCase();if(value.includes('dismin'))return'diminished';if(value.includes('menor'))return'minor';return'major';}
function centerLabel(){return(scaleTitle?.textContent||document.getElementById('statusKey')?.textContent||'Escala').replace(/^Escala de\s*/i,'').trim();}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();});}
function render(){const cards=[...grid.querySelectorAll('.chord-card')];if(cards.length!==7)return;
  const data=cards.map((card,index)=>({
    index,
    card,
    degree:card.querySelector('.badge,.degree-badge')?.textContent?.trim()||String(index+1),
    name:card.querySelector('.chord-name,.chord-card-name')?.textContent?.trim()||'',
    quality:card.querySelector('.chord-quality')?.textContent?.trim()||'',
    functionName:card.querySelector('.chord-function')?.textContent?.trim()||'',
    notes:card.querySelector('.chord-notes,.chord-card-notes')?.textContent?.trim()||'',
    active:card.classList.contains('active')
  }));
  const svg=svgEl('svg',{class:'harmony-wheel-svg',viewBox:'0 0 760 760',role:'group','aria-label':`Círculo de los siete acordes de ${centerLabel()}`});
  const cx=380,cy=380,radius=282,nodeRadius=78;
  svg.appendChild(svgEl('circle',{class:'harmony-wheel-ring',cx,cy,r:radius}));
  data.forEach((item,index)=>{const angle=(-90+index*(360/7))*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;svg.appendChild(svgEl('line',{class:'harmony-wheel-spoke',x1:cx,y1:cy,x2:x,y2:y}));});
  const center=svgEl('g');center.appendChild(svgEl('circle',{class:'harmony-wheel-center',cx,cy,r:100}));
  const kicker=svgEl('text',{class:'harmony-wheel-center-kicker',x:cx,y:cy-14});kicker.textContent='ESCALA';center.appendChild(kicker);
  const title=svgEl('text',{class:'harmony-wheel-center-title',x:cx,y:cy+25});title.textContent=centerLabel();center.appendChild(title);svg.appendChild(center);
  data.forEach((item,index)=>{
    const angle=(-90+index*(360/7))*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius,type=qualityClass(item.quality);
    const group=svgEl('g',{class:`harmony-wheel-node ${type}${item.active?' active':''}`,role:'button',tabindex:'0','aria-label':`${item.degree}, ${item.name}, ${item.quality}, ${item.functionName}, notas ${item.notes}`,'data-wheel-index':index});
    group.appendChild(svgEl('circle',{class:'harmony-wheel-node-bg',cx:x,cy:y,r:nodeRadius}));
    const degree=svgEl('text',{class:'harmony-wheel-degree',x,y:y-47});degree.textContent=item.degree;group.appendChild(degree);
    const name=svgEl('text',{class:'harmony-wheel-name',x,y:y-20});name.textContent=item.name;group.appendChild(name);
    const quality=svgEl('text',{class:'harmony-wheel-quality',x,y:y+2});quality.textContent=item.quality;group.appendChild(quality);
    const functionText=svgEl('text',{class:'harmony-wheel-function',x,y:y+27});functionText.textContent=item.functionName;group.appendChild(functionText);
    const notes=svgEl('text',{class:'harmony-wheel-notes',x,y:y+51});notes.textContent=item.notes;group.appendChild(notes);
    const activate=()=>cards[index]?.click();group.addEventListener('click',activate);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});svg.appendChild(group);
  });
  host.replaceChildren(svg);
  if(summary){const counts=data.reduce((acc,item)=>{acc[qualityClass(item.quality)]++;return acc;},{major:0,minor:0,diminished:0});summary.textContent=`${counts.major} mayores · ${counts.minor} menores · ${counts.diminished} disminuido${counts.diminished===1?'':'s'}`;}
}
new MutationObserver(schedule).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
if(scaleTitle)new MutationObserver(schedule).observe(scaleTitle,{childList:true,subtree:true,characterData:true});
window.addEventListener('DOMContentLoaded',schedule);schedule();
})();
