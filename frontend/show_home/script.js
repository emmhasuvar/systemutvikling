const ORIGIN = window.location.origin;     // auto: http://localhost:8000 (or :5500)
const STATIC = `${ORIGIN}/static`;

if (!document.querySelector('.slider')) {
  document.getElementById("content").innerHTML = "<h2>Velkommen! Velg en side i menyen.</h2>";
}

const fallback = [
  { image: `${STATIC}/show_home/DSC00608.jpg`, alt: 'ROSE Shop', title: 'The Holiday Shop',
    text: 'Gjør deg klar for solen med nye sesongfavoritter.', ctaHref: '/clothes?cat=women', ctaText: 'Shop kvinner' },
  { image: `${STATIC}/show_home/DSC00608.jpg`, alt: 'Ukens Nyheter', title: 'Ukens Nyheter',
    text: 'Friske plagg lander hver uke. Sikre deg størrelsen din!', ctaHref: '/clothes?sort=new', ctaText: 'Se nyheter' },
  { image: `${STATIC}/show_home/DSC00608.jpg`, alt: 'Salg', title: 'Mid-Season Sale',
    text: 'Gjør kupp på utvalgte favoritter – begrenset tid.', ctaHref: '/clothes?sale=1', ctaText: 'Til salget' }
];
s