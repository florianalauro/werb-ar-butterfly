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
          node.material.emissiveIntensity = 5;        
        }
      });
    }
  }
});

// --- 2. GESTIONE MANI (MediaPipe su Video AR.js) ---
const handText = document.querySelector('#hand-text');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5 });
hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Rilevamento palmo in su: polso (0) più basso del dito medio (12)
    const isPalmUp = lm[12].y < lm[0].y;

    if (isPalmUp) {
      const x = (lm[9].x - 0.5) * 2;
      const y = -(lm[9].y - 0.5) * 2;
      handText.setAttribute('position', `${x} ${y} -1`); // Segue la mano a 1m
      handText.setAttribute('visible', true);
    } else { handText.setAttribute('visible', false); }
  } else { handText.setAttribute('visible', false); }
});

// --- 3. START & SENSORI (MANTENUTI) ---
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
  
  // Trick per Safari: MediaPipe legge il video creato da AR.js
  const arVideo = document.querySelector('.arjs-video');
  if (arVideo) {
    const camera = new Camera(arVideo, {
      onFrame: async () => { await hands.send({image: arVideo}); }
    });
    camera.start();
  }
}

// --- 4. ATTIVAZIONE CALIBRAZIONE ---
setInterval(() => {
  if (!sensorsActive || experienceActivated) return;
  const camera = document.querySelector('#main-camera');
  if (camera.object3D) {
    const rot = camera.getAttribute('rotation');
    if (rot && rot.x > -25 && rot.x < 25) {
      experienceActivated = true;
      document.getElementById('overlay').classList.add('hidden');
      createSwarm(document.querySelector('#swarm'));
    }
  }
}, 200);

// --- 5. SCIAME PERPENDICOLARE (Il fix del tunnel) ---
function createSwarm(container) {
  const num = 70;
  const tunnelX = 28; // Lunghezza del volo (Destra -> Sinistra)

  for (let i = 0; i < num; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.15 0.12 0.15');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      const startX = 14; 
      const endX = -14;
      // Posizione casuale per distribuire lo sciame
      const curX = first ? (Math.random() * tunnelX - 14) : startX;
      const curY = Math.random() * 3 + 1;
      const curZ = Math.random() * 6 - 3; // Profondità nel tunnel

      el.setAttribute('position', `${curX} ${curY} ${curZ}`);
      el.setAttribute('rotation', '0 90 0'); // Guardano a sinistra

      el.setAttribute('animation', {
        property: 'position',
        to: `${endX} ${curY} ${curZ}`,
        dur: Math.random() * 4000 + 9000,
        easing: 'linear'
      });
    };

    b.addEventListener('animationcomplete', () => reset(b, false));
    container.appendChild(b);
    reset(b, true);
  }
}
