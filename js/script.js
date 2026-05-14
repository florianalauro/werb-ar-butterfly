// --- 1. COMPONENTE COLORE (MANTENUTO) ---
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { this.el.addEventListener('model-loaded', () => this.applyColor()); },
  applyColor: function () {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      const newColor = new THREE.Color(this.data.color);
      mesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.name === 'Wings') {
          node.material.color.copy(newColor);
          node.material.emissive.copy(newColor); 
          node.material.emissiveIntensity = 10;        
        }
      });
    }
  }
});

// --- 2. GESTIONE MANI (MediaPipe su Camera Posteriore) ---
const handLabel = document.querySelector('#hand-label');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5 });
hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Riconoscimento Palmo: Polso (0) più basso del dito medio (12)
    const isPalmUp = lm[12].y < lm[0].y;

    if (isPalmUp) {
      const x = (lm[9].x - 0.5) * 3;
      const y = -(lm[9].y - 0.5) * 2.5 + 1.6;
      handLabel.setAttribute('position', `${x} ${y} -1.2`);
      handLabel.setAttribute('visible', true);
    } else { handLabel.setAttribute('visible', false); }
  } else { handLabel.setAttribute('visible', false); }
});

// --- 3. START EXPERIENCE ---
let sensorsActive = false;
let experienceActivated = false;

function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // FIX CAMERA: MediaPipe legge dal video di AR.js (che è impostato su "environment")
  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
      clearInterval(checkVideo);
      // Non usiamo "new Camera()" per evitare switch sulla camera frontale
      function detect() {
        hands.send({image: v});
        requestAnimationFrame(detect);
      }
      detect();
    }
  }, 500);
}

// --- 4. CONTROLLO CALIBRAZIONE ---
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (camera.object3D) {
      const rot = camera.getAttribute('rotation');
      // Attivazione in verticale
      if (rot && rot.x > -25 && rot.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// --- 5. SCIAME TUNNEL (28 METRI - PERPENDICOLARE) ---
function createSwarm(container) {
  const numButterflies = 180; // Aumentata densità
  const tunnelX = 28; // Lunghezza tunnel

  for (let i = 0; i < numButterflies; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.18 0.15 0.18');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      const startX = 14; 
      const endX = -14;
      
      const spawnX = first ? (Math.random() * tunnelX - 14) : startX;
      const spawnY = Math.random() * 3 + 0.8;
      const spawnZ = Math.random() * 8 - 12; // Distanza perpendicolare davanti a te

      el.setAttribute('position', `${spawnX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0'); // Volano verso sinistra

      el.setAttribute('animation', {
        property: 'position',
        to: `${endX} ${spawnY} ${spawnZ}`,
        dur: Math.random() * 5000 + 10000,
        easing: 'linear'
      });
    };

    b.addEventListener('animationcomplete', () => reset(b, false));
    container.appendChild(b);
    reset(b, true);
  }
}
