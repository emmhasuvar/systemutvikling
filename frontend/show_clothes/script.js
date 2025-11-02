const API = `${location.origin}/api`;
const filtersEl = document.getElementById('category-filters');
const gridEl = document.getElementById('clothes-grid');
let currentCategory = '';

// --- Fetch & Render Clothes ---
async function fetchClothes(category = '') {
  const url = category ? `${API}/clothes/?category=${encodeURIComponent(category)}` : `${API}/clothes/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return await res.json();
}

function renderClothes(items) {
  gridEl.innerHTML = items.map(item => `
    <article class="product-card" data-id="${item.id}">
      <img src="${item.image_url}" alt="${item.name}">
      <div class="product-info">
        <div class="product-brand">Looksy</div>
        <div class="product-name">${escapeHtml(item.name)}</div>
        <div class="product-meta">
          <span class="product-category">${escapeHtml(item.category)}</span>
        </div>
      </div>
    </article>
  `).join('');

  gridEl.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const clothId = card.dataset.id;
      const cloth = items.find(it => it.id == clothId);
      openPopup(cloth);
    });
  });
}

// --- Popup ---
function openPopup(cloth) {
  const popup = document.createElement('div');
  popup.className = 'edit-popup';
  popup.innerHTML = `
    <div class="edit-popup__content">
      <h3>Rediger plagg</h3>
      <img src="${cloth.image_url}" class="edit-popup__img" alt="${cloth.name}">
      <label>Navn</label>
      <input id="editName" value="${escapeHtml(cloth.name)}" class="modal__input">
      <label>Kategori</label>
      <select id="editCat" class="modal__input">
        <option value="topp"${cloth.category==='topp'?' selected':''}>Topp</option>
        <option value="underdel"${cloth.category==='underdel'?' selected':''}>Underdel</option>
        <option value="sko"${cloth.category==='sko'?' selected':''}>Sko</option>
        <option value="tilbehør"${cloth.category==='tilbehør'?' selected':''}>Tilbehør</option>
      </select>
      <div class="edit-popup__actions">
        <button id="saveBtn" class="button button--primary">Lagre</button>
        <button id="deleteBtn" class="button button--danger">Slett</button>
        <button id="closeBtn" class="button" style="background:#e2e8f0;">Lukk</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('show'), 10);

  popup.querySelector('#closeBtn').addEventListener('click', () => closePopup(popup));

  popup.querySelector('#saveBtn').addEventListener('click', async () => {
    const name = popup.querySelector('#editName').value.trim();
    const category = popup.querySelector('#editCat').value;
    const fd = new FormData();
    fd.append('name', name);
    fd.append('category', category);

    try {
      const res = await fetch(`${API}/clothes/${cloth.id}`, {
        method: 'PUT',
        body: fd,
      });
      if (!res.ok) throw new Error();
      closePopup(popup);
      loadAndRender(currentCategory);
    } catch {
      alert('Kunne ikke lagre endringer.');
    }
  });

  popup.querySelector('#deleteBtn').addEventListener('click', async () => {
    if (!confirm('Er du sikker på at du vil slette dette plagget?')) return;
    try {
      const res = await fetch(`${API}/clothes/${cloth.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      closePopup(popup);
      loadAndRender(currentCategory);
    } catch {
      alert('Kunne ikke slette plagg.');
    }
  });
}

function closePopup(popup) {
  popup.classList.remove('show');
  setTimeout(() => popup.remove(), 150);
}

// --- Filters ---
function setActiveButton(category) {
  filtersEl.querySelectorAll('.chip').forEach(b => {
    const c = b.getAttribute('data-category') || '';
    b.classList.toggle('is-active', c === category);
  });
}

async function loadAndRender(category = '') {
  try {
    const items = await fetchClothes(category);
    renderClothes(items);
    setActiveButton(category);
  } catch {
    gridEl.innerHTML = `<p class="muted">Kunne ikke hente plagg.</p>`;
  }
}

filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  currentCategory = btn.getAttribute('data-category') || '';
  loadAndRender(currentCategory);
});

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// --- Initial ---
loadAndRender();
