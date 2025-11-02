// Use same-origin + /api to avoid hardcoding localhost
const API = `${location.origin}/api`;

const filtersEl = document.getElementById('category-filters');
const gridEl    = document.getElementById('clothes-grid');

let currentCategory = ''; // '' = alle

async function fetchClothes(category = '') {
  const url = category
    ? `${API}/clothes/?category=${encodeURIComponent(category)}`
    : `${API}/clothes/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch clothes failed: ${res.status}`);
  return await res.json();
}


function renderClothes(items) {
  if (!gridEl) return;

  if (!items || items.length === 0) {
    gridEl.innerHTML = `
      <div class="card" style="padding:1rem;">
        <p class="muted">Ingen plagg i denne kategorien enda.</p>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = items.map(item => `
    <article class="card">
      <img src="${item.image_url}" alt="${item.name}" />
      <div class="card__body">
        <h3>${escapeHtml(item.name)}</h3>
        <small class="muted">${escapeHtml(item.category)}</small>
      </div>
    </article>
  `).join('');
}

function setActiveButton(category) {
  if (!filtersEl) return;
  const btns = filtersEl.querySelectorAll('.chip');
  btns.forEach(b => {
    const c = b.getAttribute('data-category') || '';
    b.classList.toggle('is-active', c === category);
  });
}

async function loadAndRender(category = '') {
  try {
    const items = await fetchClothes(category);
    renderClothes(items);
    setActiveButton(category);
  } catch (e) {
    console.error(e);
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="card" style="padding:1rem;">
          <p class="muted">Klarte ikke å hente klær akkurat nå.</p>
        </div>
      `;
    }
  }
}

// Klikk-håndtering for filter-knappene
if (filtersEl) {
  filtersEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'BUTTON') return;
    const cat = target.getAttribute('data-category') || '';
    currentCategory = cat;
    loadAndRender(currentCategory);

    // (valgfritt) oppdater adressefeltet uten reload
    const qs = currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : '';
    history.replaceState({}, '', location.pathname + qs);
  });
}

// Les kategori fra URL ved første innlasting (valgfritt)
(function initFromURL() {
  const params = new URLSearchParams(location.search);
  currentCategory = params.get('category') || '';
})();

// En bitteliten HTML-escape for sikkerhet i render
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Første last
loadAndRender(currentCategory);
