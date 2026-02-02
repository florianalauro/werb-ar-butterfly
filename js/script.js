// 1. Registrazione Componente Colore (Ottimizzato)
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

// 2. Stato e Permessi
let sensorsActive = false;
let experienceActivated = false;

function startExperience() {
  console.log("Start button clicked");
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
  console.log("Sensors active, waiting for calibration...");
}

// 3. Oscillazione (Wobble)
const addWobble = (el) => {
  const amplitudeY = Math.random() * 0.3 + 0.1; 
  const duration = Math.random() * 2000 + 2000;

  el.setAttribute('animation__wobble', {
    property: 'object3D.position.y',
    from: el.object3D.position.y - amplitudeY,
    to: el.object3D.position.y + amplitudeY,
    dur: duration,
    dir: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });
};

// 4. Controllo Calibrazione (Loop di verifica)
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  const checkInterval = setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    // Usiamo object3D.rotation per una lettura più precisa dei gradi
    if (camera.object3D) {
      const rotX = THREE.MathUtils.radToDeg(camera.object3D.rotation.x);
      
      // Se il telefono è quasi verticale (tra -25 e +25 gradi)
      if (rotX > -25 && rotX < 25) {
        console.log("Calibration successful! Activating swarm...");
        experienceActivated = true;
        overlay.classList.add('hidden');
        createSwarm(swarm);
        clearInterval(checkInterval);
      }
    }
  }, 200);
});

// 5. Creazione Sciame
function createSwarm(swarmContainer) {
  const numButterflies = 80;
  const tunnelLength = 28;
  const tunnelWidth = 7.5;
  const tunnelHeight = 4;
  
  // Generazione griglia
  let grid = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      grid.push({ 
        y: (r / 9) * tunnelHeight + 0.5,
        z: -((c / 7) * tunnelWidth + 1)
      });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    setTimeout(() => {
      const butterfly = document.createElement('a-entity');
      const slot = grid[i % grid.length];
      
      butterfly.setAttribute('gltf-model', '#butterflyModel');
      butterfly.setAttribute('scale', '0.2 0.15 0.2');
      butterfly.setAttribute('butterfly-color', 'color: #ce0058');
      
      // Importante: attendere il caricamento prima di far partire le animazioni
      butterfly.addEventListener('model-loaded', () => {
        butterfly.setAttribute('animation-mixer', 'clip: Flying');
        
        const startX = tunnelLength / 2;
        const endX = -startX;
        const moveDur = Math.random() * 5000 + 10000;

        butterfly.setAttribute('position', `${startX} ${slot.y} ${slot.z}`);
        butterfly.setAttribute('rotation', '0 -90 0');

        // Movimento
        butterfly.setAttribute('animation__move', {
          property: 'position.x',
          to: endX,
          dur: moveDur,
          easing: 'linear',
          loop: false
        });

        // Colore
        butterfly.setAttribute('animation__color', {
          property: 'butterfly-color.color',
          from: '#ce0058',
          to: '#fe5000',
          dur: moveDur * 0.7,
          easing: 'linear'
        });

        addWobble(butterfly);
      });

      butterfly.addEventListener('animationcomplete__move', () => {
        // Reset manuale per evitare glitch di loop
        const startX = tunnelLength / 2;
        butterfly.setAttribute('position', `${startX} ${slot.y} ${slot.z}`);
        // Riavvia animazione (A-Frame richiede un piccolo trigger)
        butterfly.components.animation__move.beginAnimation();
        butterfly.setAttribute('butterfly-color', 'color: #ce0058');
      });

      swarmContainer.appendChild(butterfly);
    }, i * 150); // Ingresso cadenzato (ogni 150ms entra una farfalla)
  }
}
