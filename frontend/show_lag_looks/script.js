
      // ----- config -----
      const API_BASE = '/api';          // endre hvis du ikke la router under /api
      const CLOTHES_URL = API_BASE + '/clothes';
      const LOOKS_URL   = API_BASE + '/looks';

      // ----- state -----
      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d', { alpha: false });
      const hint = document.getElementById('hint');
      const titleInput = document.getElementById('title');
      let sprites = [];       // {id, img, x, y, w, h, selected}
      let dragging = null;    // index of sprite being dragged
      let last = {x:0, y:0};
      let shiftDown = false;

      // ----- resize canvas to CSS size -----
      function fitCanvasToDisplay() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.scale(dpr, dpr);
        render();
      }
      new ResizeObserver(fitCanvasToDisplay).observe(canvas);

      // ----- load clothes and render thumbnails -----
      async function loadClothes() {
        const res = await fetch(CLOTHES_URL);
        const items = await res.json(); // expect [{id, image_url, ...}]
        const list = document.getElementById('clothesList');
        list.innerHTML = '';
        items.forEach(it => {
          const card = document.createElement('div');
          card.className = 'card';
          const img = document.createElement('img');
          img.className = 'thumb';
          img.src = it.image_url;
          img.alt = it.name || ('Cloth ' + it.id);
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.textContent = 'Legg til';
          btn.onclick = () => addSprite(it);
          card.appendChild(img);
          card.appendChild(document.createTextNode(it.name || ('Plagg #' + it.id)));
          card.appendChild(btn);
          list.appendChild(card);
        });
      }

      // ----- add sprite to canvas -----
      function addSprite(item) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // initial size capped to 220px width, keep aspect
          const maxW = 220;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(40, img.width * scale);
          const h = Math.max(40, img.height * scale);
          const x = 40 + Math.random()*60;
          const y = 40 + Math.random()*60;
          sprites.push({ id: item.id, img, x, y, w, h, selected:false });
          hint.style.display = 'none';
          render();
        };
        img.src = item.image_url;
      }

      // ----- draw -----
      function render() {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0,0, rect.width, rect.height);
        // bg
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0, rect.width, rect.height);

        // draw each sprite
        sprites.forEach(s => {
          ctx.save();
          ctx.drawImage(s.img, s.x, s.y, s.w, s.h);
          if (s.selected) {
            ctx.strokeStyle = '#888';
            ctx.setLineDash([6,4]);
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x, s.y, s.w, s.h);
          }
          ctx.restore();
        });
      }

      // ----- hit test -----
      function pick(x, y) {
        for (let i = sprites.length - 1; i >= 0; i--) {
          const s = sprites[i];
          if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
            return i;
          }
        }
        return -1;
      }

      // ----- mouse handlers -----
      function toLocal(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }

      canvas.addEventListener('mousedown', (e) => {
        const p = toLocal(e);
        last = p;
        const i = pick(p.x, p.y);
        sprites.forEach(s => s.selected = false);
        if (i >= 0) {
          sprites[i].selected = true;
          dragging = i;
          // bring to top
          const s = sprites.splice(i,1)[0];
          sprites.push(s);
          dragging = sprites.length - 1;
        } else {
          dragging = null;
        }
        render();
      });

      canvas.addEventListener('mousemove', (e) => {
        if (dragging == null) return;
        const p = toLocal(e);
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        const s = sprites[dragging];
        if (shiftDown) {
          // scale uniformly with dy
          const k = 1 + dy / 150;
          const cx = s.x + s.w/2, cy = s.y + s.h/2;
          const nw = Math.max(20, s.w * k);
          const nh = Math.max(20, s.h * k);
          s.x = cx - nw/2; s.y = cy - nh/2; s.w = nw; s.h = nh;
        } else {
          s.x += dx; s.y += dy;
        }
        last = p;
        render();
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

      // ----- actions -----
      document.getElementById('btnClear').onclick = () => { sprites = []; hint.style.display=''; render(); };

      document.getElementById('btnSave').onclick = async () => {
        if (!sprites.length) return alert('Legg til minst ett plagg');
        const title = titleInput.value.trim() || null;

        // Export to JPG
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));

        // Collect cloth IDs present on canvas (no duplicates)
        const ids = [...new Set(sprites.map(s => s.id))];

        const fd = new FormData();
        fd.append('file', blob, 'look.jpg');
        fd.append('cloth_ids', JSON.stringify(ids));
        if (title) fd.append('title', title);

        const r = await fetch(LOOKS_URL + '/', { method: 'POST', body: fd });
        if (!r.ok) {
          const msg = await r.text();
          return alert('Kunne ikke lagre look: ' + msg);
        }
        const saved = await r.json();
        alert('Lagret! ID ' + saved.id);
      };

      // boot
      fitCanvasToDisplay();
      loadClothes().catch(err => {
        console.error(err);
        document.getElementById('clothesList').innerHTML = '<p class="small" style="padding:12px;color:#a00;">Kunne ikke hente plagg.</p>';
      });
