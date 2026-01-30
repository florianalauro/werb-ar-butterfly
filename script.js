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
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
}

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
        z: -((c / (cols - 1)) * tWidth + 4)
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

    // --- LOGICA PER IL TRASPORTO DELL'IMMAGINE (1 ogni 6) ---
    if (i % 6 === 0) {
      let imagePlane = document.createElement('a-image');
      imagePlane.setAttribute('src', '#datiImg');
      
      // Dimensioni dell'immagine
      imagePlane.setAttribute('width', '1.2');
      imagePlane.setAttribute('height', '1.2');
      
      /* POSIZIONAMENTO:
         - X: 0 (centrato)
         - Y: -0.5 (sotto la farfalla, simulando le zampe)
         - Z: 0.2 (leggermente avanti/indietro a seconda del modello)
      */
      imagePlane.setAttribute('position', '0 -0.5 0'); 
      
      /* ROTAZIONE: 
         La farfalla è ruotata di -90 gradi sull'asse Y per volare di lato.
         Ruotiamo l'immagine di 90 gradi per renderla visibile lateralmente 
         mentre la farfalla attraversa lo schermo.
      */
      imagePlane.setAttribute('rotation', '0 90 0');
      
      // Rende l'immagine visibile da entrambi i lati
      imagePlane.setAttribute('material', 'side: double; transparent: true;');
    
      butterfly.appendChild(imagePlane);
    }
// -------------------------------------------------------

    imagePlane.setAttribute('animation__swing', {
      property: 'rotation',
      from: '-5 90 -5',
      to: '5 90 5',
      dur: 1500,
      dir: 'alternate',
      loop: true,
      easing: 'easeInOutQuad'
    });
    
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
