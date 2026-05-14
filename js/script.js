// 1. Componente Colore
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { this.el.addEventListener('model-loaded', () => this.applyColor()); },
  applyColor: function () {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      const newColor = new THREE.Color(this.data.color);
      mesh.traverse((n) => {
        if (n.isMesh && n.material && n.material.name === 'Wings') {
          n.material.color.copy(newColor);
          n.material.emissive.copy(newColor); 
          n.material.emissiveIntensity = 8;        
        }
      });
    }
  }
});

// 2. Variabili Mark XXVII
let sensorsActive = false;
let experienceActivated = false;
const handData = document.querySelector('#hand-data');

// 3. MediaPipe Hands (Protocollo Riconoscimento Forzato)
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    // Gesto: Polso (0) più basso della punta del medio (12) E palmo aperto
    const isPalmUp = lm[12].y < lm[0].y && Math.abs(lm[4].x - lm[20].x) > 0.2;

    if (isPalmUp) {
      // Coordinate adattate per Safari
      const x = (lm[9].x - 0.5) * 4; 
      const y = -(lm[9].y - 0.5) * 3 + 1.6;
      handData.setAttribute('position', `${x} ${y} -1.5`);
      handData.setAttribute('visible', true);
    } else { handData.setAttribute('visible', false); }
  } else { handData.setAttribute('visible', false); }
});

// 4. Inizializzazione Start
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // Avvio MediaPipe agganciato alla webcam di AR.js
  const checkCam = setInterval(() => {
    const v = document.querySelector('video');
    if (v) {
      clearInterval(checkCam);
      const camera = new Camera(v, {
        onFrame: async () => { await hands.send({image: v}); }
      });
      camera.start();
    }
  }, 1000);
}

// 5. Trigger Calibrazione
window.addEventListener('load', () => {
  const camera = document.querySelector('#main-camera');
  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    const rot = camera.getAttribute('rotation');
    if (rot && rot.x > -25 && rot.x < 25) {
      experienceActivated = true;
      document.getElementById('overlay').classList.add('hidden');
      createSwarm(document.querySelector('#swarm'));
    }
  }, 200);
});

// 6. Sciame ad Alta Densità (150 Farfalle, 28 metri reali)
function createSwarm(container) {
  const numButterflies = 150; // Aumentata densità
  const tunnelRange = 28; 

  for (let i = 0; i < numButterflies; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.22 0.18 0.22');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      // Volo da Destra (+14) a Sinistra (-14)
      const startX = 14;
      const endX = -14;
      
      const spawnX = first ? (Math.random() * tunnelRange - 14) : startX;
      const spawnY = Math.random() * 4 + 0.5;
      const spawnZ = Math.random() * 10 - 15; // Più distanti per aumentare la prospettiva

      el.setAttribute('position', `${spawnX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0');
      
      // Velocità variabile per rendere lo sciame naturale
      const speed = Math.random() * 8000 + 12000;

      el.setAttribute('animation', {
        property: 'position',
        to: `${endX} ${spawnY} ${spawnZ}`,
        dur: speed,
        easing: 'linear',
        loop: false
      });
    };

    b.addEventListener('animationcomplete', () => reset(b, false));
    container.appendChild(b);
    reset(b, true);
  }
}
