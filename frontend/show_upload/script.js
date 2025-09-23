const API = "http://127.0.0.1:8000";

// elements
const nameInput   = document.getElementById("name");
const fileInput   = document.getElementById("file");
const processBtn  = document.getElementById("process-btn");
const resultBox   = document.getElementById("result");
const previewImg  = document.getElementById("preview");
const saveBtn     = document.getElementById("save-btn");
const statusP     = document.getElementById("status");

// holder på siste prosesserte PNG
let processedBlob = null;

processBtn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    alert("Velg en bildefil først.");
    return;
  }
  statusP.textContent = "Kjører bakgrunnsfjerner…";
  processedBlob = null;

  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/remove-bg`, { method: "POST", body: fd });
    if (!res.ok) {
      console.error(await res.text());
      alert("Feil: klarte ikke å fjerne bakgrunn.");
      statusP.textContent = "";
      return;
    }

    processedBlob = await res.blob(); // PNG
    const url = URL.createObjectURL(processedBlob);
    previewImg.src = url;
    resultBox.classList.remove("hidden");
    statusP.textContent = "Forhåndsvisning klar. Trykk “Lagre i database”.";
  } catch (err) {
    console.error(err);
    alert("Uventet feil under prosessering.");
    statusP.textContent = "";
  }
});

saveBtn.addEventListener("click", async () => {
  if (!processedBlob) {
    alert("Kjør bakgrunnsfjerner først.");
    return;
  }
  const name = (nameInput.value || "").trim();
  if (!name) {
    alert("Skriv inn navn på plagget.");
    return;
  }

  try {
    statusP.textContent = "Lagrer i database…";
    const fd = new FormData();
    fd.append("name", name);
    fd.append("file", processedBlob, "result.png");

    const res = await fetch(`${API}/clothes/`, { method: "POST", body: fd });
    if (!res.ok) {
      console.error(await res.text());
      alert("Kunne ikke lagre i databasen.");
      statusP.textContent = "";
      return;
    }
    const data = await res.json();
    statusP.textContent = `Lagret! ID: ${data.id}. Går til “Se klær”…`;
    // gå til oversikten
    window.location.href = "/clothes";
  } catch (err) {
    console.error(err);
    alert("Uventet feil under lagring.");
    statusP.textContent = "";
  }
});

