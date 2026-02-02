// 1. Registrazione Componente Personalizzato per il Colore e le Emissioni
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

// 3. Gestione Permessi (Invocata dal bottone START nel file HTML)
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
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
  // Rende lo sfondo semi-trasparente per vedere la camera durante la calibrazione
  overlay.classList.add('semi-transparent'); 
}

// 4. Controllo Calibrazione e Attivazione Automatica
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.getElementById('overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      
      // Attivazione quando il telefono è verticale (pitch tra -25° e 25°)
      if (rotation && rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); // Nasconde l'overlay e mostra lo sciame
        createSwarm(swarm);
      }
    }
  }, 200);
});

// 5. Logica dello Sciame (Tunnel 28m x 7.5m) con Oscillazione
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  const tunnelLength = 28; 
  const tunnelWidth = 7.5;
  const tunnelHeight = 4;
  const groundOffset = 0.5;
  const povDistance = 1;

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
      
      // Primo spawn: le distribuiamo casualmente lungo il tunnel per non avere il vuoto iniziale
      const currentX = isFirstSpawn ? (Math.random() * tunnelLength - startX) : startX;
      
      const moveDuration = Math.random() * 5000 + 12000; 
      const distanceFactor = isFirstSpawn ? ((currentX - endX) / tunnelLength) : 1;

      el.setAttribute('position', `${currentX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      
      // Animazione 1: Movimento orizzontale (X)
      el.setAttribute('animation__move', {
        property: 'position.x', 
        to: endX,
        dur: moveDuration * distanceFactor, 
        easing: 'linear'
      });
      
      // Animazione 2: Cambio colore (dal fucsia all'arancio)
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', 
        from: '#ce0058', 
        to: '#fe5000',
        dur: moveDuration * 0.8, 
        easing: 'linear'
      });

      // Animazione 3: Oscillazione Verticale (Bobbing)
      el.setAttribute('animation__bob', {
        property: 'position.y',
        from: slot.y - 0.15,
        to: slot.y + 0.15,
        dur: Math.random() * 1000 + 1500,
        dir: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => {
      resetButterfly(butterfly, false);
    });

    setTimeout(() => {
      swarmContainer.appendChild(butterfly);
      resetButterfly(butterfly, true); 
    }, i * 150); 
  }
}
