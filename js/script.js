// 1. Registrazione Componente Personalizzato per il Colore
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

let sensorsActive = false;
let experienceActivated = false;

// 2. Avvio della Webcam (SOLO per la texture in VR)
async function setupWebcam() {
  const video = document.getElementById('webcam-video');
  // Se è già accesa, non facciamo nulla
  if (video.srcObject) return; 
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }, 
      audio: false 
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    console.error("Errore accesso fotocamera per VR: ", err);
  }
}

// 3. Gestione Avvio (Forza ingresso in AR nativo SENZA accendere fotocamera manuale)
function startExperience() {
  const sceneEl = document.querySelector('a-scene');
  
  // Entriamo in AR WebXR nativo
  if (sceneEl.enterAR) {
    sceneEl.enterAR().catch(err => console.warn("Auto-AR fallito:", err));
  }

  // Gestione permessi orientamento 
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(console.error);
  } else { 
    proceed(); 
  }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
}

// 4. Controllo Calibrazione e Switch AR/VR
window.addEventListener('load', () => {
  const sceneEl = document.querySelector('a-scene');
  const vrBackground = document.querySelector('#vr-background');
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  // Gestione evento: l'utente entra in una modalità immersiva
  sceneEl.addEventListener('enter-vr', () => {
    // Se siamo nel VR sdoppiato (e non nell'AR nativo)
    if (!sceneEl.is('ar-mode')) {
      setupWebcam(); // Accendiamo la fotocamera manuale ORA
      vrBackground.setAttribute('visible', 'true');
    } else {
      vrBackground.setAttribute('visible', 'false');
    }
  });

  // Gestione evento: l'utente chiude il VR o l'AR
  sceneEl.addEventListener('exit-vr', () => {
    vrBackground.setAttribute('visible', 'false');
    
    // Spegniamo la fotocamera manuale per non consumare batteria
    const video = document.getElementById('webcam-video');
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  });

  // Calibrazione: attivazione quando il telefono è verticale
  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      // Pitch tra -25° e 25°
      if (rotation && rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 5. Logica dello Sciame (Invariata)
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  const tunnelLength = 28; 
  const tunnelWidth = 7.5; 
  const tunnelHeight = 3.3;
  const groundOffset = 0.5;
  const povDistance = 1;
  const rows = 12; 
  const cols = 13;
  
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ y: (r / (rows - 1)) * tunnelHeight + groundOffset, z: -((c / (cols - 1)) * tunnelWidth + povDistance) });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    const slot = grid[i % grid.length];
    
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.2 0.15 0.2');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el, isFirstSpawn = false) => {
      const startX = tunnelLength / 2;
      const endX = -(tunnelLength / 2);
      const currentSpawnX = isFirstSpawn ? (Math.random() * tunnelLength - startX) : startX;
      const moveDuration = Math.random() * 4000 + 10000;
      const distanceRatio = isFirstSpawn ? Math.abs(currentSpawnX - endX) / tunnelLength : 1;
      const currentDuration = moveDuration * distanceRatio;

      el.setAttribute('position', `${currentSpawnX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.setAttribute('animation__move', {
        property: 'position', to: `${endX} ${slot.y} ${slot.z}`, dur: currentDuration, easing: 'linear'
      });
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000', dur: currentDuration * 0.5, easing: 'linear', loop: false
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => { resetButterfly(butterfly, false); });
    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
