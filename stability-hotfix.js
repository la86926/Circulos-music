(()=>{
'use strict';
if(window.__circulosStabilityHotfix)return;
window.__circulosStabilityHotfix=true;

/* Evita que Chrome/iPhone recalcule toda la interfaz durante cada gesto. */
const nativeAddEventListener=EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener=function(type,listener,options){
  if(this===window.visualViewport&&type==='scroll')return;
  if(this===document&&type==='touchmove'){
    const next=typeof options==='object'&&options!==null?{...options,passive:true}:{capture:Boolean(options),passive:true};
    return nativeAddEventListener.call(this,type,listener,next);
  }
  return nativeAddEventListener.call(this,type,listener,options);
};

if(/CriOS/i.test(navigator.userAgent)&&window.CSSStyleDeclaration){
  const rootStyle=document.documentElement.style;
  const prototype=CSSStyleDeclaration.prototype;
  const nativeSetProperty=prototype.setProperty;
  prototype.setProperty=function(name,value,priority){
    if(this===rootStyle&&name==='--app-viewport-height')return;
    return nativeSetProperty.call(this,name,value,priority);
  };
  window.addEventListener('orientationchange',()=>setTimeout(()=>{
    nativeSetProperty.call(rootStyle,'--app-viewport-height',`${Math.round(window.visualViewport?.height||window.innerHeight)}px`);
  },240),{passive:true});
}

/* Refuerzo de volumen antes de que se cree el motor de audio. */
for(const Constructor of [window.AudioContext,window.webkitAudioContext].filter(Boolean)){
  const prototype=Constructor.prototype;
  if(prototype.__circulosStrongAudio)continue;
  prototype.__circulosStrongAudio=true;
  const nativeCreateGain=prototype.createGain;
  prototype.createGain=function(...args){
    const node=nativeCreateGain.apply(this,args);
    const param=node.gain;
    if(param&&!param.__circulosBoosted){
      param.__circulosBoosted=true;
      const amplify=value=>value>0.001?Math.min(value*3.25,1.85):value;
      for(const method of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime']){
        const native=param[method]?.bind(param);
        if(!native)continue;
        param[method]=function(value,...rest){return native(amplify(value),...rest);};
      }
    }
    return node;
  };
}

const style=document.createElement('style');
style.textContent=`
#instrumento #guitarPanel{min-width:0!important;max-width:100%!important;overflow:hidden!important}
#instrumento .circle-carousel-hint{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin:-3px 2px 9px;color:var(--muted);font-size:10px;font-weight:760;letter-spacing:.03em}
#instrumento .circle-carousel-hint span{font-size:15px;line-height:1}
#instrumento #guitarVoicings.circle-voicing-carousel{display:flex!important;flex-flow:row nowrap!important;align-items:stretch!important;width:100%!important;max-width:100%!important;min-width:0!important;gap:12px!important;overflow-x:scroll!important;overflow-y:hidden!important;padding:2px 46px 13px 2px!important;scroll-snap-type:x proximity!important;scroll-padding-inline:2px!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x!important;overscroll-behavior-x:contain!important}
#instrumento #guitarVoicings.circle-voicing-carousel::-webkit-scrollbar{display:none!important}
#instrumento #guitarVoicings.circle-voicing-carousel>.voicing-card{display:block!important;flex:0 0 min(84vw,340px)!important;width:min(84vw,340px)!important;max-width:none!important;min-width:min(84vw,340px)!important;scroll-snap-align:start!important;scroll-snap-stop:normal!important}
#instrumento .piano-scroll,.performance-piano-scroll{contain:layout paint style!important;isolation:isolate!important;transform:translateZ(0)!important;backface-visibility:hidden!important}
#pianoKeyboard,.performance-piano{contain:layout paint style!important;transform:translateZ(0)!important}
.harmony-wheel-node.playing .harmony-wheel-node-bg{filter:none!important}
@media(min-width:761px){#instrumento #guitarVoicings.circle-voicing-carousel>.voicing-card{flex-basis:min(420px,calc(50% - 8px))!important;width:min(420px,calc(50% - 8px))!important;min-width:min(420px,calc(50% - 8px))!important}}
`;
document.head.appendChild(style);

function prepareCarousel(){
  const carousel=document.getElementById('guitarVoicings');
  if(!carousel)return false;
  carousel.classList.add('circle-voicing-carousel');
  carousel.setAttribute('role','region');
  carousel.setAttribute('aria-label','Posiciones de guitarra. Desliza horizontalmente para ver más.');
  const panel=carousel.closest('#guitarPanel')||carousel.parentElement;
  if(panel&&!panel.querySelector('.circle-carousel-hint')){
    const hint=document.createElement('div');
    hint.className='circle-carousel-hint';
    hint.innerHTML='<span aria-hidden="true">←</span> Desliza para ver más <span aria-hidden="true">→</span>';
    carousel.before(hint);
  }
  carousel.querySelectorAll('.voicing-card').forEach(card=>card.style.setProperty('scroll-snap-align','start'));
  if(!carousel.dataset.carouselObserved){
    carousel.dataset.carouselObserved='true';
    new MutationObserver(()=>requestAnimationFrame(prepareCarousel)).observe(carousel,{childList:true});
  }
  return true;
}

function init(){
  if(prepareCarousel())return;
  const observer=new MutationObserver(()=>{if(prepareCarousel())observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
