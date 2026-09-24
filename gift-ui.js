class GiftCardWidget extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._previousBodyOverflow='';
  }

  connectedCallback(){
    if(this.shadowRoot.childElementCount) return;

    this.shadowRoot.innerHTML=`
      <style>
        :host{
          display:block;
          width:100%;
          margin-top:auto;
          color:var(--text,#171817);
          font-family:inherit;
        }
        *{box-sizing:border-box}
        .trigger{
          -webkit-appearance:none;
          appearance:none;
          width:100%;
          min-height:76px;
          display:grid;
          grid-template-columns:46px minmax(0,1fr) 20px;
          align-items:center;
          gap:12px;
          padding:14px;
          border:1px solid color-mix(in srgb,#d7a33d 42%,var(--line,#d7d8d2));
          border-radius:18px;
          background:linear-gradient(135deg,color-mix(in srgb,#f4d58d 24%,var(--surface,#fff)),var(--surface,#fff));
          color:var(--text,#171817);
          font:inherit;
          text-align:left;
          cursor:pointer;
          box-shadow:none;
          transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
        }
        .trigger:hover{
          transform:translateY(-2px);
          border-color:#d7a33d;
          box-shadow:0 12px 28px rgba(91,58,18,.12);
        }
        .trigger:active{transform:scale(.98)}
        .trigger:focus-visible{
          outline:3px solid color-mix(in srgb,#d7a33d 38%,transparent);
          outline-offset:3px;
        }
        .trigger>img{
          display:block;
          width:46px;
          height:46px;
          object-fit:contain;
          border-radius:0;
          background:transparent;
        }
        .copy{min-width:0}
        .copy strong,.copy small{display:block;padding:0;text-transform:none}
        .copy strong{
          margin:0;
          color:var(--text,#171817);
          font-size:14px;
          font-weight:700;
          line-height:1.2;
          letter-spacing:-.02em;
        }
        .copy small{
          margin:4px 0 0;
          color:var(--muted,#6b6e6a);
          font-size:11px;
          font-weight:400;
          line-height:1.35;
          letter-spacing:0;
        }
        .arrow{
          display:block;
          width:19px;
          height:19px;
          fill:none;
          stroke:var(--muted,#6b6e6a);
          stroke-width:2;
          stroke-linecap:round;
          stroke-linejoin:round;
        }
        .modal{
          position:fixed;
          inset:0;
          z-index:1000;
          display:grid;
          place-items:center;
          padding:22px;
          opacity:0;
          visibility:hidden;
          pointer-events:none;
          transition:opacity .22s ease,visibility .22s ease;
        }
        .modal.open{
          opacity:1;
          visibility:visible;
          pointer-events:auto;
        }
        .backdrop{
          position:absolute;
          inset:0;
          border:0;
          background:radial-gradient(circle at 50% 35%,rgba(28,82,57,.78),rgba(8,26,19,.96));
          backdrop-filter:blur(10px);
          cursor:pointer;
        }
        .card{
          position:relative;
          z-index:1;
          width:min(100%,520px);
          padding:48px 34px 38px;
          border:1px solid rgba(255,255,255,.7);
          border-radius:34px;
          background:linear-gradient(145deg,#fffdf7,#f3eddf);
          color:#183427;
          text-align:center;
          box-shadow:0 35px 100px rgba(0,0,0,.34);
          overflow:hidden;
          transform:translateY(18px) scale(.97);
          transition:transform .25s ease;
        }
        .modal.open .card{transform:translateY(0) scale(1)}
        .card::before,.card::after{
          content:"";
          position:absolute;
          border:1px solid rgba(41,107,76,.12);
          border-radius:50%;
          pointer-events:none;
        }
        .card::before{width:250px;height:250px;left:-120px;top:-130px}
        .card::after{width:210px;height:210px;right:-100px;bottom:-120px}
        .close{
          position:absolute;
          top:16px;
          right:16px;
          width:40px;
          height:40px;
          border:1px solid rgba(24,52,39,.16);
          border-radius:50%;
          background:rgba(255,255,255,.58);
          display:grid;
          place-items:center;
          cursor:pointer;
        }
        .close svg{
          width:18px;
          height:18px;
          fill:none;
          stroke:#183427;
          stroke-width:1.8;
          stroke-linecap:round;
        }
        .gift-icon{width:76px;height:76px}
        .kicker{
          margin:18px 0 10px;
          color:#6d5b32;
          font-size:11px;
          font-weight:800;
          letter-spacing:.17em;
        }
        h2{
          margin:0;
          font-family:Georgia,"Times New Roman",serif;
          font-size:clamp(32px,7vw,48px);
          line-height:1.02;
          letter-spacing:-.045em;
          font-weight:500;
        }
        .message{
          max-width:390px;
          margin:18px auto 0;
          color:#587064;
          font-size:15px;
          line-height:1.65;
        }
        .signature{
          margin:24px 0 0;
          color:#1f6d4a;
          font-family:Georgia,"Times New Roman",serif;
          font-size:21px;
          font-style:italic;
        }
        @media(max-width:500px){
          .card{padding:44px 24px 32px;border-radius:28px}
          .gift-icon{width:68px;height:68px}
        }
      </style>

      <button class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false">
        <img src="gift.svg" alt="">
        <span class="copy">
          <strong>Un regalo para ti</strong>
          <small>Descubre quién preparó todo esto.</small>
        </span>
        <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
      </button>

      <div class="modal" aria-hidden="true">
        <button class="backdrop" type="button" aria-label="Cerrar"></button>
        <section class="card" role="dialog" aria-modal="true" aria-labelledby="giftTitle">
          <button class="close" type="button" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <img class="gift-icon" src="gift.svg" alt="">
          <p class="kicker">UN REGALO MUSICAL PARA TI</p>
          <h2 id="giftTitle">Hecho para compartir la música.</h2>
          <p class="message">Todo lo que encuentras aquí fue preparado con dedicación para que explorar los acordes sea sencillo, claro y especial.</p>
          <p class="signature">Por José H. R.</p>
        </section>
      </div>
    `;

    this.trigger=this.shadowRoot.querySelector('.trigger');
    this.modal=this.shadowRoot.querySelector('.modal');
    this.closeBtn=this.shadowRoot.querySelector('.close');
    this.backdrop=this.shadowRoot.querySelector('.backdrop');

    this.openGift=()=>{
      this._previousBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      this.modal.classList.add('open');
      this.modal.setAttribute('aria-hidden','false');
      this.trigger.setAttribute('aria-expanded','true');
      requestAnimationFrame(()=>this.closeBtn.focus());
    };

    this.closeGift=()=>{
      document.body.style.overflow=this._previousBodyOverflow;
      this.modal.classList.remove('open');
      this.modal.setAttribute('aria-hidden','true');
      this.trigger.setAttribute('aria-expanded','false');
      this.trigger.focus();
    };

    this._escapeHandler=(event)=>{
      if(event.key==='Escape'&&this.modal.classList.contains('open')) this.closeGift();
    };

    this.trigger.addEventListener('click',this.openGift);
    this.closeBtn.addEventListener('click',this.closeGift);
    this.backdrop.addEventListener('click',this.closeGift);
    document.addEventListener('keydown',this._escapeHandler);
  }

  disconnectedCallback(){
    if(this._escapeHandler) document.removeEventListener('keydown',this._escapeHandler);
  }
}

if(!customElements.get('gift-card-widget')){
  customElements.define('gift-card-widget',GiftCardWidget);
}