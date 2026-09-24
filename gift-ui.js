(()=> {
  const sideNote=document.querySelector('.side-menu-note');
  if(!sideNote || sideNote.dataset.giftReady==='true') return;

  sideNote.dataset.giftReady='true';
  sideNote.className='side-menu-gift';
  sideNote.tabIndex=0;
  sideNote.setAttribute('role','button');
  sideNote.setAttribute('aria-label','Abrir regalo de José H. R.');
  sideNote.innerHTML='<img src="gift.svg" alt=""><span><strong>Un regalo para ti</strong><small>Descubre quién preparó todo esto.</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

  document.querySelectorAll('.gift-modal').forEach(modal=>modal.remove());

  const giftModal=document.createElement('div');
  giftModal.className='gift-modal';
  giftModal.setAttribute('aria-hidden','true');
  giftModal.innerHTML='<div class="gift-modal-backdrop" data-gift-close></div><section class="gift-card" role="dialog" aria-modal="true" aria-labelledby="giftTitle"><button class="gift-close" type="button" data-gift-close aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><img class="gift-card-icon" src="gift.svg" alt=""><p class="gift-kicker">UN REGALO MUSICAL PARA TI</p><h2 id="giftTitle">Hecho para compartir la música.</h2><p class="gift-message">Todo lo que encuentras aquí fue preparado con dedicación para que explorar los acordes sea sencillo, claro y especial.</p><p class="gift-signature">Por José H. R.</p></section>';
  document.body.appendChild(giftModal);

  const openGift=()=>{
    giftModal.classList.add('open');
    giftModal.setAttribute('aria-hidden','false');
    document.body.classList.add('gift-open');
    giftModal.querySelector('.gift-close')?.focus();
  };
  const closeGift=()=>{
    giftModal.classList.remove('open');
    giftModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('gift-open');
    sideNote.focus();
  };

  sideNote.addEventListener('click',openGift);
  sideNote.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      openGift();
    }
  });
  giftModal.querySelectorAll('[data-gift-close]').forEach(element=>element.addEventListener('click',closeGift));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&giftModal.classList.contains('open')) closeGift();
  });
})();