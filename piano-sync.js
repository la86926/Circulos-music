(()=>{
'use strict';
if(window.__circulosPianoPositionV2)return;
window.__circulosPianoPositionV2=true;
const bindings=new WeakMap();
function scrollFor(host){return host?.closest('.piano-scroll')||null;}
function storageKey(host){return`circulos-piano-position:${host.id}`;}
function saved(host){const n=Number(localStorage.getItem(storageKey(host)));return Number.isFinite(n)&&n>=0&&n<=1000?n:1000;}
function apply(binding){const max=Math.max(0,binding.scroll.scrollWidth-binding.scroll.clientWidth);binding.range.disabled=max<2;binding.range.value=String(binding.position);if(max<2)return;binding.lock=true;binding.scroll.scrollLeft=max*(binding.position/1000);requestAnimationFrame(()=>binding.lock=false);}
function bind(host,control){const scroll=scrollFor(host),range=control.querySelector('input');if(!scroll||!range)return;const binding={host,scroll,range,position:saved(host),lock:false};bindings.set(host,binding);range.value=String(binding.position);range.addEventListener('input',()=>{binding.position=Math.max(0,Math.min(1000,Number(range.value)||0));localStorage.setItem(storageKey(host),String(binding.position));apply(binding);});scroll.addEventListener('scroll',()=>{if(binding.lock)return;const max=Math.max(1,scroll.scrollWidth-scroll.clientWidth);binding.position=Math.round(scroll.scrollLeft/max*1000);range.value=String(binding.position);},{passive:true});if(window.ResizeObserver)new ResizeObserver(()=>apply(binding)).observe(scroll);new MutationObserver(()=>requestAnimationFrame(()=>apply(binding))).observe(host,{childList:true});requestAnimationFrame(()=>requestAnimationFrame(()=>apply(binding)));}
function ensure(){const host=document.getElementById('pianoKeyboard');if(!host)return;let control=document.querySelector(`[data-piano-position="${host.id}"]`);if(!control){control=document.createElement('div');control.className='piano-position-control';control.dataset.pianoPosition=host.id;control.innerHTML='<span class="piano-position-title">Desliza para mover el piano</span><input class="piano-position-range" type="range" min="0" max="1000" value="1000" step="1" aria-label="Mover el piano horizontalmente"><span class="piano-position-arrows" aria-hidden="true">← →</span>';scrollFor(host)?.before(control);bind(host,control);}else if(!bindings.has(host))bind(host,control);}
function init(){ensure();window.addEventListener('resize',ensure,{passive:true});window.addEventListener('pageshow',ensure,{passive:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();