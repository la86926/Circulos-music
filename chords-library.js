(()=>{
'use strict';
import('./stability-hotfix.js?v=1').then(()=>Promise.all([
  import('./circle-wheel.js?v=5'),
  import('./chords-cleanup.js?v=2')
])).catch(()=>{});
const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const ROOTS=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const LATIN={C:'DO',D:'RE',E:'MI',F:'FA',G:'SOL',A:'LA',B:'SI'};
const TUNING_PC=[4,9,2,7,11,4],TUNING_MIDI=[40,45,50,55,59,64];
const QUALITIES={
  major:{label:'Mayor',suffix:'',intervals:[0,4,7],templates:{E:[0,2,2,1,0,0],A:[null,0,2,2,2,0]}},
  minor:{label:'Menor',suffix:'m',intervals:[0,3,7],templates:{E:[0,2,2,0,0,0],A:[null,0,2,2,1,0]}},
  dominant7:{label:'Séptima',suffix:'7',intervals:[0,4,7,10],templates:{E:[0,2,0,1,0,0],A:[null,0,2,0,2,0]}},
  major7:{label:'Mayor 7',suffix:'maj7',intervals:[0,4,7,11],templates:{E:[0,2,1,1,0,0],A:[null,0,2,1,2,0]}},
  minor7:{label:'Menor 7',suffix:'m7',intervals:[0,3,7,10],templates:{E:[0,2,0,0,0,0],A:[null,0,2,0,1,0]}},
  diminished:{label:'Disminuido',suffix:'°',intervals:[0,3,6],templates:{}}
};
const OPEN={
'C:major':[null,3,2,0,1,0],'G:major':[3,2,0,0,0,3],'D:major':[null,null,0,2,3,2],'A:major':[null,0,2,2,2,0],'E:major':[0,2,2,1,0,0],'F:major':[null,null,3,2,1,1],
'A:minor':[null,0,2,2,1,0],'E:minor':[0,2,2,0,0,0],'D:minor':[null,null,0,2,3,1],
'C:dominant7':[null,3,2,3,1,0],'A:dominant7':[null,0,2,0,2,0],'E:dominant7':[0,2,0,1,0,0],'D:dominant7':[null,null,0,2,1,2],'G:dominant7':[3,2,0,0,0,1],'B:dominant7':[null,2,1,2,0,2],
'C:major7':[null,3,2,0,0,0],'A:major7':[null,0,2,1,2,0],'E:major7':[0,2,1,1,0,0],'D:major7':[null,null,0,2,2,2],'G:major7':[3,2,0,0,0,2],
'A:minor7':[null,0,2,0,1,0],'E:minor7':[0,2,0,0,0,0],'D:minor7':[null,null,0,2,1,1],'B:minor7':[null,2,0,2,0,2]
};
const state={root:'C',quality:'major',notation:'latin'};
const $=id=>document.getElementById(id);
let audio=null;
function formatNote(note){if(state.notation==='english')return note.replace('#','♯').replace('b','♭');return `${LATIN[note[0]]||note[0]}${note.slice(1).replace('#','♯').replace('b','♭')}`}
function chordName(){const q=QUALITIES[state.quality],root=formatNote(state.root);if(state.quality==='major')return `${root} mayor`;if(state.quality==='minor')return `${root} menor`;if(state.quality==='diminished')return `${root} disminuido`;return `${root}${q.suffix}`}
function noteNames(){const q=QUALITIES[state.quality],flat=state.root.includes('b');return q.intervals.map(i=>(flat?FLAT:SHARP)[(PC[state.root]+i)%12])}
function normalizedFret(f){return f===0?12:f}
function transposeTemplate(template,base){return template.map(f=>f===null?null:base+f)}
function movablePositions(){const q=QUALITIES[state.quality],rootPc=PC[state.root],positions=[];
  if(q.templates.A){const f=normalizedFret((rootPc-9+12)%12);positions.push({name:'Cejilla · forma A',description:`Raíz en 5.ª cuerda · traste ${f}`,frets:transposeTemplate(q.templates.A,f),barre:{fret:f,from:1,to:5},base:f,kind:'CAGED A'});}
  if(q.templates.E){const f=normalizedFret((rootPc-4+12)%12);positions.push({name:'Cejilla · forma E',description:`Raíz en 6.ª cuerda · traste ${f}`,frets:transposeTemplate(q.templates.E,f),barre:{fret:f,from:0,to:5},base:f,kind:'CAGED E'});}
  return positions.sort((a,b)=>a.base-b.base);
}
function compactPositions(){const intervals=QUALITIES[state.quality].intervals,target=new Set(intervals.map(i=>(PC[state.root]+i)%12)),size=intervals.length,groups=size===3?[[3,4,5],[2,3,4],[1,2,3]]:[[2,3,4,5],[1,2,3,4]],found=[];
  for(const group of groups){const frets=Array(size).fill(1);const walk=depth=>{if(depth===size){const pcs=frets.map((f,i)=>(TUNING_PC[group[i]]+f)%12);if(pcs.every(pc=>target.has(pc))&&new Set(pcs).size===size){const min=Math.min(...frets),max=Math.max(...frets),span=max-min;if(span<=4&&min>=1)found.push({group:[...group],frets:[...frets],min,max,span});}return;}for(let f=1;f<=15;f++){frets[depth]=f;walk(depth+1);}};walk(0);}
  found.sort((a,b)=>(a.span-b.span)||(a.min-b.min));const chosen=[];for(const item of found){if(chosen.some(x=>x.group.join()==item.group.join()&&Math.abs(x.min-item.min)<3))continue;if(chosen.some(x=>Math.abs(x.min-item.min)<2))continue;chosen.push(item);if(chosen.length===3)break;}
  return chosen.map((item,i)=>{const full=Array(6).fill(null);item.group.forEach((s,j)=>full[s]=item.frets[j]);return{name:size===3?`Triada compacta ${i+1}`:`Voicing compacto ${i+1}`,description:`Zona de los trastes ${item.min}–${item.max}`,frets:full,base:item.min,kind:size===3?'Triada':'Cuatro notas'};});
}
function allPositions(){const list=[],open=OPEN[`${state.root}:${state.quality}`];if(open)list.push({name:'Posición abierta',description:'La forma más habitual para comenzar',frets:open,base:0,kind:'Abierto'});list.push(...movablePositions(),...compactPositions());return list.slice(0,6);}
function midiFor(position){return position.frets.map((f,i)=>f===null?null:TUNING_MIDI[i]+f).filter(Number.isFinite)}
function ensureAudio(){if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio}
function play(position){const notes=midiFor(position),ctx=ensureAudio(),now=ctx.currentTime;notes.forEach((midi,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+i*.055;osc.type='triangle';osc.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.03,.12/Math.sqrt(notes.length)),start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+1.15);osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+1.2);});}
function diagram(position){const frets=position.frets,positive=frets.filter(f=>Number.isFinite(f)&&f>0);let start=positive.length?Math.min(...positive):1;if(start<=3&&Math.max(...positive,0)<=5)start=1;const end=start+4,w=230,h=252,left=38,top=38,sg=31,fg=36,rootPc=PC[state.root];let svg=`<svg class="library-diagram" viewBox="0 0 ${w} ${h}" role="img" aria-label="${position.name} de ${chordName()}">`;
  for(let s=0;s<6;s++)svg+=`<line class="string" x1="${left+s*sg}" y1="${top}" x2="${left+s*sg}" y2="${top+5*fg}"/>`;
  for(let f=0;f<=5;f++)svg+=`<line class="${start===1&&f===0?'nut':'fret'}" x1="${left}" y1="${top+f*fg}" x2="${left+5*sg}" y2="${top+f*fg}"/>`;
  if(start>1)svg+=`<text class="label" x="8" y="${top+fg*.7}">${start}</text>`;
  if(position.barre&&position.barre.fret>=start&&position.barre.fret<=end){const y=top+(position.barre.fret-start+.5)*fg;svg+=`<line class="barre" x1="${left+position.barre.from*sg}" y1="${y}" x2="${left+position.barre.to*sg}" y2="${y}"/>`;}
  frets.forEach((f,s)=>{const x=left+s*sg;if(f===null){svg+=`<text class="label" x="${x}" y="22" text-anchor="middle">×</text>`;return;}if(f===0){svg+=`<text class="label" x="${x}" y="22" text-anchor="middle">○</text>`;return;}if(f<start||f>end)return;const y=top+(f-start+.5)*fg,pc=(TUNING_PC[s]+f)%12,isRoot=pc===rootPc;svg+=`<circle class="${isRoot?'root':'dot'}" cx="${x}" cy="${y}" r="10"/>`;if(isRoot)svg+=`<text class="dot-label" x="${x}" y="${y}">R</text>`;});
  return svg+`<text class="label" x="${left}" y="${h-9}">6.ª</text><text class="label" x="${left+5*sg}" y="${h-9}" text-anchor="end">1.ª</text></svg>`;
}
function renderSelectors(){const roots=$('libraryRoots'),qualities=$('libraryQualities');if(!roots||!qualities)return;roots.innerHTML=ROOTS.map(root=>`<button class="library-root-btn ${root===state.root?'active':''}" data-library-root="${root}" type="button">${formatNote(root)}</button>`).join('');qualities.innerHTML=Object.entries(QUALITIES).map(([key,q])=>`<button class="library-quality-btn ${key===state.quality?'active':''}" data-library-quality="${key}" type="button">${q.label}</button>`).join('');roots.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.root=btn.dataset.libraryRoot;render();});qualities.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.quality=btn.dataset.libraryQuality;render();});document.querySelectorAll('[data-library-notation]').forEach(btn=>btn.classList.toggle('active',btn.dataset.libraryNotation===state.notation));}
function render(){if(!$('chordLibraryGrid'))return;renderSelectors();const positions=allPositions(),notes=noteNames();$('libraryTitle').textContent=chordName();$('libraryNotes').textContent=`Notas: ${notes.map(formatNote).join(' · ')}`;$('chordLibraryGrid').innerHTML=positions.map((p,i)=>`<article class="library-card ${i===0?'featured':''}"><span class="library-rank">${i===0?'Más conocida':i===1?'Muy usada':`Posición ${i+1}`}</span><div class="library-card-head"><div><h3>${p.name}</h3><p>${p.description}</p></div><button class="library-card-play" data-library-play="${i}" type="button" aria-label="Escuchar ${p.name}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg></button></div>${diagram(p)}<div class="library-card-foot"><span>${p.kind}</span><span>${p.base===0?'Abierto':`Desde traste ${p.base}`}</span></div></article>`).join('');$('chordLibraryGrid').querySelectorAll('[data-library-play]').forEach(btn=>btn.onclick=()=>play(positions[Number(btn.dataset.libraryPlay)]));$('playLibraryChord').onclick=()=>play(positions[0]);}
document.querySelectorAll('[data-library-notation]').forEach(btn=>btn.addEventListener('click',()=>{state.notation=btn.dataset.libraryNotation;render();}));window.addEventListener('DOMContentLoaded',render);render();
})();
