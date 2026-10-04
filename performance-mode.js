/* Círculos Music · interacción de la rueda y colores del piano
   Tocar un círculo de la rueda selecciona ese acorde, lo resalta un momento y pinta sus notas en el piano. */
(()=>{
'use strict';
if(window.__circulosPerformanceModeV10)return;
window.__circulosPerformanceModeV10=true;

const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const LATIN_TO_EN={DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};

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
function cardChord(card){
  const text=card?.querySelector('.chord-notes')?.textContent||'';
  return{index:Number(card?.dataset.d??0),notes:text.split(/[·,]/).map(parseNote).filter(Number.isFinite)};
}

/* Resalte momentáneo del círculo tocado */
const playing=new Map();
function applyPlaying(){
  const now=Date.now();
  for(const[index,expires]of playing)if(expires<=now)playing.delete(index);
  document.querySelectorAll('.harmony-wheel-node[data-wheel-index]').forEach(node=>node.classList.toggle('playing',playing.has(Number(node.dataset.wheelIndex))));
  document.querySelectorAll('#diatonicGrid .chord-card').forEach((card,index)=>card.classList.toggle('performance-playing',playing.has(index)));
}
function markCircle(index,duration=1750){
  playing.set(index,Date.now()+duration);
  applyPlaying();
  setTimeout(applyPlaying,duration+50);
}
function flash(element,duration=320){
  if(!element)return;
  element.classList.add('performance-playing');
  clearTimeout(element._performanceTimer);
  element._performanceTimer=setTimeout(()=>element.classList.remove('performance-playing'),duration);
}

/* Colores del piano según la nota dentro del acorde */
function decorateCirclePiano(){
  const host=document.getElementById('pianoKeyboard');
  const active=document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card');
  if(!host||!active)return;
  const classes=new Map(cardChord(active).notes.map((pc,index)=>[pc,`triad-tone-${index+1}`]));
  host.querySelectorAll('.white-key,.black-key').forEach(key=>{
    key.classList.remove('triad-tone-1','triad-tone-2','triad-tone-3','triad-tone-4');
    const className=classes.get(parseNote(key.textContent));
    if(className)key.classList.add(className);
  });
}

/* El círculo se activa al apoyar el dedo; el clic posterior se descarta para no repetirlo */
const blockedClicks=new WeakMap();
document.addEventListener('click',event=>{
  const node=event.target.closest?.('.harmony-wheel-node');
  if(node&&(blockedClicks.get(node)||0)>Date.now()){
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},true);
document.addEventListener('pointerdown',event=>{
  const circle=event.target.closest?.('.harmony-wheel-node[data-wheel-index]');
  if(!circle)return;
  event.preventDefault();event.stopPropagation();
  blockedClicks.set(circle,Date.now()+700);
  const index=Number(circle.dataset.wheelIndex);
  [...document.querySelectorAll('#diatonicGrid .chord-card')][index]?.click();
  markCircle(index);
  requestAnimationFrame(decorateCirclePiano);
},true);
document.addEventListener('click',event=>{
  const key=event.target.closest?.('#pianoKeyboard .white-key,#pianoKeyboard .black-key');
  if(key)flash(key);
},true);

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
  decorateCirclePiano();
  observeChildren(document.getElementById('pianoKeyboard'),decorateCirclePiano);
  observeChildren(document.getElementById('diatonicGrid'),()=>requestAnimationFrame(decorateCirclePiano));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
