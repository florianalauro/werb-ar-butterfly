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

// 3. Gestione Permessi
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

// 4. Controllo Calibrazione e Attivazione
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      
      // Attivazione quando il telefono è verticale (pitch tra -25° e 25°)
      if (rotation && rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 5. Logica dello Sciame tarata sul tunnel reale (28m x 7.5m)
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  
  // DIMENSIONI REALI (metri)
  const tunnelLength = 28; 
  const tunnelWidth = 7.5;
  const tunnelHeight = 4;
  const groundOffset = 0.5; // Sollevamento indicato in planimetria
  const povDistance = 1;    // Distanza dal punto viola alla zona rossa

  const rows = 12; 
  const cols = 13;
  
  let grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ 
        // Y: Parte da 0.5m e sale fino a 4.5m
        y: (r / (rows - 1)) * tunnelHeight + groundOffset,
        // Z: Parte da 1m di distanza e copre i 7.5m di larghezza
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
    butterfly.setAttribute('scale', '0.35 0.35 0.35');
    butterfly.setAttribute('butterfly-color', 'color: #ce0058');

    const resetButterfly = (el) => {
      // X: Copre i 28 metri del tunnel (da +14 a -14 rispetto al centro)
      const startX = tunnelLength / 2;
      const endX = -(tunnelLength / 2);
      
      const moveDuration = Math.random() * 4000 + 10000; // Più lente dato che il tunnel è lungo
      const colorDuration = moveDuration * 0.7; 
      
      el.setAttribute('position', `${startX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.setAttribute('animation__move', {
        property: 'position', 
        to: `${endX} ${slot.y} ${slot.z}`,
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

    // Partenza distribuita per creare l'effetto flusso continuo
    setTimeout(() => {
      swarmContainer.appendChild(butterfly);
      resetButterfly(butterfly);
    }, Math.random() * 12000);
  }
}
