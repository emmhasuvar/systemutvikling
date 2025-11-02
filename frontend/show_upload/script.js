const API = 'http://127.0.0.1:8000'; // change to location.origin if server and static share host/port

/* ==============================
   Mobile nav toggle
============================== */
(() => {
  const toggle = document.querySelector('[data-js="menu-toggle"]');
  const nav = document.querySelector('[data-js="nav"]');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();

/* ==============================
   Upload / Preview / Save
============================== */
(() => {
  if (window.__upload_bound) return;
  window.__upload_bound = true;

  // Elements
  const dropzone   = document.getElementById('dropzone');
  const fileInput  = document.getElementById('file');
  const nameInput  = document.getElementById('name');
  const processBtn = document.getElementById('process-btn');
  const resetBtn   = document.getElementById('reset-btn');
  const resultBox  = document.getElementById('result');
  const previewImg = document.getElementById('preview');
  const saveBtn    = document.getElementById('save-btn');
  const statusP    = document.getElementById('status');
  const categorySelect = document.getElementById('category'); // NYTT

  if (!dropzone || !fileInput || !processBtn || !resultBox || !previewImg || !saveBtn || !statusP) {
    console.warn('[upload] Mangler forventede DOM-elementer — sjekk HTML.');
    return;
  }

  // State
  let processedBlob = null;
  const MAX_FILE_MB = 10;

  function isImage(file) {
    return file && file.type && file.type.startsWith('image/');
  }
  function isTooBig(file) {
    return file && file.size > MAX_FILE_MB * 1024 * 1024;
  }

  function showPreview(file) {
    if (!file) return;
    if (!isImage(file)) {
      statusP.textContent = 'Velg en bildefil (JPG/PNG).';
      return;
    }
    if (isTooBig(file)) {
      statusP.textContent = `Filen er for stor (maks ${MAX_FILE_MB} MB).`;
      return;
    }
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    resultBox.classList.remove('hidden');
    statusP.textContent = 'Forhåndsvisning klar. Du kan nå kjøre bakgrunnsfjerner.';
    processedBlob = null;
  }

  function clearPreview() {
    previewImg.removeAttribute('src');
    resultBox.classList.add('hidden');
    statusP.textContent = '';
    processedBlob = null;
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target === fileInput) return;
    fileInput.click();
  });
  fileInput.addEventListener('click', (e) => { e.stopPropagation(); });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) showPreview(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('is-dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      showPreview(file);
    }
  });

  // Process (remove background)
  processBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) { alert('Velg en bildefil først.'); return; }
    if (!isImage(file)) { alert('Filen må være et bilde (JPG/PNG).'); return; }
    if (isTooBig(file)) { alert(`Filen er for stor (maks ${MAX_FILE_MB} MB).`); return; }

    statusP.textContent = 'Kjører bakgrunnsfjerner…';
    processedBlob = null;

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API}/remove-bg`, { method: 'POST', body: fd });
      if (!res.ok) {
        console.error('[remove-bg] HTTP', res.status, await res.text());
        alert('Feil: klarte ikke å fjerne bakgrunn.');
        statusP.textContent = '';
        return;
      }

      processedBlob = await res.blob(); // PNG
      const url = URL.createObjectURL(processedBlob);
      previewImg.src = url;
      resultBox.classList.remove('hidden');
      statusP.textContent = 'Forhåndsvisning klar. Trykk «Lagre i database».';
    } catch (err) {
      console.error('[remove-bg] Uventet feil', err);
      alert('Uventet feil under prosessering.');
      statusP.textContent = '';
    }
  });

  // Save (POST /clothes/)
  saveBtn.addEventListener('click', async () => {
    if (!processedBlob) { alert('Kjør bakgrunnsfjerner først.'); return; }

    const name = (nameInput.value || '').trim();
    if (!name) { alert('Skriv inn navn på plagget.'); return; }

    // NYTT: enkel validering av kategori
    const category = categorySelect ? categorySelect.value : '';
    if (!category) {
      alert('Velg kategori.');
      return;
    }

    try {
      statusP.textContent = 'Lagrer i database…';

      const fd = new FormData();
      fd.append('name', name);
      fd.append('category', category);             // NYTT: sendes til backend
      fd.append('file', processedBlob, 'result.png');

      const res = await fetch(`${API}/clothes/`, { method: 'POST', body: fd });
      if (!res.ok) {
        console.error('[clothes/] HTTP', res.status, await res.text());
        alert('Kunne ikke lagre i databasen.');
        statusP.textContent = '';
        return;
      }

      const data = await res.json();
      statusP.textContent = `Lagret! ID: ${data.id}. Går til «Se klær»…`;
      window.location.href = '/clothes';
    } catch (err) {
      console.error('[clothes/] Uventet feil', err);
      alert('Uventet feil under lagring.');
      statusP.textContent = '';
    }
  });

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      fileInput.value = '';
      nameInput.value = '';
      if (categorySelect) categorySelect.selectedIndex = 0; // NYTT: reset kategori (valgfritt)
      clearPreview();
    });
  }
})();
