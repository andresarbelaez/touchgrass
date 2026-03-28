(function () {
  "use strict";

  const canvas = document.getElementById("meadow");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const soundBtn = document.getElementById("sound-toggle");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  let w = 0;
  let h = 0;
  let dpr = 1;
  let groundY = 0;
  let horizonY = 0;
  /** @type {{ x: number; bladeH: number; lw: number; phase: number; depth: number; hue: number; sat: number; light: number }[]} */
  let blades = [];

  const mouse = { x: -1e6, y: -1e6, active: false };

  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {AudioBufferSourceNode | null} */
  let noiseSource = null;
  /** @type {BiquadFilterNode | null} */
  let windFilter = null;
  /** @type {GainNode | null} */
  let windGain = null;
  let soundOn = false;

  function bladeCountForSize() {
    const area = w * h;
    let n = Math.floor(area / 820);
    n = Math.min(4200, Math.max(720, n));
    if (w < 520) n = Math.floor(n * 0.68);
    if (prefersReducedMotion.matches) n = Math.floor(n * 0.72);
    return n;
  }

  function rebuildBlades() {
    blades = [];
    const n = bladeCountForSize();
    groundY = h + 4;
    horizonY = h * 0.52;

    for (let i = 0; i < n; i++) {
      const depth = Math.random();
      const x = Math.random() * (w + 40) - 20;
      const bladeH =
        (h - horizonY) * (0.22 + depth * 0.78) * (0.85 + Math.random() * 0.35);
      const lw = 0.55 + depth * 1.35;
      const phase = Math.random() * Math.PI * 2;
      const hue = 78 + depth * 22 + (Math.random() - 0.5) * 8;
      const sat = 42 + depth * 18;
      const light = 24 + (1 - depth) * 14 + Math.random() * 6;
      blades.push({
        x,
        bladeH,
        lw,
        phase,
        depth,
        hue,
        sat,
        light,
      });
    }
    blades.sort((a, b) => a.depth - b.depth);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildBlades();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, "#ff8f4a");
    g.addColorStop(0.35, "#ffc873");
    g.addColorStop(0.62, "#f0e6a8");
    g.addColorStop(1, "#c8e090");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizonY + 2);

    const sunX = w * 0.78;
    const sunY = h * 0.14;
    const sunR = Math.min(w, h) * 0.42;
    const sg = ctx.createRadialGradient(
      sunX,
      sunY,
      0,
      sunX,
      sunY,
      sunR,
    );
    sg.addColorStop(0, "rgba(255, 245, 210, 0.55)");
    sg.addColorStop(0.35, "rgba(255, 220, 140, 0.22)");
    sg.addColorStop(1, "rgba(255, 200, 100, 0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, horizonY + 2);

    const haze = ctx.createLinearGradient(0, horizonY - 80, 0, horizonY + 60);
    haze.addColorStop(0, "rgba(255, 230, 180, 0)");
    haze.addColorStop(1, "rgba(100, 140, 70, 0.15)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizonY - 80, w, 160);
  }

  function drawGround() {
    const g = ctx.createLinearGradient(0, horizonY, 0, h);
    g.addColorStop(0, "#9bc96a");
    g.addColorStop(0.25, "#6aa84f");
    g.addColorStop(0.55, "#3d7a40");
    g.addColorStop(1, "#245c30");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, w, h - horizonY + 8);
  }

  function drawGrass(t) {
    const motionScale = prefersReducedMotion.matches ? 0.12 : 1;
    const wSlow = t * 0.00115 * motionScale;
    const wFast = t * 0.00235 * motionScale;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const wind =
        Math.sin(wSlow + b.phase) * 0.5 +
        Math.sin(wFast * 0.47 + b.phase * 2.1) * 0.18 +
        Math.sin(wSlow * 0.23 + b.phase * 4.2) * 0.08;

      let mouseLean = 0;
      if (mouse.active) {
        const midY = groundY - b.bladeH * 0.45;
        const dx = mouse.x - b.x;
        const dy = mouse.y - midY;
        const dist = Math.hypot(dx, dy);
        const R = Math.min(200, w * 0.22);
        if (dist < R) {
          const falloff = (1 - dist / R) ** 2;
          mouseLean += (dx / R) * falloff * 1.05 * motionScale;
        }
      }

      const sway = (wind + mouseLean) * (prefersReducedMotion.matches ? 0.35 : 1);
      const lean = Math.sin(sway) * Math.min(b.bladeH * 0.38, 96);
      const tipX = b.x + lean;
      const tipY = groundY - b.bladeH;
      const cx = b.x + Math.sin(sway * 0.85) * b.bladeH * 0.14;
      const cy = groundY - b.bladeH * 0.52;

      ctx.strokeStyle = `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${0.55 + b.depth * 0.4})`;
      ctx.lineWidth = b.lw;
      ctx.beginPath();
      ctx.moveTo(b.x, groundY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();
    }
  }

  function frame(t) {
    ctx.fillStyle = "#1e3d28";
    ctx.fillRect(0, 0, w, h);
    drawSky();
    drawGround();
    drawGrass(t);

    if (soundOn && windFilter && audioCtx) {
      const now = audioCtx.currentTime;
      const mod = 260 + Math.sin(t * 0.0007) * 95 + Math.sin(t * 0.00025) * 45;
      windFilter.frequency.setTargetAtTime(mod, now, 0.08);
    }

    requestAnimationFrame(frame);
  }

  function stopWind() {
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
    setSoundUi(true);
  }

  window.addEventListener("resize", () => {
    resize();
  });

  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    },
    { passive: true },
  );

  window.addEventListener(
    "mouseleave",
    () => {
      mouse.active = false;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    },
    { passive: true },
  );

  window.addEventListener("touchend", () => {
    mouse.active = false;
  });

  if (soundBtn) {
    soundBtn.addEventListener("click", () => toggleSound());
  }

  prefersReducedMotion.addEventListener("change", () => {
    rebuildBlades();
  });

  resize();
  requestAnimationFrame(frame);
})();
