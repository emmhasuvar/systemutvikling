const API = 'http://127.0.0.1:8000';
const grid = document.getElementById('grid');

console.log('[clothes] script loaded, grid:', !!grid);

/* ---------- fetch & render ---------- */
async function loadClothes() {
  if (!grid) return console.error('[clothes] #grid not found');
  grid.textContent = 'Laster…';
  try {
    const res = await fetch(`${API}/clothes/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!items.length) { grid.textContent = 'Ingen klær lagret ennå.'; return; }

    grid.innerHTML = items.map(c => `
      <figure class="card" data-id="${c.id}">
        <img src="${API}${c.image_url}" alt="Plagg" loading="lazy" />
        <button class="del" type="button" data-id="${c.id}" aria-label="Slett">🗑️</button>
      </figure>
    `).join('');
    console.log('[clothes] rendered', items.length, 'items');
  } catch (e) {
    console.error('[clothes] fetch error', e);
    grid.textContent = 'Kunne ikke hente klær.';
  }
}

/* ---------- cute confirm modal ---------- */
function showConfirm(message) {
  try {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.innerHTML = `
      <div class="popup" role="dialog" aria-modal="true">
        <p>${message}</p>
        <div class="popup__actions">
          <button class="popup__btn popup__btn--cancel" type="button">Avbryt</button>
          <button class="popup__btn popup__btn--delete" type="button">Slett</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    return new Promise(resolve => {
      overlay.querySelector('.popup__btn--cancel').onclick = () => {
        overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 180); resolve(false);
      };
      overlay.querySelector('.popup__btn--delete').onclick = () => {
        overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 180); resolve(true);
      };
    });
  } catch (e) {
    console.warn('[clothes] modal failed, falling back to native confirm', e);
    return Promise.resolve(confirm(message));
  }
}

/* ---------- delete flow ---------- */
async function handleDelete(id, btn) {
  const ok = await showConfirm('Er du sikker på at du vil slette dette plagget?');
  if (!ok) return;

  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = '…';

  try {
    const res = await fetch(`${API}/clothes/${id}`, { method: 'DELETE' });
    if (!(res.ok || res.status === 204)) throw new Error(`HTTP ${res.status}`);

    const card = btn.closest('.card');
    if (card) card.remove();
    if (!grid.querySelector('.card')) grid.textContent = 'Ingen klær lagret ennå.';
  } catch (e) {
    console.error('[clothes] delete error', e);
    alert('Kunne ikke slette.');
    btn.disabled = false;
    btn.textContent = prev;
  }
}

/* ---------- event delegation (with logs) ---------- */
if (grid) {
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button.del');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) { console.warn('[clothes] delete button without data-id'); return; }
    console.log('[clothes] delete click id=', id);
    handleDelete(id, btn);
  });
  (function ensurePopupStyles(){
  if (document.getElementById('popup-styles')) return;
  const style = document.createElement('style');
  style.id = 'popup-styles';
  style.textContent = `
    .popup-overlay{position:fixed;inset:0;display:flex;justify-content:center;align-items:center;
      background:rgba(0,0,0,.45);z-index:9999;opacity:0;pointer-events:none;transition:opacity .2s ease}
    .popup-overlay.show{opacity:1;pointer-events:auto}
    .popup{background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:12px;
      padding:1.25rem 1.5rem;text-align:center;max-width:320px;width:min(92vw,320px);
      box-shadow:0 10px 30px rgba(2,6,23,.15);animation:popupFadeIn .22s ease}
    .popup p{margin:0 0 1rem;font-size:1rem}
    .popup__actions{display:flex;gap:.6rem;justify-content:center}
    .popup__btn{padding:.5rem 1rem;border-radius:10px;border:none;cursor:pointer;font-size:.95rem}
    .popup__btn--cancel{background:#e2e8f0}.popup__btn--cancel:hover{background:#cbd5e1}
    .popup__btn--delete{background:#ef4444;color:#fff}.popup__btn--delete:hover{background:#dc2626}
    @keyframes popupFadeIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
  `;
  document.head.appendChild(style);
})();
}

document.addEventListener('DOMContentLoaded', loadClothes);
