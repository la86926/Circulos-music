(()=>{
  const PORTAL_ID='gift-ui-portal';
  const STYLE_ID='gift-ui-global-style';

  function ensureGlobalStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${PORTAL_ID}{
        position:fixed!important;
        inset:0!important;
        z-index:2147483000!important;
        display:grid!important;
        place-items:center!important;
        width:100vw!important;
        height:100dvh!important;
        min-height:100vh!important;
        padding:22px!important;
        margin:0!important;
        box-sizing:border-box!important;
        opacity:0;
        visibility:hidden;
        pointer-events:none;
        isolation:isolate!important;
      }
      #${PORTAL_ID}.open{
        opacity:1;
        visibility:visible;
        pointer-events:auto;
      }
      #${PORTAL_ID} .gift-portal-backdrop{
        position:fixed!important;
        inset:0!important;
        width:100vw!important;
        height:100dvh!important;
        min-height:100vh!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        background:radial-gradient(circle at 50% 35%,rgba(28,82,57,.78),rgba(8,26,19,.96))!important;
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        cursor:pointer;
      }
      #${PORTAL_ID} .gift-portal-card{
        position:relative!important;
        z-index:1!important;
        box-sizing:border-box!important;
        width:min(100%,520px)!important;
        max-height:calc(100dvh - 44px)!important;
        overflow:auto!important;
        padding:48px 34px 38px!important;
        margin:0!important;
        border:1px solid rgba(255,255,255,.72)!important;
        border-radius:34px!important;
        background:linear-gradient(145deg,#fffdf7,#f3eddf)!important;
        color:#183427!important;
        text-align:center!important;
        box-shadow:0 35px 100px rgba(0,0,0,.34)!important;
        transform:translateY(18px) scale(.97);
        transition:transform .25s ease;
        font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif!important;
      }
      #${PORTAL_ID}.open .gift-portal-card{transform:translateY(0) scale(1)}
      #${PORTAL_ID} .gift-portal-close{
        position:absolute!important;
        top:16px!important;
        right:16px!important;
        width:40px!important;
        height:40px!important;
        display:grid!important;
        place-items:center!important;
        margin:0!important;
        padding:0!important;
        border:1px solid rgba(24,52,39,.16)!important;
        border-radius:50%!important;
        background:rgba(255,255,255,.72)!important;
        cursor:pointer!important;
      }
      #${PORTAL_ID} .gift-portal-close svg{
        width:18px!important;height:18px!important;
        fill:none!important;stroke:#183427!important;stroke-width:1.8!important;
        stroke-linecap:round!important;
      }
      #${PORTAL_ID} .gift-portal-icon{
        display:block!important;
        width:76px!important;
        height:76px!important;
        margin:0 auto!important;
        object-fit:contain!important;
      }
      #${PORTAL_ID} .gift-portal-kicker{
        margin:18px 0 10px!important;
        color:#6d5b32!important;
        font-size:11px!important;
        font-weight:800!important;
        line-height:1.3!important;
        letter-spacing:.17em!important;
        text-transform:uppercase!important;
      }
      #${PORTAL_ID} .gift-portal-title{
        margin:0!important;
        color:#183427!important;
        font-family:Georgia,"Times New Roman",serif!important;
        font-size:clamp(32px,7vw,48px)!important;
        font-weight:500!important;
        line-height:1.02!important;
        letter-spacing:-.045em!important;
      }
      #${PORTAL_ID} .gift-portal-message{
        max-width:390px!important;
        margin:18px auto 0!important;
        color:#587064!important;
        font-size:15px!important;
        line-height:1.65!important;
      }
      #${PORTAL_ID} .gift-portal-signature{
        margin:24px 0 0!important;
        color:#1f6d4a!important;
        font-family:Georgia,"Times New Roman",serif!important;
        font-size:21px!important;
        font-style:italic!important;
        line-height:1.3!important;
      }
      @media(max-width:500px){
        #${PORTAL_ID}{padding:16px!important}
        #${PORTAL_ID} .gift-portal-card{
          max-height:calc(100dvh - 32px)!important;
          padding:44px 24px 32px!important;
          border-radius:28px!important;
        }
        #${PORTAL_ID} .gift-portal-icon{width:68px!important;height:68px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePortal(){
    ensureGlobalStyle();
    let portal=document.getElementById(PORTAL_ID);
    if(portal) return portal;

    portal=document.createElement('div');
    portal.id=PORTAL_ID;
    portal.setAttribute('aria-hidden','true');
    portal.innerHTML=`
      <button class="gift-portal-backdrop" type="button" aria-label="Cerrar"></button>
      <section class="gift-portal-card" role="dialog" aria-modal="true" aria-labelledby="giftPortalTitle">
        <button class="gift-portal-close" type="button" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <img class="gift-portal-icon" src="gift.svg" alt="">
        <p class="gift-portal-kicker">UN REGALO MUSICAL PARA TI</p>
        <h2 class="gift-portal-title" id="giftPortalTitle">Hecho para compartir la música.</h2>
        <p class="gift-portal-message">Todo lo que encuentras aquí fue preparado con dedicación para que explorar los acordes sea sencillo, claro y especial.</p>
        <p class="gift-portal-signature">Por José H. R.</p>
      </section>
    `;
    document.body.appendChild(portal);

    const close=()=>{
      portal.classList.remove('open');
      portal.setAttribute('aria-hidden','true');
      document.documentElement.style.overflow=portal.dataset.prevHtmlOverflow||'';
      document.body.style.overflow=portal.dataset.prevBodyOverflow||'';
      const opener=document.querySelector('gift-card-widget[data-gift-opener="true"]');
      if(opener){
        opener.removeAttribute('data-gift-opener');
        opener.focusTrigger?.();
      }
    };

    portal.querySelector('.gift-portal-backdrop').addEventListener('click',close);
    portal.querySelector('.gift-portal-close').addEventListener('click',close);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&portal.classList.contains('open')) close();
    });

    portal.openFrom=(widget)=>{
      document.querySelectorAll('gift-card-widget[data-gift-opener]').forEach(el=>el.removeAttribute('data-gift-opener'));
      widget.setAttribute('data-gift-opener','true');
      portal.dataset.prevHtmlOverflow=document.documentElement.style.overflow||'';
      portal.dataset.prevBodyOverflow=document.body.style.overflow||'';
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
      portal.classList.add('open');
      portal.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>portal.querySelector('.gift-portal-close').focus());
    };

    return portal;
  }

  class GiftCardWidget extends HTMLElement{
    constructor(){
      super();
      this.attachShadow({mode:'open'});
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
          button{
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
          button:hover{
            transform:translateY(-2px);
            border-color:#d7a33d;
            box-shadow:0 12px 28px rgba(91,58,18,.12);
          }
          button:active{transform:scale(.98)}
          button:focus-visible{
            outline:3px solid color-mix(in srgb,#d7a33d 38%,transparent);
            outline-offset:3px;
          }
          img{
            display:block;
            width:46px;
            height:46px;
            object-fit:contain;
            background:transparent;
          }
          .copy{min-width:0}
          strong,small{display:block;padding:0;text-transform:none}
          strong{
            margin:0;
            color:var(--text,#171817);
            font-size:14px;
            font-weight:700;
            line-height:1.2;
            letter-spacing:-.02em;
          }
          small{
            margin:4px 0 0;
            color:var(--muted,#6b6e6a);
            font-size:11px;
            font-weight:400;
            line-height:1.35;
            letter-spacing:0;
          }
          svg{
            display:block;
            width:19px;
            height:19px;
            fill:none;
            stroke:var(--muted,#6b6e6a);
            stroke-width:2;
            stroke-linecap:round;
            stroke-linejoin:round;
          }
        </style>
        <button type="button" aria-haspopup="dialog" aria-label="Abrir regalo de José H. R.">
          <img src="gift.svg" alt="">
          <span class="copy">
            <strong>Un regalo para ti</strong>
            <small>Descubre quién preparó todo esto.</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      `;

      this.trigger=this.shadowRoot.querySelector('button');
      this.trigger.addEventListener('click',()=>ensurePortal().openFrom(this));
    }

    focusTrigger(){ this.trigger?.focus(); }
  }

  if(!customElements.get('gift-card-widget')){
    customElements.define('gift-card-widget',GiftCardWidget);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensurePortal,{once:true});
  }else{
    ensurePortal();
  }
})();