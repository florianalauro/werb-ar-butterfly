// --- 1. COMPONENTE COLORE (MANTENUTO DAL PROGETTO ORIGINALE) ---
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
        node.material.emissiveIntensity = 10;        
      }
    });
  }
});

let sensorsActive = false;
let experienceActivated = false;
const handContainer = document.querySelector('#hand-container');

// --- 2. GESTO "HOLDING" (PALMO ORIZZONTALE) ---
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    // Analisi della posa: mano piatta (distanza Y minima tra nocche e polso)
    const verticalDepth = Math.abs(lm[0].y - lm[9].y);
    const isHolding = verticalDepth < 0.2; // La mano è "schiacciata" in prospettiva

    if (isHolding) {
      // Coordinate localizzate davanti alla camera
      const x = (lm[9].x - 0.5) * 1.5;
      const y = -(lm[9].y - 0.5) * 1.5;
      handContainer.setAttribute('position', `${x} ${y} -0.5`);
      handContainer.setAttribute('visible', true);
    } else { handContainer.setAttribute('visible', false); }
  } else { handContainer.setAttribute('visible', false); }
});

// --- 3. START & ANTI-CRASH (MANTENUTI) ---
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  let frameCount = 0;
  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
      clearInterval(checkVideo);
      function detect() {
        frameCount++;
        if (experienceActivated && frameCount % 12 === 0) { hands.send({image: v}); }
        requestAnimationFrame(detect);
      }
      detect();
    }
  }, 1000);
}

// --- 4. CALIBRAZIONE ---
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

// --- 5. SCIAME 28 METRI (DISTRIBUZIONE PERPENDICOLARE) ---
function createSwarm(container) {
  const numButterflies = 90; 
  const tunnelRange = 28;

  for (let i = 0; i < numButterflies; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.2 0.16 0.2');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      const startX = 14; 
      const endX = -14;
      const spawnX = first ? (Math.random() * tunnelRange - 14) : startX;
      const spawnY = Math.random() * 3 + 1;
      const spawnZ = -(Math.random() * 6 + 5);

      el.setAttribute('position', `${spawnX} ${spawnY} ${spawnZ}`);
      el.setAttribute('rotation', '0 90 0');

      const duration = Math.random() * 5000 + 10000;

      el.setAttribute('animation__fly', {
        property: 'position', to: `${endX} ${spawnY} ${spawnZ}`,
        dur: duration, easing: 'linear'
      });

      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000',
        dur: duration * 0.6, easing: 'linear'
      });
    };

    b.addEventListener('animationcomplete__fly', () => reset(b, false));
    container.appendChild(b);
    reset(b, true);
  }
}
