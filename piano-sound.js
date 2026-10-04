/* Círculos Music · sonido del piano
   Muestras reales del Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0) — ver sounds/piano/CREDITS.txt.
   Hay una grabación cada tres semitonos (DO, RE♯, FA♯, LA); las notas intermedias se afinan desde la más cercana. */
(()=>{
'use strict';
const AC=window.AudioContext||window.webkitAudioContext;
if(!AC)return;
const SAMPLES={48:'C3',51:'Ds3',54:'Fs3',57:'A3',60:'C4',63:'Ds4',66:'Fs4',69:'A4',72:'C5',75:'Ds5',78:'Fs5',81:'A5',84:'C6'};
const ROOTS=Object.keys(SAMPLES).map(Number);
let ctx=null,out=null,loading=null;
const buffers=new Map(),voices=new Map();

function context(){
  if(ctx)return ctx;
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}   // suena aunque el iPhone esté en silencio
  ctx=new AC({latencyHint:'interactive'});
  const comp=ctx.createDynamicsCompressor();                 // evita saturación cuando suenan varias notas
  comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.25;
  out=ctx.createGain();out.gain.value=.9;out.connect(comp);comp.connect(ctx.destination);
  return ctx;
}
function load(){
  if(loading)return loading;
  const c=context();
  loading=Promise.all(ROOTS.map(m=>fetch(`sounds/piano/${SAMPLES[m]}.mp3`).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();})
    .then(data=>new Promise((ok,fail)=>c.decodeAudioData(data,ok,fail))).then(buf=>buffers.set(m,buf))))
    .catch(err=>{loading=null;console.warn('Círculos Music: no se pudo cargar el sonido del piano',err);});
  return loading;
}
function unlock(){const c=context();if(c.state==='suspended')c.resume();load();}

function voice(midi,when,velocity){
  const root=ROOTS.reduce((a,b)=>Math.abs(b-midi)<Math.abs(a-midi)?b:a),buf=buffers.get(root);if(!buf)return;
  const prev=voices.get(midi);                                // la misma tecla otra vez: se apaga la anterior con suavidad
  if(prev){try{prev.gain.gain.cancelScheduledValues(when);prev.gain.gain.setTargetAtTime(0,when,.03);prev.src.stop(when+.25);}catch(e){}}
  const src=ctx.createBufferSource(),gain=ctx.createGain();
  src.buffer=buf;src.playbackRate.value=Math.pow(2,(midi-root)/12);
  gain.gain.setValueAtTime(velocity,when);
  gain.gain.setTargetAtTime(0,when+3.2,.9);                  // cola natural y luego se desvanece
  src.connect(gain);gain.connect(out);src.start(when);src.stop(when+7.5);
  const v={src,gain};voices.set(midi,v);src.onended=()=>{if(voices.get(midi)===v)voices.delete(midi);};
}
function play(midis,{roll=0,velocity=.8}={}){
  unlock();
  const list=[].concat(midis).filter(Number.isFinite);if(!list.length)return;
  const asked=performance.now();
  load()?.then(()=>{
    if(performance.now()-asked>900)return;                    // si tardó mucho en cargar, mejor no sonar fuera de tiempo
    const t=ctx.currentTime+.012;
    list.forEach((m,i)=>voice(m,t+i*roll,velocity*(list.length>1?.82:1)));
  });
}
window.CirculosPiano={play,unlock};

/* Teclas: suenan al tocarlas. En pantallas táctiles espera un instante para no sonar al desplazar la página. */
const midiOf=key=>Number(key?.dataset.pkMidi);
document.addEventListener('pointerdown',e=>{
  const key=e.target.closest?.('#pianoKeyboard .white-key,#pianoKeyboard .black-key');
  if(!key){if(e.target.closest?.('#instrumento'))unlock();return;}
  const m=midiOf(key);if(!Number.isFinite(m))return;
  if(e.pointerType!=='touch'){play(m);return;}
  unlock();
  const start={x:e.clientX,y:e.clientY,id:e.pointerId};let done=false;
  const cancel=()=>{done=true;cleanup();};
  const move=ev=>{if(ev.pointerId===start.id&&Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>9)cancel();};
  const fire=()=>{if(done)return;done=true;cleanup();play(m);};
  const timer=setTimeout(fire,70);
  function cleanup(){clearTimeout(timer);removeEventListener('pointermove',move,true);removeEventListener('pointercancel',cancel,true);removeEventListener('pointerup',fire,true);}
  addEventListener('pointermove',move,true);addEventListener('pointercancel',cancel,true);addEventListener('pointerup',fire,true);
},true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-instrument="piano"]'))unlock();},true);
})();
