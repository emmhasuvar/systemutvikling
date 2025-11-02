const STATIC = '/static'; // works across ports/reverse proxies

if (!document.querySelector('.slider')) {
  document.getElementById('content').innerHTML = '<h2>Velkommen! Velg en side i menyen.</h2>';
}
(() => {
  // Mobile nav
  const toggle = document.querySelector('[data-js="menu-toggle"]');
  const nav = document.querySelector('[data-js="nav"]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('nav--open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Slider
  const viewport = document.querySelector('.slider__viewport');
  const dotsWrap = document.querySelector('[data-js="dots"]');
  const prev = document.querySelector('[data-js="prev"]');
  const next = document.querySelector('[data-js="next"]');
  if (!viewport || !dotsWrap) return;

  const items = [
    { image: '/static/show_home/bilde11.jpg', alt: 'Last opp', title: 'Last opp dine egne klær',
      text: 'Finn dine skatter i skapet!', ctaHref: '/upload', ctaText: 'Last opp' },
    { image: '/static/show_home/bilde2.jpg', alt: 'Se klesskapet', title: 'Se ditt klesskap!',
      text: 'Se gjennom alt du har lastet opp', ctaHref: '/clothes', ctaText: 'Kleskap' },
    { image: '/static/show_home/bilde3.jpg', alt: 'Kommer', title: 'Lag dine antrekk!',
      text: 'Begynn å planlegg antrekk', ctaHref: '/looks', ctaText: 'Lag Looks' }
  ];

  const slideHTML = (s, idx) => `
    <article class="slide${idx===0?' is-active':''}" data-index="${idx}" id="slide-${idx}">
      <img class="slide__img" src="${s.image}" alt="${s.alt || ''}">
      <div class="slide__content">
        ${s.title ? `<h2 class="slide__title">${s.title}</h2>` : ''}
        ${s.text ? `<p class="slide__text">${s.text}</p>` : ''}
        ${s.ctaHref ? `<a class="button button--primary" href="${s.ctaHref}">${s.ctaText || 'Shop nå'}</a>` : ''}
      </div>
    </article>`;

  const dotHTML = (i, active) =>
    `<button class="dot${active?' is-active':''}" role="tab" aria-selected="${active}" aria-controls="slide-${i}" data-js="dot" data-index="${i}">
       <span class="sr-only">Banner ${i+1}</span>
     </button>`;

  viewport.innerHTML = items.map(slideHTML).join('');
  dotsWrap.innerHTML = items.map((_,i)=>dotHTML(i, i===0)).join('');

  const slides = Array.from(viewport.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('[data-js="dot"]'));
  let i = 0, timer = null;
  const DURATION = 6000;

  function go(to){
    const from = i;
    i = (to + slides.length) % slides.length;
    if (from === i) return;
    slides[from].classList.remove('is-active');
    slides[i].classList.add('is-active');
    dots[from]?.classList.remove('is-active');
    dots[i]?.classList.add('is-active');
    dots.forEach((d, idx) => d.setAttribute('aria-selected', String(idx === i)));
    restart();
  }
  const nextSlide = () => go(i + 1);
  const prevSlide = () => go(i - 1);
  const restart   = () => { clearInterval(timer); timer = setInterval(nextSlide, DURATION); };

  prev?.addEventListener('click', prevSlide);
  next?.addEventListener('click', nextSlide);
  dots.forEach(btn => btn.addEventListener('click', () => go(Number(btn.dataset.index))));

  viewport.setAttribute('tabindex', '0');
  viewport.addEventListener('keydown', (e)=>{ if (e.key==='ArrowLeft') prevSlide(); if (e.key==='ArrowRight') nextSlide(); });

  const slider = document.querySelector('.slider');
  slider?.addEventListener('mouseenter', ()=> clearInterval(timer));
  slider?.addEventListener('mouseleave', restart);
  slider?.addEventListener('focusin', ()=> clearInterval(timer));
  slider?.addEventListener('focusout', restart);

  let startX = 0, dx = 0; const THRESH = 40;
  viewport.addEventListener('touchstart', (e)=>{ startX = e.touches[0].clientX; dx = 0; }, {passive:true});
  viewport.addEventListener('touchmove',  (e)=>{ dx = e.touches[0].clientX - startX; }, {passive:true});
  viewport.addEventListener('touchend',   ()=>{ if (dx > THRESH) prevSlide(); else if (dx < -THRESH) nextSlide(); });

  document.querySelectorAll('.slide__img').forEach(img=>{
    img.addEventListener('error', ()=> console.error('Image failed:', img.src));
    img.addEventListener('load',  ()=> console.log('Image loaded:', img.src));
  });

  restart();
})();