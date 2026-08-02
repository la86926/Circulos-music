(()=>{
'use strict';
if(window.__circulosStabilityHotfix)return;
window.__circulosStabilityHotfix=true;

/* Carga primero la hoja corregida para que no se reutilicen los gestos y colores anteriores. */
if(!document.querySelector('link[href*="performance-ui.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='performance-ui.css?v=4';
  document.head.appendChild(link);
}

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

/* Etapa final de 20× antes de un compresor-limitador. Se aplica una sola vez
   a cada salida de audio y conserva la mezcla de varios acordes. */
const AudioNodeClass=window.AudioNode;
if(AudioNodeClass&&!AudioNodeClass.prototype.__circulosTwentyBoost){
  AudioNodeClass.prototype.__circulosTwentyBoost=true;
  const nativeConnect=AudioNodeClass.prototype.connect;
  const factories=new WeakMap();
  for(const Constructor of [window.AudioContext,window.webkitAudioContext].filter(Boolean)){
    const prototype=Constructor.prototype;
    factories.set(prototype,{
      gain:prototype.createGain,
      compressor:prototype.createDynamicsCompressor
    });
  }
  function getFactories(context){
    let prototype=Object.getPrototypeOf(context);
    while(prototype){
      const found=factories.get(prototype);
      if(found)return found;
      prototype=Object.getPrototypeOf(prototype);
    }
    return null;
  }
  AudioNodeClass.prototype.connect=function(destination,...args){
    const context=this.context;
    if(destination===context?.destination&&!this.__circulosFinalBoosted){
      const factory=getFactories(context);
      if(factory?.gain&&factory?.compressor){
        this.__circulosFinalBoosted=true;
        const preamp=factory.gain.call(context);
        const limiter=factory.compressor.call(context);
        const output=factory.gain.call(context);
        preamp.gain.value=20;
        limiter.threshold.value=-26;
        limiter.knee.value=5;
        limiter.ratio.value=20;
        limiter.attack.value=.002;
        limiter.release.value=.24;
        output.gain.value=.96;
        nativeConnect.call(this,preamp);
        nativeConnect.call(preamp,limiter);
        nativeConnect.call(limiter,output);
        nativeConnect.call(output,destination,...args);
        this.__circulosFinalChain={preamp,limiter,output};
        return destination;
      }
    }
    return nativeConnect.call(this,destination,...args);
  };
}

const style=document.createElement('style');
style.textContent=`
#instrumento #guitarPanel{min-width:0!important;max-width:100%!important;overflow:hidden!important}
#instrumento .circle-carousel-hint{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin:-3px 2px 9px;color:var(--muted);font-size:10px;font-weight:760;letter-spacing:.03em}
#instrumento .circle-carousel-hint span{font-size:15px;line-height:1}
html body #instrumento #guitarVoicings.circle-voicing-carousel{display:flex!important;flex-flow:row nowrap!important;align-items:stretch!important;width:100%!important;max-width:100%!important;min-width:0!important;gap:12px!important;overflow-x:scroll!important;overflow-y:hidden!important;padding:2px 46px 13px 2px!important;scroll-snap-type:x proximity!important;scroll-padding-inline:2px!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x pan-y!important;overscroll-behavior:auto!important}
html body #instrumento #guitarVoicings.circle-voicing-carousel::-webkit-scrollbar{display:none!important}
html body #instrumento #guitarVoicings.circle-voicing-carousel>.voicing-card{display:block!important;flex:0 0 min(84vw,340px)!important;width:min(84vw,340px)!important;max-width:none!important;min-width:min(84vw,340px)!important;scroll-snap-align:start!important;scroll-snap-stop:normal!important;touch-action:pan-x pan-y!important}
html body #instrumento .piano-scroll,html body .performance-piano-scroll{contain:layout paint style!important;isolation:isolate!important;transform:translateZ(0)!important;backface-visibility:hidden!important;touch-action:pan-x pan-y!important;overscroll-behavior:auto!important}
html body #pianoKeyboard,html body .performance-piano,html body #pianoKeyboard button,html body .performance-piano button{contain:layout paint style!important;transform:translateZ(0)!important;touch-action:pan-x pan-y!important}
.harmony-wheel-node.playing .harmony-wheel-node-bg{filter:none!important}
@media(min-width:761px){html body #instrumento #guitarVoicings.circle-voicing-carousel>.voicing-card{flex-basis:min(420px,calc(50% - 8px))!important;width:min(420px,calc(50% - 8px))!important;min-width:min(420px,calc(50% - 8px))!important}}
`;
document.head.appendChild(style);

function prepareCarousel(){
  const carousel=document.getElementById('guitarVoicings');
  if(!carousel)return false;
  carousel.classList.add('circle-voicing-carousel');
  carousel.setAttribute('role','region');
  carousel.setAttribute('aria-label','Posiciones de guitarra. Desliza horizontalmente para ver más o verticalmente para continuar por la página.');
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
