/* Círculos Music · Afinador de guitarra
   Escucha el micrófono, detecta el tono con TunerCore (YIN + afinado por fase) y muestra cuántos cents
   falta para la cuerda. Afinación estándar E A D G B E con La = 440 Hz. */
(()=>{
'use strict';
const T=window.TunerCore;if(!T)return;
const $=id=>document.getElementById(id);
const el={start:$('tunerStart'),needle:$('tunerNeedle'),note:$('tunerNote'),sub:$('tunerSub'),cents:$('tunerCents'),status:$('tunerStatus'),
  strings:$('tunerStrings'),auto:$('tunerAuto'),gauge:$('tunerGauge'),card:$('tunerCard'),msg:$('tunerMsg'),level:$('tunerLevel')};
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}}};
const notation=()=>store.get('circulos-notation')==='latin'?'latin':'english';
const IN_TUNE=3;                         // ± cents para considerar afinada
const MIN_LEVEL=0.0004;                  // volumen mínimo absoluto para escuchar

let ctx=null,stream=null,analyser=null,buf=null,timer=0,running=false;
let locked=null;                         // cuerda elegida a mano (null = automático)
let history=[],shownCents=0,lastHeard=0,inTuneSince=0,noiseFloor=0.0003,current=null;
const tuned=new Set();

/* ───────── Cuerdas ───────── */
function renderStrings(){
  const names=notation()==='latin';
  el.strings.innerHTML=T.STRINGS.map((s,i)=>`<button type="button" class="tuner-string${locked===i?' is-locked':''}${tuned.has(i)?' is-tuned':''}" data-i="${i}" aria-label="Cuerda ${s.n}, ${names?s.latin:s.name}${s.octave}">
      <span class="ts-name">${names?s.latin:s.name}</span><span class="ts-num">${s.n}.ª</span></button>`).join('');
  el.auto.classList.toggle('is-on',locked===null);el.auto.setAttribute('aria-pressed',String(locked===null));
}
el.strings.addEventListener('click',e=>{
  const b=e.target.closest('.tuner-string');if(!b)return;
  const i=Number(b.dataset.i);locked=locked===i?null:i;history=[];renderStrings();
  if(!running)preview(i);
});
el.auto.addEventListener('click',()=>{locked=null;history=[];renderStrings();});

/* Muestra la cuerda elegida aunque todavía no se escuche nada */
function preview(i){const s=T.STRINGS[i];el.note.textContent=notation()==='latin'?s.latin:s.name;el.sub.textContent=`${s.n}.ª cuerda · ${s.freq.toFixed(2)} Hz`;}

/* ───────── Micrófono ───────── */
async function start(){
  if(running){stop();return;}
  el.msg.textContent='';
  if(!navigator.mediaDevices?.getUserMedia){el.msg.textContent='Este navegador no permite usar el micrófono. Abre la web en Safari o Chrome (no dentro de WhatsApp o Facebook).';return;}
  // En iPhone el audio solo arranca si se crea dentro del toque: se crea aquí, antes de pedir el micrófono
  const AC=window.AudioContext||window.webkitAudioContext;
  try{ctx=new AC({latencyHint:'interactive'});}catch(e){ctx=new AC();}
  ctx.resume?.().catch(()=>{});
  el.start.disabled=true;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  }catch(err){
    el.start.disabled=false;ctx.close?.();ctx=null;
    el.msg.textContent=err&&err.name==='NotAllowedError'?'Permite el micrófono para poder afinar. Revisa los permisos del navegador para este sitio.':'No se encontró un micrófono disponible.';
    return;
  }
  el.start.disabled=false;
  if(ctx.state!=='running')await ctx.resume().catch(()=>{});
  // Si el micrófono trabaja a otra frecuencia de muestreo que el audio (p. ej. 48000 vs 44100),
  // se usa la misma del micrófono para evitar que el tono se lea desplazado
  const micRate=stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
  if(micRate&&Math.abs(micRate-ctx.sampleRate)>1){
    try{
      const c2=new AC({latencyHint:'interactive',sampleRate:micRate});
      await Promise.race([c2.resume(),new Promise(r=>setTimeout(r,400))]);
      if(c2.state==='running'){ctx.close();ctx=c2;}else c2.close();
    }catch(e){}
  }
  const src=ctx.createMediaStreamSource(stream);
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=60;hp.Q.value=.7;    // quita zumbidos graves
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;lp.Q.value=.7;   // quita el siseo agudo
  analyser=ctx.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=0;
  src.connect(hp);hp.connect(lp);lp.connect(analyser);
  // Safari necesita que la cadena termine en la salida para procesar; va en silencio (volumen 0)
  const mute=ctx.createGain();mute.gain.value=0;analyser.connect(mute);mute.connect(ctx.destination);
  buf=new Float32Array(analyser.fftSize);
  noiseFloor=0.0003;history=[];lastHeard=0;
  running=true;document.body.classList.add('tuner-on');
  el.start.innerHTML='<span class="tuner-start-dot"></span>Detener';el.start.setAttribute('aria-pressed','true');
  setStatus('Toca una cuerda al aire','idle');
  timer=setInterval(tick,45);
}
function stop(){
  running=false;clearInterval(timer);document.body.classList.remove('tuner-on','tuner-good');
  stream?.getTracks().forEach(t=>t.stop());ctx?.close();ctx=stream=analyser=null;
  el.start.innerHTML='Empezar a afinar';el.start.setAttribute('aria-pressed','false');
  setNeedle(0);setLevel(0);el.cents.textContent='';setStatus('','idle');
}
el.start.addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});

/* ───────── Análisis ───────── */
function median(a){const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];}
function tick(){
  if(ctx.state!=='running'){ctx.resume().catch(()=>{});}           // iPhone a veces lo pausa (llamada, bloqueo)
  analyser.getFloatTimeDomainData(buf);
  const now=performance.now(),level=T.rms(buf);
  // Ruido de fondo: baja rápido y sube despacio. Se escucha lo que suena claramente por encima de él.
  noiseFloor=level<noiseFloor?noiseFloor*0.7+level*0.3:noiseFloor*1.01;
  setLevel(level);
  if(level<Math.max(MIN_LEVEL,noiseFloor*2.2)){if(now-lastHeard>900)fade();return;}
  let r=T.detect(buf,ctx.sampleRate,{minFreq:65,maxFreq:420});
  if(!r||r.clarity<0.7){if(now-lastHeard>900)fade();return;}
  // Cuerdas graves: si una octava abajo la nota cae mucho más cerca de una cuerda, era el 2.º armónico
  const low=r.freq<230?T.octaveDown(r):null;
  if(low){
    const ref=f=>locked!==null?Math.abs(T.centsBetween(f,T.STRINGS[locked].freq)):Math.abs(T.centsBetween(f,T.nearestString(f).freq));
    if(ref(low.freq)<ref(r.freq)-60)r=low;
  }
  // En automático se queda con la cuerda que venía sonando, salvo que la nota esté claramente en otra
  let target=locked!==null?T.STRINGS[locked]:T.nearestString(r.freq);
  if(locked===null&&current!==null&&target!==T.STRINGS[current]&&Math.abs(T.centsBetween(r.freq,T.STRINGS[current].freq))<200&&now-lastHeard<600)target=T.STRINGS[current];
  const idx=T.STRINGS.indexOf(target);
  let cents=T.centsBetween(r.freq,target.freq);
  if(locked===null&&Math.abs(cents)>250)return;          // sonido que no es una cuerda al aire
  lastHeard=now;current=idx;
  history.push({c:cents,i:idx,t:now});history=history.filter(h=>now-h.t<380&&h.i===idx);
  cents=median(history.map(h=>h.c));
  show(target,idx,cents,r.freq);
}
function show(s,idx,cents,freq){
  document.body.classList.remove('tuner-quiet');
  el.note.textContent=notation()==='latin'?s.latin:s.name;
  el.sub.textContent=`${s.n}.ª cuerda · ${freq.toFixed(1)} Hz`;
  shownCents+=(cents-shownCents)*.35;                     // aguja suave
  const c=Math.round(shownCents);
  el.cents.textContent=`${c>0?'+':''}${c} ¢`;
  setNeedle(shownCents);
  el.strings.querySelectorAll('.tuner-string').forEach((b,i)=>b.classList.toggle('is-active',i===idx));
  const now=performance.now();
  if(Math.abs(cents)<=IN_TUNE){
    if(!inTuneSince)inTuneSince=now;
    if(now-inTuneSince>450){
      setStatus('¡Afinada!','good');document.body.classList.add('tuner-good');
      if(!tuned.has(idx)){tuned.add(idx);renderStrings();el.strings.querySelector(`[data-i="${idx}"]`)?.classList.add('is-active','just-tuned');}
    }
  }else{
    inTuneSince=0;document.body.classList.remove('tuner-good');
    setStatus(cents<0?'Sube un poco: aprieta la cuerda':'Baja un poco: afloja la cuerda',cents<0?'low':'high');
  }
}
function fade(){document.body.classList.add('tuner-quiet');document.body.classList.remove('tuner-good');inTuneSince=0;history=[];current=null;if(running)setStatus('Toca una cuerda al aire','idle');}
function setNeedle(c){const a=Math.max(-50,Math.min(50,c))*0.9;el.needle.style.transform=`rotate(${a}deg)`;el.gauge.style.setProperty('--off',Math.min(1,Math.abs(c)/50));}
function setLevel(v){if(!el.level)return;const db=v>0?20*Math.log10(v):-100;el.level.style.setProperty('--lvl',Math.max(0,Math.min(1,(db+66)/54)).toFixed(3));}
function setStatus(text,kind){el.status.textContent=text;el.status.dataset.kind=kind;}

/* Escala del medidor: marcas cada 10 cents */
(function ticks(){
  const g=document.getElementById('tunerTicks');if(!g)return;let html='';
  for(let c=-50;c<=50;c+=5){
    const a=(c*0.9-90)*Math.PI/180,r1=c%10===0?118:124,r2=132,cx=150,cy=150;
    html+=`<line x1="${(cx+r1*Math.cos(a)).toFixed(1)}" y1="${(cy+r1*Math.sin(a)).toFixed(1)}" x2="${(cx+r2*Math.cos(a)).toFixed(1)}" y2="${(cy+r2*Math.sin(a)).toFixed(1)}" class="${c===0?'tick-zero':c%10===0?'tick-major':'tick-minor'}"/>`;
  }
  g.innerHTML=html;
})();

renderStrings();preview(0);el.sub.textContent='Afinación estándar · La = 440 Hz';el.note.textContent='—';
window.CirculosTuner={start,stop};
})();
