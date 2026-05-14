// 1. Registrazione Componente Colore (MANTENUTO)
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
        node.material.emissiveIntensity = 10;        
      }
    });
  }
});

// 2. Variabili di Stato
let sensorsActive = false;
let experienceActivated = false;
const handData = document.querySelector('#hand-data');

// 3. Gestione MediaPipe (Senza conflitto camera)
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Gesto palmo in su: polso (0) più in basso del medio (12)
    const isPalmUp = lm[12].y < lm[0].y;

    if (isPalmUp) {
      const x = (lm[9].x - 0.5) * 3;
      const y = -(lm[9].y - 0.5) * 2.5;
      handData.setAttribute('position', `${x} ${y + 1.6} -1`);
      handData.setAttribute('visible', true);
    } else { handData.setAttribute('visible', false); }
  } else { handData.setAttribute('visible', false); }
});

// 4. Start Experience
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // FIX SCHERMO BIANCO: MediaPipe usa il video già creato da AR.js
  const checkVideo = setInterval(() => {
    const arVideo = document.querySelector('video');
    if (arVideo) {
      clearInterval(checkVideo);
      const camera = new Camera(arVideo, {
        onFrame: async () => { await hands.send({image: arVideo}); }
      });
      camera.start();
    }
  }, 500);
}

// 5. Controllo Calibrazione
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

// 6. Sciame Perpendicolare (28 metri reali)
function createSwarm(swarmContainer) {
  const numButterflies = 85;
  const tunnelLength = 28; 

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.18 0.15 0.18');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el, isFirst = false) => {
      // Volo da destra (+14) a sinistra (-14)
      const startX = 14;
      const endX = -14;
      
      const spawnX = isFirst ? (Math.random() * tunnelLength - 14) : startX;
      const spawnY = Math.random() * 2 + 1; // Altezza tra 1m e 3m
      const spawnZ = Math.random() * 6 - 3; // Profondità davanti a te

      el.setAttribute('position', `${spawnX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0'); // Orientate a sinistra
      
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
