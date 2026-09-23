(()=>{
'use strict';
if(window.__circulosPerformanceModeV8)return;
window.__circulosPerformanceModeV8=true;

function parseNote(token){
  const map={DO:'C',RE:'D',MI:'E',FA:'F',SOL:'G',LA:'A',SI:'B'};
  const pc={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  let value=String(token||'').trim().toUpperCase().replace(/NOTAS?:/g,'').replace(/♯/g,'#').replace(/♭/g,'B').replace(/\s+/g,'');
  for(const latin of ['SOL','DO','RE','MI','FA','LA','SI'])if(value.startsWith(latin)){const next=value.slice(latin.length,latin.length+1),acc=next==='#'?'#':next==='B'?'b':'';return pc[(map[latin]||'C')+acc]??null;}
  const m=value.match(/^([A-G])([#B]?)/);return m?(pc[m[1]+(m[2]==='B'?'b':m[2])]??null):null;
}
function cardChord(card){const text=card?.querySelector('.chord-notes,.chord-card-notes')?.textContent||'';return text.split(/[·,]/).map(parseNote).filter(Number.isFinite);}
function toneClassMap(pcs){return new Map(pcs.map((pc,index)=>[pc,`triad-tone-${index+1}`]));}
function decorateCirclePiano(){
  const host=document.getElementById('pianoKeyboard'),active=document.querySelector('#diatonicGrid .chord-card.active')||document.querySelector('#diatonicGrid .chord-card');if(!host||!active)return;
  const classes=toneClassMap(cardChord(active));host.querySelectorAll('.white-key,.black-key').forEach(key=>{key.classList.remove('triad-tone-1','triad-tone-2','triad-tone-3','triad-tone-4');const c=classes.get(parseNote(key.textContent));if(c)key.classList.add(c);});
}
const rotatePoint=(x,y,width)=>[y,width-x];
function rotateDiagram(svg){
  if(!svg||svg.dataset.horizontalTab==='true')return;
  const parts=(svg.getAttribute('viewBox')||'0 0 230 250').trim().split(/\s+/).map(Number),width=parts[2],height=parts[3];if(!Number.isFinite(width)||!Number.isFinite(height))return;
  svg.querySelectorAll('line').forEach(line=>{const a=rotatePoint(Number(line.getAttribute('x1')),Number(line.getAttribute('y1')),width),b=rotatePoint(Number(line.getAttribute('x2')),Number(line.getAttribute('y2')),width);line.setAttribute('x1',a[0]);line.setAttribute('y1',a[1]);line.setAttribute('x2',b[0]);line.setAttribute('y2',b[1]);});
  svg.querySelectorAll('circle').forEach(circle=>{const p=rotatePoint(Number(circle.getAttribute('cx')),Number(circle.getAttribute('cy')),width);circle.setAttribute('cx',p[0]);circle.setAttribute('cy',p[1]);});
  svg.querySelectorAll('text').forEach(text=>{const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'));if(!Number.isFinite(x)||!Number.isFinite(y))return;const p=rotatePoint(x,y,width);text.setAttribute('x',p[0]);text.setAttribute('y',p[1]);text.removeAttribute('transform');});
  svg.setAttribute('viewBox',`0 0 ${height} ${width}`);svg.dataset.horizontalTab='true';svg.classList.add('horizontal-tab');
}
function rotateInside(host){host?.querySelectorAll('.chord-diagram').forEach(rotateDiagram);}
function observe(host,callback){if(!host)return;let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;callback();});}).observe(host,{childList:true,subtree:true});}
function bindWheel(){
  document.addEventListener('click',event=>{const node=event.target.closest?.('.harmony-wheel-node[data-wheel-index]');if(!node)return;const card=[...document.querySelectorAll('#diatonicGrid .chord-card')][Number(node.dataset.wheelIndex)];if(card&&!card.classList.contains('active'))card.click();requestAnimationFrame(()=>{rotateInside(document.getElementById('guitarVoicings'));decorateCirclePiano();});});
}
function init(){
  rotateInside(document.getElementById('guitarVoicings'));decorateCirclePiano();bindWheel();
  observe(document.getElementById('guitarVoicings'),()=>rotateInside(document.getElementById('guitarVoicings')));
  observe(document.getElementById('pianoKeyboard'),decorateCirclePiano);
  observe(document.getElementById('diatonicGrid'),()=>requestAnimationFrame(decorateCirclePiano));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();