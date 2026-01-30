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

// 3. Gestione Permessi e Inizio
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
  const overlay = document.getElementById('overlay');
  const statusMsg = document.getElementById('status-msg');
  const calibMsg = document.getElementById('calibration-msg');

  statusMsg.classList.add('hidden');
  calibMsg.classList.remove('hidden');
  
  // Cambiamo lo sfondo dell'overlay per vedere la telecamera durante la calibrazione
  overlay.classList.add('semi-transparent'); 
}

// Modifica anche l'intervallo di calibrazione per essere più robusto
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    // Se i sensori non sono attivi o l'esperienza è già partita, esci
    if (!sensorsActive || experienceActivated) return;

    // Assicuriamoci che l'oggetto Three.js della camera sia pronto
    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      
      // Controllo posizione verticale (margine più ampio per facilitare l'utente)
      if (rotation && rotation.x > -30 && rotation.x < 30) {
        experienceActivated = true;
        overlay.classList.add('hidden'); // Nasconde tutto l'overlay
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 4. Logica di Calibrazione e Generazione Sciame
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    const rotation = camera.getAttribute('rotation');
    
    // Controlla se il dispositivo è in posizione verticale
    if (rotation && rotation.x > -20 && rotation.x < 20) {
      experienceActivated = true;
      overlay.classList.add('hidden');
      createSwarm(swarm);
    }
  }, 200);
});

function createSwarm(swarmContainer) {
  const numButterflies = 150;
  const tLength = 20; 
  const tHeight = 7; 
  const tWidth = 7;
  const rows = 12; 
  const cols = 13;
  
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ 
        y: (r / (rows - 1)) * tHeight,
        z: -((c / (cols - 1)) * tWidth + 2)
      });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    const slot = grid[i % grid.length];
    
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.3 0.3 0.3');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el) => {
      const startX = tLength;
      const endX = -(tLength);
      const posY = slot.y;
      const posZ = slot.z;
      const moveDuration = Math.random() * 4000 + 8000;
      const colorDuration = moveDuration * 0.6; 
      
      el.setAttribute('position', `${startX} ${posY} ${posZ}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.setAttribute('animation__move', {
        property: 'position', 
        to: `${endX} ${posY} ${posZ}`,
        dur: moveDuration, 
        easing: 'linear'
      });
      
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', 
        from: '#ce0058', 
        to: '#fe5000',
        dur: colorDuration, 
        easing: 'linear',
        loop: false
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => {
      resetButterfly(butterfly);
    });

    setTimeout(() => {
      swarmContainer.appendChild(butterfly);
      resetButterfly(butterfly);
    }, Math.random() * 10000);
  }
}
