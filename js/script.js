// 1. Componente Colore
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

// 3. Gestione Caricamento
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

  // LOOP DI CONTROLLO ORIENTAMENTO
  setInterval(() => {
    if (experienceActivated || !sensorsActive) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      
      // Assicuriamoci che la rotazione sia "reale" (non 0 puro pre-caricamento)
      if (rotation && rotation.x !== 0 && Math.abs(rotation.x) < 25) {
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

  // 2. Attiva i sensori dopo 1 secondo per evitare false letture
  setTimeout(() => { sensorsActive = true; }, 1000);

  // 3. Avvia AR (WebXR per Android, automatico AR.js per iOS)
  if (scene.hasWebXR) {
    scene.enterAR();
  }

  // 4. Permessi per iOS
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(res => {
      if (res === 'granted') console.log('Sensors allowed');
    }).catch(console.error);
  }
}

function activateExperience(swarmContainer, overlay) {
  if (experienceActivated) return;
  experienceActivated = true;
  overlay.classList.add('hidden');
  createSwarm(swarmContainer);
}

// 4. Logica Sciame (X-Axis - Right to Left)
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  const tunnelLength = 28; 
  const tunnelWidth = 7.5; 
  const tunnelHeight = 3.3;
  const groundOffset = 0.5;
  const povDistance = 1.5;

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
      
      // ROTAZIONE CORRETTA: Volano verso sinistra (-X)
      el.setAttribute('rotation', '0 90 0'); 
      
      el.setAttribute('animation__move', {
        property: 'position', to: `${endX} ${slot.y} ${slot.z}`,
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
