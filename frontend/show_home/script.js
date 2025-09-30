const STATIC = '/static'; // works across ports/reverse proxies

if (!document.querySelector('.slider')) {
  document.getElementById('content').innerHTML = '<h2>Velkommen! Velg en side i menyen.</h2>';
}

const items = [
  { image: '/static/show_home/bilde1.jpg', alt: 'Holiday Shop', title: 'The Rose Shop',
    text: 'Gjør deg klar for solen med nye sesongfavoritter.', ctaHref: '/clothes?cat=women', ctaText: 'Shop ROSE' },
  { image: '/static/show_home/bilde2.jpg', alt: 'Ukens Nyheter', title: 'Ukens Nyheter',
    text: 'Friske plagg lander hver uke. Sikre deg størrelsen din!', ctaHref: '/clothes?sort=new', ctaText: 'Se nyheter' },
  { image: '/static/show_home/bilde3.jpg', alt: 'Salg', title: 'Mid-Season Sale',
    text: 'Gjør kupp på utvalgte favoritter – begrenset tid.', ctaHref: '/clothes?sale=1', ctaText: 'Til ROSEE' }
];
