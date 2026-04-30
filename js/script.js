// 1. Componente personalizzato per il colore della farfalla
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { this.el.addEventListener('model-loaded', () => this.applyColor()); },
  update: function () { this.applyColor(); },
  applyColor: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const newColor = new THREE.Color(this.data.color);
    newColor.convertSRGBToLinear();
    mesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.name === 'Wings') {
        node.material.color.copy(newColor);
        node.material.emissive.copy(newColor);
        node.material.emissiveIntensity = 15;
      }
    });
  }
});

// 2. Stato
let sensorsActive = false;
let experienceActivated = false;
let latestBeta = null;
let orientationListenerAttached = false;
let orientationEventReceived = false;

// 3. Avvio webcam come sfondo a tutto schermo
async function setupWebcam() {
  const video = document.getElementById('webcam-video');
  if (video.srcObject) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    console.error('Errore accesso fotocamera:', err);
    alert('Per usare l\'esperienza AR è necessario consentire l\'accesso alla fotocamera.');
  }
}

// 3b. Listener globale per l'orientamento del device
function attachOrientationListener() {
  if (orientationListenerAttached) return;
  orientationListenerAttached = true;
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta !== null && e.beta !== undefined) {
      latestBeta = e.beta;
      orientationEventReceived = true;
    }
  }, true);
}

// 4. Avvio esperienza
async function startExperience() {
  // Avvia webcam (deve partire dentro il gesto utente per iOS)
  await setupWebcam();

  // Permesso orientamento (iOS 13+)
  let orientationGranted = true;
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission();
      orientationGranted = (response === 'granted');
      if (!orientationGranted) {
        console.warn('Permesso orientamento negato');
      }
    } catch (e) {
      orientationGranted = false;
      console.error(e);
    }
  }

  if (orientationGranted) attachOrientationListener();

  proceed(orientationGranted);
}

function proceed(orientationGranted) {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // Se l'orientamento non è disponibile, dopo 2s mostra fallback con tap manuale
  if (!orientationGranted) {
    setTimeout(() => enableManualStart('Orientamento non disponibile. Tocca per iniziare.'), 500);
    return;
  }

  // Se entro 3s non arriva nessun evento orientamento, fallback manuale
  setTimeout(() => {
    if (!orientationEventReceived && !experienceActivated) {
      enableManualStart('Sensore non rilevato. Tocca per iniziare.');
    }
  }, 3000);
}

function enableManualStart(msgText) {
  const calib = document.getElementById('calibration-msg');
  if (!calib || calib.dataset.manual === '1') return;
  calib.dataset.manual = '1';
  const p = calib.querySelector('p');
  if (p) p.textContent = msgText;
  calib.style.cursor = 'pointer';
  calib.addEventListener('click', triggerExperience, { once: true });
}

function triggerExperience() {
  if (experienceActivated) return;
  experienceActivated = true;
  const swarm = document.querySelector('#swarm');
  const overlay = document.querySelector('#overlay');
  overlay.classList.add('hidden');
  createSwarm(swarm);
}

// 5. Calibrazione: parte lo sciame quando il telefono è realmente verticale
window.addEventListener('load', () => {
  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (latestBeta === null) return;
    // beta ~ 90° quando il telefono è in verticale (schermo verso l'utente)
    // Range tollerante: 60° - 110°
    if (latestBeta > 60 && latestBeta < 110) {
      triggerExperience();
    }
  }, 200);
});

// 6. Sciame di farfalle
function createSwarm(swarmContainer) {
  const numButterflies = 90;

  const tunnelLength = 28;
  const tunnelWidth = 7.5;
  const tunnelHeight = 3.3;
  const groundOffset = 0.5;
  const povDistance = 1;

  const rows = 12;
  const cols = 13;

  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({
        y: (r / (rows - 1)) * tunnelHeight + groundOffset,
        z: -((c / (cols - 1)) * tunnelWidth + povDistance)
      });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    const slot = grid[i % grid.length];

    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.2 0.15 0.2');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el, isFirstSpawn = false) => {
      const startX = tunnelLength / 2;
      const endX = -(tunnelLength / 2);

      const currentSpawnX = isFirstSpawn ? (Math.random() * tunnelLength - startX) : startX;
      const moveDuration = Math.random() * 4000 + 10000;

      const distanceRatio = isFirstSpawn ? Math.abs(currentSpawnX - endX) / tunnelLength : 1;
      const currentDuration = moveDuration * distanceRatio;

      el.setAttribute('position', `${currentSpawnX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');

      el.setAttribute('animation__move', {
        property: 'position',
        to: `${endX} ${slot.y} ${slot.z}`,
        dur: currentDuration,
        easing: 'linear'
      });

      el.setAttribute('animation__color', {
        property: 'butterfly-color.color',
        from: '#ce0058',
        to: '#fe5000',
        dur: currentDuration * 0.5,
        easing: 'linear',
        loop: false
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => {
      resetButterfly(butterfly, false);
    });

    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
