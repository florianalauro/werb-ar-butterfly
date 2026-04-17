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

// 2. Variabili di Stato
let sensorsActive = false;
let experienceActivated = false;

// 3. Gestione Caricamento e Lifecycle
window.addEventListener('load', () => {
  const assets = document.querySelector('a-assets');
  const btnStart = document.getElementById('btn-start');
  const loadingContainer = document.getElementById('loading-container');
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  const enableButton = () => {
    if (!loadingContainer.classList.contains('hidden')) {
      loadingContainer.classList.add('hidden');
      btnStart.classList.remove('hidden');
    }
  };

  if (assets.hasLoaded) enableButton();
  else assets.addEventListener('loaded', enableButton);

  // Monitoraggio per l'attivazione: se i sensori sono attivi e non è ancora attiva l'esperienza
  setInterval(() => {
    if (experienceActivated || !sensorsActive) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      // Quando il telefono è verticale (pitch vicino a 0)
      if (rotation && Math.abs(rotation.x) < 25) {
        activateExperience(swarm, overlay);
      }
    }
  }, 200);
});

function startExperience() {
  const scene = document.querySelector('a-scene');
  
  // 1. Mostra subito il messaggio di calibrazione
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
  sensorsActive = true;

  // 2. Prova ad avviare WebXR (Android moderno)
  // Nota: su alcuni browser l'ingresso in AR può nascondere temporaneamente l'overlay
  if (scene.hasWebXR) {
    scene.enterAR();
  }

  // 3. Richiesta permessi sensori (Fondamentale per iOS e Giroscopio)
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => {
      if (res === 'granted') console.log('Sensors active');
    }).catch(console.error);
  }
}

function activateExperience(swarmContainer, overlay) {
  if (experienceActivated) return;
  experienceActivated = true;
  
  // Nasconde tutto l'overlay e avvia lo sciame
  overlay.classList.add('hidden');
  createSwarm(swarmContainer);
  console.log('Swarm Activated!');
}

// 4. Logica dello Sciame (Z-Axis Depth - 28 metri)
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  const tunnelLength = 28; 
  const tunnelWidth = 7.5; 
  const tunnelHeight = 3.3;
  const groundOffset = 1.0; 

  const rows = 12; 
  const cols = 13;
  
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ 
        x: (c / (cols - 1)) * tunnelWidth - (tunnelWidth / 2),
        y: (r / (rows - 1)) * tunnelHeight + groundOffset
      });
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
      const startZ = -tunnelLength;
      const endZ = 5; 
      
      const currentSpawnZ = isFirstSpawn ? (Math.random() * -tunnelLength) : startZ;
      const moveDuration = Math.random() * 4000 + 10000;
      const distanceRatio = isFirstSpawn ? Math.abs(currentSpawnZ - endZ) / (tunnelLength + 5) : 1;
      const currentDuration = moveDuration * distanceRatio;

      el.setAttribute('position', `${slot.x} ${slot.y} ${currentSpawnZ}`);
      el.setAttribute('rotation', '0 180 0'); // Volano verso l'utente
      
      el.setAttribute('animation__move', {
        property: 'position', to: `${slot.x} ${slot.y} ${endZ}`,
        dur: currentDuration, easing: 'linear'
      });
      
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', from: '#ce0058', to: '#fe5000',
        dur: currentDuration * 0.5, easing: 'linear'
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly, false));
    swarmContainer.appendChild(butterfly);
    resetButterfly(butterfly, true);
  }
}
