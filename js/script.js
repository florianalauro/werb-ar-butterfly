// 1. Registrazione Componente Colore
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { this.el.addEventListener('model-loaded', () => this.applyColor()); },
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

// 2. Stato e Hands
let sensorsActive = false;
let experienceActivated = false;
let activeButterfly = null;
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

// 3. Logica Hand Tracking con Debug Visivo
hands.onResults(results => {
  if (!handTrackerUI) handTrackerUI = document.querySelector('#hand-debug-ui');

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    // Mostriamo il mirino rosso quando la mano è rilevata
    if (handTrackerUI) handTrackerUI.setAttribute('visible', 'true');
    
    // Logica attrazione: Punto 9 (nocca medio) più in alto del Punto 0 (polso)
    // Ricorda: Y in MediaPipe è 0 in alto e 1 in basso
    if (landmarks[9].y < landmarks[0].y) {
      attractButterfly(landmarks[9]);
    }
  } else {
    if (handTrackerUI) handTrackerUI.setAttribute('visible', 'false');
    if (activeButterfly) releaseButterfly();
  }
});

function attractButterfly(palmPoint) {
  // Mappatura coordinate da MediaPipe (0/1) a A-Frame (-3/+3)
  const x = (palmPoint.x - 0.5) * 6;  
  const y = (0.5 - palmPoint.y) * 4 + 1.5; 
  const z = -2;

  if (handTrackerUI) handTrackerUI.setAttribute('position', `${x} ${y} ${z}`);

  if (!activeButterfly) {
    const butterflies = Array.from(document.querySelectorAll('[butterfly-color]'));
    
    // Cerchiamo prima quelle arancioni (#fe5000)
    activeButterfly = butterflies.find(b => {
      const c = b.getAttribute('butterfly-color').color.toLowerCase();
      return c === '#fe5000';
    });

    // Se non ce ne sono ancora arancioni, ne prendiamo una qualunque per test
    if (!activeButterfly) {
      activeButterfly = butterflies[0];
    }

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

// 4. Avvio Esperienza e Camera Fix
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); }).catch(console.error);
  } else { proceed(); }
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
    } catch (err) { console.error("Camera Error:", err); }
  }
}

// 5. Setup Invariato
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');
  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (camera.object3D) {
      const rot = camera.getAttribute('rotation');
      if (rot && rot.x > -25 && rot.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

function createSwarm(swarmContainer) {
  const numButterflies = 60; // Ridotto per performance mobile
  const tunnelLength = 28;
  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.2 0.15 0.2');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      const startX = 14;
      const endX = -14;
      const spawnX = first ? (Math.random() * 28 - 14) : startX;
      const dur = Math.random() * 4000 + 10000;
      el.setAttribute('position', `${spawnX} ${Math.random()*3+1} ${-(Math.random()*5+2)}`);
      el.setAttribute('rotation', '0 -90 0');
      el.setAttribute('animation__move', { property: 'position', to: `${endX} ${el.getAttribute('position').y} ${el.getAttribute('position').z}`, dur: dur, easing: 'linear' });
      el.setAttribute('animation__color', { property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000', dur: dur * 0.5, easing: 'linear' });
    };

    butterfly.addEventListener('animationcomplete__move', () => reset(butterfly));
    swarmContainer.appendChild(butterfly);
    reset(butterfly, true);
  }
}
