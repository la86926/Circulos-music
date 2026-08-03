(()=>{
'use strict';
if(window.__circulosPianoSyncV5)return;
window.__circulosPianoSyncV5=true;

const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const CHROMATIC=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const LATIN={C:'DO',D:'RE',E:'MI',F:'FA',G:'SOL',A:'LA',B:'SI'};
const LATIN_TO_EN={DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};
const INTERVALS={major:[0,4,7],minor:[0,3,7],dominant7:[0,4,7,10],major7:[0,4,7,11],minor7:[0,3,7,10],diminished:[0,3,6]};
const QUALITY_LABEL={major:'mayor',minor:'menor',dominant7:'séptima',major7:'mayor 7',minor7:'menor 7',diminished:'disminuido'};
const WHITE_PCS=new Set([0,2,4,5,7,9,11]);
const activePointers=new Map(),blockedClicks=new WeakMap(),visualTimers=new WeakMap(),rangeBindings=new WeakMap();
let librarySignature='',renderingLibrary=false,bodyQueued=false;

const style=document.createElement('style');
style.textContent=`
.keyboard-mode-slider,.keyboard-move-toggle{display:none!important}
html body #pianoKeyboard,html body #performancePianoKeyboard,html body #pianoKeyboard button,html body #performancePianoKeyboard button{touch-action:none!important;-webkit-touch-callout:none!important;user-select:none!important;-webkit-user-select:none!important}
.piano-position-control{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;margin:12px 0 14px;padding:0;background:transparent;border:0;box-shadow:none}
.piano-position-title{color:var(--muted);font-size:11px;font-weight:800;white-space:nowrap}
.piano-position-arrows{color:var(--muted);font-size:17px;font-weight:760;line-height:1;letter-spacing:-.12em}
.piano-position-range{width:100%;height:30px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:ew-resize;touch-action:none!important}
.piano-position-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:var(--surface3);box-shadow:inset 0 0 0 1px var(--line)}
.piano-position-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:28px;height:28px;margin-top:-11px;border:4px solid var(--surface);border-radius:50%;background:var(--accent);box-shadow:0 3px 10px rgba(0,0,0,.18)}
.piano-position-range::-moz-range-track{height:6px;border:1px solid var(--line);border-radius:999px;background:var(--surface3)}
.piano-position-range::-moz-range-thumb{width:22px;height:22px;border:4px solid var(--surface);border-radius:50%;background:var(--accent);box-shadow:0 3px 10px rgba(0,0,0,.18)}
.piano-position-range:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 22%,transparent);outline-offset:3px;border-radius:999px}
#pianoPanel .piano-position-control{margin-left:0;margin-right:0}
#libraryPianoPanel{padding:0 18px 22px!important;background:transparent!important;border:0!important;box-shadow:none!important}
#libraryPianoPanel .performance-piano-summary{display:block!important;margin:14px 0 8px!important;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;min-height:0!important}
#libraryPianoPanel .performance-piano-summary>div{display:block!important;width:100%!important;min-width:0!important}
#libraryPianoPanel .performance-piano-summary strong{display:block!important;margin:0!important;font-size:28px!important;line-height:1.05!important;letter-spacing:-.045em!important}
#libraryPianoPanel .performance-piano-summary small{display:block!important;margin-top:5px!important;line-height:1.35!important}
#libraryPianoPanel .piano-position-control{margin:8px 0 12px!important}
#libraryPianoPanel .performance-piano-scroll{margin:0!important;padding:2px 0 8px!important;border:0!important;border-radius:14px!important;background:transparent!important;box-shadow:none!important}
#libraryPianoPanel #performancePianoKeyboard{margin:0!important}
#libraryPerformanceSwitch{margin:0 18px 14px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
#libraryPerformanceSwitch>span{display:none!important}
#libraryPerformanceSwitch .segmented{width:100%!important;max-width:none!important;padding:4px!important;border:1px solid var(--line)!important;border-radius:999px!important;background:var(--surface2)!important;overflow:hidden!important;box-shadow:none!important}
#libraryPerformanceSwitch .seg-btn{min-height:48px!important;border-radius:999px!important}
#chordsView[data-performance-instrument="piano"] #libraryPianoPanel{display:block!important}
#chordsView[data-performance-instrument="piano"] #chordLibraryGrid{display:none!important}
@media(max-width:560px){.piano-position-control{grid-template-columns:1fr auto;gap:7px}.piano-position-title{grid-column:1/-1}.piano-position-range{min-width:0}#libraryPianoPanel{padding:0 16px 20px!important}#libraryPerformanceSwitch{margin:0 16px 12px!important}#libraryPianoPanel .performance-piano-summary strong{font-size:25px!important}}
`;
document.head.appendChild(style);

const notation=()=>document.querySelector('[data-library-notation="latin"].active')?'latin':'english';
const quality=()=>document.getElementById('libraryQualitySelect')?.value||document.querySelector('#libraryQualities [data-library-quality].active')?.dataset.libraryQuality||'major';
function libraryChord(){
  const root=document.querySelector('#libraryRoots [data-library-root].active')?.dataset.libraryRoot||'C';
  const rootPc=PC[root]??0,q=quality(),intervals=INTERVALS[q]||INTERVALS.major;
  return{root,rootPc,quality:q,pcs:intervals.map(interval=>(rootPc+interval)%12)};
}
function noteLabel(pc,currentNotation=notation()){
  const note=CHROMATIC[(pc+12)%12];
  return currentNotation==='english'?note.replace('#','♯'):`${LATIN[note[0]]}${note.slice(1).replace('#','♯')}`;
}
function cssPx(name,fallback){const value=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));return Number.isFinite(value)&&value>0?value:fallback;}
function fundamentalMidis(pcs){let previous=-Infinity;return pcs.map(pc=>{let midi=60+pc;while(midi<=previous)midi+=12;previous=midi;return midi;});}

function renderLibraryPiano(force=false){
  const host=document.getElementById('performancePianoKeyboard');if(!host||renderingLibrary)return false;
  const current=libraryChord(),currentNotation=notation(),signature=`${current.root}|${current.quality}|${currentNotation}|${cssPx('--key-w',58)}`;
  if(!force&&signature===librarySignature&&host.querySelector('.white-key')){ensurePositionControls();return true;}
  renderingLibrary=true;librarySignature=signature;
  const chordPcs=new Set(current.pcs),voicingSet=new Set(fundamentalMidis(current.pcs)),whites=[];
  for(let midi=48;midi<=84;midi++)if(WHITE_PCS.has(midi%12))whites.push(midi);
  const keyWidth=cssPx('--key-w',58);
  host.className='piano library-cloned-piano';host.dataset.keyboardMode='play';host.replaceChildren();
  host.setAttribute('role','group');host.setAttribute('aria-label',`Piano de ${noteLabel(current.rootPc,currentNotation)} ${QUALITY_LABEL[current.quality]||'mayor'}`);
  whites.forEach((midi,index)=>{
    const pc=midi%12,white=document.createElement('button');
    white.type='button';white.dataset.performanceMidi=String(midi);
    white.className=`white-key${chordPcs.has(pc)?' chord-tone':''}${voicingSet.has(midi)?' voicing-tone':''}${pc===current.rootPc?' root-tone':''}`;
    white.textContent=noteLabel(pc,currentNotation);host.appendChild(white);
    if([0,2,5,7,9].includes(pc)&&midi+1<=84){
      const blackMidi=midi+1,blackPc=blackMidi%12,black=document.createElement('button');
      black.type='button';black.dataset.performanceMidi=String(blackMidi);
      black.className=`black-key${chordPcs.has(blackPc)?' chord-tone':''}${voicingSet.has(blackMidi)?' voicing-tone':''}${blackPc===current.rootPc?' root-tone':''}`;
      black.style.left=`${(index+1)*keyWidth}px`;black.textContent=noteLabel(blackPc,currentNotation);host.appendChild(black);
    }
  });
  host.style.minWidth=`${whites.length*keyWidth+8}px`;
  const title=document.getElementById('performancePianoTitle'),notes=document.getElementById('performancePianoNotes');
  if(title)title.textContent=`${noteLabel(current.rootPc,currentNotation)} ${QUALITY_LABEL[current.quality]||'mayor'}`;
  if(notes)notes.textContent=current.pcs.map(pc=>noteLabel(pc,currentNotation)).join(' · ');
  renderingLibrary=false;ensurePositionControls();return true;
}

function parseKeyPc(label){
  const value=String(label||'').trim().toUpperCase().replace(/♯/g,'#').replace(/♭/g,'B').replace(/\s+/g,'');
  for(const latin of ['SOL','DO','RE','MI','FA','LA','SI'])if(value.startsWith(latin)){
    const next=value.slice(latin.length,latin.length+1),accidental=next==='#'?'#':next==='B'?'b':'';
    return PC[(LATIN_TO_EN[latin]||'C')+accidental]??null;
  }
  const match=value.match(/^([A-G])([#B]?)/);return match?(PC[match[1]+(match[2]==='B'?'b':match[2])]??null):null;
}
function assignCircleMidis(){
  const host=document.getElementById('pianoKeyboard');if(!host)return;
  const whiteMidis=[];for(let midi=48;midi<=84;midi++)if(WHITE_PCS.has(midi%12))whiteMidis.push(midi);
  let whiteIndex=-1,lastWhiteMidi=48;
  [...host.children].forEach(key=>{
    if(key.classList.contains('white-key')){whiteIndex++;lastWhiteMidi=whiteMidis[whiteIndex]??(48+(whiteIndex*2));key.dataset.performanceMidi=String(lastWhiteMidi);}
    else if(key.classList.contains('black-key'))key.dataset.performanceMidi=String(lastWhiteMidi+1);
    else if(!key.dataset.performanceMidi){const pc=parseKeyPc(key.textContent);if(Number.isFinite(pc))key.dataset.performanceMidi=String(60+pc);}
  });
  host.dataset.keyboardMode='play';ensurePositionControls();
}

function scrollForHost(host){return host?.closest('.piano-scroll,.performance-piano-scroll')||null;}
function updateRange(binding){
  const max=Math.max(0,binding.scroll.scrollWidth-binding.scroll.clientWidth);
  binding.range.disabled=max<2;
  if(!binding.dragging)binding.range.value=max?String(Math.round(binding.scroll.scrollLeft/max*1000)):'0';
}
function bindRange(host,control){
  const scroll=scrollForHost(host),range=control.querySelector('input[type="range"]');if(!scroll||!range)return;
  const binding={host,scroll,range,dragging:false};rangeBindings.set(host,binding);
  range.addEventListener('pointerdown',()=>{binding.dragging=true;});
  range.addEventListener('pointerup',()=>{binding.dragging=false;updateRange(binding);});
  range.addEventListener('pointercancel',()=>{binding.dragging=false;updateRange(binding);});
  range.addEventListener('input',()=>{
    const max=Math.max(0,scroll.scrollWidth-scroll.clientWidth);
    scroll.scrollLeft=max*(Number(range.value)/1000);
  });
  scroll.addEventListener('scroll',()=>updateRange(binding),{passive:true});
  if(window.ResizeObserver)new ResizeObserver(()=>updateRange(binding)).observe(scroll);
  new MutationObserver(()=>requestAnimationFrame(()=>updateRange(binding))).observe(host,{childList:true,subtree:true});
  requestAnimationFrame(()=>updateRange(binding));
}
function makePositionControl(host){
  if(!host)return;
  document.querySelectorAll(`[data-keyboard-toggle="${host.id}"]`).forEach(node=>node.remove());
  const existing=document.querySelector(`[data-piano-position="${host.id}"]`);if(existing){if(!rangeBindings.has(host))bindRange(host,existing);return;}
  const control=document.createElement('div');control.className='piano-position-control';control.dataset.pianoPosition=host.id;
  control.innerHTML='<span class="piano-position-title">Desliza para mover el piano</span><input class="piano-position-range" type="range" min="0" max="1000" value="0" step="1" aria-label="Mover el piano horizontalmente"><span class="piano-position-arrows" aria-hidden="true">← →</span>';
  if(host.id==='pianoKeyboard')scrollForHost(host)?.before(control);
  else document.querySelector('#libraryPianoPanel .performance-piano-summary')?.after(control);
  bindRange(host,control);
}
function ensurePositionControls(){
  document.querySelectorAll('.keyboard-mode-slider,.keyboard-move-toggle').forEach(node=>node.remove());
  const circle=document.getElementById('pianoKeyboard'),library=document.getElementById('performancePianoKeyboard');
  if(circle){circle.dataset.keyboardMode='play';makePositionControl(circle);}
  if(library){library.dataset.keyboardMode='play';makePositionControl(library);}
}

function flashKey(key,duration=180){
  key.classList.add('performance-playing');clearTimeout(visualTimers.get(key));
  const timer=setTimeout(()=>{key.classList.remove('performance-playing');visualTimers.delete(key);},duration);visualTimers.set(key,timer);
}
function playKey(key){
  if(!key.dataset.performanceMidi&&key.closest('#pianoKeyboard'))assignCircleMidis();
  const midi=Number(key.dataset.performanceMidi);if(!Number.isFinite(midi))return;
  const audio=window.CirculosAudio,options={arpeggio:false,velocity:.96},context=audio?.ensureAudio?.();
  if(context&&context.state!=='running'&&typeof context.resume==='function')context.resume().then(()=>audio.play([midi],'piano',options)).catch(()=>{});
  else audio?.play([midi],'piano',options);
  flashKey(key);
}
function hostForKey(key){return key?.closest('#pianoKeyboard,#performancePianoKeyboard')||null;}
function keyAtPoint(event,host){
  const key=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('#pianoKeyboard button,#performancePianoKeyboard button');
  return key&&hostForKey(key)===host?key:null;
}
window.addEventListener('pointerdown',event=>{
  const key=event.target.closest?.('#pianoKeyboard button,#performancePianoKeyboard button');if(!key)return;
  event.preventDefault();event.stopImmediatePropagation();
  const host=hostForKey(key);activePointers.set(event.pointerId,{host,lastKey:key});blockedClicks.set(key,Date.now()+900);playKey(key);
  try{key.setPointerCapture?.(event.pointerId);}catch(e){}
},true);
window.addEventListener('pointermove',event=>{
  const item=activePointers.get(event.pointerId);if(!item)return;
  event.preventDefault();event.stopImmediatePropagation();
  const next=keyAtPoint(event,item.host);if(!next||next===item.lastKey)return;
  item.lastKey=next;blockedClicks.set(next,Date.now()+900);playKey(next);
},true);
['pointerup','pointercancel','lostpointercapture'].forEach(type=>window.addEventListener(type,event=>activePointers.delete(event.pointerId),true));
window.addEventListener('click',event=>{
  const key=event.target.closest?.('#pianoKeyboard button,#performancePianoKeyboard button');
  if(key&&(blockedClicks.get(key)||0)>Date.now()){event.preventDefault();event.stopImmediatePropagation();}
},true);

function refresh(){
  document.querySelectorAll('.keyboard-mode-slider,.keyboard-move-toggle').forEach(node=>node.remove());
  assignCircleMidis();renderLibraryPiano(false);ensurePositionControls();
}
function queueRefresh(){if(bodyQueued)return;bodyQueued=true;requestAnimationFrame(()=>{bodyQueued=false;refresh();});}
function init(){
  refresh();
  document.addEventListener('click',event=>{if(event.target.closest('#libraryRoots [data-library-root],[data-library-notation],[data-performance-library]')){librarySignature='';setTimeout(()=>renderLibraryPiano(true),0);}});
  document.addEventListener('change',event=>{if(event.target.id==='libraryQualitySelect'){librarySignature='';setTimeout(()=>renderLibraryPiano(true),0);}});
  const observer=new MutationObserver(queueRefresh);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',()=>document.querySelectorAll('.piano-position-range').forEach(range=>range.dispatchEvent(new Event('input'))),{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();