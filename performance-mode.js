/* Círculos Music · interacción de la rueda
   Tocar un círculo de la rueda selecciona ese acorde y lo resalta un momento. */
(()=>{
'use strict';
if(window.__circulosPerformanceModeV10)return;
window.__circulosPerformanceModeV10=true;

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
},true);
document.addEventListener('click',event=>{
  const key=event.target.closest?.('#pianoKeyboard .white-key,#pianoKeyboard .black-key');
  if(key)flash(key);
},true);

})();
