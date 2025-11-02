// --------------------------------------------------
// Base
// --------------------------------------------------
const API        = `${location.origin}/api`;
const filtersEl  = document.getElementById("category-filters");
const gridEl     = document.getElementById("clothes-grid");
const openMagBtn = document.getElementById("openMagazine");

// simple in-memory state for looks in Magasin
const state = { looks: [] };

// Safety: remove any stale overlays from previous reloads
document.querySelectorAll(".mag-overlay, .edit-popup").forEach(el => el.remove());

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function escapeHtml(s = "") {
  return s.replaceAll("&","&amp;")
          .replaceAll("<","&lt;")
          .replaceAll(">","&gt;")
          .replaceAll('"',"&quot;")
          .replaceAll("'","&#39;");
}

/** Normalize any server path to a web URL under /media if needed */
function normalizeMediaPath(u = "") {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;                 // absolute
  const idx = u.indexOf("/media/");                      // contains /media/
  if (idx !== -1) return u.slice(idx);
  if (u.startsWith("media/")) return "/" + u;            // starts with media/
  // fallback: basename
  const qpos = u.indexOf("?"); const bare = qpos >= 0 ? u.slice(0, qpos) : u;
  const parts = bare.split(/[\\/]/); const fname = parts.pop() || "";
  return fname ? `/media/${fname}` : "";
}

/** If image fails, retry with basename and absolute origin once */
function attachImageFallback(img) {
  let triedBasename = false, triedAbsolute = false;
  img.addEventListener("error", () => {
    const cur = img.getAttribute("src") || "";
    const base = cur.split(/[\\/]/).pop() || "";
    if (!triedBasename && base && !cur.endsWith(base)) {
      triedBasename = true; img.src = `/media/${base}`; return;
    }
    if (!triedAbsolute && cur && !/^https?:\/\//i.test(cur)) {
      triedAbsolute = true; img.src = `${location.origin}${cur.startsWith("/") ? "" : "/"}${cur}`; return;
    }
  });
}

// --------------------------------------------------
// Clothes grid
// --------------------------------------------------
async function fetchClothes(category = "") {
  const url = category ? `${API}/clothes/?category=${encodeURIComponent(category)}`
                       : `${API}/clothes/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch clothes failed: ${res.status}`);
  return res.json();
}

function renderClothes(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    gridEl.innerHTML = `
      <div class="card" style="padding:1rem;">
        <p class="muted">Ingen plagg i denne kategorien enda.</p>
      </div>`;
    return;
  }

  gridEl.innerHTML = items.map(item => {
    const src = normalizeMediaPath(item.image_url || "");
    return `
      <article class="product-card" tabindex="0"
               data-id="${item.id}" data-name="${escapeHtml(item.name || "")}" data-category="${escapeHtml(item.category || "")}">
        <img class="product-img" src="${src}" alt="${escapeHtml(item.name || "")}" />
        <div class="product-info">
          <div class="product-name">${escapeHtml(item.name || "")}</div>
          <div class="product-category">${escapeHtml(item.category || "")}</div>
        </div>
      </article>`;
  }).join("");

  gridEl.querySelectorAll("img.product-img").forEach(attachImageFallback);
}

async function loadClothes(category = "") {
  try {
    const items = await fetchClothes(category);
    renderClothes(items);
  } catch (err) {
    console.error("[clothes] error:", err);
    gridEl.innerHTML = `
      <div class="card" style="padding:1rem;">
        <p class="muted">Klarte ikke å hente klær akkurat nå.</p>
      </div>`;
  }
}

// Filters
if (filtersEl) {
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const category = btn.getAttribute("data-category") || "";
    filtersEl.querySelectorAll(".chip").forEach(b => b.classList.toggle("is-active", b === btn));
    loadClothes(category);
  });
}

// --------------------------------------------------
// Edit popup for CLOTHES (rename, recategorize, delete)
// --------------------------------------------------
function openEditPopup({ id, name, category, imgSrc }) {
  // remove existing popup if any
  document.querySelectorAll(".edit-popup").forEach(el => el.remove());

  const wrap = document.createElement("div");
  wrap.className = "edit-popup";
  wrap.innerHTML = `
    <div class="edit-popup__content" role="dialog" aria-modal="true">
      <img class="edit-popup__img" src="${imgSrc}" alt="${escapeHtml(name)}"/>
      <label>Navn
        <input id="ep-name" class="modal__input" type="text" value="${escapeHtml(name)}" />
      </label>
      <label>Kategori
        <select id="ep-cat" class="modal__input">
          <option value="topp">topp</option>
          <option value="underdel">underdel</option>
          <option value="sko">sko</option>
          <option value="tilbehør">tilbehør</option>
        </select>
      </label>
      <div class="edit-popup__actions">
        <button id="ep-delete" class="button button--danger">Slett</button>
        <div>
          <button id="ep-cancel" class="button">Avbryt</button>
          <button id="ep-save" class="button button--primary">Lagre</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.classList.add("show");

  // set current category
  const catSel = wrap.querySelector("#ep-cat");
  catSel.value = category || "topp";

  const close = () => wrap.remove();
  const imgEl = wrap.querySelector("img"); attachImageFallback(imgEl);

  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector("#ep-cancel").addEventListener("click", close);

  // Save -> PUT /api/clothes/{id} as FormData(name, category)
  wrap.querySelector("#ep-save").addEventListener("click", async () => {
    const newName = wrap.querySelector("#ep-name").value.trim();
    const newCat  = catSel.value;
    const fd = new FormData();
    fd.append("name", newName);
    fd.append("category", newCat);
    try {
      const res = await fetch(`${API}/clothes/${id}`, { method: "PUT", body: fd });
      if (!res.ok) throw new Error(await res.text());
      close();
      // reload current filter set
      const activeBtn = filtersEl?.querySelector(".chip.is-active");
      const cat = activeBtn ? activeBtn.getAttribute("data-category") || "" : "";
      loadClothes(cat);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Kunne ikke lagre endringer.");
    }
  });

  // Delete (with confirm) -> DELETE /api/clothes/{id}
  wrap.querySelector("#ep-delete").addEventListener("click", async () => {
    if (!confirm("Er du sikker på at du vil slette dette plagget?")) return;
    try {
      const res = await fetch(`${API}/clothes/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      close();
      const activeBtn = filtersEl?.querySelector(".chip.is-active");
      const cat = activeBtn ? activeBtn.getAttribute("data-category") || "" : "";
      loadClothes(cat);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Kunne ikke slette plagget.");
    }
  });
}

// Delegate clicks from grid to open popup
gridEl.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card || !gridEl.contains(card)) return;
  const id   = card.getAttribute("data-id");
  const name = card.getAttribute("data-name") || "";
  const cat  = card.getAttribute("data-category") || "topp";
  const img  = card.querySelector("img")?.getAttribute("src") || "";
  openEditPopup({ id, name, category: cat, imgSrc: img });
});

// --------------------------------------------------
// Magasin (overlay) — view, rename, delete LOOKS
// --------------------------------------------------
async function fetchLooks() {
  const res = await fetch(`${API}/looks`);
  if (!res.ok) throw new Error(`Fetch looks failed: ${res.status}`);
  return res.json();
}

function renderLooksGrid(looks) {
  const grid = document.getElementById("magGrid");
  if (!grid) return;

  grid.innerHTML = looks.map(l => {
    const src = normalizeMediaPath(l.image_url || "");
    const title = l.title || `Look #${l.id}`;
    const date  = l.created_at ? new Date(l.created_at).toLocaleDateString() : "";
    return `
      <article class="mag-card" data-look-id="${l.id}">
        <img class="mag-img" src="${src}" alt="${escapeHtml(title)}" />
        <div class="mag-meta">
          <div class="mag-title">${escapeHtml(title)}</div>
          <div class="mag-date">${escapeHtml(date)}</div>
        </div>
        <button class="mag-edit" title="Rediger">✎</button>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("img.mag-img").forEach(attachImageFallback);

  grid.querySelectorAll(".mag-card").forEach(card => {
    const id = Number(card.getAttribute("data-look-id"));
    const look = state.looks.find(x => x.id === id);

    // click anywhere opens editor
    card.addEventListener("click", () => openLookEditor(look));

    // make sure the small button doesn't double-bubble
    card.querySelector(".mag-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      openLookEditor(look);
    });
  });
}

function openLookEditor(look) {
  // remove any open editor
  document.querySelectorAll(".edit-popup").forEach(el => el.remove());

  const wrap = document.createElement("div");
  wrap.className = "edit-popup show";
  wrap.innerHTML = `
    <div class="edit-popup__content" role="dialog" aria-modal="true" aria-label="Rediger look">
      <img class="edit-popup__img" src="${normalizeMediaPath(look.image_url || '')}" alt="" />
      <label class="muted" for="look-title">Tittel</label>
      <input id="look-title" class="modal__input" type="text" value="${escapeHtml(look.title || '')}" placeholder="Gi looken et navn" />
      <div class="edit-popup__actions">
        <button class="button button--danger" data-act="delete">Slett</button>
        <span></span>
        <button class="button" data-act="cancel">Avbryt</button>
        <button class="button button--primary" data-act="save">Lagre</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const img = wrap.querySelector("img"); attachImageFallback(img);

  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-act="cancel"]').onclick = close;

  wrap.querySelector('[data-act="save"]').onclick = async () => {
    const title = /** @type {HTMLInputElement} */(wrap.querySelector('#look-title')).value.trim() || null;
    const fd = new FormData();
    if (title !== null) fd.append('title', title);
    try {
      const r = await fetch(`${API}/looks/${look.id}`, { method: 'PUT', body: fd });
      if (!r.ok) throw new Error(await r.text());
      const updated = await r.json();
      // refresh local state + UI
      const idx = state.looks.findIndex(x => x.id === look.id);
      if (idx >= 0) state.looks[idx] = updated;
      renderLooksGrid(state.looks);
      close();
    } catch (err) {
      console.error(err);
      alert('Kunne ikke lagre tittel.');
    }
  };

  wrap.querySelector('[data-act="delete"]').onclick = async () => {
    if (!confirm('Er du sikker på at du vil slette denne looken?')) return;
    try {
      const r = await fetch(`${API}/looks/${look.id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) throw new Error(await r.text());
      state.looks = state.looks.filter(x => x.id !== look.id);
      renderLooksGrid(state.looks);
      close();
    } catch (err) {
      console.error(err);
      alert('Kunne ikke slette look.');
    }
  };
}

function openMagazine() {
  // Create overlay fresh every time
  const overlay = document.createElement("div");
  overlay.className = "mag-overlay";
  overlay.innerHTML = `
    <div class="mag-sheet">
      <div class="mag-head">
        <strong>Magasin</strong>
        <span class="mag-spacer"></span>
        <button class="mag-close">Lukk</button>
      </div>
      <div class="mag-grid" id="magGrid">
        <p class="muted">Laster...</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const grid = overlay.querySelector("#magGrid");
  const closeBtn = overlay.querySelector(".mag-close");
  const close = () => overlay.remove();
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  fetchLooks()
    .then(list => {
      state.looks = Array.isArray(list) ? list : [];
      if (state.looks.length === 0) {
        grid.innerHTML = `<p class="muted" style="text-align:center;">Ingen looks lagret enda.</p>`;
        return;
      }
      renderLooksGrid(state.looks);
    })
    .catch(err => {
      console.error("[looks] error:", err);
      grid.innerHTML = `<p class="muted" style="text-align:center;">Feil ved lasting av looks.</p>`;
    });
}

if (openMagBtn) openMagBtn.addEventListener("click", openMagazine);

// --------------------------------------------------
// Init
// --------------------------------------------------
loadClothes("");
