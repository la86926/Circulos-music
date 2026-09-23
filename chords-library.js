(()=>{
'use strict';
if(window.__circulosChordLibraryV11)return;
window.__circulosChordLibraryV11=true;

const DATA_URL='chords-data.json?v=2';
const ROOT_PC={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const PC_ROOT=['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B'];
const LATIN={C:'DO',D:'RE',E:'MI',F:'FA',G:'SOL',A:'LA',B:'SI'};
const ROOT_QUERY={c:'C',do:'C','c#':'C#/Db',db:'C#/Db','do#':'C#/Db',reb:'C#/Db',d:'D',re:'D','d#':'D#/Eb',eb:'D#/Eb','re#':'D#/Eb',mib:'D#/Eb',e:'E',mi:'E',f:'F',fa:'F','f#':'F#/Gb',gb:'F#/Gb','fa#':'F#/Gb',solb:'F#/Gb',g:'G',sol:'G','g#':'G#/Ab',ab:'G#/Ab','sol#':'G#/Ab',lab:'G#/Ab',a:'A',la:'A','a#':'A#/Bb',bb:'A#/Bb','la#':'A#/Bb',sib:'A#/Bb',b:'B',si:'B'};
const FAMILY_LABEL={mayor:'Mayor',m:'Menor',dim:'Disminuido',aug:'Aumentado',inversiones:'Inversiones',slash:'Slash / pedal'};
const BATCH=72;
const state={data:null,loading:false,notation:localStorage.getItem('circulos-library-notation')||'latin',root:'all',family:'all',position:'all',query:'',visible:BATCH,filtered:[]};
const $=id=>document.getElementById(id);

function stripAccents(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function normalize(value){
  let s=stripAccents(value).toLowerCase().replace(/♯/g,'#').replace(/♭/g,'b');
  s=s.replace(/sostenido/g,'#').replace(/bemol/g,'b');
  const notes=[['sol','g'],['do','c'],['re','d'],['mi','e'],['fa','f'],['la','a'],['si','b']];
  const prefix=notes.find(([n])=>new RegExp(`^${n}(?=(?:#|b|m|maj|dim|aug|sus|add|alt|[0-9]|/|$))`).test(s));
  if(prefix)s=s.replace(new RegExp(`^${prefix[0]}`),prefix[1]);
  for(const[n,e]of notes)s=s.replace(new RegExp(`\\b${n}(?=[#b]|\\b)`,'g'),e);
  return s.replace(/disminuido/g,'dim').replace(/aumentado/g,'aug').replace(/menor/g,'m').replace(/mayor/g,'maj').replace(/septima/g,'7').replace(/\s+/g,'').replace(/[()]/g,'');
}
function noteDisplay(note,notation=state.notation){
  const m=String(note).match(/^([A-G])([#b]*)$/);if(!m)return note;
  const base=notation==='latin'?(LATIN[m[1]]||m[1]):m[1];
  return base+m[2].replace(/#/g,'♯').replace(/b/g,'♭');
}
function displayChordToken(token){
  const m=String(token).trim().match(/^([A-G](?:#|b)?)(.*)$/);if(!m)return token;
  let rest=m[2].replace(/\/([A-G](?:#|b)?)/g,(_,n)=>'/'+noteDisplay(n));
  return noteDisplay(m[1])+rest;
}
function displaySymbol(symbol){return String(symbol).split(' / ').map(displayChordToken).join(' / ');}
function familyLabel(f){return FAMILY_LABEL[f]||f;}
function primaryRoot(symbol){const first=String(symbol).split(' / ')[0].split('/')[0];return first.match(/^([A-G](?:#|b)?)/)?.[1]||'C';}
function entryRootGroup(symbol){return PC_ROOT[ROOT_PC[primaryRoot(symbol)]??0];}
function positionTags(entry){
  const tags=new Set();
  if(entry.k==='inversion')tags.add('inversion');
  if(entry.k==='slash')tags.add('slash');
  for(const p of entry.p||[]){const s=stripAccents(p.l).toLowerCase();if(s.includes('abierta'))tags.add('open');if(s.includes('cejilla'))tags.add('barre');if(s.includes('movil'))tags.add('movable');if(s.includes('inversion'))tags.add('inversion');if(s.includes('bajo en'))tags.add('bass');}
  return tags;
}
function buildSearch(entry){
  const values=[entry.s,displaySymbolFor(entry.s,'latin'),entry.n,entry.f,entry.fn,...(entry.a||[])].filter(Boolean);
  return values.map(normalize);
}
function displaySymbolFor(symbol,notation){const before=state.notation;state.notation=notation;const result=displaySymbol(symbol);state.notation=before;return result;}
function enrich(){
  for(const entry of state.data.entries){entry.r=entry.r||entryRootGroup(entry.s);entry._tags=positionTags(entry);entry._search=buildSearch(entry);entry._symbolNorm=normalize(entry.s);entry._latinNorm=normalize(displaySymbolFor(entry.s,'latin'));}
}
function rootOnlyQuery(raw){
  const v=stripAccents(raw).toLowerCase().trim().replace(/♯/g,'#').replace(/♭/g,'b').replace(/\s+/g,'');
  return ROOT_QUERY[v]||null;
}
function matchesQuery(entry){
  const raw=state.query.trim();if(!raw)return true;
  const rootOnly=rootOnlyQuery(raw);if(rootOnly)return entry.r===rootOnly;
  const q=normalize(raw);return entry._search.some(x=>x.includes(q));
}
function score(entry){
  const raw=state.query.trim();if(!raw)return 0;const q=normalize(raw);
  if(entry._symbolNorm===q||entry._latinNorm===q||(entry.a||[]).some(a=>normalize(a)===q))return 0;
  if(entry._symbolNorm.startsWith(q)||entry._latinNorm.startsWith(q))return 1;
  return 2;
}
function applyFilters(reset=true){
  if(!state.data)return;
  let list=state.data.entries.filter(entry=>{
    if(state.root!=='all'&&entry.r!==state.root)return false;
    if(state.family!=='all'&&entry.f!==state.family)return false;
    if(state.position!=='all'&&!entry._tags.has(state.position))return false;
    return matchesQuery(entry);
  });
  if(state.query.trim())list=list.map((entry,index)=>({entry,index,score:score(entry)})).sort((a,b)=>a.score-b.score||a.entry.s.length-b.entry.s.length||a.index-b.index).map(x=>x.entry);
  state.filtered=list;if(reset)state.visible=BATCH;renderResults();
}
function positionTypeLabel(type){return({open:'Abierta',barre:'Cejilla',movable:'Móvil',inversion:'Inversión',slash:'Slash / pedal',bass:'Bajo alternativo'})[type]||type;}
function shapeTokens(shape){return String(shape||'').trim().split(/\s+/);}
function preferredPosition(entry){
  const list=entry.p||[];
  return list.find(p=>/(principal|est[aá]ndar|tradicional|com[uú]n)/i.test(stripAccents(p.l)))||list[0]||null;
}
function cardHtml(entry){
  const pos=preferredPosition(entry);
  return `<button class="chord-catalog-card" type="button" data-chord-id="${entry.id}" aria-label="Abrir ${escapeHtml(displaySymbol(entry.s))}, ${entry.p.length} posiciones">
    <span class="chord-catalog-top"><strong>${escapeHtml(displaySymbol(entry.s))}</strong></span>
    ${pos?diagramSvg(entry,pos,0,{mini:true}):'<span class="diagram-empty">Sin diagrama</span>'}
  </button>`;
}
function renderResults(){
  const grid=$('chordCatalogGrid'),count=$('chordResultCount'),more=$('chordLoadMore'),empty=$('chordEmpty');if(!grid)return;
  const shown=state.filtered.slice(0,state.visible);grid.innerHTML=shown.map(cardHtml).join('');
  count.textContent=`${state.filtered.length} ${state.filtered.length===1?'acorde':'acordes'}`;
  empty.hidden=state.filtered.length!==0;more.hidden=state.visible>=state.filtered.length;more.textContent=`Mostrar más · ${Math.min(BATCH,state.filtered.length-state.visible)}`;
}
function renderRoots(){
  const host=$('chordRootFilters');if(!host)return;
  const roots=['all',...state.data.roots];host.innerHTML=roots.map(root=>`<button class="chord-filter-chip ${state.root===root?'active':''}" type="button" data-root="${root}">${root==='all'?'Todas':escapeHtml(displayRootGroup(root))}</button>`).join('');
}
function displayRootGroup(root){if(state.notation==='english')return root.replace(/#/g,'♯').replace(/b/g,'♭');return root.split('/').map(noteDisplay).join('/');}
function renderFamilies(){
  const select=$('chordFamilyFilter');if(!select)return;
  const families=[...state.data.families,'inversiones','slash'];select.innerHTML='<option value="all">Todas las familias</option>'+families.map(f=>`<option value="${escapeAttr(f)}">${escapeHtml(familyLabel(f))}</option>`).join('');select.value=state.family;
}
function syncNotation(){
  document.querySelectorAll('[data-library-notation]').forEach(btn=>btn.classList.toggle('active',btn.dataset.libraryNotation===state.notation));
  if(state.data){renderRoots();renderResults();}
  const open=document.querySelector('.chord-detail.open');if(open&&open.dataset.entryId)openDetail(open.dataset.entryId,true);
}
function setLoading(value){state.loading=value;const grid=$('chordCatalogGrid'),count=$('chordResultCount');if(grid&&value)grid.innerHTML=Array.from({length:18},()=>'<div class="chord-skeleton" aria-hidden="true"></div>').join('');if(count&&value)count.textContent='Cargando biblioteca…';}
async function ensureData(){
  if(state.data||state.loading)return;setLoading(true);
  try{
    const response=await fetch(DATA_URL,{cache:'force-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    state.data=await response.json();if(state.data.stringOrder!=='1-6')throw new Error('Orden de cuerdas no compatible');enrich();renderFamilies();renderRoots();applyFilters();
    const stats=$('chordLibraryStats');if(stats)stats.textContent=`${state.data.entries.length} acordes · ${state.data.entries.reduce((n,e)=>n+(e.p?.length||0),0)} posiciones`;
  }catch(error){const grid=$('chordCatalogGrid');if(grid)grid.innerHTML='<div class="library-error"><strong>No se pudo abrir la biblioteca.</strong><span>Recarga la página para intentarlo de nuevo.</span></div>';console.error('Círculos Music: biblioteca de acordes',error);}
  finally{setLoading(false);}
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function escapeAttr(value){return escapeHtml(value);}
function diagramSvg(entry,position,index,options={}){
  const mini=Boolean(options.mini),tokens=shapeTokens(position.x);
  const frets=tokens.map(v=>v.toLowerCase()==='x'?null:Number(v));
  const positive=frets.filter(v=>Number.isFinite(v)&&v>0);
  const max=positive.length?Math.max(...positive):0,min=positive.length?Math.min(...positive):1;
  let start=positive.length?min:1;if(start<=3&&max<=5)start=1;
  const fretCount=Math.max(5,Math.min(7,max-start+1));
  const left=24,top=50,stringGap=22,fretGap=26;
  const verticalWidth=left+5*stringGap+24,verticalHeight=top+fretCount*fretGap+20;
  const rotateCCW=(x,y)=>[verticalHeight-y,x];
  const stringX=dataIndex=>left+(5-dataIndex)*stringGap;
  const rootPc=ROOT_PC[primaryRoot(entry.s)]??0;
  const tuningByDataIndex=[4,11,7,2,9,4];
  const classes=`library-diagram${mini?' library-diagram-mini':''}`;
  const accessibility=mini?'aria-hidden="true"':`role="img" aria-label="${escapeAttr(displaySymbol(entry.s))}, posición ${index+1}"`;
  let svg=`<svg class="${classes}" viewBox="0 0 ${verticalHeight} ${verticalWidth}" ${accessibility} data-string-order="1-6" data-orientation="ccw-90">`;
  for(let dataIndex=0;dataIndex<6;dataIndex++){
    const x=stringX(dataIndex),a=rotateCCW(x,top),b=rotateCCW(x,top+fretCount*fretGap);
    svg+=`<line class="diagram-string" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  }
  for(let f=0;f<=fretCount;f++){
    const y=top+f*fretGap,a=rotateCCW(left,y),b=rotateCCW(left+5*stringGap,y);
    svg+=`<line class="${start===1&&f===0?'diagram-nut':'diagram-fret'}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  }
  const nutX=rotateCCW(left,top)[0];
  if(start>1){
    const labelX=rotateCCW(left,top+fretGap*.62)[0];
    svg+=`<text class="diagram-label diagram-fret-number" x="${labelX}" y="13" text-anchor="middle">${start}</text>`;
  }
  if(stripAccents(position.l).toLowerCase().includes('cejilla')&&positive.length){
    const barreFret=min,from=frets.findIndex(v=>Number.isFinite(v)&&v>0),to=frets.map((v,i)=>Number.isFinite(v)&&v>0?i:-1).reduce((a,b)=>Math.max(a,b),-1);
    if(from>=0&&to>from&&barreFret>=start&&barreFret<start+fretCount){
      const y=top+(barreFret-start+.5)*fretGap,a=rotateCCW(stringX(from),y),b=rotateCCW(stringX(to),y);
      svg+=`<line class="diagram-barre" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
    }
  }
  frets.forEach((fret,dataIndex)=>{
    const verticalX=stringX(dataIndex),stringNumber=dataIndex+1,stringY=rotateCCW(verticalX,top)[1];
    const marker=fret===null?'×':fret===0?'○':'';
    if(marker)svg+=`<text class="diagram-label diagram-marker" x="${nutX+17}" y="${stringY}" text-anchor="middle" dominant-baseline="central">${marker}</text>`;
    svg+=`<text class="diagram-label diagram-string-number" x="${nutX+36}" y="${stringY}" text-anchor="middle" dominant-baseline="central">${stringNumber}</text>`;
    if(fret===null||fret===0||fret<start||fret>=start+fretCount)return;
    const verticalY=top+(fret-start+.5)*fretGap,p=rotateCCW(verticalX,verticalY);
    const pc=(tuningByDataIndex[dataIndex]+fret)%12,isRoot=pc===rootPc;
    svg+=`<circle class="${isRoot?'diagram-root':'diagram-dot'}" cx="${p[0]}" cy="${p[1]}" r="${mini?7.5:9.5}"/>`;
    if(isRoot&&!mini)svg+=`<text class="diagram-dot-text" x="${p[0]}" y="${p[1]}">R</text>`;
  });
  svg+='</svg>';return svg;
}
function displayNotesText(text){return String(text||'').split('–').map(part=>noteDisplay(part.trim())).join('–');}
function detailMeta(entry){
  const items=[];
  if(entry.fm)items.push(`<div><span>Fórmula</span><strong>${escapeHtml(entry.fm)}</strong></div>`);
  if(entry.nt?.length)items.push(`<div><span>Notas</span><strong>${entry.nt.map(([label,notes])=>entry.nt.length>1?`${escapeHtml(noteDisplay(label))}: ${escapeHtml(displayNotesText(notes))}`:escapeHtml(displayNotesText(notes))).join('<br>')}</strong></div>`);
  if(entry.a?.length)items.push(`<div><span>También escrito</span><strong>${entry.a.map(escapeHtml).join(' · ')}</strong></div>`);
  if(entry.fn)items.push(`<div><span>Función</span><strong>${escapeHtml(entry.fn)}</strong></div>`);
  return items.join('');
}
function openDetail(id,rerender=false){
  if(!state.data)return;const entry=state.data.entries.find(e=>e.id===id);if(!entry)return;
  let modal=$('chordDetail');if(!modal){modal=document.createElement('div');modal.id='chordDetail';modal.className='chord-detail';modal.innerHTML='<div class="chord-detail-backdrop" data-detail-close></div><section class="chord-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="chordDetailTitle"><button class="chord-detail-close" type="button" data-detail-close aria-label="Cerrar">×</button><div id="chordDetailContent"></div></section>';document.body.appendChild(modal);}
  modal.dataset.entryId=id;const content=$('chordDetailContent');
  content.innerHTML=`<header class="chord-detail-head"><p class="eyebrow">${escapeHtml(familyLabel(entry.f))}</p><h2 id="chordDetailTitle">${escapeHtml(displaySymbol(entry.s))}</h2>${entry.n?`<p>${escapeHtml(entry.n)}</p>`:''}<div class="chord-detail-meta">${detailMeta(entry)}</div></header><div class="chord-detail-section-head"><div><strong>${entry.p.length} ${entry.p.length===1?'posición':'posiciones'}</strong><span>Datos: 1.ª cuerda → 6.ª cuerda</span></div></div><div class="chord-position-grid">${entry.p.map((p,i)=>`<article class="chord-position-card"><div class="position-card-head"><span>Posición ${i+1}</span><strong>${escapeHtml(p.l)}</strong></div>${diagramSvg(entry,p,i)}<code>${escapeHtml(p.x.replace(/x/g,'×'))}</code>${p.o?`<small>Omisiones: ${escapeHtml(p.o)}</small>`:''}${p.al?`<small>Alteraciones: ${escapeHtml(p.al)}</small>`:''}</article>`).join('')}</div>${entry.c?`<p class="chord-context">${escapeHtml(entry.c)}</p>`:''}`;
  modal.classList.add('open');document.body.classList.add('chord-detail-open');if(!rerender)modal.querySelector('.chord-detail-close')?.focus({preventScroll:true});
}
function closeDetail(){const modal=$('chordDetail');if(!modal?.classList.contains('open'))return;modal.classList.remove('open');document.body.classList.remove('chord-detail-open');}
function resetFilters(){state.root=state.family=state.position='all';state.query='';$('chordSearch').value='';$('chordFamilyFilter').value='all';$('chordPositionFilter').value='all';renderRoots();applyFilters();}
function applyGiftCopy(){
  const gift=document.querySelector('.side-menu-gift'),title=gift?.querySelector('strong'),subtitle=gift?.querySelector('small'),kicker=document.querySelector('.gift-kicker'),modalTitle=document.getElementById('giftTitle'),message=document.querySelector('.gift-message');if(!gift||!title||!subtitle||!kicker||!modalTitle||!message)return false;
  title.textContent='UN REGALO MUSICAL';subtitle.textContent='Lo que hay preparado aquí.';kicker.textContent='UN REGALO MUSICAL';modalTitle.textContent='Por José H. Rico, todo esto';message.textContent='Todo lo que encuentras aquí fue preparado con dedicación para que, explorar los acordes, sea sencillo y claro.';document.querySelector('.gift-signature')?.remove();gift.setAttribute('aria-label','Abrir regalo musical');return true;
}
function bind(){
  $('chordSearch')?.addEventListener('input',event=>{state.query=event.target.value;applyFilters();});
  $('chordFamilyFilter')?.addEventListener('change',event=>{state.family=event.target.value;applyFilters();});
  $('chordPositionFilter')?.addEventListener('change',event=>{state.position=event.target.value;applyFilters();});
  $('chordRootFilters')?.addEventListener('click',event=>{const btn=event.target.closest('[data-root]');if(!btn)return;state.root=btn.dataset.root;renderRoots();applyFilters();});
  $('chordCatalogGrid')?.addEventListener('click',event=>{const card=event.target.closest('[data-chord-id]');if(card)openDetail(card.dataset.chordId);});
  $('chordLoadMore')?.addEventListener('click',()=>{state.visible+=BATCH;renderResults();});
  $('chordResetFilters')?.addEventListener('click',resetFilters);
  document.querySelectorAll('[data-library-notation]').forEach(btn=>btn.addEventListener('click',()=>{state.notation=btn.dataset.libraryNotation;localStorage.setItem('circulos-library-notation',state.notation);syncNotation();}));
  document.addEventListener('click',event=>{if(event.target.closest('[data-detail-close]'))closeDetail();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDetail();});
  document.querySelectorAll('[data-app-view="chords"]').forEach(btn=>btn.addEventListener('click',ensureData));
  const view=$('chordsView');if(view)new MutationObserver(()=>{if(!view.classList.contains('view-hidden'))ensureData();}).observe(view,{attributes:true,attributeFilter:['class']});
}
function init(){bind();syncNotation();if(!$('chordsView')?.classList.contains('view-hidden'))ensureData();if(!applyGiftCopy()){const observer=new MutationObserver(()=>{if(applyGiftCopy())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();