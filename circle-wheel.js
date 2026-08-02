(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';

/* Bloqueo de zoom dentro de la aplicación */
const viewport=document.querySelector('meta[name="viewport"]');
if(viewport)viewport.setAttribute('content','width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
const uiStyle=document.createElement('style');
uiStyle.textContent=`
html,body{touch-action:pan-x pan-y!important;-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
#escala{display:none!important}
.compact-mode-picker{display:flex;align-items:center;gap:10px;min-width:250px}
.compact-mode-label{color:var(--muted);font-size:11px;font-weight:760;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap}
.compact-mode-segment{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;flex:1;padding:4px;border-radius:999px;background:var(--surface2)}
.compact-mode-btn{min-height:38px;border:0;border-radius:999px;background:transparent;color:var(--muted);padding:0 13px;cursor:pointer;font-size:12px;font-weight:760;white-space:nowrap}
.compact-mode-btn.active{background:var(--accent);color:var(--contrast)}
@media(max-width:700px){#selector .panel-head{display:grid;grid-template-columns:1fr;align-items:flex-start}.compact-mode-picker{width:100%;min-width:0}.compact-mode-segment{width:100%}}
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
if(selectorHead&&originalModeButtons.length){
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

if(!document.querySelector('link[href*="circle-wheel.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='circle-wheel.css?v=1';document.head.appendChild(link);}
let section=document.getElementById('circuloArmonico');
if(!section){const chordsSection=document.getElementById('acordes');if(!chordsSection)return;section=document.createElement('section');section.className='panel';section.id='circuloArmonico';section.innerHTML=`<div class="panel-head"><div><h3 class="panel-title">Círculo de los 7 acordes</h3><p class="panel-subtitle">Visualiza los acordes de la escala y pulsa cualquiera para seleccionarlo.</p></div></div><div class="harmony-wheel-wrap"><div class="harmony-wheel-stage" id="harmonyWheel"></div><aside class="harmony-wheel-info"><div><h4>Distribución armónica</h4><p id="harmonyWheelSummary">3 mayores · 3 menores · 1 disminuido</p></div><div class="harmony-wheel-legend"><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot major"></span><span>Mayor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot minor"></span><span>Menor</span></div><div class="harmony-wheel-legend-item"><span class="harmony-wheel-dot diminished"></span><span>Disminuido</span></div></div><p class="harmony-wheel-tip">El nombre de cada acorde cambia automáticamente según la tonalidad, el tipo de escala y la nomenclatura elegida.</p></aside></div>`;chordsSection.parentNode.insertBefore(section,chordsSection);}
const grid=document.getElementById('diatonicGrid');
const host=document.getElementById('harmonyWheel');
const summary=document.getElementById('harmonyWheelSummary');
const scaleTitle=document.getElementById('scaleTitle');
if(!grid||!host)return;
let pending=false;
function svgEl(name,attrs={}){const node=document.createElementNS(NS,name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));return node;}
function qualityClass(text){const value=(text||'').toLowerCase();if(value.includes('dismin'))return'diminished';if(value.includes('menor'))return'minor';return'major';}
function centerLabel(){return(scaleTitle?.textContent||document.getElementById('statusKey')?.textContent||'Escala').replace(/^Escala de\s*/i,'').trim();}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();});}
function render(){const cards=[...grid.querySelectorAll('.chord-card')];if(cards.length!==7)return;
  const data=cards.map((card,index)=>({index,card,degree:card.querySelector('.badge,.degree-badge')?.textContent?.trim()||String(index+1),name:card.querySelector('.chord-name,.chord-card-name')?.textContent?.trim()||'',quality:card.querySelector('.chord-quality')?.textContent?.trim()||'',active:card.classList.contains('active')}));
  const svg=svgEl('svg',{class:'harmony-wheel-svg',viewBox:'0 0 640 640',role:'group','aria-label':`Círculo de los siete acordes de ${centerLabel()}`});
  const cx=320,cy=320,radius=226,nodeRadius=58;
  svg.appendChild(svgEl('circle',{class:'harmony-wheel-ring',cx,cy,r:radius}));
  data.forEach((item,index)=>{const angle=(-90+index*(360/7))*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;svg.appendChild(svgEl('line',{class:'harmony-wheel-spoke',x1:cx,y1:cy,x2:x,y2:y}));});
  const center=svgEl('g');center.appendChild(svgEl('circle',{class:'harmony-wheel-center',cx,cy,r:91}));
  const kicker=svgEl('text',{class:'harmony-wheel-center-kicker',x:cx,y:cy-12});kicker.textContent='ESCALA';center.appendChild(kicker);
  const title=svgEl('text',{class:'harmony-wheel-center-title',x:cx,y:cy+24});title.textContent=centerLabel();center.appendChild(title);svg.appendChild(center);
  data.forEach((item,index)=>{const angle=(-90+index*(360/7))*Math.PI/180,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius,type=qualityClass(item.quality);const group=svgEl('g',{class:`harmony-wheel-node ${type}${item.active?' active':''}`,role:'button',tabindex:'0','aria-label':`${item.degree}, ${item.name}, ${item.quality}`,'data-wheel-index':index});
    group.appendChild(svgEl('circle',{class:'harmony-wheel-node-bg',cx:x,cy:y,r:nodeRadius}));
    const degree=svgEl('text',{class:'harmony-wheel-degree',x,y:y-22});degree.textContent=item.degree;group.appendChild(degree);
    const name=svgEl('text',{class:'harmony-wheel-name',x,y:y+5});name.textContent=item.name;group.appendChild(name);
    const quality=svgEl('text',{class:'harmony-wheel-quality',x,y:y+28});quality.textContent=item.quality;group.appendChild(quality);
    const activate=()=>cards[index]?.click();group.addEventListener('click',activate);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});svg.appendChild(group);
  });
  host.replaceChildren(svg);
  if(summary){const counts=data.reduce((acc,item)=>{acc[qualityClass(item.quality)]++;return acc;},{major:0,minor:0,diminished:0});summary.textContent=`${counts.major} mayores · ${counts.minor} menores · ${counts.diminished} disminuido${counts.diminished===1?'':'s'}`;}
}
new MutationObserver(schedule).observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
if(scaleTitle)new MutationObserver(schedule).observe(scaleTitle,{childList:true,subtree:true,characterData:true});
window.addEventListener('DOMContentLoaded',schedule);schedule();
})();
