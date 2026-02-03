// 1. Componente Colore
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
        node.material.emissiveIntensity = 10;        
      }
    });
  }
});

// 2. Variabili e MediaPipe
let sensorsActive = false;
let experienceActivated = false;
let activeButterfly = null;
let handTrackerUI = null;

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

// 3. Logica di Cattura e Posizionamento (Distanza Fissa 1m)
hands.onResults(results => {
  if (!handTrackerUI) handTrackerUI = document.querySelector('#hand-debug-ui');
  const cam = document.querySelector('#main-camera');

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    if (handTrackerUI) handTrackerUI.setAttribute('visible', 'true');

    // Mappatura coordinate su camera (Fissato a -1m di profondità)
    const x = (landmarks[9].x - 0.5) * 2; 
    const y = (0.5 - landmarks[9].y) * 2; 
    const z = -1; 

    if (handTrackerUI) handTrackerUI.setAttribute('position', `${x} ${y} ${z}`);

    // Gesto: Palmo rivolto alla camera (nocca 9 più alta del polso 0)
    if (landmarks[9].y < landmarks[0].y) {
      if (!activeButterfly) {
        const butterflies = Array.from(document.querySelectorAll('[butterfly-color]'));
        // Cerca quella arancione, se non c'è prende la prima disponibile (fallback)
        activeButterfly = butterflies.find(b => b.getAttribute('butterfly-color').color.toLowerCase() === '#fe5000') || butterflies[0];
        
        if (activeButterfly) {
          activeButterfly.removeAttribute('animation__move');
          // Diventa figlio della camera per bloccare la distanza AR
          cam.appendChild(activeButterfly);
          activeButterfly.setAttribute('animation-mixer', {timeScale: 0.3});
        }
      }
      
      if (activeButterfly) {
        activeButterfly.setAttribute('position', `${x} ${y} ${z}`);
        activeButterfly.setAttribute('rotation', '0 0 0');
      }
    }
  } else if (activeButterfly) {
    releaseButterfly();
  }
});

function releaseButterfly() {
  const swarm = document.querySelector('#swarm');
  if (activeButterfly) {
    // Torna ad essere parte del mondo globale
    swarm.appendChild(activeButterfly);
    activeButterfly.setAttribute('animation-mixer', {timeScale: 1});
    activeButterfly.emit('animationcomplete__move'); 
    activeButterfly = null;
  }
}

// 4. Gestione Permessi e Avvio
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(console.error);
  } else { 
    proceed(); 
  }
}

async function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg')?.classList.add('hidden');
  document.getElementById('calibration-msg')?.classList.remove('hidden');
  
  const videoElement = document.querySelector('video');
  if (videoElement) {
    try {
      const cameraUtils = new Camera(videoElement, {
        onFrame: async () => { await hands.send({image: videoElement}); },
        facingMode: 'environment', // Fix iOS: Camera Posteriore
        width: 640, height: 480    // Stabilità Android
      });
      await cameraUtils.start();
    } catch (err) { console.error("Camera Error:", err); }
  }
}

// 5. Controllo Calibrazione (Inclinazione telefono)
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    if (camera.object3D) {
      const rot = camera.getAttribute('rotation');
      // Attiva se il telefono è quasi verticale
      if (rot && rot.x > -25 && rot.x < 25) {
        experienceActivated = true;
        if (overlay) overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 6. Logica Sciame (Distanza corretta)
function createSwarm(swarmContainer) {
  const numButterflies = 50;
  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.1 0.1 0.1');

    const reset = (el, first = false) => {
      const startX = 10;
      const endX = -10;
      // Z tra -1.5 e -5 metri dalla camera
      const zPos = -(Math.random() * 3.5 + 1.5); 
      const yPos = Math.random() * 2 + 0.5;
      const spawnX = first ? (Math.random() * 20 - 10) : startX;
      const dur = Math.random() * 5000 + 8000;

      el.setAttribute('position', `${spawnX} ${yPos} ${zPos}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.setAttribute('animation__move', { 
        property: 'position', 
        to: `${endX} ${yPos} ${zPos}`, 
        dur: dur, 
        easing: 'linear' 
      });
      
      el.setAttribute('animation__color', { 
        property: 'butterfly-color.color', 
        from: '#ce0058', 
        to: '#fe5000', 
        dur: dur * 0.5, 
        easing: 'linear' 
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => reset(butterfly));
    swarmContainer.appendChild(butterfly);
    reset(butterfly, true);
  }
}
