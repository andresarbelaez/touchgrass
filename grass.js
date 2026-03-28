(function () {
  "use strict";

  const soundBtn = document.getElementById("sound-toggle");

  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {AudioBufferSourceNode | null} */
  let noiseSource = null;
  /** @type {BiquadFilterNode | null} */
  let windFilter = null;
  /** @type {GainNode | null} */
  let windGain = null;
  let soundOn = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let filterInterval = null;
  let filterT0 = 0;

  function stopFilterModulation() {
    if (filterInterval != null) {
      clearInterval(filterInterval);
      filterInterval = null;
    }
  }

  function startFilterModulation() {
    stopFilterModulation();
    filterT0 = performance.now();
    filterInterval = setInterval(() => {
      if (!soundOn || !windFilter || !audioCtx) return;
      const t = performance.now() - filterT0;
      const mod =
        260 + Math.sin(t * 0.0007) * 95 + Math.sin(t * 0.00025) * 45;
      windFilter.frequency.setTargetAtTime(mod, audioCtx.currentTime, 0.08);
    }, 64);
  }

  function stopWind() {
    stopFilterModulation();
    if (noiseSource) {
      try {
        noiseSource.stop();
      } catch (_) {}
      noiseSource.disconnect();
      noiseSource = null;
    }
    if (windFilter) {
      windFilter.disconnect();
      windFilter = null;
    }
    if (windGain) {
      windGain.disconnect();
      windGain = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }

  function startWind() {
    stopWind();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    audioCtx = new AC();
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = 4 * sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.015 * white) / 1.015;
      data[i] = last * 2.8;
    }

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    windFilter = audioCtx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.Q.value = 0.7;
    windFilter.frequency.value = 320;

    windGain = audioCtx.createGain();
    windGain.gain.value = 0.072;

    noiseSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(audioCtx.destination);
    noiseSource.start(0);
  }

  function setSoundUi(on) {
    soundOn = on;
    if (!soundBtn) return;
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    soundBtn.setAttribute(
      "aria-label",
      on ? "Turn ambient sound off" : "Turn ambient sound on",
    );
    soundBtn.title = on ? "Sound on" : "Sound off";
  }

  function toggleSound() {
    if (soundOn) {
      stopFilterModulation();
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.suspend().catch(() => {});
      }
      setSoundUi(false);
      return;
    }
    if (!audioCtx || audioCtx.state === "closed") {
      startWind();
    }
    if (audioCtx) {
      audioCtx.resume().catch(() => {});
    }
    startFilterModulation();
    setSoundUi(true);
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", () => toggleSound());
  }
})();
