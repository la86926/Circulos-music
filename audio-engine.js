(()=>{
'use strict';
if(window.CirculosAudio)return;

let ctx=null,master=null,limiter=null,highpass=null,presence=null,output=null,resumePromise=null;

const PIANO_PARTIALS=[['triangle',1,0,.60],['sine',2,0,.25],['sine',3,0,.11],['sine',4,0,.04]];
const GUITAR_PARTIALS=[['triangle',1,0,.58],['sine',2,0,.24],['sine',3,0,.12],['sine',4,0,.06]];
const QUALITY_PATTERNS={
  major:[0,4,7],
  minor:[0,3,7],
  dominant7:[0,4,7,10],
  major7:[0,4,7,11],
  minor7:[0,3,7,10],
  diminished:[0,3,6]
};
const QUALITY_PROFILES={
  neutral:{brightness:1,release:1,attack:1,q:.72,harmonics:[1,1,1,1],detune:0,gain:1,gap:.030},
  major:{brightness:1.14,release:1,attack:.88,q:.62,harmonics:[1.10,1,.82,.58],detune:.35,gain:1.02,gap:.026},
  minor:{brightness:.76,release:1.20,attack:1.10,q:.86,harmonics:[1.14,.72,.48,.28],detune:-.70,gain:1.04,gap:.038},
  dominant7:{brightness:1.30,release:.88,attack:.78,q:1.08,harmonics:[.95,1.18,1.12,.90],detune:1.60,gain:1.05,gap:.021},
  major7:{brightness:.98,release:1.38,attack:1.24,q:.58,harmonics:[.92,1.05,.76,.42],detune:.75,gain:1.02,gap:.034},
  minor7:{brightness:.70,release:1.44,attack:1.18,q:.94,harmonics:[1.16,.68,.50,.30],detune:-1.10,gain:1.04,gap:.040},
  diminished:{brightness:1.42,release:.72,attack:.70,q:1.28,harmonics:[.88,1.20,1.26,1.02],detune:2.40,gain:1.06,gap:.018}
};

function buildAudioGraph(){
  ctx=new(window.AudioContext||window.webkitAudioContext)();
  highpass=ctx.createBiquadFilter();
  highpass.type='highpass';
  highpass.frequency.value=55;
  highpass.Q.value=.707;

  presence=ctx.createBiquadFilter();
  presence.type='highshelf';
  presence.frequency.value=1800;
  presence.gain.value=2.2;

  limiter=ctx.createDynamicsCompressor();
  limiter.threshold.value=-7;
  limiter.knee.value=8;
  limiter.ratio.value=8;
  limiter.attack.value=.003;
  limiter.release.value=.18;

  master=ctx.createGain();
  master.gain.value=2.6;
  output=ctx.createGain();
  output.gain.value=1.04;
  master.connect(highpass).connect(presence).connect(limiter).connect(output).connect(ctx.destination);
}

function ensureAudio(){
  if(!ctx||ctx.state==='closed')buildAudioGraph();
  return ctx;
}

function resumeAudio(){
  const audio=ensureAudio();
  if(audio.state==='running')return Promise.resolve(audio);
  if(resumePromise)return resumePromise;
  resumePromise=audio.resume()
    .then(()=>audio)
    .catch(()=>audio)
    .finally(()=>{resumePromise=null;});
  return resumePromise;
}

const frequency=midi=>440*Math.pow(2,(midi-69)/12);
const samePattern=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
function inferQuality(notes,explicit){
  if(explicit&&QUALITY_PROFILES[explicit])return explicit;
  const pcs=[...new Set(notes.map(note=>((note%12)+12)%12))];
  for(const [quality,pattern] of Object.entries(QUALITY_PATTERNS)){
    if(pattern.length!==pcs.length)continue;
    for(const rootPc of pcs){
      const intervals=pcs.map(pc=>(pc-rootPc+12)%12).sort((a,b)=>a-b);
      if(samePattern(intervals,pattern))return quality;
    }
  }
  return'neutral';
}

function voice(midi,start,peak,partials,options,profile){
  const audio=ensureAudio(),freq=frequency(midi),filter=audio.createBiquadFilter(),envelope=audio.createGain();
  const {cutoffBase,cutoffSpan,cutoffMax,cutoffFloor,sweep,attack,breakLevel,breakTime,release}=options;
  const brightness=profile.brightness||1;
  filter.type='lowpass';
  filter.Q.value=profile.q||.72;
  filter.frequency.setValueAtTime(Math.min(cutoffMax,Math.max(cutoffFloor,(cutoffBase+freq*cutoffSpan)*brightness)),start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoffFloor,freq*sweep*brightness),start+release*profile.release*.75);

  const adjustedAttack=Math.max(.004,attack*profile.attack),adjustedRelease=release*profile.release;
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(peak*profile.gain,start+adjustedAttack);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*breakLevel*profile.gain),start+breakTime*profile.release);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+adjustedRelease);
  filter.connect(envelope).connect(master);

  partials.forEach(([type,multiple,detune,level],index)=>{
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(freq*multiple,start);
    oscillator.detune.value=detune+(profile.detune||0)*(index%2===0?1:-1);
    gain.gain.value=level*(profile.harmonics[index]??1);
    oscillator.connect(gain).connect(filter);
    oscillator.start(start);
    oscillator.stop(start+adjustedRelease+.08);
  });
}

function pianoTone(midi,start,peak,profile){
  voice(midi,start,peak,PIANO_PARTIALS,{
    cutoffBase:3200,cutoffSpan:4.6,cutoffMax:8200,cutoffFloor:1400,sweep:2.3,
    attack:.010,breakLevel:.40,breakTime:.30,release:2.3
  },profile);
}

function guitarTone(midi,start,peak,profile){
  voice(midi,start,peak,GUITAR_PARTIALS,{
    cutoffBase:2100,cutoffSpan:3.8,cutoffMax:6200,cutoffFloor:900,sweep:1.9,
    attack:.007,breakLevel:.34,breakTime:.18,release:1.7
  },profile);
}

function schedulePlayback(notes,instrument,options){
  const audio=ensureAudio();
  if(audio.state!=='running')return;
  const quality=inferQuality(notes,options.quality),profile=QUALITY_PROFILES[quality]||QUALITY_PROFILES.neutral;
  const now=audio.currentTime+.012,arpeggio=options.arpeggio??(instrument==='guitar');
  const gap=arpeggio?(options.gap??profile.gap):0,velocity=options.velocity??1;
  const peak=Math.min(.82,.88*velocity/Math.pow(notes.length,.46));
  notes.forEach((midi,index)=>{
    const start=now+index*gap;
    if(instrument==='piano')pianoTone(midi,start,peak,profile);else guitarTone(midi,start,peak,profile);
  });
}

function play(midis,instrument='piano',options={}){
  const notes=(Array.isArray(midis)?midis:[midis]).filter(Number.isFinite);
  if(!notes.length)return;
  const audio=ensureAudio();
  if(audio.state==='running')schedulePlayback(notes,instrument,options);
  else resumeAudio().then(active=>{if(active.state==='running')schedulePlayback(notes,instrument,options);});
}

window.CirculosAudio={play,ensureAudio,resume:resumeAudio,context:()=>ctx};
window.CirculosPremiumAudio=window.CirculosAudio;

const wake=()=>{resumeAudio();};
['pointerdown','touchstart','keydown'].forEach(type=>document.addEventListener(type,wake,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();},{passive:true});
window.addEventListener('pageshow',wake,{passive:true});
})();
