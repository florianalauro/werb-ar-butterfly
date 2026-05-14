// --- 1. COMPONENTE COLORE (MANTENUTO) ---
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

// --- 2. VARIABILI DI STATO ---
let sensorsActive = false;
let experienceActivated = false;
const handLabel = document.querySelector('#hand-label');

// --- 3. GESTIONE HAND TRACKING ---
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Palmo in su: Medio (12) più in alto del polso (0)
    const isPalmUp = lm[12].y < lm[0].y;

    if (isPalmUp) {
      const x = (lm[9].x - 0.5) * 3;
      const y = -(lm[9].y - 0.5) * 2 + 1.5;
      handLabel.setAttribute('position', `${x} ${y} -1`);
      handLabel.setAttribute('visible', true);
    } else { handLabel.setAttribute('visible', false); }
  } else { handLabel.setAttribute('visible', false); }
});

// --- 4. START & CALIBRAZIONE (ORIGINALI) ---
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // Aggancio MediaPipe al video di AR.js
  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
      clearInterval(checkVideo);
      function detect() { hands.send({image: v}); requestAnimationFrame(detect); }
      detect();
    }
  }, 1000);
}

window.addEventListener('load', () => {
  const camera = document.querySelector('#main-camera');
  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (camera.object3D) {
      const rot = camera.getAttribute('rotation');
      if (rot && rot.x > -25 && rot.x < 25) {
        experienceActivated = true;
        document.getElementById('overlay').classList.add('hidden'); 
        createSwarm(document.querySelector('#swarm'));
      }
    }
  }, 200);
});

// --- 5. LOGICA SCIAME (90 FARFALLE - PERPENDICOLARE) ---
function createSwarm(swarmContainer) {
  const numButterflies = 90; // RIPORTATO AL VALORE ORIGINALE
  const tunnelLength = 28;
  const tunnelWidth = 7.5;
  const tunnelHeight = 3.3;

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.2 0.15 0.2');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el, isFirstSpawn = false) => {
      const startX = 14; 
      const endX = -14;
      
      const currentX = isFirstSpawn ? (Math.random() * tunnelLength - 14) : startX;
      const spawnY = Math.random() * tunnelHeight + 0.5;
      const spawnZ = - (Math.random() * tunnelWidth + 5); // Perpendicolari a 5-12 metri da te

      el.setAttribute('position', `${currentX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0');
      
      const currentDuration = Math.random() * 4000 + 10000;

      // ANIMAZIONE MOVIMENTO
      el.setAttribute('animation__move', {
        property: 'position', 
        to: `${endX} ${spawnY} ${spawnZ}`,
        dur: currentDuration, 
        easing: 'linear'
      });
      
      // ANIMAZIONE COLORE (RIPRISTINATA)
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', 
        from: '#ce0058', 
        to: '#fe5000',
        dur: currentDuration * 0.5, 
        easing: 'linear',
        loop: false
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly, false));
    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
