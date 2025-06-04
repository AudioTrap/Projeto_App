const modelURL = "https://teachablemachine.withgoogle.com/models/I9hL16mkw/";
let recognizer;
let map;
let markers = [];

// Carrega modelo
async function createModel() {
  const checkpointURL = modelURL + "model.json";
  const metadataURL = modelURL + "metadata.json";

  recognizer = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await recognizer.ensureModelLoaded();
}

// Inicia detecção
async function init() {
  await createModel();
  const classLabels = recognizer.wordLabels();

  recognizer.listen(result => {
    const scores = result.scores;
    const index = scores.indexOf(Math.max(...scores));
    const label = classLabels[index];
    const confidence = scores[index];

    const output = document.getElementById("audio-alert");
    const alertImage = document.getElementById("alert-image");

    if (confidence > 0.75) {
      let emoji = "🔊";
      let imageSrc = "imagens/sirene.png";

      if (label.includes("cachorro")) {
        emoji = "🐶";
        imageSrc = "imagens/cachorro.png";
      } else if (label.includes("buzina")) {
        emoji = "📢";
        imageSrc = "imagens/buzina.png";
      } else if (label.includes("palmas")) {
        emoji = "👏";
        imageSrc = "imagens/palmas.png";
      } else if (label.includes("estalo")) {
        emoji = "⚡";
        imageSrc = "imagens/estalo.png";
      } else if (label.includes("alarme")) {
        emoji = "🚨";
        imageSrc = "imagens/sirene.png";
      }

      output.innerText = `${emoji} ${label} (${(confidence * 100).toFixed(1)}%)`;
      alertImage.src = imageSrc;
      alertImage.style.display = "block";
    } else {
      output.innerText = "Aguardando som...";
      alertImage.style.display = "none";
    }

  }, {
    includeSpectrogram: true,
    probabilityThreshold: 0.75,
    invokeCallbackOnNoiseAndUnknown: true,
    overlapFactor: 0.5,
  });
}

// Mapa
function initMap() {
  map = L.map('map').setView([-10.2, -62.8], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

// Limpa marcadores
function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

// Geocodifica endereço
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
  } catch (err) {
    console.error("Erro ao buscar endereço:", err);
  }
  return null;
}

// Calcula e exibe rota
async function calculateRoute() {
  const origem = document.getElementById("start").value.trim();
  const destino = document.getElementById("end").value.trim();

  if (!origem || !destino) {
    alert("Por favor, preencha origem e destino.");
    return;
  }

  clearMarkers();

  const origemCoord = await geocode(origem);
  const destinoCoord = await geocode(destino);

  if (!origemCoord || !destinoCoord) {
    alert("Endereço(s) não encontrado(s).");
    return;
  }

  const group = new L.featureGroup([
    L.marker([origemCoord.lat, origemCoord.lon]).bindPopup(`Origem: ${origemCoord.display_name}`),
    L.marker([destinoCoord.lat, destinoCoord.lon]).bindPopup(`Destino: ${destinoCoord.display_name}`)
  ]);
  group.addTo(map);
  map.fitBounds(group.getBounds(), { padding: [50, 50] });

  markers.push(...group.getLayers());

  mostrarFeedbacks(destino);
}

// Feedbacks simulados
function mostrarFeedbacks(destino) {
  const feedbacks = {
    "Hospital Municipal": ["Ambiente tranquilo", "Sirene constante", "Boa sinalização"],
    "Shopping Center": ["Muito barulho", "Latidos frequentes", "Fácil acesso"]
  };

  const lista = document.getElementById("lista-feedbacks");
  lista.innerHTML = "";

  const comentarios = feedbacks[destino] || ["Sem feedbacks cadastrados."];
  comentarios.forEach(msg => {
    const li = document.createElement("li");
    li.textContent = msg;
    lista.appendChild(li);
  });
}

// Inicializa mapa
window.addEventListener("load", initMap);
