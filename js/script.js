// --- 1. COMPONENTE COLORE (MANTENUTO) ---
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { this.el.addEventListener('model-loaded', () => this.applyColor()); },
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

// --- 2. LOGICA HAND TRACKING (NOVITÀ) ---
const handLabel = document.querySelector('#hand-label');
const videoElement = document.getElementById('webcamVideo');

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Palmo in su: medio (12) più in alto del polso (0) e dita aperte
    const isPalmUp = lm[12].y < lm[0].y && lm[5].x < lm[17].x;

    if (isPalmUp) {
      // Mappiamo coordinate video -> spazio AR
      const x = (lm[9].x - 0.5) * 2.5; 
      const y = -(lm[9].y - 0.5) * 2;
      handLabel.setAttribute('position', `${x} ${y} -0.8`);
      handLabel.setAttribute('visible', true);
    } else { handLabel.setAttribute('visible', false); }
  } else { handLabel.setAttribute('visible', false); }
});

// --- 3. START EXPERIENCE (ORIGINALE + CAMERA) ---
let sensorsActive = false;
let experienceActivated = false;

async function startExperience() {
  // Avvio camera per MediaPipe
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = stream;
  const cameraPipe = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); }
  });
  cameraPipe.start();

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(console.error);
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
}

// --- 4. CONTROLLO CALIBRAZIONE (MANTENUTO) ---
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

// --- 5. SCIAME PERPENDICOLARE (X-AXIS) ---
function createSwarm(swarmContainer) {
  const numButterflies = 80;
  const tunnelLength = 28; // Ora lungo l'asse X (destra/sinistra)
  const tunnelWidth = 7.5; 

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.15 0.12 0.15');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el, isFirstSpawn = false) => {
      // Volo da destra (14m) a sinistra (-14m)
      const startX = 14;
      const endX = -14;
      
      const currentSpawnX = isFirstSpawn ? (Math.random() * tunnelLength - 14) : startX;
      const spawnY = Math.random() * 3 + 0.5;
      const spawnZ = Math.random() * 4 - 6; // Posizionate davanti a te

      el.setAttribute('position', `${currentSpawnX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0'); // Girate verso sinistra
      
      const duration = Math.random() * 5000 + 10000;

      el.setAttribute('animation__move', {
        property: 'position', 
        to: `${endX} ${spawnY} ${spawnZ}`,
        dur: duration, 
        easing: 'linear'
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly, false));
    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
