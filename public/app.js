const photo = document.querySelector("#photo");
const preview = document.querySelector("#preview");
const previewWrap = document.querySelector("#previewWrap");
const original = document.querySelector("#original");
const result = document.querySelector("#result");
const resultCard = document.querySelector("#resultCard");
const statusCard = document.querySelector("#statusCard");
const status = document.querySelector("#status");
const generate = document.querySelector("#generate");
const advisor = document.querySelector("#advisor");
const save = document.querySelector("#save");

let objectUrl = null;

photo.addEventListener("change", () => {
  if (!photo.files[0]) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(photo.files[0]);
  preview.src = objectUrl;
  original.src = objectUrl;
  previewWrap.classList.remove("hidden");
  resultCard.classList.add("hidden");
});

async function createLook(mode) {
  if (!photo.files[0]) {
    alert("Bitte zuerst ein Foto hochladen.");
    return;
  }

  generate.disabled = advisor.disabled = true;
  statusCard.classList.remove("hidden");
  resultCard.classList.add("hidden");
  status.className = "status spinner";
  status.textContent = " Dein neuer Look wird erstellt. Das kann etwas dauern …";

  const fd = new FormData();
  fd.append("photo", photo.files[0]);
  fd.append("mode", mode);
  fd.append("hairstyle", document.querySelector("#hairstyle").value);
  fd.append("hairColor", document.querySelector("#hairColor").value);
  fd.append("outfit", document.querySelector("#outfit").value);

  try {
    const response = await fetch("/api/generate-look", { method: "POST", body: fd });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Generierung fehlgeschlagen.");

    result.src = data.image;
    save.href = data.image;
    resultCard.classList.remove("hidden");
    status.className = "status";
    status.textContent = "Fertig – vergleiche Original und neuen Look.";
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    status.className = "status";
    status.textContent = "Fehler: " + e.message;
  } finally {
    generate.disabled = advisor.disabled = false;
  }
}

generate.addEventListener("click", () => createLook("manual"));
advisor.addEventListener("click", () => createLook("advisor"));
