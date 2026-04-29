// 1. Registrazione Componente Personalizzato per il Colore
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () {
    this.wingMesh = null;
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      mesh.traverse((node) => {
        if (node.isMesh && node.material && node.material.name === 'Wings') {
          this.wingMesh = node;
        }
      });
      this.applyColor();
    });
  },
  update: function () { this.applyColor(); },
  applyColor: function () {
    if (!this.wingMesh) return;
    const newColor = new THREE.Color(this.data.color);
    newColor.convertSRGBToLinear();
    this.wingMesh.material.color.copy(newColor);
    this.wingMesh.material.emissive.copy(newColor);
    this.wingMesh.material.emissiveIntensity = 15;
  }
});

// 2. Variabili di Stato
window.ARState = {
  sensorsActive: false,
  experienceActivated: false
};

// 3. Gestione Permessi
function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(err => {
      console.error(err);
      alert('Per favore, consenti l\'accesso ai sensori per avviare l\'esperienza.');
    });
  } else { 
    proceed(); 
  }
}

function proceed() {
  window.ARState.sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
}

// Componente per la calibrazione
AFRAME.registerComponent('calibration-manager', {
  init: function () {
    this.experienceActivated = false;
    this.overlay = document.querySelector('#overlay');
    this.swarm = document.querySelector('#swarm');
  },
  tick: function () {
    if (this.experienceActivated || !window.ARState.sensorsActive) return;

    const rotation = this.el.getAttribute('rotation');
    // Calibrazione: telefono verticale (pitch -25° a 25°)
    if (rotation && rotation.x > -25 && rotation.x < 25) {
      this.experienceActivated = true;
      this.overlay.classList.add('hidden');
      createSwarm(this.swarm);
    }
  }
});


// 5. Logica dello Sciame tarata sul tunnel reale (28m x 9.5m)
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  
  const tunnelLength = 28; 
  const tunnelWidth = 9.5; 
  const tunnelHeight = 3.3;
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

    // Funzione di reset modificata
    const resetButterfly = (el, isFirstSpawn = false) => {
      const startX = tunnelLength / 2;
      const endX = -(tunnelLength / 2);
      
      // Se è la prima apparizione, spawniamo in un punto a caso lungo la X
      // Altrimenti, partono sempre dall'inizio (startX)
      const currentSpawnX = isFirstSpawn ? (Math.random() * tunnelLength - startX) : startX;
      
      const moveDuration = Math.random() * 4000 + 10000;
      
      // Calcoliamo una durata proporzionale alla distanza rimanente per il primo volo
      // per evitare che le farfalle a metà tunnel vadano troppo lente
      const distanceRatio = isFirstSpawn ? Math.abs(currentSpawnX - endX) / tunnelLength : 1;
      const currentDuration = moveDuration * distanceRatio;

      el.setAttribute('position', `${currentSpawnX} ${slot.y} ${slot.z}`);
      el.setAttribute('rotation', '0 -90 0');
      
      el.setAttribute('animation__move', {
        property: 'position', 
        to: `${endX} ${slot.y} ${slot.z}`,
        dur: currentDuration, 
        easing: 'linear'
      });
      
      el.setAttribute('animation__color', {
        property: 'butterfly-color.color', 
        from: '#ce0058', 
        to: '#fe5000',
        dur: currentDuration * 0.5, 
        easing: 'linear',
        loop: false
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => {
      // Dal secondo volo in poi, isFirstSpawn è false (partono dal fondo)
      resetButterfly(butterfly, false);
    });

    // Rimosso il setTimeout: aggiungiamo tutto subito
    swarmContainer.appendChild(butterfly);
    // Passiamo true per distribuire le farfalle ovunque all'avvio
    resetButterfly(butterfly, true);
  }
}
