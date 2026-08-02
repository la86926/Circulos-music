(()=>{
'use strict';
if(window.__circulosPerformanceMode)return;
window.__circulosPerformanceMode=true;

const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const CHROMATIC=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const LATIN={C:'DO',D:'RE',E:'MI',F:'FA',G:'SOL',A:'LA',B:'SI'};
const LATIN_TO_EN={DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};
const INTERVALS={major:[0,4,7],minor:[0,3,7],dominant7:[0,4,7,10],major7:[0,4,7,11],minor7:[0,3,7,10],diminished:[0,3,6]};
const QUALITY_LABEL={major:'mayor',minor:'menor',dominant7:'séptima',major7:'mayor 7',minor7:'menor 7',diminished:'disminuido'};
const state={circles:'guitar',library:'guitar'};
let pianoSignature='';

if(!document.querySelector('link[href*="performance-ui.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='performance-ui.css?v=5';
  document.head.appendChild(link);
}

function cssPx(name,fallback){const raw=getComputedStyle(document.documentElement).getPropertyValue(name).trim();const value=parseFloat(raw);return Number.isFinite(value)&&value>0?value:fallback;}
const PremiumAudio={play(midis,instrument='guitar',options={}){window.CirculosAudio?.play(midis,instrument,options);}};

function parseNote(token){
  const value=String(token||'').trim().toUpperCase().replace(/NOTAS?:/g,'').replace(/♯/g,'#').replace(/♭/g,'B').replace(/\s+/g,'');
  if(!value)return null;
  for(const latin of ['SOL','DO','RE','MI','FA','LA','SI']){
    if(value.startsWith(latin)){
      const next=value.slice(latin.length,latin.length+1),accidental=next==='#'?'#':next==='B'?'b':'';
      return PC[(LATIN_TO_EN[latin]||'C')+accidental]??null;
    }
  }
  const match=value.match(/^([A-G])([#B]?)/);
  if(!match)return null;
  return PC[match[1]+(match[2]==='B'?'b':match[2])]??null;
}
const libraryNotation=()=>document.querySelector('[data-library-notation="latin"].active')?'latin':'english';
function displayNote(pc,notation=libraryNotation()){
  const english=CHROMATIC[(pc+12)%12];
  return notation==='english'?english.replace('#','♯'):`${LATIN[english[0]]}${english.slice(1).replace('#','♯')}`;
}
const currentQuality=()=>document.getElementById('libraryQualitySelect')?.value||document.querySelector('#libraryQualities [data-library-quality].active')?.dataset.libraryQuality||'major';
function ascendingMidis(pcs,instrument='guitar'){
  const base=instrument==='piano'?60:48;
  let previous=-Infinity;
  return pcs.map((pc,index)=>{
    let midi=base+pc;
    if(index===0&&instrument==='guitar'&&midi>59)midi-=12;
    while(midi<=previous)midi+=12;
    previous=midi;
    return midi;
  });
}
function cardChord(card){
  const text=card?.querySelector('.chord-notes,.chord-card-notes')?.textContent||'';
  return{index:Number(card?.dataset.d??0),notes:text.split(/[·,]/).map(parseNote).filter(Number.isFinite),card};
}
function libraryChord(rootOverride){
  const active=document.querySelector('#libraryRoots [data-library-root].active');
  const root=rootOverride||active?.dataset.libraryRoot||'C',rootPc=PC[root]??0,quality=currentQuality(),intervals=INTERVALS[quality]||INTERVALS.major;
  return{root,rootPc,quality,pcs:intervals.map(interval=>(rootPc+interval)%12)};
}

const playing=new Map();
function applyCirclePlaying(){
  const now=Date.now();
  for(const[index,expires]of playing)if(expires<=now)playing.delete(index);
  document.querySelectorAll('.harmony-wheel-node[data-wheel-index]').forEach(node=>node.classList.toggle('playing',playing.has(Number(node.dataset.wheelIndex))));
  document.querySelectorAll('#diatonicGrid .chord-card').forEach((card,index)=>card.classList.toggle('performance-playing',playing.has(index)));
}
function markCircle(index,duration=1750){
  playing.set(index,Date.now()+duration);
  applyCirclePlaying();
  setTimeout(()=>{if((playing.get(index)||0)<=Date.now())playing.delete(index);applyCirclePlaying();},duration+50);
}
function flash(element,duration=900){
  if(!element)return;
  element.classList.add('performance-playing');
  clearTimeout(element._performanceTimer);
  element._performanceTimer=setTimeout(()=>element.classList.remove('performance-playing'),duration);
}

const rotatePoint=(x,y,width)=>[y,width-x];
function rotateDiagram(svg){
  if(!svg||svg.dataset.horizontalTab==='true')return;
  const parts=(svg.getAttribute('viewBox')||'0 0 230 250').trim().split(/\s+/).map(Number),width=parts[2],height=parts[3];
  if(!Number.isFinite(width)||!Number.isFinite(height))return;
  svg.querySelectorAll('line').forEach(line=>{
    const a=rotatePoint(Number(line.getAttribute('x1')),Number(line.getAttribute('y1')),width),b=rotatePoint(Number(line.getAttribute('x2')),Number(line.getAttribute('y2')),width);
    line.setAttribute('x1',a[0]);line.setAttribute('y1',a[1]);line.setAttribute('x2',b[0]);line.setAttribute('y2',b[1]);
  });
  svg.querySelectorAll('circle').forEach(circle=>{
    const point=rotatePoint(Number(circle.getAttribute('cx')),Number(circle.getAttribute('cy')),width);
    circle.setAttribute('cx',point[0]);circle.setAttribute('cy',point[1]);
  });
  svg.querySelectorAll('text').forEach(text=>{
    const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'));
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const point=rotatePoint(x,y,width);
    text.setAttribute('x',point[0]);text.setAttribute('y',point[1]);text.removeAttribute('transform');
  });
  svg.setAttribute('viewBox',`0 0 ${height} ${width}`);
  svg.dataset.horizontalTab='true';
  svg.classList.add('horizontal-tab');
}
function rotateInside(host){host?.querySelectorAll('.chord-diagram,.library-diagram').forEach(rotateDiagram);}

function toneClassMap(pcs){return new Map(pcs.map((pc,index)=>[pc,`triad-tone-${index+1}`]));}
function decorateCirclePiano(){
  const host=document.getElementById('pianoKeyboard');
  const active=document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card');
  if(!host||!active)return;
  const chord=cardChord(active),classes=toneClassMap(chord.notes);
  host.querySelectorAll('.white-key,.black-key').forEach(key=>{
    key.classList.remove('triad-tone-1','triad-tone-2','triad-tone-3','triad-tone-4');
    const pc=parseNote(key.textContent),className=classes.get(pc);
    if(className)key.classList.add(className);
  });
}

function initializeCircleDetail(){
  const panel=document.getElementById('instrumento');
  if(!panel)return;
  if(!panel.querySelector('.last-chord-kicker'))panel.insertAdjacentHTML('afterbegin','<p class="last-chord-kicker">Último acorde tocado</p>');
  if(!panel.dataset.performanceDefault){
    panel.dataset.performanceDefault='guitar';
    requestAnimationFrame(()=>panel.querySelector('[data-instrument="guitar"]')?.click());
  }
  if(!panel.dataset.performanceBound){
    panel.dataset.performanceBound='true';
    panel.addEventListener('click',event=>{
      const button=event.target.closest('[data-instrument]');
      if(button)state.circles=button.dataset.instrument||'guitar';
    });
  }
}
function createLibrarySwitch(){
  const view=document.getElementById('chordsView'),grid=document.getElementById('chordLibraryGrid');
  if(!view||!grid)return;
  const panel=grid.closest('.panel');
  if(!panel)return;
  let control=document.getElementById('libraryPerformanceSwitch');
  if(!control){
    control=document.createElement('div');
    control.id='libraryPerformanceSwitch';
    control.className='performance-instrument-switch';
    control.innerHTML='<span>Instrumento</span><div class="segmented seg2"><button class="seg-btn active" data-performance-library="guitar" type="button">Guitarra</button><button class="seg-btn" data-performance-library="piano" type="button">Piano</button></div>';
    panel.insertBefore(control,grid);
    view.dataset.performanceInstrument='guitar';
  }
  if(!document.getElementById('libraryPianoPanel')){
    const piano=document.createElement('section');
    piano.id='libraryPianoPanel';
    piano.innerHTML='<div class="performance-piano-summary"><div><strong id="performancePianoTitle">C mayor</strong><small id="performancePianoNotes">C · E · G</small></div></div><div class="performance-piano-scroll"><div class="performance-piano" id="performancePianoKeyboard"></div></div>';
    panel.insertBefore(piano,grid.nextSibling);
  }
  if(!control.dataset.performanceBound){
    control.dataset.performanceBound='true';
    control.addEventListener('click',event=>{
      const button=event.target.closest('[data-performance-library]');
      if(!button)return;
      state.library=button.dataset.performanceLibrary;
      control.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));
      view.dataset.performanceInstrument=state.library;
      pianoSignature='';
      renderLibraryPiano();
    });
  }
  renderLibraryPiano();
}
function renderLibraryPiano(){
  const host=document.getElementById('performancePianoKeyboard');
  if(!host)return;
  const chord=libraryChord(),notation=libraryNotation(),signature=`${chord.root}|${chord.quality}|${notation}`;
  if(signature===pianoSignature&&host.childElementCount)return;
  pianoSignature=signature;
  const classes=toneClassMap(chord.pcs),whitePcs=new Set([0,2,4,5,7,9,11]),whites=[],title=document.getElementById('performancePianoTitle'),notes=document.getElementById('performancePianoNotes');
  if(title)title.textContent=`${displayNote(chord.rootPc,notation)} ${QUALITY_LABEL[chord.quality]||'mayor'}`;
  if(notes)notes.textContent=chord.pcs.map(pc=>displayNote(pc,notation)).join(' · ');
  host.replaceChildren();
  for(let midi=48;midi<=83;midi++)if(whitePcs.has(midi%12))whites.push(midi);
  const keyWidth=cssPx('--pkey-w',51);
  whites.forEach((midi,index)=>{
    const pc=midi%12,key=document.createElement('button'),toneClass=classes.get(pc)||'';
    key.type='button';key.dataset.performanceMidi=midi;
    key.className=`performance-white-key ${toneClass}`.trim();
    key.textContent=displayNote(pc,notation);
    host.appendChild(key);
    if([0,2,5,7,9].includes(pc)&&midi+1<=83){
      const blackMidi=midi+1,blackPc=blackMidi%12,black=document.createElement('button'),blackTone=classes.get(blackPc)||'';
      black.type='button';black.dataset.performanceMidi=blackMidi;
      black.className=`performance-black-key ${blackTone}`.trim();
      black.style.left=`${(index+1)*keyWidth}px`;
      black.textContent=displayNote(blackPc,notation);
      host.appendChild(black);
    }
  });
  host.style.minWidth=`${whites.length*keyWidth+8}px`;
}

const blockedClicks=new WeakMap();
function blockNextClick(element){if(element)blockedClicks.set(element,Date.now()+700);}
document.addEventListener('click',event=>{
  const element=event.target.closest?.('.harmony-wheel-node,.library-card-play,#guitarVoicings .voicing-play,#playChordBtn');
  if(element&&(blockedClicks.get(element)||0)>Date.now()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},true);

document.addEventListener('pointerdown',event=>{
  const circle=event.target.closest?.('.harmony-wheel-node[data-wheel-index]');
  if(circle){
    event.preventDefault();event.stopPropagation();blockNextClick(circle);
    const index=Number(circle.dataset.wheelIndex),card=[...document.querySelectorAll('#diatonicGrid .chord-card')][index],chord=cardChord(card);
    if(chord.notes.length)PremiumAudio.play(ascendingMidis(chord.notes,state.circles),state.circles,{arpeggio:state.circles==='guitar'});
    card?.click();
    markCircle(index);
    requestAnimationFrame(()=>{initializeCircleDetail();rotateInside(document.getElementById('guitarVoicings'));decorateCirclePiano();});
    return;
  }
  const rootButton=event.target.closest?.('#libraryRoots [data-library-root]');
  if(rootButton){
    const chord=libraryChord(rootButton.dataset.libraryRoot);
    PremiumAudio.play(ascendingMidis(chord.pcs,state.library),state.library,{arpeggio:state.library==='guitar'});
    flash(rootButton);
    return;
  }
  const libraryPlay=event.target.closest?.('.library-card-play');
  if(libraryPlay){
    event.preventDefault();event.stopPropagation();blockNextClick(libraryPlay);
    const chord=libraryChord();
    PremiumAudio.play(ascendingMidis(chord.pcs,state.library),state.library,{arpeggio:state.library==='guitar'});
    flash(libraryPlay.closest('.library-card'));
    return;
  }
  const voicingPlay=event.target.closest?.('#guitarVoicings .voicing-play');
  if(voicingPlay){
    event.preventDefault();event.stopPropagation();blockNextClick(voicingPlay);
    const chord=cardChord(document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card'));
    if(chord.notes.length)PremiumAudio.play(ascendingMidis(chord.notes,'guitar'),'guitar',{arpeggio:true});
    flash(voicingPlay.closest('.voicing-card'));
    return;
  }
  const replay=event.target.closest?.('#playChordBtn');
  if(replay){
    event.preventDefault();event.stopPropagation();blockNextClick(replay);
    const chord=cardChord(document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card'));
    if(chord.notes.length)PremiumAudio.play(ascendingMidis(chord.notes,state.circles),state.circles,{arpeggio:state.circles==='guitar'});
    markCircle(chord.index);
  }
},true);

document.addEventListener('click',event=>{
  const premiumKey=event.target.closest?.('[data-performance-midi]');
  if(premiumKey){
    event.preventDefault();event.stopImmediatePropagation();
    PremiumAudio.play([Number(premiumKey.dataset.performanceMidi)],'piano',{arpeggio:false,velocity:.94});
    flash(premiumKey,320);
    return;
  }
  const existingKey=event.target.closest?.('#pianoKeyboard .white-key,#pianoKeyboard .black-key');
  if(existingKey){flash(existingKey,320);return;}
  if(event.target.closest?.('#libraryRoots [data-library-root],[data-library-notation]')){
    pianoSignature='';
    setTimeout(renderLibraryPiano,0);
  }
},true);
document.addEventListener('change',event=>{
  if(event.target.id==='libraryQualitySelect'){
    pianoSignature='';
    setTimeout(renderLibraryPiano,0);
  }
});

function observeChildren(host,callback){
  if(!host)return;
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;callback();});
  }).observe(host,{childList:true,subtree:true});
}
function init(){
  initializeCircleDetail();
  createLibrarySwitch();
  rotateInside(document.getElementById('guitarVoicings'));
  rotateInside(document.getElementById('chordLibraryGrid'));
  decorateCirclePiano();
  observeChildren(document.getElementById('guitarVoicings'),()=>rotateInside(document.getElementById('guitarVoicings')));
  observeChildren(document.getElementById('chordLibraryGrid'),()=>rotateInside(document.getElementById('chordLibraryGrid')));
  observeChildren(document.getElementById('pianoKeyboard'),decorateCirclePiano);
  observeChildren(document.getElementById('diatonicGrid'),()=>requestAnimationFrame(decorateCirclePiano));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();