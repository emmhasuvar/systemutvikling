const API = "http://127.0.0.1:8000";

async function loadClothes() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "Laster…";

  const res = await fetch(`${API}/clothes/`);
  if (!res.ok) {
    grid.textContent = "Klarte ikke å hente klær.";
    return;
  }
  const items = await res.json();
  if (!items.length) {
    grid.textContent = "Ingen klær lagret ennå.";
    return;
  }

  grid.innerHTML = items.map(c => `
    <figure class="card">
      <img src="${API}${c.image_url}" alt="${c.name}" loading="lazy" />
      <button class="del" data-id="${c.id}">Slett</button>
    </figure>
  `).join("");

  grid.addEventListener("click", async (e) => {
    if (!e.target.matches(".del")) return;
    const id = e.target.getAttribute("data-id");
    if (!confirm("Slette dette plagget?")) return;
    const resp = await fetch(`${API}/clothes/${id}`, { method: "DELETE" });
    if (resp.status === 204) loadClothes();
    else alert("Kunne ikke slette.");
  }, { once: true });
}

document.addEventListener("DOMContentLoaded", loadClothes);
