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
        node.material.emissiveIntensity = 10;        
      }
    });
  }
});

// --- 2. STATO E MEDIA PIPE (THROTTLED PER EVITARE REFRESH) ---
let sensorsActive = false;
let experienceActivated = false;
const handLabel = document.querySelector('#hand-label');

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5 }); // Complexity 0 per risparmiare RAM

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Palmo in su: Polso (0) più basso del medio (12)
    const isPalmUp = lm[12].y < lm[0].y;
    if (isPalmUp) {
      const x = (lm[9].x - 0.5) * 1.5;
      const y = -(lm[9].y - 0.5) * 1.5;
      handLabel.setAttribute('position', `${x} ${y} -0.5`);
      handLabel.setAttribute('visible', true);
    } else { handLabel.setAttribute('visible', false); }
  } else { handLabel.setAttribute('visible', false); }
});

// --- 3. GESTIONE START (MANTENUTA) ---
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => { if (res == 'granted') proceed(); });
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');

  // AGGANCIO MEDIA PIPE CON THROTTLING (Esegue ogni 100ms, non ogni 16ms)
  const checkVideo = setInterval(() => {
    const v = document.querySelector('video');
    if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
      clearInterval(checkVideo);
      setInterval(() => {
          if(experienceActivated) hands.send({image: v});
      }, 100); // 10 FPS sono sufficienti e salvano la memoria
    }
  }, 500);
}

// --- 4. CALIBRAZIONE ---
window.addEventListener('load', () => {
  const camera = document.querySelector('#main-camera');
  const interval = setInterval(() => {
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

// --- 5. LOGICA SCIAME (90 UNITÀ - RESPAWN INFINITO) ---
function createSwarm(container) {
  const numButterflies = 90;
  const tunnelX = 28;

  for (let i = 0; i < numButterflies; i++) {
    let b = document.createElement('a-entity');
    b.setAttribute('gltf-model', '#butterflyModel');
    b.setAttribute('animation-mixer', 'clip: Flying');
    b.setAttribute('scale', '0.15 0.12 0.15');
    b.setAttribute('butterfly-color', 'color: #ce0058');

    const reset = (el, first = false) => {
      const startX = 14; 
      const endX = -14;
      const curX = first ? (Math.random() * tunnelX - 14) : startX;
      const curY = Math.random() * 3 + 1;
      const curZ = Math.random() * 8 - 12;

      el.setAttribute('position', `${curX} ${curY} ${curZ}`);
      el.setAttribute('rotation', '0 90 0');

      const dur = Math.random() * 4000 + 10000;

      // Usiamo attributi puliti per evitare conflitti
      el.setAttribute('animation__fly', {
        property: 'position',
        to: `${endX} ${curY} ${curZ}`,
        dur: dur,
        easing: 'linear'
      });

      el.setAttribute('animation__tint', {
        property: 'butterfly-color.color',
        from: '#ce0058',
        to: '#fe5000',
        dur: dur * 0.5,
        easing: 'linear'
      });
    };

    // FIX: Ascoltatore corretto per il respawn
    b.addEventListener('animationcomplete__fly', () => {
        reset(b, false);
    });

    container.appendChild(b);
    reset(b, true);
  }
}
