// ---------- API base ----------
const API_BASE   = `${location.origin}/api`;
const CLOTHES_EP = `${API_BASE}/clothes`;
const LOOKS_EP   = `${API_BASE}/looks`;

// ---------- DOM ----------
const filtersEl = document.getElementById('category-filters');
const canvas   = document.getElementById('stage');
const ctx      = canvas.getContext('2d', { alpha: false });
const listEl   = document.getElementById('clothesList');
const hintEl   = document.getElementById('hint');
const titleEl  = document.getElementById('title');
const btnSave  = document.getElementById('btnSave');
const btnClear = document.getElementById('btnClear');

// ---------- State ----------
let sprites = [];
let dragging = null;
let last = { x: 0, y: 0 };
let shiftDown = false;
let currentCategory = ''; // '' = alle

// ---------- Helpers ----------
function fitCanvasToDisplay() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);
  render();
}
new ResizeObserver(fitCanvasToDisplay).observe(canvas);

function render() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);
  sprites.forEach(s => {
    ctx.drawImage(s.img, s.x, s.y, s.w, s.h);
    if (s.selected) {
      ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle = '#9ca3af';
      ctx.strokeRect(s.x, s.y, s.w, s.h); ctx.restore();
    }
  });
}
function pick(x,y){ for(let i=sprites.length-1;i>=0;i--){const s=sprites[i];if(x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h)return i;} return -1; }
function toLocal(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }

function addSpriteFromCloth(cloth) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const maxW = 220;
    const scale = Math.min(1, maxW / img.width);
    const w = Math.max(40, img.width * scale);
    const h = Math.max(40, img.height * scale);
    const x = 40 + Math.random()*60;
    const y = 40 + Math.random()*60;
    sprites.push({ id: cloth.id, img, x, y, w, h, selected:false });
    hintEl.style.display = 'none';
    render();
  };
  img.src = cloth.image_url;
}

function makeClothCard(cloth) {
  const wrap = document.createElement('div');
  wrap.className = 'looks__card';
  const img = document.createElement('img');
  img.className = 'looks__thumb';
  img.src = cloth.image_url;
  img.alt = cloth.name || `Plagg #${cloth.id}`;
  const title = document.createElement('div');
  title.className = 'looks__cardTitle';
  title.textContent = cloth.name || `Plagg #${cloth.id}`;
  const btn = document.createElement('button');
  btn.className = 'looks__btn';
  btn.textContent = 'Legg til';
  btn.addEventListener('click', () => addSpriteFromCloth(cloth));
  wrap.append(img, title, btn);
  return wrap;
}

// ---------- Data ----------
async function fetchClothes(category='') {
  const url = category ? `${CLOTHES_EP}/?category=${encodeURIComponent(category)}` : CLOTHES_EP;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function loadClothes(category='') {
  try {
    const items = await fetchClothes(category);
    console.log('Fetched clothes:', items);
    listEl.innerHTML = '';
    items.forEach(it => listEl.appendChild(makeClothCard(it)));
  } catch (err) {
    console.error('loadClothes() error:', err);
    listEl.innerHTML = '<p class="muted" style="padding:12px;">Kunne ikke hente plagg.</p>';
  }
}

// ---------- Filter UI ----------
function setActiveChip(category) {
  if (!filtersEl) return;
  filtersEl.querySelectorAll('.chip').forEach(b => {
    const c = b.getAttribute('data-category') || '';
    b.classList.toggle('is-active', c === category);
  });
}
if (filtersEl) {
  filtersEl.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'BUTTON') return;
    currentCategory = t.getAttribute('data-category') || '';
    setActiveChip(currentCategory);
    loadClothes(currentCategory);
  });
}

// ---------- Canvas interactions ----------
canvas.addEventListener('mousedown', (e) => {
  const p = toLocal(e); last = p;
  const i = pick(p.x, p.y);
  sprites.forEach(s => s.selected = false);
  if (i >= 0) {
    sprites[i].selected = true;
    const s = sprites.splice(i,1)[0];
    sprites.push(s);
    dragging = sprites.length-1;
  } else dragging = null;
  render();
});
canvas.addEventListener('mousemove', (e) => {
  if (dragging == null) return;
  const p = toLocal(e); const s = sprites[dragging];
  if (shiftDown) {
    const dy=p.y-last.y; const k=1+dy/150;
    const cx=s.x+s.w/2, cy=s.y+s.h/2;
    const nw=Math.max(20,s.w*k), nh=Math.max(20,s.h*k);
    s.x=cx-nw/2; s.y=cy-nh/2; s.w=nw; s.h=nh;
  } else { s.x += p.x-last.x; s.y += p.y-last.y; }
  last = p; render();
});
window.addEventListener('mouseup', () => dragging = null);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') shiftDown = true;
  if (e.key === 'Backspace' || e.key === 'Delete') {
    const i = sprites.findIndex(s => s.selected);
    if (i >= 0) { sprites.splice(i,1); render(); }
  }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') shiftDown = false; });

// ---------- Buttons ----------
btnClear.addEventListener('click', () => { sprites = []; hintEl.style.display=''; render(); });
btnSave.addEventListener('click', async () => {
  if (!sprites.length) return alert('Legg til minst ett plagg');
  const title = (titleEl.value || '').trim() || null;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  const ids = [...new Set(sprites.map(s => s.id))];
  const fd = new FormData();
  fd.append('file', blob, 'look.jpg');
  fd.append('cloth_ids', JSON.stringify(ids));
  if (title) fd.append('title', title);
  try {
    const r = await fetch(LOOKS_EP, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(await r.text());
    const saved = await r.json();
    alert('Lagret! ID: ' + saved.id);
  } catch (err) {
    console.error(err);
    alert('Kunne ikke lagre look.');
  }
});

// ---------- boot ----------
fitCanvasToDisplay();
setActiveChip(currentCategory);
loadClothes(currentCategory);
