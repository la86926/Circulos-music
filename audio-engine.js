(()=>{
'use strict';
if(window.CirculosAudio)return;

let ctx=null,master=null,limiter=null,highpass=null,output=null;

function ensureAudio(){
  if(!ctx){
    ctx=new(window.AudioContext||window.webkitAudioContext)();
    highpass=ctx.createBiquadFilter();
    highpass.type='highpass';
    highpass.frequency.value=72;
    highpass.Q.value=.707;
    limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-1;
    limiter.knee.value=0;
    limiter.ratio.value=20;
    limiter.attack.value=.002;
    limiter.release.value=.20;
    master=ctx.createGain();
    master.gain.value=2.2;
    output=ctx.createGain();
    output.gain.value=1.1;
    master.connect(highpass).connect(limiter).connect(output).connect(ctx.destination);
  }
  if(ctx.state==='suspended')ctx.resume();
  return ctx;
}

const frequency=midi=>440*Math.pow(2,(midi-69)/12);

const PIANO_PARTIALS=[['triangle',1,0,.60],['sine',2,0,.25],['sine',3,0,.11],['sine',4,0,.04]];
const GUITAR_PARTIALS=[['triangle',1,0,.58],['sine',2,0,.24],['sine',3,0,.12],['sine',4,0,.06]];

function voice(midi,start,peak,partials,options){
  const audio=ensureAudio(),
        freq=frequency(midi),
        filter=audio.createBiquadFilter(),
        envelope=audio.createGain(),
        {cutoffBase,cutoffSpan,cutoffMax,cutoffFloor,sweep,attack,breakLevel,breakTime,release}=options;
  filter.type='lowpass';
  filter.Q.value=.7;
  filter.frequency.setValueAtTime(Math.min(cutoffMax,cutoffBase+freq*cutoffSpan),start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoffFloor,freq*sweep),start+release*.75);
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(peak,start+attack);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*breakLevel),start+breakTime);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+release);
  filter.connect(envelope).connect(master);
  partials.forEach(([type,multiple,detune,level])=>{
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(freq*multiple,start);
    oscillator.detune.value=detune;
    gain.gain.value=level;
    oscillator.connect(gain).connect(filter);
    oscillator.start(start);
    oscillator.stop(start+release+.05);
  });
}

function pianoTone(midi,start,peak){
  voice(midi,start,peak,PIANO_PARTIALS,{
    cutoffBase:3200,cutoffSpan:4.6,cutoffMax:8200,cutoffFloor:1400,sweep:2.3,
    attack:.010,breakLevel:.40,breakTime:.30,release:2.3
  });
}

function guitarTone(midi,start,peak){
  voice(midi,start,peak,GUITAR_PARTIALS,{
    cutoffBase:2100,cutoffSpan:3.8,cutoffMax:6200,cutoffFloor:900,sweep:1.9,
    attack:.007,breakLevel:.34,breakTime:.18,release:1.7
  });
}

function play(midis,instrument='piano',options={}){
  if(!Array.isArray(midis))midis=[midis];
  const notes=midis.filter(Number.isFinite);
  if(!notes.length)return;
  const audio=ensureAudio(),
        now=audio.currentTime+.01,
        arpeggio=options.arpeggio??(instrument==='guitar'),
        gap=arpeggio?(options.gap??.030):0,
        velocity=options.velocity??1,
        peak=Math.min(.72,.78*velocity/Math.sqrt(notes.length));
  notes.forEach((midi,index)=>{
    const start=now+index*gap;
    if(instrument==='piano')pianoTone(midi,start,peak);else guitarTone(midi,start,peak);
  });
}

window.CirculosAudio={play,ensureAudio,context:()=>ctx};
window.CirculosPremiumAudio=window.CirculosAudio;

const unlock=()=>{ensureAudio();};
['pointerdown','touchstart','keydown'].forEach(type=>document.addEventListener(type,unlock,{once:true,passive:true}));
})();