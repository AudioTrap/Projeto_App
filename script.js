// Firebase SDKs
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBrQ8qo5eZdkdukmLYvIilI6kv51Z9p8Gg",
  authDomain: "audiotrap-23.firebaseapp.com",
  databaseURL: "https://audiotrap-23-default-rtdb.firebaseio.com",
  projectId: "audiotrap-23",
  storageBucket: "audiotrap-23.appspot.com",
  messagingSenderId: "49187410477",
  appId: "1:49187410477:web:98bc5f8f90025e56775ea4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Reconhecimento de som
let recognizer;
const modelURL = "https://teachablemachine.withgoogle.com/models/I9hL16mkw/";

async function createModel() {
  if (!window.speechCommands) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  recognizer = speechCommands.create("BROWSER_FFT", undefined, modelURL + "model.json", modelURL + "metadata.json");
  await recognizer.ensureModelLoaded();
}

async function init() {
  try {
    await createModel();
    const classLabels = recognizer.wordLabels();

    recognizer.listen(result => {
      const scores = result.scores;
      const index = scores.indexOf(Math.max(...scores));
      const label = classLabels[index] || "Desconhecido";
      const confidence = scores[index];
      const output = document.getElementById("audio-alert");
      const alertImage = document.getElementById("alert-image");

      if (output) output.innerText = "Aguardando som...";

      if (confidence > 0.75) {
        let emoji = "🔊";
        let imageSrc = "imagens/sirene.png";
        let nomeSom = label;

        const l = label.toLowerCase();
        if (l.includes("cachorro")) {
          emoji = "🐶";
          imageSrc = "imagens/cachorro.png";
          nomeSom = "Latido";
        } else if (l.includes("buzina")) {
          emoji = "📢";
          imageSrc = "imagens/buzina.png";
          nomeSom = "Buzina";
        } else if (l.includes("palmas")) {
          emoji = "👏";
          imageSrc = "imagens/palmas.png";
          nomeSom = "Palmas";
        } else if (l.includes("estalo")) {
          emoji = "⚡";
          imageSrc = "imagens/estalo.png";
          nomeSom = "Estalo";
        } else if (l.includes("alarme") || l.includes("sirene")) {
          emoji = "🚨";
          imageSrc = "imagens/sirene.png";
          nomeSom = "Alarme de Incêndio";
        }

        if (output) {
          output.innerHTML = `
            <div class="detected-sound">
              <div class="sound-name">${emoji} Som detectado: <strong>${nomeSom}</strong></div>
              <div class="confidence">Nível do som: ${(confidence * 100).toFixed(1)}%</div>
            </div>
          `;
        }

        if (alertImage) {
          alertImage.src = imageSrc;
          alertImage.style.display = "block";
        }

        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

      } else {
        if (alertImage) alertImage.style.display = "none";
      }

    }, {
      includeSpectrogram: true,
      probabilityThreshold: 0.75,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.5,
    });

  } catch (err) {
    console.error("Erro ao iniciar reconhecimento:", err);
  }
}

// Mapa
let map;
let markers = [];

function initMap() {
  map = L.map('mapa').setView([-10.2, -62.8], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
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
    return data.length > 0 ? {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name
    } : null;
  } catch (err) {
    console.error("Erro ao buscar geolocalização:", err);
    return null;
  }
}

async function calculateRoute() {
  const origem = document.getElementById("start").value.trim();
  const destino = document.getElementById("end").value.trim();

  if (!origem || !destino) {
    alert("Preencha origem e destino!");
    return;
  }

  clearMarkers();

  const origemCoord = await geocode(origem);
  const destinoCoord = await geocode(destino);

  if (!origemCoord || !destinoCoord) {
    alert("Endereço não encontrado.");
    return;
  }

  const origemMarker = L.marker([origemCoord.lat, origemCoord.lon]).bindPopup(`Origem: ${origemCoord.display_name}`);
  const destinoMarker = L.marker([destinoCoord.lat, destinoCoord.lon]).bindPopup(`Destino: ${destinoCoord.display_name}`);

  origemMarker.addTo(map);
  destinoMarker.addTo(map);

  markers.push(origemMarker, destinoMarker);
  map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [50, 50] });

  mostrarFeedbacks(destino);
}

// Feedbacks
function mostrarFeedbacks(destino) {
  const lista = document.getElementById("lista-feedbacks");
  lista.innerHTML = "<li>Carregando feedbacks...</li>";

  const chave = "feedbacks/" + destino.replace(/\W+/g, "_");
  const feedbackRef = ref(database, chave);

  onValue(feedbackRef, snapshot => {
    lista.innerHTML = "";
    if (!snapshot.exists()) {
      lista.innerHTML = "<li>Sem feedbacks disponíveis.</li>";
      return;
    }

    snapshot.forEach(child => {
      const fb = child.val();
      const acess = `♿`.repeat(fb.acess || 0) + ` (${fb.acess || 0})`;
      const mov = `🚶‍♂️`.repeat(fb.mov || 0) + ` (${fb.mov || 0})`;
      const recom = `⭐`.repeat(fb.recom || 0) + ` (${fb.recom || 0})`;
      const li = document.createElement("li");
      li.textContent = `${acess} ${mov} ${recom}`;
      lista.appendChild(li);
    });
  });
}

document.getElementById("feedback-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const acess = parseInt(document.getElementById("acess").value);
  const mov = parseInt(document.getElementById("mov").value);
  const recom = parseInt(document.getElementById("recom").value);
  const destino = document.getElementById("end").value.trim();

  if (!destino) {
    alert("Preencha o destino.");
    return;
  }

  const chave = "feedbacks/" + destino.replace(/\W+/g, "_");
  const feedbackRef = ref(database, chave);
  const feedback = { acess, mov, recom };

  push(feedbackRef, feedback)
    .then(() => {
      alert("✅ Feedback enviado!");
      mostrarFeedbacks(destino);
    })
    .catch(err => {
      alert("Erro ao salvar feedback: " + err.message);
    });
});

// Inicializações
window.addEventListener("load", () => {
  initMap();
  const mapDiv = document.getElementById("mapa");
  if (mapDiv) {
    mapDiv.style.height = "300px";
    mapDiv.style.width = "100%";
  }
  init(); // Inicializa o reconhecimento de som após carregar tudo
});

window.calculateRoute = calculateRoute;

// Fecha o menu ao clicar em qualquer link
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector("nav ul").classList.remove("open");
  });
});
