// Importações do Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-analytics.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrQ8qo5eZdkdukmLYvIilI6kv51Z9p8Gg",
  authDomain: "audiotrap-23.firebaseapp.com",
  databaseURL: "https://audiotrap-23-default-rtdb.firebaseio.com", // ✅ ESSENCIAL
  projectId: "audiotrap-23",
  storageBucket: "audiotrap-23.firebasestorage.app", // ✅ corrigido
  messagingSenderId: "49187410477",
  appId: "1:49187410477:web:98bc5f8f90025e56775ea4"
};

// Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);


// Reconhecimento de som
const modelURL = "https://teachablemachine.withgoogle.com/models/I9hL16mkw/";
let recognizer;
let map;
let markers = [];

async function createModel() {
  const checkpointURL = modelURL + "model.json";
  const metadataURL = modelURL + "metadata.json";
  recognizer = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await recognizer.ensureModelLoaded();
}

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
      let nomeSom = label;

      if (label.includes("cachorro")) {
        emoji = "🐶";
        imageSrc = "imagens/cachorro.png";
        nomeSom = "Latido";
      } else if (label.includes("buzina")) {
        emoji = "📢";
        imageSrc = "imagens/buzina.png";
        nomeSom = "Buzina";
      } else if (label.includes("palmas")) {
        emoji = "👏";
        imageSrc = "imagens/palmas.png";
        nomeSom = "Palmas";
      } else if (label.includes("estalo")) {
        emoji = "⚡";
        imageSrc = "imagens/estalo.png";
        nomeSom = "Estalo";
      } else if (label.includes("alarme") || label.includes("sirene")) {
        emoji = "🚨";
        imageSrc = "imagens/sirene.png";
        nomeSom = "Alarme de Incêndio";
      }

      output.innerHTML = `
        <div class="detected-sound">
          <div class="sound-name">${emoji} Som detectado: <strong>${nomeSom}</strong></div>
          <div class="confidence">Confiança: ${(confidence * 100).toFixed(1)}%</div>
        </div>
      `;
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

// Mapa e Rota
function initMap() {
  map = L.map('mapa').setView([-10.2, -62.8], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

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

// Feedbacks
function mostrarFeedbacks(destino) {
  const lista = document.getElementById("lista-feedbacks");
  lista.innerHTML = "<li>🔄 Carregando feedbacks...</li>";

  const feedbackRef = ref(database, "feedbacks/" + destino.replace(/\W+/g, "_"));

  onValue(feedbackRef, snapshot => {
    lista.innerHTML = "";

    if (!snapshot.exists()) {
      lista.innerHTML = "<li>❔ Sem feedbacks cadastrados.</li>";
      return;
    }

    snapshot.forEach(child => {
      const data = child.val();
      const acess = `${"♿".repeat(data.acess || 0)} (${data.acess || 0})`;
      const mov = `${"🚶‍♂️".repeat(data.mov || 0)} (${data.mov || 0})`;
      const recom = `${"⭐".repeat(data.recom || 0)} (${data.recom || 0})`;

      const li = document.createElement("li");
      li.textContent = `${acess} ${mov} ${recom}`;
      lista.appendChild(li);
    });
  }, {
    onlyOnce: true
  });
}

// Envio do Feedback
document.getElementById("feedback-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const acess = parseInt(document.getElementById("acess").value);
  const mov = parseInt(document.getElementById("mov").value);
  const recom = parseInt(document.getElementById("recom").value);
  const destino = document.getElementById("end").value.trim();

  if (!destino) {
    alert("Informe um destino para associar o feedback.");
    return;
  }

  const feedback = { acess, mov, recom };
  const feedbackRef = ref(database, "feedbacks/" + destino.replace(/\W+/g, "_"));
  push(feedbackRef, feedback);

  alert("✅ Feedback enviado! Obrigado 😊");
  mostrarFeedbacks(destino);
});

// Inicialização
window.addEventListener("load", initMap);

// Tornar funções acessíveis no HTML
window.init = init;
window.calculateRoute = calculateRoute;
