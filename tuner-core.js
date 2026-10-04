/* Círculos Music · núcleo del afinador (detección de tono)
   Algoritmo YIN (de Cheveigné y Kawahara, 2002) con interpolación parabólica.
   Afinación estándar de guitarra con La4 = 440 Hz. Funciona igual en el navegador y en pruebas con Node. */
(function(root){
'use strict';
const A4=440;
const STRINGS=[                       // de la 6.ª (grave) a la 1.ª (aguda)
  {n:6,name:'E',latin:'MI',octave:2,midi:40},
  {n:5,name:'A',latin:'LA',octave:2,midi:45},
  {n:4,name:'D',latin:'RE',octave:3,midi:50},
  {n:3,name:'G',latin:'SOL',octave:3,midi:55},
  {n:2,name:'B',latin:'SI',octave:3,midi:59},
  {n:1,name:'E',latin:'MI',octave:4,midi:64}
].map(s=>({...s,freq:A4*Math.pow(2,(s.midi-69)/12)}));

const midiToFreq=m=>A4*Math.pow(2,(m-69)/12);
const centsBetween=(f,ref)=>1200*Math.log2(f/ref);

/* Devuelve {freq, clarity} o null si no hay un tono claro */
function detect(buf,sampleRate,{minFreq=60,maxFreq=1100,threshold=0.12}={}){
  const tauMin=Math.max(2,Math.floor(sampleRate/maxFreq)),tauMax=Math.min(Math.floor(sampleRate/minFreq),Math.floor(buf.length/2));
  const W=buf.length-tauMax;if(W<tauMax)return null;
  // diferencia acumulada normalizada
  const d=new Float32Array(tauMax+1);
  for(let tau=1;tau<=tauMax;tau++){
    let sum=0;
    for(let i=0;i<W;i++){const x=buf[i]-buf[i+tau];sum+=x*x;}
    d[tau]=sum;
  }
  const cmnd=new Float32Array(tauMax+1);cmnd[0]=1;let running=0;
  for(let tau=1;tau<=tauMax;tau++){running+=d[tau];cmnd[tau]=running>0?d[tau]*tau/running:1;}
  // primer valle por debajo del umbral
  let tau=-1;
  for(let t=tauMin;t<tauMax;t++){
    if(cmnd[t]<threshold){while(t+1<tauMax&&cmnd[t+1]<cmnd[t])t++;tau=t;break;}
  }
  if(tau<0){                                  // sin valle claro: el mínimo global, si es razonable
    let best=tauMin;for(let t=tauMin;t<tauMax;t++)if(cmnd[t]<cmnd[best])best=t;
    if(cmnd[best]>0.3)return null;tau=best;
  }
  // ¿es en realidad el doble del período? (cuando la fundamental se apaga y domina el 2.º armónico)
  for(let k=0;k<2;k++){
    const t2=tau*2;if(t2+2>=tauMax||cmnd[tau]<=0.025)break;
    let b=t2;for(let t=Math.max(tauMin,Math.round(t2*0.97));t<=Math.min(tauMax-1,Math.round(t2*1.03));t++)if(cmnd[t]<cmnd[b])b=t;
    if(cmnd[b]<cmnd[tau]*0.5)tau=b;else break;
  }
  // interpolación parabólica para afinar por debajo de una muestra
  let better=tau;
  if(tau>1&&tau<tauMax){
    const a=cmnd[tau-1],b=cmnd[tau],c=cmnd[tau+1],den=a+c-2*b;
    if(den!==0)better=tau+(a-c)/(2*den);
  }
  let freq=sampleRate/better;
  if(freq<minFreq||freq>maxFreq)return null;
  freq=refine(buf,sampleRate,freq);
  return{freq,clarity:1-cmnd[tau],tau,cmnd,tauMin,tauMax,sampleRate,buf};
}

/* La misma lectura una octava abajo (período doble): sirve cuando el 2.º armónico de una cuerda grave
   se impone a la fundamental. Devuelve null si el período doble no es claramente periódico. */
function octaveDown(r,minClarity=0.6){
  const {cmnd,tauMax,sampleRate,buf}=r,t2=r.tau*2;
  if(t2+2>=tauMax)return null;
  let b=t2;for(let t=Math.round(t2*0.97);t<=Math.min(tauMax-1,Math.round(t2*1.03));t++)if(cmnd[t]<cmnd[b])b=t;
  if(1-cmnd[b]<minClarity)return null;
  let better=b;const a=cmnd[b-1],m=cmnd[b],c=cmnd[b+1],den=a+c-2*m;if(den!==0)better=b+(a-c)/(2*den);
  return{freq:refine(buf,sampleRate,sampleRate/better),clarity:1-cmnd[b]};
}

/* Afinado fino de la fundamental por la fase: se mide cuánto avanza la fase de la fundamental entre
   la primera y la segunda mitad del bloque. Corrige el pequeño sesgo que dejan los armónicos de una cuerda real. */
function goertzel(buf,start,len,freq,sampleRate){
  let re=0,im=0;const w=2*Math.PI*freq/sampleRate;
  for(let n=0;n<len;n++){const h=0.5-0.5*Math.cos(2*Math.PI*n/(len-1)),x=buf[start+n]*h;re+=x*Math.cos(w*n);im-=x*Math.sin(w*n);}
  return{re,im,mag:Math.hypot(re,im)};
}
function refine(buf,sampleRate,f){
  const H=Math.floor(buf.length/2);
  if(f*H/sampleRate<4)return f;                       // hacen falta varios ciclos en cada mitad
  const A=goertzel(buf,0,H,f,sampleRate),B=goertzel(buf,H,H,f,sampleRate);
  let energy=0;for(let i=0;i<buf.length;i++)energy+=buf[i]*buf[i];
  const strength=(A.mag+B.mag)/Math.sqrt(energy*H+1e-12);
  if(strength<0.15)return f;                           // fundamental muy débil: se queda el valor de YIN
  let d=Math.atan2(B.im,B.re)-Math.atan2(A.im,A.re)-2*Math.PI*f*H/sampleRate;
  d=((d+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  const g=f+d*sampleRate/(2*Math.PI*H);
  return Math.abs(1200*Math.log2(g/f))<25?g:f;        // nunca corrige más de un cuarto de semitono
}

function rms(buf){let s=0;for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];return Math.sqrt(s/buf.length);}

/* Cuerda más cercana (en cents) a una frecuencia */
function nearestString(freq){
  let best=STRINGS[0],bc=Infinity;
  for(const s of STRINGS){const c=Math.abs(centsBetween(freq,s.freq));if(c<bc){bc=c;best=s;}}
  return best;
}

const api={A4,STRINGS,detect,octaveDown,rms,nearestString,centsBetween,midiToFreq};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TunerCore=api;
})(typeof self!=='undefined'?self:this);
