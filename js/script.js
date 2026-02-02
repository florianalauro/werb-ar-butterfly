// 1. Componente Colore con isolamento materiale
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () { 
    this.el.addEventListener('model-loaded', () => this.applyColor()); 
  },
  update: function () { this.applyColor(); },
  applyColor: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const newColor = new THREE.Color(this.data.color);
    newColor.convertSRGBToLinear();
    mesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.name === 'Wings') {
        if (!node.material._isCloned) {
          node.material = node.material.clone();
          node.material._isCloned = true;
        }
        node.material.color.copy(newColor);
        node.material.emissive.copy(newColor); 
        node.material.emissiveIntensity = 2;       
      }
    });
  }
});

// 2. Variabili di Stato
let sensorsActive = false;
let experienceActivated = false;

function startExperience() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response == 'granted') { proceed(); }
    }).catch(console.error);
  } else { proceed(); }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
  window.dispatchEvent(new Event('resize'));
}

// 3. Wobble (Oscillazione)
const addWobble = (el) => {
  const amp = Math.random() * 0.4 + 0.1;
  el.setAttribute('animation__wobble', {
    property: 'object3D.position.y',
    from: el.object3D.position.y - amp,
    to: el.object3D.position.y + amp,
    dur: Math.random() * 1000 + 2000,
    dir: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });
};

// 4. Trigger Calibrazione
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  const checkInterval = setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    const rotation = camera.getAttribute('rotation');
    if (rotation && Math.abs(rotation.x) < 25) {
      experienceActivated = true;
      overlay.classList.add('hidden');
      createSwarm(swarm);
      clearInterval(checkInterval);
    }
  }, 200);
});

// 5. Creazione Sciame con Volume Reale e Sorpassi
function createSwarm(swarmContainer) {
  const numButterflies = 80;
  const tunnelLength = 28; // Metri totali lungo X
  
  for (let i = 0; i < numButterflies; i++) {
    setTimeout(() => {
      const butterfly = document.createElement('a-entity');
      
      // Definiamo un volume di spawn (Box) invece di una linea
      const startX = tunnelLength / 2; // +14m (Inizio tunnel a destra)
      const startY = (Math.random() * 4) + 0.5; // Altezza tra 0.5m e 4.5m
      
      // PROFONDITÀ (Z): Fondamentale per evitare la fila indiana
      // Distribuiamo tra -2m e -10m rispetto alla camera
      const startZ = -(Math.random() * 8 + 2); 

      butterfly.setAttribute('gltf-model', '#butterflyModel');
      butterfly.setAttribute('scale', '0.15 0.12 0.15'); // Leggermente più piccole per profondità
      butterfly.setAttribute('butterfly-color', 'color: #ce0058');
      butterfly.setAttribute('position', `${startX} ${startY} ${startZ}`);
      butterfly.setAttribute('rotation', '0 -90 0');

      butterfly.addEventListener('model-loaded', () => {
        butterfly.setAttribute('animation-mixer', 'clip: Flying');
        
        // VELOCITÀ VARIABILE (Sorpassi): da 8 a 16 secondi per coprire il tunnel
        const moveDur = 8000 + Math.random() * 8000; 

        // Movimento orizzontale
        butterfly.setAttribute('animation__move', {
          property: 'position.x',
          to: -startX, // Arriva a -14m (Fine tunnel a sinistra)
          dur: moveDur,
          easing: 'linear',
          loop: true
        });

        // Colore sincronizzato alla velocità
        butterfly.setAttribute('animation__color', {
          property: 'butterfly-color.color',
          from: '#ce0058',
          to: '#fe5000',
          dur: moveDur * 0.7,
          easing: 'linear',
          dir: 'alternate',
          loop: true
        });

        addWobble(butterfly);
      });

      swarmContainer.appendChild(butterfly);
    }, i * 120); // Flusso continuo
  }
}
