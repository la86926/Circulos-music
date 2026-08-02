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
const performanceState={circles:'guitar',library:'guitar'};

if(!document.querySelector('link[href*="performance-ui.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='performance-ui.css?v=1';
  document.head.appendChild(link);
}

let audioContext=null,masterGain=null,noiseBuffer=null;
function ensureAudio(){
  if(!audioContext){
    audioContext=new(window.AudioContext||window.webkitAudioContext)();
    const compressor=audioContext.createDynamicsCompressor();
    compressor.threshold.value=-18;
    compressor.knee.value=18;
    compressor.ratio.value=4;
    compressor.attack.value=.004;
    compressor.release.value=.22;
    masterGain=audioContext.createGain();
    masterGain.gain.value=.82;
    masterGain.connect(compressor).connect(audioContext.destination);
    noiseBuffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*.22),audioContext.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2.6);
  }
  if(audioContext.state==='suspended')audioContext.resume();
  return audioContext;
}
function frequency(midi){return 440*Math.pow(2,(midi-69)/12)}
function pianoTone(midi,start,velocity=.86){
  const ctx=ensureAudio(),freq=frequency(midi),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();
  filter.type='lowpass';
  filter.frequency.setValueAtTime(Math.min(7600,3000+freq*5),start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(1100,freq*2.2),start+1.8);
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(.22*velocity,start+.006);
  envelope.gain.exponentialRampToValueAtTime(.075*velocity,start+.24);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+2.45);
  filter.connect(envelope).connect(masterGain);
  const layers=[['triangle',1,0,.64],['sine',2,-4,.21],['sine',3,3,.1],['sine',.5,0,.05]];
  layers.forEach(([type,multiple,detune,level])=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq*multiple,start);
    osc.detune.value=detune;
    gain.gain.value=level;
    osc.connect(gain).connect(filter);
    osc.start(start);
    osc.stop(start+2.5);
  });
  const transient=ctx.createBufferSource(),transientGain=ctx.createGain(),high=ctx.createBiquadFilter();
  transient.buffer=noiseBuffer;
  high.type='highpass';high.frequency.value=1800;
  transientGain.gain.setValueAtTime(.035*velocity,start);
  transientGain.gain.exponentialRampToValueAtTime(.0001,start+.045);
  transient.connect(high).connect(transientGain).connect(masterGain);
  transient.start(start);transient.stop(start+.06);
}
function guitarTone(midi,start,velocity=.86){
  const ctx=ensureAudio(),freq=frequency(midi),body=ctx.createBiquadFilter(),envelope=ctx.createGain();
  body.type='lowpass';
  body.frequency.setValueAtTime(Math.min(5200,1700+freq*4),start);
  body.frequency.exponentialRampToValueAtTime(Math.max(700,freq*1.8),start+1.45);
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(.19*velocity,start+.004);
  envelope.gain.exponentialRampToValueAtTime(.058*velocity,start+.13);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+1.75);
  body.connect(envelope).connect(masterGain);
  [['triangle',1,.7],['sine',2,.2],['sine',3,.1]].forEach(([type,multiple,level])=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq*multiple,start);gain.gain.value=level;
    osc.connect(gain).connect(body);osc.start(start);osc.stop(start+1.8);
  });
  const pick=ctx.createBufferSource(),pickFilter=ctx.createBiquadFilter(),pickGain=ctx.createGain();
  pick.buffer=noiseBuffer;
  pickFilter.type='bandpass';pickFilter.frequency.value=Math.min(6500,freq*4.5);pickFilter.Q.value=.8;
  pickGain.gain.setValueAtTime(.13*velocity,start);
  pickGain.gain.exponentialRampToValueAtTime(.0001,start+.12);
  pick.connect(pickFilter).connect(pickGain).connect(masterGain);
  pick.start(start);pick.stop(start+.14);
}
const PremiumAudio={
  play(midis,instrument='guitar',options={}){
    if(!Array.isArray(midis)||!midis.length)return;
    const ctx=ensureAudio(),now=ctx.currentTime+.006,arpeggio=options.arpeggio??instrument==='guitar',gap=arpeggio?.038:0,velocity=options.velocity??.88;
    midis.forEach((midi,index)=>{
      const start=now+index*gap;
      if(instrument==='piano')pianoTone(midi,start,velocity);else guitarTone(midi,start,velocity);
    });
  }
};
window.CirculosPremiumAudio=PremiumAudio;

function parseNote(token){
  let value=String(token||'').trim().toUpperCase().replace(/NOTAS?:/g,'').replace(/♯/g,'#').replace(/♭/g,'B').replace(/\s+/g,'');
  if(!value)return null;
  for(const latin of ['SOL','DO','RE','MI','FA','LA','SI']){
    if(value.startsWith(latin)){
      const accidental=value.slice(latin.length,latin.length+1)==='#'?'#':value.slice(latin.length,latin.length+1)==='B'?'b':'';
      return PC[(LATIN_TO_EN[latin]||'C')+accidental]??null;
    }
  }
  const match=value.match(/^([A-G])([#B]?)/);
  if(!match)return null;
  const note=match[1]+(match[2]==='B'?'b':match[2]);
  return PC[note]??null;
}
function notation(){return document.querySelector('[data-library-notation="latin"].active')?'latin':'english'}
function displayNote(pc,currentNotation=notation()){
  const english=CHROMATIC[(pc+12)%12];
  if(currentNotation==='english')return english.replace('#','♯');
  return `${LATIN[english[0]]}${english.slice(1).replace('#','♯')}`;
}
function quality(){return document.getElementById('libraryQualitySelect')?.value||document.querySelector('#libraryQualities [data-library-quality].active')?.dataset.libraryQuality||'major'}
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
  const noteText=card?.querySelector('.chord-notes,.chord-card-notes')?.textContent||'';
  const pcs=noteText.split(/[·,]/).map(parseNote).filter(Number.isFinite);
  return{
    index:Number(card?.dataset.d??0),
    name:card?.querySelector('.chord-name,.chord-card-name')?.textContent?.trim()||'',
    notes:pcs,
    noteText,
    card
  };
}
function selectedLibraryChord(rootOverride){
  const active=document.querySelector('#libraryRoots [data-library-root].active');
  const root=rootOverride||active?.dataset.libraryRoot||'C';
  const rootPc=PC[root]??0,q=quality(),intervals=INTERVALS[q]||INTERVALS.major;
  return{root,rootPc,quality:q,pcs:intervals.map(interval=>(rootPc+interval)%12)};
}

const circlePlaying=new Map();
function markCircle(index,duration=1900){
  const expires=Date.now()+duration;
  circlePlaying.set(index,expires);
  applyCirclePlaying();
  setTimeout(()=>{if((circlePlaying.get(index)||0)<=Date.now())circlePlaying.delete(index);applyCirclePlaying();},duration+40);
}
function applyCirclePlaying(){
  const now=Date.now();
  for(const[index,expires]of circlePlaying)if(expires<=now)circlePlaying.delete(index);
  document.querySelectorAll('.harmony-wheel-node[data-wheel-index]').forEach(node=>node.classList.toggle('playing',circlePlaying.has(Number(node.dataset.wheelIndex))));
  document.querySelectorAll('#diatonicGrid .chord-card').forEach((card,index)=>card.classList.toggle('performance-playing',circlePlaying.has(index)));
}
function flash(element,duration=1500){
  if(!element)return;
  element.classList.add('performance-playing');
  clearTimeout(element._performanceTimer);
  element._performanceTimer=setTimeout(()=>element.classList.remove('performance-playing'),duration);
}

function rotatePoint(x,y,width){return[y,width-x]}
function rotateDiagram(svg){
  if(!svg||svg.dataset.horizontalTab==='true')return;
  const parts=(svg.getAttribute('viewBox')||'0 0 230 250').trim().split(/\s+/).map(Number);
  const width=parts[2],height=parts[3];
  if(!Number.isFinite(width)||!Number.isFinite(height))return;
  svg.querySelectorAll('line').forEach(line=>{
    const[x1,y1]=rotatePoint(Number(line.getAttribute('x1')),Number(line.getAttribute('y1')),width);
    const[x2,y2]=rotatePoint(Number(line.getAttribute('x2')),Number(line.getAttribute('y2')),width);
    line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',x2);line.setAttribute('y2',y2);
  });
  svg.querySelectorAll('circle').forEach(circle=>{
    const[x,y]=rotatePoint(Number(circle.getAttribute('cx')),Number(circle.getAttribute('cy')),width);
    circle.setAttribute('cx',x);circle.setAttribute('cy',y);
  });
  svg.querySelectorAll('text').forEach(text=>{
    const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'));
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const[nx,ny]=rotatePoint(x,y,width);
    text.setAttribute('x',nx);text.setAttribute('y',ny);
    text.removeAttribute('transform');
  });
  svg.setAttribute('viewBox',`0 0 ${height} ${width}`);
  svg.dataset.horizontalTab='true';
  svg.classList.add('horizontal-tab');
}
function rotateAll(){document.querySelectorAll('.chord-diagram,.library-diagram').forEach(rotateDiagram)}

function initializeCircleDetail(){
  const panel=document.getElementById('instrumento');
  if(!panel)return;
  if(!panel.querySelector('.last-chord-kicker'))panel.insertAdjacentHTML('afterbegin','<p class="last-chord-kicker">Último acorde tocado</p>');
  if(!panel.dataset.performanceDefault){
    panel.dataset.performanceDefault='guitar';
    requestAnimationFrame(()=>panel.querySelector('[data-instrument="guitar"]')?.click());
  }
  panel.querySelectorAll('[data-instrument]').forEach(button=>button.addEventListener('click',()=>{performanceState.circles=button.dataset.instrument||'guitar';}));
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
  }
  let piano=document.getElementById('libraryPianoPanel');
  if(!piano){
    piano=document.createElement('section');
    piano.id='libraryPianoPanel';
    piano.innerHTML='<div class="performance-piano-summary"><div><strong id="performancePianoTitle">C mayor</strong><small id="performancePianoNotes">C · E · G</small></div></div><div class="performance-piano-scroll"><div class="performance-piano" id="performancePianoKeyboard"></div></div>';
    panel.insertBefore(piano,grid.nextSibling);
  }
  control.querySelectorAll('[data-performance-library]').forEach(button=>button.addEventListener('click',()=>{
    performanceState.library=button.dataset.performanceLibrary;
    control.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));
    view.dataset.performanceInstrument=performanceState.library;
    renderLibraryPiano();
  }));
  view.dataset.performanceInstrument='guitar';
  renderLibraryPiano();
}
function renderLibraryPiano(){
  const host=document.getElementById('performancePianoKeyboard');
  if(!host)return;
  const chord=selectedLibraryChord(),currentNotation=notation(),pcs=new Set(chord.pcs),whitePcs=new Set([0,2,4,5,7,9,11]),whites=[];
  document.getElementById('performancePianoTitle').textContent=`${displayNote(chord.rootPc,currentNotation)} ${QUALITY_LABEL[chord.quality]||'mayor'}`;
  document.getElementById('performancePianoNotes').textContent=chord.pcs.map(pc=>displayNote(pc,currentNotation)).join(' · ');
  host.replaceChildren();
  for(let midi=48;midi<=83;midi++)if(whitePcs.has(midi%12))whites.push(midi);
  const keyWidth=54;
  whites.forEach((midi,index)=>{
    const pc=midi%12,key=document.createElement('button');
    key.type='button';key.dataset.performanceMidi=midi;
    key.className=`performance-white-key${pcs.has(pc)?' chord-tone':''}${pc===chord.rootPc?' root-tone':''}`;
    key.textContent=displayNote(pc,currentNotation);
    host.appendChild(key);
    if([0,2,5,7,9].includes(pc)&&midi+1<=83){
      const blackMidi=midi+1,blackPc=blackMidi%12,black=document.createElement('button');
      black.type='button';black.dataset.performanceMidi=blackMidi;
      black.className=`performance-black-key${pcs.has(blackPc)?' chord-tone':''}${blackPc===chord.rootPc?' root-tone':''}`;
      black.style.left=`${(index+1)*keyWidth}px`;
      black.textContent=displayNote(blackPc,currentNotation);
      host.appendChild(black);
    }
  });
  host.style.minWidth=`${whites.length*keyWidth+8}px`;
}

let suppressCircleClickUntil=0;
document.addEventListener('pointerdown',event=>{
  const circleNode=event.target.closest?.('.harmony-wheel-node[data-wheel-index]');
  if(circleNode){
    event.preventDefault();event.stopPropagation();
    const index=Number(circleNode.dataset.wheelIndex),card=[...document.querySelectorAll('#diatonicGrid .chord-card')][index],chord=cardChord(card);
    if(chord.notes.length){
      PremiumAudio.play(ascendingMidis(chord.notes,performanceState.circles),performanceState.circles,{arpeggio:performanceState.circles==='guitar'});
      markCircle(index);
    }
    suppressCircleClickUntil=Date.now()+700;
    card?.click();
    return;
  }
  const rootButton=event.target.closest?.('#libraryRoots [data-library-root]');
  if(rootButton){
    const chord=selectedLibraryChord(rootButton.dataset.libraryRoot);
    PremiumAudio.play(ascendingMidis(chord.pcs,performanceState.library),performanceState.library,{arpeggio:performanceState.library==='guitar'});
    flash(rootButton);
    setTimeout(renderLibraryPiano,0);
    return;
  }
  const libraryPlay=event.target.closest?.('.library-card-play');
  if(libraryPlay){
    const chord=selectedLibraryChord();
    PremiumAudio.play(ascendingMidis(chord.pcs,performanceState.library),performanceState.library,{arpeggio:performanceState.library==='guitar'});
    flash(libraryPlay.closest('.library-card'));
    return;
  }
  const voicingPlay=event.target.closest?.('#guitarVoicings .voicing-play');
  if(voicingPlay){
    const activeCard=document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card');
    const chord=cardChord(activeCard);
    if(chord.notes.length)PremiumAudio.play(ascendingMidis(chord.notes,'guitar'),'guitar',{arpeggio:true});
    flash(voicingPlay.closest('.voicing-card'));
    return;
  }
  const replay=event.target.closest?.('#playChordBtn');
  if(replay){
    const activeCard=document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card');
    const chord=cardChord(activeCard);
    if(chord.notes.length)PremiumAudio.play(ascendingMidis(chord.notes,performanceState.circles),performanceState.circles,{arpeggio:performanceState.circles==='guitar'});
    markCircle(chord.index);
    return;
  }
  const premiumKey=event.target.closest?.('[data-performance-midi]');
  if(premiumKey){
    PremiumAudio.play([Number(premiumKey.dataset.performanceMidi)],'piano',{arpeggio:false,velocity:.96});
    flash(premiumKey,420);
    return;
  }
  const existingPianoKey=event.target.closest?.('#pianoKeyboard .white-key,#pianoKeyboard .black-key');
  if(existingPianoKey){
    const text=existingPianoKey.textContent,pc=parseNote(text);
    if(Number.isFinite(pc))PremiumAudio.play([60+pc],'piano',{arpeggio:false,velocity:.9});
  }
},true);
document.addEventListener('click',event=>{
  if(Date.now()<suppressCircleClickUntil&&event.target.closest?.('.harmony-wheel-node')){
    event.preventDefault();event.stopImmediatePropagation();
  }
},true);

document.addEventListener('click',event=>{
  const instrument=event.target.closest?.('#instrumento [data-instrument]');
  if(instrument)performanceState.circles=instrument.dataset.instrument||'guitar';
  if(event.target.closest?.('[data-library-notation]'))setTimeout(renderLibraryPiano,0);
  if(event.target.closest?.('#libraryQualitySelect'))setTimeout(renderLibraryPiano,0);
});
document.addEventListener('change',event=>{if(event.target.id==='libraryQualitySelect')setTimeout(renderLibraryPiano,0)});

function refresh(){
  initializeCircleDetail();
  createLibrarySwitch();
  rotateAll();
  applyCirclePlaying();
  renderLibraryPiano();
}
const observer=new MutationObserver(()=>requestAnimationFrame(refresh));
observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
