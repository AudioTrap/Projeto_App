const URL = "https://teachablemachine.withgoogle.com/models/-wiVr2DM4/";

let recognizer;

async function createModel() {
  const checkpointURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

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
      output.innerText = `🔊 Som detectado: ${label} (${(confidence * 100).toFixed(2)}%)`;

      if (label === "Buzina") {
        alertImage.src = "imagens/buzina.png";
      } else if (label === "Cachorro-latindo") {
        alertImage.src = "imagens/cachorro-latindo.png";
      } else if (label === "Sirene") {
        alertImage.src = "imagens/sirene.png";
      } else if (label === "Palmas") {
        alertImage.src = "imagens/palmas.png";
      } else if (label === "Estalos") {
        alertImage.src = "imagens/estalos.png";
      } else {
        alertImage.src = "imagens/som-desconhecido.png"; 
      }

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
