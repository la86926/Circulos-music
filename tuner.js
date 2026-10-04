/* Círculos Music · Afinador de guitarra
   Escucha el micrófono, detecta el tono con TunerCore (YIN + afinado por fase) y muestra cuántos cents
   falta para la cuerda. Afinación estándar E A D G B E con La = 440 Hz. */
(()=>{
'use strict';
const T=window.TunerCore;if(!T)return;
const $=id=>document.getElementById(id);
const el={start:$('tunerStart'),needle:$('tunerNeedle'),note:$('tunerNote'),sub:$('tunerSub'),cents:$('tunerCents'),status:$('tunerStatus'),
  strings:$('tunerStrings'),auto:$('tunerAuto'),gauge:$('tunerGauge'),card:$('tunerCard'),msg:$('tunerMsg')};
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}}};
const notation=()=>store.get('circulos-notation')==='latin'?'latin':'english';
const IN_TUNE=3;                         // ± cents para considerar afinada
const GATE=0.006;                        // volumen mínimo para escuchar

let ctx=null,stream=null,analyser=null,buf=null,timer=0,running=false;
let locked=null;                         // cuerda elegida a mano (null = automático)
let history=[],shownCents=0,lastHeard=0,inTuneSince=0;
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
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
  }catch(err){
    el.msg.textContent=err&&err.name==='NotAllowedError'?'Permite el micrófono para poder afinar. Revisa los permisos del navegador para este sitio.':'No se encontró un micrófono disponible.';
    return;
  }
  ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  if(ctx.state==='suspended')await ctx.resume();
  const src=ctx.createMediaStreamSource(stream);
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=55;hp.Q.value=.7;   // quita zumbidos graves
  analyser=ctx.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=0;
  src.connect(hp);hp.connect(analyser);
  buf=new Float32Array(analyser.fftSize);
  running=true;document.body.classList.add('tuner-on');
  el.start.innerHTML='<span class="tuner-start-dot"></span>Detener';el.start.setAttribute('aria-pressed','true');
  setStatus('Toca una cuerda al aire','idle');
  timer=setInterval(tick,45);
}
function stop(){
  running=false;clearInterval(timer);document.body.classList.remove('tuner-on','tuner-good');
  stream?.getTracks().forEach(t=>t.stop());ctx?.close();ctx=stream=analyser=null;
  el.start.innerHTML='Empezar a afinar';el.start.setAttribute('aria-pressed','false');
  setNeedle(0);el.cents.textContent='';setStatus('','idle');
}
el.start.addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});

/* ───────── Análisis ───────── */
function median(a){const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];}
function tick(){
  analyser.getFloatTimeDomainData(buf);
  const now=performance.now();
  if(T.rms(buf)<GATE){if(now-lastHeard>900)fade();return;}
  const r=T.detect(buf,ctx.sampleRate,{minFreq:65,maxFreq:420});
  if(!r||r.clarity<0.85){if(now-lastHeard>900)fade();return;}
  lastHeard=now;
  const target=locked!==null?T.STRINGS[locked]:T.nearestString(r.freq);
  const idx=T.STRINGS.indexOf(target);
  let cents=T.centsBetween(r.freq,target.freq);
  if(locked===null&&Math.abs(cents)>250)return;          // sonido que no es una cuerda al aire
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
function fade(){document.body.classList.add('tuner-quiet');document.body.classList.remove('tuner-good');inTuneSince=0;history=[];if(running)setStatus('Toca una cuerda al aire','idle');}
function setNeedle(c){const a=Math.max(-50,Math.min(50,c))*0.9;el.needle.style.transform=`rotate(${a}deg)`;el.gauge.style.setProperty('--off',Math.min(1,Math.abs(c)/50));}
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
