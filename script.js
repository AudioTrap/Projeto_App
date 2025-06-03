let classifier;
let modelURL = "https://teachablemachine.withgoogle.com/models/crs48Q1do/";

window.addEventListener('DOMContentLoaded', () => {
    // Inicia o classificador de som
    ml5.soundClassifier(modelURL + "model.json", { probabilityThreshold: 0.75 }, (err, c) => {
        if (err) {
            console.error(err);
            return;
        }
        classifier = c;
        classifier.classify(gotResult);
    });

    // Lógica de abas
    document.querySelectorAll("nav a").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const id = link.getAttribute("href").substring(1);
            mostrarAba(id);
        });
    });

    mostrarAba("inicio"); // Aba padrão
});

function gotResult(error, results) {
    if (error) {
        console.error(error);
        return;
    }

    const label = results[0].label;
    const confidence = (results[0].confidence * 100).toFixed(2);
    const output = document.getElementById("audio-alert");
    const alertImage = document.getElementById("alert-image");

    if (label === "Buzina" && confidence > 80) {
        output.innerText = `🚗 Som de buzina detectado (${confidence}%)`;
        alertImage.src = "imagens/buzina.png";
        alertImage.style.display = "block";
    } else if (label === "Latido" && confidence > 80) {
        output.innerText = `🐶 Latido detectado (${confidence}%)`;
        alertImage.src = "imagens/latido.png";
        alertImage.style.display = "block";
    } else if (label === "Sirene" && confidence > 80) {
        output.innerText = `🚨 Sirene detectada (${confidence}%)`;
        alertImage.src = "imagens/sirene.png";
        alertImage.style.display = "block";
    } else {
        output.innerText = "Aguardando som...";
        alertImage.style.display = "none";
    }
}

function mostrarAba(id) {
    const abas = document.querySelectorAll(".aba");
    abas.forEach(aba => aba.classList.remove("ativa"));

    const abaAtiva = document.getElementById(id);
    if (abaAtiva) {
        abaAtiva.classList.add("ativa");
    }
}
