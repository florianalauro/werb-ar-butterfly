// 1. Registrazione Componente Personalizzato per il Colore
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { 
    this.el.addEventListener('model-loaded', () => this.applyColor()); 
  },
  update: function () { this.applyColor(); },
  applyColor: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const newColor = new THREE.Color(this.data.color);
    mesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.name === 'Wings') {
        node.material.color.copy(newColor);
        node.material.emissive.copy(newColor); 
        node.material.emissiveIntensity = 15;        
      }
    });
  }
});

// 2. Variabili di Stato e Hand Tracking
let sensorsActive = false;
let experienceActivated = false;
let activeButterfly = null;
let lastResetData = new Map();

// Riferimento al mirino visivo per il debug
let handTrackerUI = null;

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// 3. Logica di Interazione con la Mano
hands.onResults(results => {
  if (!handTrackerUI) {
    handTrackerUI = document.querySelector('#hand-debug-ui');
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    // Mostra il mirino di debug
    if (handTrackerUI) handTrackerUI.setAttribute('visible', 'true');

    // Il punto 9 deve essere sopra il polso (punto 0)
    if (landmarks[9].y < landmarks[0].y) {
      attractButterfly(landmarks[9]);
    }
  } else {
    // Nascondi mirino se la mano sparisce
    if (handTrackerUI) handTrackerUI.setAttribute('visible', 'false');
    if (activeButterfly) releaseButterfly();
  }
});

function attractButterfly(palmPoint) {
  // Calcolo coordinate (mappate per AR)
  const x = (palmPoint.x - 0.5) * 6;  
  const y = (0.5 - palmPoint.y) * 4 + 1.5;
  const z = -2;

  // Aggiorna posizione mirino debug
  if (handTrackerUI) {
    handTrackerUI.setAttribute('position', `${x} ${y} ${z}`);
  }

  if (!activeButterfly) {
    const butterflies = Array.from(document.querySelectorAll('[butterfly-color]'));
    // CERCA FARFALLE ARANCIONI
    activeButterfly = butterflies.find(b => {
      const colorAttr = b.getAttribute('butterfly-color').color.toLowerCase();
      return colorAttr === '#fe5000';
    });

    if (activeButterfly) {
      activeButterfly.removeAttribute('animation__move'); 
      activeButterfly.setAttribute('animation-mixer', {timeScale: 0.3});
    }
  }

  if (activeButterfly) {
    activeButterfly.setAttribute('position', `${x} ${y} ${z}`);
    activeButterfly.setAttribute('rotation', '-20 0 0');
  }
}

function releaseButterfly() {
  if (activeButterfly) {
    activeButterfly.setAttribute('animation-mixer', {timeScale: 1});
    activeButterfly.emit('animationcomplete__move'); 
    activeButterfly = null;
  }
}

// 4. Gestione Permessi e Avvio Camera
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(console.error);
  } else { 
    proceed(); 
  }
}

async function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
  
  const videoElement = document.querySelector('video');
  if (videoElement) {
    try {
      const cameraUtils = new Camera(videoElement, {
        onFrame: async () => { await hands.send({image: videoElement}); },
        facingMode: 'environment',
        width: 640,
        height: 480
      });
      await cameraUtils.start();
    } catch (err) {
      console.error("Camera error:", err);
    }
  }
}

// 5. Controllo Calibrazione e Sciame (Invariato)
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      if (rotation && rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

function createSwarm(swarmContainer) {
  const numButterflies = 90;
  const tunnelLength = 28;
  const tunnelWidth = 7.5;
  const tunnelHeight = 4;
  const groundOffset = 0.5;

  const rows = 12;
  const cols = 13;
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ y: (r / (rows - 1)) * tunnelHeight + groundOffset, z: -((c / (cols - 1)) * tunnelWidth + 1) });
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
      const endX = -startX;
      const currentSpawnX = isFirstSpawn ? (Math.random() * tunnelLength - startX) : startX;
      const moveDuration = Math.random() * 4000 + 10000;
      el.setAttribute('position', `${currentSpawnX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      el.setAttribute('animation__move', { property: 'position', to: `${endX} ${slot.y} ${slot.z}`, dur: moveDuration * (isFirstSpawn ? 0.5 : 1), easing: 'linear' });
      el.setAttribute('animation__color', { property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000', dur: moveDuration * 0.5, easing: 'linear', loop: false });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly, false));
    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
