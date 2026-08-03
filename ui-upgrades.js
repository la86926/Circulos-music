(()=>{
'use strict';
if(window.__circulosUiUpgradesV3)return;
window.__circulosUiUpgradesV3=true;

const DEGREE_MAP={
  major:['I','III','V'],minor:['I','♭III','V'],dominant7:['I','III','V','♭VII'],
  major7:['I','III','V','VII'],minor7:['I','♭III','V','♭VII'],diminished:['I','♭III','♭V']
};
const QUALITY_FROM_TEXT=text=>{
  const value=String(text||'').toLowerCase();
  if(value.includes('dismin'))return'diminished';
  if(value.includes('menor'))return'minor';
  return'major';
};
const degreeText=quality=>(DEGREE_MAP[quality]||DEGREE_MAP.major).join(' · ');

const style=document.createElement('style');
style.textContent=`
.chord-degrees,.selected-chord-degrees,.piano-voicing-degrees,.library-root-degrees,.performance-piano-degrees{display:block;color:var(--muted);font-size:10px;font-weight:820;letter-spacing:.09em;line-height:1.25;text-transform:uppercase}
.chord-degrees{margin-top:8px}.chord-card.active .chord-degrees{color:color-mix(in srgb,var(--contrast) 76%,transparent)}
.selected-chord-degrees{margin:8px 0 2px;font-size:11px}.piano-voicing-degrees{margin:14px 0 -8px;font-size:11px}
.library-root-degrees{margin-top:1px;font-size:9px}.library-root-tones{margin-top:-2px}
.performance-piano-degrees{margin-top:5px}.performance-piano-summary small{line-height:1.35}
.harmony-wheel-chord-degrees{display:none!important}
#instrumento .instrument-tabs .segmented,#libraryPerformanceSwitch .segmented{grid-template-columns:repeat(2,minmax(0,1fr))!important}
@media(max-width:560px){.library-root-degrees{font-size:8px}.selected-chord-degrees,.piano-voicing-degrees{font-size:10px}}
`;
document.head.appendChild(style);

function currentLibraryQuality(){return document.getElementById('libraryQualitySelect')?.value||document.querySelector('#libraryQualities [data-library-quality].active')?.dataset.libraryQuality||'major';}
function circleQuality(){return QUALITY_FROM_TEXT(document.querySelector('#diatonicGrid .chord-card.active .chord-quality')?.textContent);}
function decorateChordCards(){
  document.querySelectorAll('#diatonicGrid .chord-card').forEach(card=>{
    const notes=card.querySelector('.chord-notes,.chord-card-notes');if(!notes)return;
    let degrees=card.querySelector('.chord-degrees');
    if(!degrees){degrees=document.createElement('span');degrees.className='chord-degrees';notes.before(degrees);}
    const text=degreeText(QUALITY_FROM_TEXT(card.querySelector('.chord-quality')?.textContent));if(degrees.textContent!==text)degrees.textContent=text;
  });
}
function decorateCircleDetail(){
  const notes=document.getElementById('selectedChordNotes');
  if(notes){
    let degrees=document.getElementById('selectedChordDegrees');
    if(!degrees){degrees=document.createElement('p');degrees.id='selectedChordDegrees';degrees.className='selected-chord-degrees';notes.before(degrees);}
    const text=degreeText(circleQuality());if(degrees.textContent!==text)degrees.textContent=text;
  }
  const voicingLine=document.querySelector('#pianoPanel .voicing-note-line');
  if(voicingLine){
    let degrees=document.getElementById('pianoVoicingDegrees');
    if(!degrees){degrees=document.createElement('p');degrees.id='pianoVoicingDegrees';degrees.className='piano-voicing-degrees';voicingLine.before(degrees);}
    const text=degreeText(circleQuality());if(degrees.textContent!==text)degrees.textContent=text;
  }
}
function decorateRootCards(){
  const text=degreeText(currentLibraryQuality());
  document.querySelectorAll('#libraryRoots [data-library-root]').forEach(button=>{
    const tones=button.querySelector('.library-root-tones');if(!tones)return;
    let degrees=button.querySelector('.library-root-degrees');
    if(!degrees){degrees=document.createElement('span');degrees.className='library-root-degrees';tones.before(degrees);}
    if(degrees.textContent!==text)degrees.textContent=text;
  });
}
function decorateLibraryPiano(){
  const notes=document.getElementById('performancePianoNotes');if(!notes)return;
  let degrees=document.getElementById('performancePianoDegrees');
  if(!degrees){degrees=document.createElement('small');degrees.id='performancePianoDegrees';degrees.className='performance-piano-degrees';notes.before(degrees);}
  const text=degreeText(currentLibraryQuality());if(degrees.textContent!==text)degrees.textContent=text;
}
function cleanupCircleDegrees(){document.querySelectorAll('#harmonyWheel .harmony-wheel-chord-degrees').forEach(node=>node.remove());}
function decorateAll(){decorateChordCards();decorateCircleDetail();decorateRootCards();decorateLibraryPiano();cleanupCircleDegrees();reorderInstrumentControls();}
let queued=false;
function scheduleDecorate(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateAll();});}

function reorderPair(container,guitarSelector,pianoSelector){
  if(!container)return;
  const guitar=container.querySelector(guitarSelector),piano=container.querySelector(pianoSelector);if(!guitar||!piano)return;
  const visible=[...container.children].filter(child=>child===guitar||child===piano);
  if(visible[0]===guitar&&visible[1]===piano)return;
  container.append(guitar,piano);
}
function reorderInstrumentControls(){
  document.querySelectorAll('#instrumento .instrument-tabs .segmented').forEach(segment=>reorderPair(segment,'[data-instrument="guitar"]','[data-instrument="piano"]'));
  document.querySelectorAll('#libraryPerformanceSwitch .segmented').forEach(segment=>reorderPair(segment,'[data-performance-library="guitar"]','[data-performance-library="piano"]'));
}
function syncCircleInstrument(instrument){
  const piano=instrument==='piano',panel=document.getElementById('instrumento'),pianoPanel=document.getElementById('pianoPanel'),guitarPanel=document.getElementById('guitarPanel');
  if(!panel||!pianoPanel||!guitarPanel)return;
  panel.querySelectorAll('[data-instrument]').forEach(button=>button.classList.toggle('active',button.dataset.instrument===instrument));
  pianoPanel.classList.toggle('hidden',!piano);guitarPanel.classList.toggle('hidden',piano);
  pianoPanel.style.setProperty('display',piano?'block':'none','important');guitarPanel.style.setProperty('display',piano?'none':'block','important');
  panel.dataset.visibleInstrument=instrument;
  if(piano)requestAnimationFrame(()=>{document.getElementById('pianoKeyboard')?.style.removeProperty('display');window.dispatchEvent(new Event('resize'));});
}
function syncLibraryInstrument(instrument){
  const view=document.getElementById('chordsView'),control=document.getElementById('libraryPerformanceSwitch'),pianoPanel=document.getElementById('libraryPianoPanel'),grid=document.getElementById('chordLibraryGrid');
  if(!view||!control||!pianoPanel||!grid)return;
  control.querySelectorAll('[data-performance-library]').forEach(button=>button.classList.toggle('active',button.dataset.performanceLibrary===instrument));
  view.dataset.performanceInstrument=instrument;
  if(instrument==='piano'){
    grid.style.setProperty('display','none','important');pianoPanel.style.setProperty('display','block','important');requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }else{
    grid.style.removeProperty('display');pianoPanel.style.setProperty('display','none','important');
  }
}
function openMenu(open){
  const menu=document.getElementById('sideMenu'),backdrop=document.getElementById('menuBackdrop'),button=document.getElementById('menuBtn');if(!menu||!backdrop||!button)return;
  document.body.classList.toggle('menu-open',open);menu.classList.toggle('open',open);backdrop.classList.toggle('open',open);
  menu.setAttribute('aria-hidden',String(!open));backdrop.setAttribute('aria-hidden',String(!open));button.setAttribute('aria-expanded',String(open));
}
function showView(name){
  const circles=name==='circles',circlesView=document.getElementById('circlesView'),chordsView=document.getElementById('chordsView'),bottom=document.getElementById('bottomNav');
  if(!circlesView||!chordsView||!bottom)return;
  circlesView.classList.toggle('view-hidden',!circles);chordsView.classList.toggle('view-hidden',circles);bottom.classList.toggle('view-hidden',!circles);
  document.querySelectorAll('[data-app-view]').forEach(button=>{
    const active=button.dataset.appView===name;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
    const badge=button.querySelector('.app-choice-badge');if(badge)badge.textContent=active?'Activo':'Abrir';
  });
  localStorage.setItem('circulos-active-view',name);openMenu(false);window.scrollTo({top:0,behavior:'smooth'});setTimeout(scheduleDecorate,0);
}

const pointerStarts=new Map(),suppressClicks=new WeakMap();let forwarding=false;
function forwardClick(button){if(!button)return;forwarding=true;try{button.click();}finally{forwarding=false;}suppressClicks.set(button,Date.now()+800);}
function instantTarget(target){return target.closest?.('#menuBtn,#menuCloseBtn,#menuBackdrop,[data-app-view],#instrumento [data-instrument],#libraryPerformanceSwitch [data-performance-library]')||null;}
window.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse')return;
  const target=instantTarget(event.target);if(target)pointerStarts.set(event.pointerId,{target,x:event.clientX,y:event.clientY});
},true);
window.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse')return;
  const start=pointerStarts.get(event.pointerId);pointerStarts.delete(event.pointerId);if(!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>12)return;
  const target=start.target;event.preventDefault();event.stopImmediatePropagation();suppressClicks.set(target,Date.now()+800);
  if(target.id==='menuBtn'){openMenu(true);return;}
  if(target.id==='menuCloseBtn'||target.id==='menuBackdrop'){openMenu(false);return;}
  if(target.matches('[data-app-view]')){showView(target.dataset.appView);return;}
  if(target.matches('#instrumento [data-instrument]')){forwardClick(target);syncCircleInstrument(target.dataset.instrument);return;}
  if(target.matches('#libraryPerformanceSwitch [data-performance-library]')){forwardClick(target);syncLibraryInstrument(target.dataset.performanceLibrary);}
},true);
window.addEventListener('pointercancel',event=>pointerStarts.delete(event.pointerId),true);
window.addEventListener('click',event=>{
  if(forwarding)return;
  const target=instantTarget(event.target);if(target&&(suppressClicks.get(target)||0)>Date.now()){event.preventDefault();event.stopImmediatePropagation();}
},true);

const themeMedia=window.matchMedia('(prefers-color-scheme: dark)');
function themeChoice(){return localStorage.getItem('circulos-theme')||'system';}
function applyTheme(){
  const choice=themeChoice(),resolved=choice==='system'?(themeMedia.matches?'dark':'light'):choice;
  document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=resolved==='dark'?'#101110':'#f5f5f2';
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.classList.toggle('active',button.dataset.themeChoice===choice));
}
function reinforceTheme(){applyTheme();requestAnimationFrame(applyTheme);setTimeout(applyTheme,120);}
try{themeMedia.addEventListener('change',reinforceTheme);}catch(e){themeMedia.addListener?.(reinforceTheme);}
window.addEventListener('pageshow',reinforceTheme);window.addEventListener('focus',reinforceTheme);window.addEventListener('orientationchange',()=>setTimeout(reinforceTheme,160));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reinforceTheme();});
document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-theme-choice]'))setTimeout(reinforceTheme,0);
  if(event.target.closest?.('#diatonicGrid .chord-card,#libraryRoots [data-library-root],[data-library-notation],[data-performance-library],[data-instrument]'))scheduleDecorate();
});
document.addEventListener('change',event=>{if(event.target.id==='libraryQualitySelect'||event.target.id==='minimalScaleSelect')scheduleDecorate();});
setInterval(()=>{if(themeChoice()==='system'&&document.visibilityState==='visible')applyTheme();},1200);

function init(){
  reinforceTheme();decorateAll();
  const bodyObserver=new MutationObserver(scheduleDecorate);bodyObserver.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{
    reorderInstrumentControls();
    const circleActive=document.querySelector('#instrumento [data-instrument].active');syncCircleInstrument(circleActive?.dataset.instrument||'guitar');
    const libraryActive=document.querySelector('#libraryPerformanceSwitch [data-performance-library].active');if(libraryActive)syncLibraryInstrument(libraryActive.dataset.performanceLibrary);
  },80);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();