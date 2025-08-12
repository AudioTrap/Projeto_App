// ==============================
// Firebase SDKs
// ==============================
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

// ==============================
// Reconhecimento de som
// ==============================
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

// ==============================
// Transcrição em tempo real com Web Speech API
// ==============================

let recognition;
let recognizing = false;

function iniciarTranscricao() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Seu navegador não suporta a API de reconhecimento de fala.');
    return;
  }

  if (recognizing) return; // já está rodando

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'pt-BR';

  recognition.onresult = (event) => {
    let textoCompleto = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      textoCompleto += event.results[i][0].transcript;
    }
    document.getElementById('transcricao').innerText = textoCompleto;
  };

  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento de fala:', event.error);
  };

  recognition.onend = () => {
    recognizing = false;
    // opcional: reiniciar reconhecimento automaticamente
    // iniciarTranscricao();
  };

  recognition.start();
  recognizing = true;
}

function pararTranscricao() {
  if (recognition && recognizing) {
    recognition.stop();
    recognizing = false;
  }
}

// Função para alternar transcrição
function toggleTranscricao() {
  if (recognizing) {
    pararTranscricao();
    document.getElementById('audio-alert').innerText = "Transcrição parada.";
    document.getElementById('transcricao').innerText = "";
  } else {
    iniciarTranscricao();
    document.getElementById('audio-alert').innerText = "Transcrevendo áudio do ambiente...";
  }
}

// ==============================
// Mapa
// ==============================
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

  // Tenta achar endereço fixo para origem e destino
  const origemFixo = buscarEnderecoFixo(origem);
  const destinoFixo = buscarEnderecoFixo(destino);

  let origemCoord, destinoCoord;

  if (origemFixo) {
    origemCoord = { lat: origemFixo.lat, lon: origemFixo.lon, display_name: origemFixo.nome + " - " + origemFixo.endereco };
  } else {
    origemCoord = await geocode(origem);
  }

  if (destinoFixo) {
    destinoCoord = { lat: destinoFixo.lat, lon: destinoFixo.lon, display_name: destinoFixo.nome + " - " + destinoFixo.endereco };
  } else {
    destinoCoord = await geocode(destino);
  }

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


// ==============================
// Feedbacks
// ==============================
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

// ==============================
// Autocomplete Nominatim
// ==============================
// Endereços fixos com lat/lon
const enderecosFixos = [
  {
    nome: "IFRO - Instituto Federal de Rondônia Campus Porto Velho Calama",
    endereco: "Av. Calama, 4985 - Flodoaldo Pontes Pinto, Porto Velho - RO",
    lat: -8.753424,
    lon: -63.893956
  },
  {
    nome: "IFRO - Instituto Federal de Rondônia Campus Porto Velho Zona Norte",
    endereco: "Avenida Governador Jorge Teixeira 3146 Setor - Industrial, Porto Velho - RO",
    lat: -8.752343,
    lon: -63.903253
  },
  {
    nome: "ASPVH - Associação de Surdos de Porto Velho",
    endereco: "Av. Campos Sales, 5176 - Vila Eletronorte, Porto Velho - RO",
    lat: -8.743708,
    lon: -63.872004
  },
  {
    nome: "Porto Velho Shopping",
    endereco: "Av. Rio Madeira, 3288 - Flodoaldo Pontes Pinto, Porto Velho - RO",
    lat: -8.756007,
    lon: -63.899625
  },
  {
    nome: "Defensoria Pública do Estado de Rondônia",
    endereco: "Av. Gov. Jorge Teixeira, 1722 - Embratel, Porto Velho - RO",
    lat: -8.751000,
    lon: -63.902000
  },
  {
    nome: "UPA Zona Sul",
    endereco: "R. Urtiga, 1 - Nova Floresta, Porto Velho - RO",
    lat: -8.759920,
    lon: -63.883680
  }
];

function buscarEnderecoFixo(nomeEndereco) {
  const nomeLower = nomeEndereco.toLowerCase().trim();
  return enderecosFixos.find(item =>
    nomeLower.includes(item.nome.toLowerCase()) || nomeLower.includes(item.endereco.toLowerCase())
  );
}

// Função para buscar sugestões (fixas + Nominatim)
async function buscarSugestoes(query) {
  const queryLower = query.toLowerCase();

  // Filtra endereços fixos que combinam com a busca
  const fixosFiltrados = enderecosFixos.filter(item =>
    item.nome.toLowerCase().includes(queryLower) || item.endereco.toLowerCase().includes(queryLower)
  ).map(item => ({
    display_name: `${item.nome} - ${item.endereco}`,
    lat: item.lat,
    lon: item.lon,
    fixo: true
  }));

  // Busca no Nominatim (limitado a Porto Velho, se quiser)
  const portoVelhoViewbox = "-63.2,-10.5,-63.0,-10.3"; // ajustar conforme necessário
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}&viewbox=${portoVelhoViewbox}&bounded=1&accept-language=pt`;

  let dados = [];
  try {
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR",
        "User-Agent": "AudioTrapApp/1.0 (audiotrapp4g@gmail.com)"
      }
    });
    if (res.ok) {
      dados = await res.json();
    }
  } catch (err) {
    console.error("Erro no autocomplete Nominatim:", err);
  }

  return [...fixosFiltrados, ...dados];
}

// Atualiza setupAutocomplete para usar buscarSugestoes
function setupAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.createElement("div");
  suggestionBox.className = "autocomplete-suggestions";
  suggestionBox.style.position = "absolute";
  suggestionBox.style.top = `${input.offsetHeight}px`;
  suggestionBox.style.left = "0";
  suggestionBox.style.width = "100%";
  suggestionBox.style.background = "#fff";
  suggestionBox.style.border = "1px solid #ccc";
  suggestionBox.style.zIndex = "9999";
  suggestionBox.style.maxHeight = "200px";
  suggestionBox.style.overflowY = "auto";
  suggestionBox.style.display = "none";
  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(suggestionBox);

  let debounceTimer;
  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const query = input.value.trim();
      if (query.length < 3) {
        suggestionBox.style.display = "none";
        return;
      }

      const data = await buscarSugestoes(query);

      suggestionBox.innerHTML = "";
      if (data.length === 0) {
        suggestionBox.style.display = "none";
        return;
      }

      data.forEach(item => {
        const option = document.createElement("div");
        option.style.padding = "8px";
        option.style.cursor = "pointer";
        option.textContent = item.display_name;

        option.addEventListener("click", () => {
          input.value = item.display_name;
          suggestionBox.style.display = "none";

          clearMarkers();

          if (item.fixo) {
            // Marcar local fixo direto no mapa
            const marker = L.marker([item.lat, item.lon])
              .addTo(map)
              .bindPopup(item.display_name)
              .openPopup();
            markers.push(marker);
            map.setView([item.lat, item.lon], 16);
          } else {
            // Geocodifica endereço normal e mostra marcador
            geocode(item.display_name).then(coord => {
              if (coord) {
                const marker = L.marker([coord.lat, coord.lon])
                  .addTo(map)
                  .bindPopup(coord.display_name)
                  .openPopup();
                markers.push(marker);
                map.setView([coord.lat, coord.lon], 16);
              }
            });
          }
        });

        option.addEventListener("mouseover", () => {
          option.style.background = "#f0f0f0";
        });
        option.addEventListener("mouseout", () => {
          option.style.background = "#fff";
        });

        suggestionBox.appendChild(option);
      });

      suggestionBox.style.display = "block";

    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = "none";
    }
  });
}

// Inicializa autocomplete para os dois campos
setupAutocomplete("start");
setupAutocomplete("end");


// ==============================
// Sonora Chat
// ==============================
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

// ==============================
// Inicialização
// ==============================

window.addEventListener("load", () => {
  initMap();
});
window.calculateRoute = calculateRoute;
window.toggleTranscricao = toggleTranscricao;

