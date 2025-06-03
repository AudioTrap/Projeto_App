const modelURL = "https://teachablemachine.withgoogle.com/models/I9hL16mkw/";

let recognizer;
let map;
let markers = [];

// Cria o modelo de detecção de som
async function createModel() {
  const checkpointURL = modelURL + "model.json";
  const metadataURL = modelURL + "metadata.json";

  recognizer = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await recognizer.ensureModelLoaded();
}

// Inicializa o sistema de som
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

    if (label === "alarme de incêndio" && confidence > 0.75) {
      output.innerText = `🚨 Alarme de incêndio detectado (${(confidence * 100).toFixed(2)}%)`;
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

// Inicializa o mapa Leaflet
function initMap() {
  map = L.map('map').setView([-10.2, -62.8], 13); // Rondônia aproximado

  // Camada OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

// Remove todos os marcadores do mapa
function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

// Função para buscar coordenadas usando a API Nominatim (OpenStreetMap)
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro no geocode:', error);
    return null;
  }
}

// Função para mostrar os pontos no mapa
async function calculateRoute() {
  const origem = document.getElementById("start").value.trim();
  const destino = document.getElementById("end").value.trim();

  if (!origem || !destino) {
    alert("Por favor, insira origem e destino.");
    return;
  }

  clearMarkers();

  const origemCoord = await geocode(origem);
  const destinoCoord = await geocode(destino);

  if (!origemCoord) {
    alert("Origem não encontrada.");
    return;
  }
  if (!destinoCoord) {
    alert("Destino não encontrado.");
    return;
  }

  // Ajusta o mapa para mostrar os dois pontos
  const group = new L.featureGroup([
    L.marker([origemCoord.lat, origemCoord.lon]).bindPopup(`Origem: ${origemCoord.display_name}`),
    L.marker([destinoCoord.lat, destinoCoord.lon]).bindPopup(`Destino: ${destinoCoord.display_name}`)
  ]);
  group.addTo(map);
  map.fitBounds(group.getBounds(), { padding: [50, 50] });

  // Guarda os marcadores para poder limpar depois
  markers.push(...group.getLayers());

  mostrarFeedbacks(destino);
}

// Feedbacks simulados
function mostrarFeedbacks(destino) {
  const feedbacks = {
    "Hospital Municipal": ["Ambiente tranquilo", "Sirene constante", "Boa sinalização"],
    "Shopping Center": ["Muito barulho", "Latidos frequentes", "Fácil acesso"],
  };

  const lista = document.getElementById("lista-feedbacks");
  lista.innerHTML = "";

  const comentarios = feedbacks[destino] || ["Sem feedbacks cadastrados."];
  comentarios.forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    lista.appendChild(li);
  });
}

// Inicializa o mapa ao carregar a página
window.addEventListener('load', initMap);
