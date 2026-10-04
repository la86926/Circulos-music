/* Círculos Music · piano en colores pastel e inversiones animadas
   Solo se iluminan las 3 teclas de la posición elegida: lila = tónica, menta = las otras notas.
   Al cambiar de inversión, la nota que cambia de octava "vuela" a su nueva tecla y el teclado se centra solo. */
(()=>{
'use strict';
const host=document.getElementById('pianoKeyboard');
if(!host)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let last=null,busy=false;

const keys=()=>[...host.children].filter(k=>k.classList.contains('white-key')||k.classList.contains('black-key'));
function snapshot(){
  const list=keys(),voicing=[];let root=null;
  list.forEach((k,i)=>{                                // las teclas van en orden cromático desde DO 48
    k.dataset.pkMidi=48+i;
    if(k.classList.contains('root-tone'))root=i%12;
    if(k.classList.contains('voicing-tone'))voicing.push(48+i);
  });
  return{voicing,root,pcs:voicing.map(m=>m%12).sort((a,b)=>a-b).join(',')};
}
const keyAt=m=>host.querySelector(`[data-pk-midi="${m}"]`);
function paint(state){
  keys().forEach(k=>{
    const m=Number(k.dataset.pkMidi),on=state.voicing.includes(m);
    k.classList.toggle('pk-on',on&&m%12!==state.root);
    k.classList.toggle('pk-root',on&&m%12===state.root);
  });
}
function centerOf(k){return{x:k.offsetLeft+k.offsetWidth/2,y:k.offsetTop+k.offsetHeight-(k.classList.contains('black-key')?34:58)};}

/* Centra el teclado sobre las teclas iluminadas usando la barra deslizante del piano */
function recenter(state){
  const scroll=host.closest('.piano-scroll'),range=document.querySelector('[data-piano-position="pianoKeyboard"] input[type="range"]');
  if(!scroll||!range||!state.voicing.length)return;
  const first=keyAt(state.voicing[0]),lastKey=keyAt(state.voicing[state.voicing.length-1]);if(!first||!lastKey)return;
  const max=scroll.scrollWidth-scroll.clientWidth;if(max<2)return;
  const mid=(first.offsetLeft+lastKey.offsetLeft+lastKey.offsetWidth)/2;
  const left=scroll.scrollLeft,right=left+scroll.clientWidth;
  if(first.offsetLeft>=left+16&&lastKey.offsetLeft+lastKey.offsetWidth<=right-16)return;   // ya se ven
  const target=Math.max(0,Math.min(1000,Math.round((mid-scroll.clientWidth/2)/max*1000)));
  const from=Number(range.value)||0,t0=performance.now(),dur=reduced.matches?0:520;
  const step=now=>{
    const p=dur?Math.min(1,(now-t0)/dur):1,e=1-Math.pow(1-p,3);
    range.value=String(Math.round(from+(target-from)*e));range.dispatchEvent(new Event('input'));
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function pop(list){
  list.forEach((k,i)=>{k.style.setProperty('--pk-d',`${i*80}ms`);k.classList.remove('pk-pop');void k.offsetWidth;k.classList.add('pk-pop');});
}
function ring(x,y,root){
  const r=document.createElement('span');r.className=`pk-ring${root?' is-root':''}`;r.style.left=x+'px';r.style.top=y+'px';
  host.appendChild(r);setTimeout(()=>r.remove(),700);
}
function fly(fromKey,toKey,label,root,delay){
  const a=centerOf(fromKey),b=centerOf(toKey);
  const bubble=document.createElement('span');bubble.className=`pk-fly${root?' is-root':''}`;bubble.textContent=label;
  host.appendChild(bubble);toKey.classList.add('pk-wait');
  const lift=Math.max(24,Math.min(150,60+Math.abs(b.x-a.x)*.22,Math.min(a.y,b.y)-24)),frames=[];
  for(let i=0;i<=12;i++){const t=i/12;frames.push({transform:`translate(${a.x+(b.x-a.x)*t}px,${a.y+(b.y-a.y)*t-Math.sin(Math.PI*t)*lift}px) scale(${1+.18*Math.sin(Math.PI*t)})`,opacity:i===0?0:1});}
  const anim=bubble.animate(frames,{duration:760,delay,easing:'cubic-bezier(.45,.05,.3,1)',fill:'both'});
  fromKey.classList.add('pk-leave');setTimeout(()=>fromKey.classList.remove('pk-leave'),delay+520);
  anim.onfinish=()=>{bubble.remove();toKey.classList.remove('pk-wait');pop([toKey]);ring(b.x,b.y,root);};
}

function update(){
  if(busy)return;
  const state=snapshot();if(!state.voicing.length)return;
  const sig=state.voicing.join(',')+'|'+state.root;
  if(last&&sig===last.sig)return;
  busy=true;paint(state);busy=false;
  const prev=last;last={...state,sig};
  if(!host.offsetParent||reduced.matches){if(prev)recenter(state);return;}
  const nowKeys=state.voicing.map(keyAt).filter(Boolean);
  if(prev&&prev.pcs===state.pcs&&prev.root===state.root){        // mismo acorde, otra inversión
    const gone=prev.voicing.filter(m=>!state.voicing.includes(m)),came=state.voicing.filter(m=>!prev.voicing.includes(m));
    recenter(state);
    setTimeout(()=>gone.forEach((m,i)=>{
      const target=came.find(c=>c%12===m%12),fromKey=keyAt(m),toKey=keyAt(target);
      if(fromKey&&toKey)fly(fromKey,toKey,toKey.textContent.trim(),m%12===state.root,i*140);
    }),reduced.matches?0:120);
    pop(nowKeys.filter(k=>!came.includes(Number(k.dataset.pkMidi))));
  }else{
    pop(nowKeys);
    if(prev)recenter(state);
  }
}
new MutationObserver(muts=>{
  if(muts.every(m=>[...m.addedNodes,...m.removedNodes].every(n=>n.classList&&(n.classList.contains('pk-fly')||n.classList.contains('pk-ring')))))return;
  requestAnimationFrame(update);
}).observe(host,{childList:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-instrument="piano"]'))setTimeout(()=>{if(last)recenter(last);},60);});
update();
})();
