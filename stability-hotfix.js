(()=>{
'use strict';
if(window.__circulosStabilityHotfix)return;
window.__circulosStabilityHotfix=true;

if(!document.querySelector('link[href*="performance-ui.css"]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='performance-ui.css?v=9';
  document.head.appendChild(link);
}

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

const style=document.createElement('style');
style.textContent=`
:root{--piano-tonic-bg:#1f6d4a;--piano-tonic-text:#fff;--piano-tonic-edge:#0d3b28;--piano-chord-bg:#dff2e6;--piano-chord-text:#397b56;--piano-chord-edge:#74b88e;--piano-black-tonic:#267b52;--piano-black-chord:#5ea67b}
html[data-theme="dark"]{--piano-tonic-bg:#8cddb0;--piano-tonic-text:#092217;--piano-tonic-edge:#d2f5df;--piano-chord-bg:#254533;--piano-chord-text:#a6e0bc;--piano-chord-edge:#5eaa7b;--piano-black-tonic:#9be5b6;--piano-black-chord:#4f9b70}
html body #instrumento .piano-scroll,html body .performance-piano-scroll{contain:layout paint style!important;isolation:isolate!important;transform:translateZ(0)!important;backface-visibility:hidden!important;touch-action:pan-x pan-y!important;overscroll-behavior:auto!important}
html body #pianoKeyboard,html body .performance-piano,html body #pianoKeyboard button,html body .performance-piano button{contain:layout paint style!important;transform:translateZ(0)!important;touch-action:pan-x pan-y!important}
html body #pianoKeyboard .white-key.piano-tonic-color,html body .performance-white-key.piano-tonic-color{background:var(--piano-tonic-bg)!important;color:var(--piano-tonic-text)!important;box-shadow:inset 0 -8px 0 var(--piano-tonic-edge)!important}
html body #pianoKeyboard .white-key.piano-chord-color,html body .performance-white-key.piano-chord-color{background:var(--piano-chord-bg)!important;color:var(--piano-chord-text)!important;box-shadow:inset 0 -7px 0 var(--piano-chord-edge)!important}
html body #pianoKeyboard .black-key.piano-tonic-color,html body .performance-black-key.piano-tonic-color{background:var(--piano-black-tonic)!important;color:var(--piano-tonic-text)!important;box-shadow:inset 0 0 0 3px var(--piano-tonic-edge)!important}
html body #pianoKeyboard .black-key.piano-chord-color,html body .performance-black-key.piano-chord-color{background:var(--piano-black-chord)!important;color:#fff!important;box-shadow:inset 0 0 0 3px var(--piano-chord-edge)!important}
.harmony-wheel-node.playing .harmony-wheel-node-bg{filter:none!important}
`;
document.head.appendChild(style);

const watchedPianos=new WeakSet();
function normalizePianoColors(host){
  if(!host)return;
  host.querySelectorAll('.white-key,.black-key,.performance-white-key,.performance-black-key').forEach(key=>{
    const tonic=key.classList.contains('triad-tone-1')||key.classList.contains('root-tone');
    const chord=tonic||key.classList.contains('triad-tone-2')||key.classList.contains('triad-tone-3')||key.classList.contains('triad-tone-4')||key.classList.contains('voicing-tone')||key.classList.contains('chord-tone');
    key.classList.toggle('piano-tonic-color',tonic);
    key.classList.toggle('piano-chord-color',!tonic&&chord);
  });
}
function watchPiano(host){
  if(!host||watchedPianos.has(host))return;
  watchedPianos.add(host);
  let scheduled=false;
  const refresh=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;normalizePianoColors(host);});
  };
  new MutationObserver(refresh).observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  refresh();
}
function discoverPianos(){
  watchPiano(document.getElementById('pianoKeyboard'));
  watchPiano(document.getElementById('performancePianoKeyboard'));
}

function init(){
  discoverPianos();
  const observer=new MutationObserver(()=>{
    discoverPianos();
    if(document.getElementById('pianoKeyboard'))observer.disconnect();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
