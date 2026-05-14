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
        node.material.emissiveIntensity = 12;        
      }
    });
  }
});

let sensorsActive = false;
let experienceActivated = false;
const handLabel = document.querySelector('#hand-label');

// --- 2. LOGICA GESTO "PALMO IN SU" (HOLDING) ---
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5 });

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    // CALCOLO DISTANZA VERTICALE (Wrist to Middle Tip)
    const handHeight = Math.abs(lm[0].y - lm[12].y);
    // CALCOLO LARGHEZZA (Pinky to Thumb base)
    const handWidth = Math.abs(lm[17].x - lm[5].x);

    // Un palmo rivolto verso l'alto (orizzontale) appare "basso" e "largo" alla camera
    // Rispetto al saluto che è "alto" e "stretto".
    const isPalmHolding = handHeight < 0.25 && lm[12].y < lm[0].y;

    if (isPalmHolding) {
      const x = (lm[9].x - 0.5) * 2;
      const y = -(lm[9].y - 0.5) * 2;
      handLabel.setAttribute('position', `${x} ${y} -0.6`);
      handLabel.setAttribute('visible', true);
    } else { handLabel.setAttribute('visible', false); }
  } else { handLabel.setAttribute('visible', false); }
});

// --- 3. START EXPERIENCE ---
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
      clearInterval(checkVideo);
      setInterval(() => { if(experienceActivated) hands.send({image: v}); }, 100);
    }
  }, 500);
}

// --- 4. CALIBRAZIONE E TRIGGER ---
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

// --- 5. SCIAME 28 METRI (DISTRIBUZIONE REALE) ---
function createSwarm(container) {
  const numButterflies = 90;
  const tunnelLength = 28; // Totale 28 metri

  for (let i = 0; i < numButterflies; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.2 0.16 0.2');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      // START: 14m a destra (+14) | END: 14m a sinistra (-14)
      const startX = 14; 
      const endX = -14;
      
      // Se è il primo avvio, le distribuiamo su TUTTI i 28 metri (da -14 a +14)
      const curX = first ? (Math.random() * tunnelLength - 14) : startX;
      const curY = Math.random() * 3 + 1;
      // Z: Le mettiamo a una distanza fissa di 4-8 metri davanti a te per non perderle
      const curZ = -(Math.random() * 4 + 4);

      el.setAttribute('position', `${curX} ${curY} ${curZ}`);
      el.setAttribute('rotation', '0 90 0'); // Guardano verso sinistra

      const duration = Math.random() * 5000 + 12000;

      // Reset animazioni per evitare sovrapposizioni
      el.removeAttribute('animation__fly');
      el.removeAttribute('animation__color');

      el.setAttribute('animation__fly', {
        property: 'position',
        to: `${endX} ${curY} ${curZ}`,
        dur: duration,
        easing: 'linear'
      });

      el.setAttribute('animation__color', {
        property: 'butterfly-color.color',
        from: '#ce0058',
        to: '#fe5000',
        dur: duration * 0.6,
        easing: 'linear'
      });
    };

    b.addEventListener('animationcomplete__fly', () => reset(b, false));
    container.appendChild(b);
    reset(b, true);
  }
}
