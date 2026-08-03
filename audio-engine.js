(()=>{
'use strict';
if(window.CirculosAudio)return;

/* ============================================================
   AJUSTES RÁPIDOS
   VOLUMEN : 0.8 = más bajo · 1.0 = normal · 1.4 = más fuerte
             (no distorsiona: hay un limitador suave al final)
   MAX_VOCES : cuántas notas pueden sonar a la vez como máximo
   ============================================================ */
const VOLUMEN=1.0;
const MAX_VOCES=28;

const Ctor=window.AudioContext||window.webkitAudioContext;
let ctx=null,bus=null,comp=null,makeup=null,shaper=null,salida=null,ruido=null;
let fallos=0;
const voces=new Set();

/* --- limitador suave: transparente abajo, techo firme arriba --- */
function curvaSuave(){
  const n=4096,curva=new Float32Array(n),umbral=.62,rango=1-umbral;
  for(let i=0;i<n;i++){
    const x=(i*2)/(n-1)-1,a=Math.abs(x);
    const y=a<=umbral?a:umbral+rango*Math.tanh((a-umbral)/rango);
    curva[i]=x<0?-y:y;
  }
  return curva;
}
function crearRuido(){
  const largo=Math.floor(ctx.sampleRate*.4),buffer=ctx.createBuffer(1,largo,ctx.sampleRate),datos=buffer.getChannelData(0);
  for(let i=0;i<largo;i++)datos[i]=Math.random()*2-1;
  return buffer;
}
function construirCadena(){
  const hp=ctx.createBiquadFilter();
  hp.type='highpass';hp.frequency.value=62;hp.Q.value=.707;
  bus=ctx.createGain();bus.gain.value=1;
  comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-12;comp.knee.value=10;comp.ratio.value=3.5;
  comp.attack.value=.006;comp.release.value=.25;
  makeup=ctx.createGain();makeup.gain.value=2.7*VOLUMEN;
  shaper=ctx.createWaveShaper();shaper.curve=curvaSuave();shaper.oversample='4x';
  salida=ctx.createGain();salida.gain.value=1;
  bus.connect(hp);hp.connect(comp);comp.connect(makeup);makeup.connect(shaper);shaper.connect(salida);salida.connect(ctx.destination);
  ruido=crearRuido();
}
function crearContexto(){
  ctx=new Ctor();
  voces.clear();
  construirCadena();
  ctx.onstatechange=()=>{if(ctx.state==='running')fallos=0;else despertar();};
}
function despertar(){
  if(!ctx||ctx.state==='running')return;
  const p=ctx.resume();
  if(p&&p.then)p.then(()=>{fallos=0;}).catch(()=>{if(++fallos>6)reconstruir();});
}
function reconstruir(){
  fallos=0;
  const viejo=ctx;
  ctx=null;
  try{viejo&&viejo.close();}catch(e){}
  crearContexto();
}
function ensureAudio(){
  if(!ctx||ctx.state==='closed')crearContexto();
  if(ctx.state!=='running')despertar();
  return ctx;
}

/* --- control de voces: evita que se saturen y se corte el sonido --- */
function registrar(voz){
  voces.add(voz);
  if(voces.size>MAX_VOCES){
    let vieja=null;
    for(const v of voces){if(!vieja||v.inicio<vieja.inicio)vieja=v;}
    if(vieja)cortar(vieja);
  }
}
function cortar(voz){
  voces.delete(voz);
  try{
    const t=ctx.currentTime;
    voz.env.gain.cancelScheduledValues(t);
    voz.env.gain.setValueAtTime(Math.max(.0001,voz.env.gain.value),t);
    voz.env.gain.exponentialRampToValueAtTime(.0001,t+.08);
    voz.osc.forEach(o=>{try{o.stop(t+.1);}catch(e){}});
  }catch(e){}
}
function liberar(voz){
  voces.delete(voz);
  try{voz.nodos.forEach(n=>{try{n.disconnect();}catch(e){}});}catch(e){}
}

const frecuencia=midi=>440*Math.pow(2,(midi-69)/12);

/* --- timbres claramente distintos --- */
const TIMBRES={
  piano:{
    parciales:[['triangle',1,0,.55],['sine',2,0,.22],['sine',3,4,.10],['sine',4,-4,.055],['sine',6,7,.02]],
    corteBase:2600,corteSpan:5.2,corteMax:9000,corteMin:900,barrido:2.0,q:.6,
    ataque:.006,quiebre:.46,tQuiebre:.34,cola:3.0,
    golpe:{nivel:.05,freq:3400,q:1.1,dur:.035}
  },
  guitar:{
    parciales:[['sawtooth',1,0,.30],['triangle',1,7,.22],['sine',2,-6,.18],['sine',3,0,.10],['sine',4,5,.05],['sine',5,0,.03]],
    corteBase:1200,corteSpan:3.0,corteMax:5200,corteMin:520,barrido:1.5,q:1.1,
    ataque:.003,quiebre:.34,tQuiebre:.18,cola:2.4,
    golpe:{nivel:.13,freq:2100,q:.9,dur:.055}
  }
};

function nota(midi,inicio,pico,tipo){
  const audio=ensureAudio();
  if(!audio||!bus)return;
  const t=TIMBRES[tipo]||TIMBRES.piano,freq=frecuencia(midi),nodos=[],osciladores=[];
  const filtro=audio.createBiquadFilter();
  filtro.type='lowpass';filtro.Q.value=t.q;
  filtro.frequency.setValueAtTime(Math.min(t.corteMax,t.corteBase+freq*t.corteSpan),inicio);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(t.corteMin,freq*t.barrido),inicio+t.cola*.7);
  const env=audio.createGain();
  env.gain.setValueAtTime(.0001,inicio);
  env.gain.exponentialRampToValueAtTime(pico,inicio+t.ataque);
  env.gain.exponentialRampToValueAtTime(Math.max(.0002,pico*t.quiebre),inicio+t.tQuiebre);
  env.gain.exponentialRampToValueAtTime(.0001,inicio+t.cola);
  filtro.connect(env);env.connect(bus);
  nodos.push(filtro,env);
  t.parciales.forEach(([forma,mult,detune,nivel])=>{
    const osc=audio.createOscillator(),g=audio.createGain();
    osc.type=forma;
    osc.frequency.setValueAtTime(freq*mult,inicio);
    osc.detune.value=detune;
    g.gain.value=nivel;
    osc.connect(g);g.connect(filtro);
    osc.start(inicio);osc.stop(inicio+t.cola+.06);
    osciladores.push(osc);nodos.push(osc,g);
  });
  if(t.golpe&&ruido){
    const src=audio.createBufferSource(),bp=audio.createBiquadFilter(),g=audio.createGain();
    src.buffer=ruido;
    bp.type='bandpass';bp.frequency.value=t.golpe.freq;bp.Q.value=t.golpe.q;
    g.gain.setValueAtTime(Math.max(.0002,pico*t.golpe.nivel),inicio);
    g.gain.exponentialRampToValueAtTime(.0001,inicio+t.golpe.dur);
    src.connect(bp);bp.connect(g);g.connect(bus);
    try{src.start(inicio,Math.random()*.3);}catch(e){src.start(inicio);}
    src.stop(inicio+t.golpe.dur+.02);
    src.onended=()=>{try{src.disconnect();bp.disconnect();g.disconnect();}catch(e){}};
  }
  const voz={env,osc:osciladores,nodos,inicio};
  registrar(voz);
  const ultimo=osciladores[osciladores.length-1];
  if(ultimo)ultimo.onended=()=>liberar(voz);
  else setTimeout(()=>liberar(voz),(t.cola+.2)*1000);
}

function play(midis,instrumento='piano',opciones={}){
  const audio=ensureAudio();
  if(!audio)return;
  if(!Array.isArray(midis))midis=[midis];
  const notas=midis.filter(Number.isFinite);
  if(!notas.length)return;
  const tipo=instrumento==='guitar'?'guitar':'piano';
  const ahora=audio.currentTime+.02;
  const rasgueo=opciones.arpeggio??(tipo==='guitar');
  const paso=rasgueo?(opciones.gap??.038):0;
  const vel=opciones.velocity??1;
  const simultaneas=rasgueo?Math.min(notas.length,3):notas.length;
  const pico=Math.min(.9,.9*vel/Math.sqrt(simultaneas));
  notas.forEach((midi,i)=>{
    const acento=rasgueo?Math.max(.7,1-i*.035):1;
    nota(midi,ahora+i*paso,Math.max(.02,pico*acento),tipo);
  });
}

function stopAll(){for(const v of[...voces])cortar(v);}

window.CirculosAudio={play,stopAll,ensureAudio,context:()=>ctx};
window.CirculosPremiumAudio=window.CirculosAudio;

/* --- mantener el audio vivo (iOS/Safari lo suspende solo) --- */
const despierta=()=>{try{ensureAudio();}catch(e){}};
['pointerdown','touchstart','touchend','mousedown','keydown','click'].forEach(tipo=>{
  document.addEventListener(tipo,despierta,{passive:true,capture:true});
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)despierta();});
window.addEventListener('focus',despierta);
window.addEventListener('pageshow',despierta);
setInterval(()=>{
  if(ctx&&ctx.state!=='running'&&document.visibilityState==='visible')despertar();
},1500);
})();
