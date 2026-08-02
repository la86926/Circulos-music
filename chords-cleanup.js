(()=>{
'use strict';
import('./performance-mode.js?v=6').catch(()=>{});
const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
const CHROMATIC=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const LATIN={C:'DO',D:'RE',E:'MI',F:'FA',G:'SOL',A:'LA',B:'SI'};
const INTERVALS={major:[0,4,7],minor:[0,3,7],dominant7:[0,4,7,10],major7:[0,4,7,11],minor7:[0,3,7,10],diminished:[0,3,6]};

const style=document.createElement('style');
style.textContent=`
#chordsView .library-control-block:has(#libraryQualities){display:none!important}
#chordsView .library-toolbar{display:none!important}
#chordsView>.panel:last-of-type{padding-top:0!important}
#chordsView .library-grid{padding-top:14px!important}
#libraryRoots{align-items:stretch;gap:10px!important}
#libraryRoots .library-root-btn{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:7px;width:auto!important;min-width:98px!important;height:76px!important;min-height:76px!important;padding:9px 10px!important;border-radius:18px!important;font-size:initial!important;line-height:1!important}
#libraryRoots .library-root-btn::before,#libraryRoots .library-root-btn::after{content:none!important;display:none!important}
.library-root-main{display:block;font-size:18px;font-weight:820;letter-spacing:-.035em;color:inherit}
.library-root-tones{display:block;max-width:86px;color:var(--muted);font-size:10px;font-weight:650;line-height:1.25;white-space:normal;text-align:center}
#libraryRoots .library-root-btn.active .library-root-tones{color:color-mix(in srgb,var(--contrast) 76%,transparent)}
@media(max-width:560px){#libraryRoots .library-root-btn{min-width:92px!important;height:72px!important;min-height:72px!important}.library-root-main{font-size:17px}.library-root-tones{font-size:10px}}
`;
document.head.appendChild(style);

function latin(note){return `${LATIN[note[0]]||note[0]}${note.slice(1).replace('#','♯')}`;}
function displayNote(note,notation){return notation==='latin'?latin(note):note.replace('#','♯');}
function currentNotation(){return document.querySelector('[data-library-notation="latin"].active')?'latin':'english';}
function currentQuality(){return document.querySelector('#libraryQualities [data-library-quality].active')?.dataset.libraryQuality||document.getElementById('libraryQualitySelect')?.value||'major';}
function tonesFor(root){const base=PC[root]??0,intervals=INTERVALS[currentQuality()]||INTERVALS.major,notation=currentNotation();return intervals.map(interval=>displayNote(CHROMATIC[(base+interval)%12],notation));}
function rootLabel(root){const note=CHROMATIC[PC[root]??0];return displayNote(note,currentNotation());}
function decorateRoots(){
  const host=document.getElementById('libraryRoots');
  if(!host)return;
  host.querySelectorAll('[data-library-root]').forEach(button=>{
    const root=button.dataset.libraryRoot;
    button.innerHTML=`<span class="library-root-main">${rootLabel(root)}</span><span class="library-root-tones">${tonesFor(root).join(' · ')}</span>`;
    button.setAttribute('aria-label',`${rootLabel(root)}: ${tonesFor(root).join(', ')}`);
  });
}
function applyGiftCopy(){
  const gift=document.querySelector('.side-menu-gift');
  const title=gift?.querySelector('strong');
  const subtitle=gift?.querySelector('small');
  const kicker=document.querySelector('.gift-kicker');
  const modalTitle=document.getElementById('giftTitle');
  const message=document.querySelector('.gift-message');
  const signature=document.querySelector('.gift-signature');
  if(!gift||!title||!subtitle||!kicker||!modalTitle||!message)return false;
  if(title.textContent!=='UN REGALO MUSICAL')title.textContent='UN REGALO MUSICAL';
  if(subtitle.textContent!=='Lo que hay preparado aquí.')subtitle.textContent='Lo que hay preparado aquí.';
  if(kicker.textContent!=='UN REGALO MUSICAL')kicker.textContent='UN REGALO MUSICAL';
  if(modalTitle.textContent!=='Por José H. Rico, todo esto')modalTitle.textContent='Por José H. Rico, todo esto';
  const newMessage='Todo lo que encuentras aquí fue preparado con dedicación para que, explorar los acordes, sea sencillo y claro.';
  if(message.textContent!==newMessage)message.textContent=newMessage;
  signature?.remove();
  gift.setAttribute('aria-label','Abrir regalo musical');
  return true;
}
function simplify(){
  const qualityBlock=document.getElementById('libraryQualities')?.closest('.library-control-block');
  if(qualityBlock){qualityBlock.style.setProperty('display','none','important');qualityBlock.setAttribute('aria-hidden','true');}
  const toolbar=document.querySelector('#chordsView .library-toolbar');
  if(toolbar){toolbar.style.setProperty('display','none','important');toolbar.setAttribute('aria-hidden','true');}
  decorateRoots();
}
function init(){
  simplify();
  const roots=document.getElementById('libraryRoots');
  const qualities=document.getElementById('libraryQualities');
  if(roots)new MutationObserver(()=>requestAnimationFrame(decorateRoots)).observe(roots,{childList:true});
  if(qualities)new MutationObserver(()=>requestAnimationFrame(decorateRoots)).observe(qualities,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.querySelectorAll('[data-library-notation]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(decorateRoots)));
  document.getElementById('libraryQualitySelect')?.addEventListener('change',()=>requestAnimationFrame(decorateRoots));
  if(!applyGiftCopy()){
    const observer=new MutationObserver(()=>{if(applyGiftCopy())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();