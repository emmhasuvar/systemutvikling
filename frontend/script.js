const API = "http://127.0.0.1:8000";
const content = document.getElementById("content");

// Navigasjon
document.getElementById("home-btn").addEventListener("click", showHome);
document.getElementById("upload-btn").addEventListener("click", showUpload);
document.getElementById("view-btn").addEventListener("click", showClothes);

function showHome() {
  content.innerHTML = `<p>Velg en handling over!</p>`;
}

function showUpload() {
  content.innerHTML = `
    <h2>Last opp plagg</h2>
    <form id="upload-form">
      <input type="text" name="name" placeholder="Navn på plagg" required />
      <input type="file" name="file" accept="image/*" required />
      <button type="submit">Kjør bakgrunnsfjerner</button>
    </form>
    <div id="preview"></div>
  `;

  document.getElementById("upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const file = fd.get("file");
    if (!file) return;

    // 1. Send bildet til /remove-bg
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/remove-bg`, { method: "POST", body: formData });
    if (!res.ok) {
      alert("Feil under fjerning av bakgrunn");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // 2. Vis forhåndsvisning + Lagre-knapp
    const preview = document.getElementById("preview");
    preview.innerHTML = `
      <h3>Resultat</h3>
      <img src="${url}" width="200" />
      <br/>
      <button id="save-btn">Lagre i database</button>
    `;

    // 3. Når brukeren klikker "Lagre", send PNG-en til /clothes/
    document.getElementById("save-btn").addEventListener("click", async () => {
      const clothForm = new FormData();
      clothForm.append("name", fd.get("name"));
      clothForm.append("file", blob, "result.png");

      const saveRes = await fetch(`${API}/clothes/`, { method: "POST", body: clothForm });
      const data = await saveRes.json();
      alert("Lagret! ID: " + data.id);
    });
  });
}

async function showClothes() {
  content.innerHTML = `<h2>Dine klær</h2><div id="clothes-grid"></div>`;
  const grid = document.getElementById("clothes-grid");

  const res = await fetch(`${API}/clothes/`);
  const clothes = await res.json();

  if (clothes.length === 0) {
    grid.innerHTML = "<p>Ingen klær lagret ennå.</p>";
    return;
  }

  grid.innerHTML = clothes
    .map(c => `
      <div class="item">
        <img src="${API}${c.image_url}" width="150" />
        <p>${c.name}</p>
      </div>
    `)
    .join("");
}

// Start på "Hjem"
showHome();
