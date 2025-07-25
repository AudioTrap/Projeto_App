// Firebase SDKs
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-analytics.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrQ8qo5eZdkdukmLYvIilI6kv51Z9p8Gg",
  authDomain: "audiotrap-23.firebaseapp.com",
  databaseURL: "https://audiotrap-23-default-rtdb.firebaseio.com",
  projectId: "audiotrap-23",
  storageBucket: "audiotrap-23.appspot.com",
  messagingSenderId: "49187410477",
  appId: "1:49187410477:web:98bc5f8f90025e56775ea4",
  measurementId: "G-7J8EHXJSPT"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Reconhecimento de som
let recognizer;
const modelURL = "https://teachablemachine.withgoogle.com/models/U_mjo1IdA/";

async function createModel() {
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands";
  document.head.appendChild(script);
  await new Promise(resolve => script.onload = resolve);

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
      const label = classLabels[index];
      const confidence = scores[index];
      const output = document.getElementById("audio-alert");
      const alertImage = document.getElementById("alert-image");

      output.innerText = "Aguardando som...";

      if (confidence > 0.75) {
        let emoji = "🔊";
        let imageSrc = "imagens/ondas.jpg";
        let nomeSom = label.toLowerCase();

        if (label.toLowerCase().includes("cachorro")) {
          emoji = "🐶";
          imageSrc = "imagens/cachorro-latindo.png";
          nomeSom = "Cachorro latindo";
        } else if (label.toLowerCase().includes("buzina")) {
          emoji = "🚗";
          imageSrc = "imagens/buzina.png";
          nomeSom = "Buzina";
        } else if (label.toLowerCase().includes("palmas")) {
          emoji = "👏";
          imageSrc = "imagens/palmas.png";
          nomeSom = "Palmas";
        } else if (label.toLowerCase().includes("estalo")) {
          emoji = "🤞";
          imageSrc = "imagens/estalos.png";
          nomeSom = "Estalo";
        } else if (label.toLowerCase().includes("alarme de incêndio")) {
          emoji = "🚨";
          imageSrc = "imagens/sirene.png";
          nomeSom = "Alarme de incêndio";
        } else if (label.toLowerCase().includes("pessoas conversando")) {
          emoji = "🗣️";
          imageSrc = "imagens/conversa.png";
          nomeSom = "Pessoas conversando";
        }

        output.innerHTML = `
          <div class="detected-sound">
            <div class="sound-name">${emoji} Som detectado: <strong>${nomeSom}</strong></div>
            <div class="confidence">Nível do som: ${(confidence * 100).toFixed(1)}%</div>
          </div>
        `;

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

// Sonora - Assistente Virtual com Menu de Perguntas
const faqSonora = [
  { pergunta: "O que é o AudioTrap?", resposta: "O AudioTrap é uma solução de acessibilidade sonora que ajuda pessoas surdas a identificarem sons do ambiente e obterem informações sobre segurança e mobilidade." },
  { pergunta: "Como funciona o detector de som?", resposta: "O detector capta sons importantes, como sirenes, buzinas e latidos, e exibe alertas visuais e vibratórios." },
  { pergunta: "Para que serve o mapa interativo?", resposta: "O mapa mostra rotas e locais com feedbacks sobre acessibilidade, segurança e movimentação." },
  { pergunta: "Como enviar feedback?", resposta: "Você pode avaliar locais com emojis de acessibilidade, movimentação e recomendação." },
  { pergunta: "Quem criou o AudioTrap?", resposta: "O AudioTrap foi desenvolvido por pesquisadoras e estudantes do IFRO Campus Porto Velho Calama." },
];

window.abrirChatSonora = function () {
  const chat = document.getElementById("sonora-chat");
  const mensagens = document.getElementById("mensagens-sonora");
  chat.style.display = "block";
  mensagens.innerHTML = "<strong>Sonora:</strong> Olá! Escolha uma das opções abaixo para saber mais:<br>";

  faqSonora.forEach((item, index) => {
    mensagens.innerHTML += `<button onclick="responderFaq(${index})" style="margin:5px; padding:8px;">${item.pergunta}</button><br>`;
  });

  mensagens.innerHTML += `<br>Se a sua dúvida não estiver aqui, entre em contato pelo e-mail <strong>audiotrapp4g@gmail.com</strong>`;
};

window.responderFaq = function (index) {
  const mensagens = document.getElementById("mensagens-sonora");
  mensagens.innerHTML += `<div style="margin-top:10px;"><strong>Você:</strong> ${faqSonora[index].pergunta}</div>`;
  mensagens.innerHTML += `<div><strong>Sonora:</strong> ${faqSonora[index].resposta}</div>`;
};

window.addEventListener("load", initMap);
window.init = init;
window.calculateRoute = calculateRoute;
