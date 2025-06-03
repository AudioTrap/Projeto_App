const URL = "https://teachablemachine.withgoogle.com/models/I9hL16mkw/";

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

    if (label === "alarme de incêndio" && confidence > 0.75) {
      output.innerText = `🚨 Alarme de incêndio (${(confidence * 100).toFixed(2)}%)`;
      alertImage.src = "imagens/sirene.png";
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
