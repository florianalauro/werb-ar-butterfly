// 1. REGISTRAZIONE COMPONENTE (Mantiene i colori fucsia -> arancio)
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

// --- NUOVA FUNZIONE PER IL MOVIMENTO LIBERO (Inserita qui alla riga 25) ---
// Questa funzione dice alla scena: "Quando entri in AR, resetta lo zero sulla posizione dell'utente"
document.addEventListener('DOMContentLoaded', () => {
  const sceneEl = document.querySelector('a-scene');
  sceneEl.addEventListener('enter-vr', () => {
    if (sceneEl.is('ar-mode')) {
      const cameraEl = document.querySelector('#main-camera');
      // Fissiamo la posizione iniziale per permettere all'utente di camminare
      cameraEl.setAttribute('position', '0 0 0');
      console.log("Modalità Movimento Libero (6DOF) attivata.");
    }
  });
});

// 2. VARIABILI DI STATO
let sensorsActive = false;
let experienceActivated = false;

// 3. GESTIONE PERMESSI
function startExperience() {
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

// 4. LOGICA DI ATTIVAZIONE (Unificata e pulita)
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      // Controllo posizione verticale (pitch tra -20 e 20 gradi)
      if (rotation && rotation.x > -20 && rotation.x < 20) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 5. GENERAZIONE SCIAME (Dimensioni tunnel 28m x 7.5m)
function createSwarm(swarmContainer) {
  const numButterflies = 150;
  const tunnelLength = 28; 
  const tunnelWidth = 7.5;
  const tunnelHeight = 3;
  const groundOffset = 0.5; // Tunnel sollevato di 50cm
  const povDistance = 1.5;    // Distanza di 1m dal punto di vista

  const rows = 12; 
  const cols = 13;
  
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ 
        y: (r / (rows - 1)) * tunnelHeight + groundOffset,
        z: -((c / (cols - 1)) * tunnelWidth + povDistance)
      });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    const slot = grid[i % grid.length];
    
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.25 0.25 0.25');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el) => {
      const startX = tunnelLength / 2;
      const endX = -(tunnelLength / 2);
      const moveDuration = Math.random() * 5000 + 10000;
      
      el.setAttribute('position', `${startX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.removeAttribute('animation__move');
      el.removeAttribute('animation__color');
      
      el.setAttribute('animation__move', {
        property: 'position', to: `${endX} ${slot.y} ${slot.z}`,
        dur: moveDuration, easing: 'linear'
      });
      
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000',
        dur: moveDuration, easing: 'linear'
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly));

    setTimeout(() => {
      swarmContainer.appendChild(butterfly);
      resetButterfly(butterfly);
    }, Math.random() * 12000);
  }
}
