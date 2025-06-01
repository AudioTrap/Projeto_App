let classifier;
let label = "Aguardando som...";
let modelURL = "https://teachablemachine.withgoogle.com/models/crs48Q1do/";

function preload() {
    classifier = ml5.soundClassifier(modelURL + "model.json");
}

function setup() {
    noCanvas();
    classifier.classify(gotResult);
}

function gotResult(error, results) {
    if (error) {
        console.error(error);
        return;
    }

    label = results[0].label;
    const confidence = (results[0].confidence * 100).toFixed(2);

    const output = document.getElementById("audio-alert");
    const alertImage = document.getElementById("alert-image");

    if (label === "Buzina" && confidence > 80) {
        output.innerText = `🚗 Som de buzina detectada (${confidence}%)`;
        alertImage.src = "imagens/buzina.png";
        alertImage.style.display = "block";
    } else {
        output.innerText = "Aguardando som...";
        alertImage.style.display = "none";
    }
}
