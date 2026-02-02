// 1. Registrazione Componente Colore
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

let sensorsActive = false;
let experienceActivated = false;
let is6DOFSupported = false;

// 2. Controllo Supporto Movimento Libero (WebXR)
async function checkARSupport() {
  if (navigator.xr) {
    is6DOFSupported = await navigator.xr.isSessionSupported('immersive-ar');
  }
  console.log("Supporto movimento libero:", is6DOFSupported);
}

function startExperience() {
  checkARSupport().then(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(response => {
        if (response == 'granted') { proceed(); }
      }).catch(console.error);
    } else { proceed(); }
  });
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
}

// 3. Attivazione Intelligente
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;
    const rotation = camera.getAttribute('rotation');
    
    if (rotation && rotation.x > -25 && rotation.x < 25) {
      experienceActivated = true;
      overlay.classList.add('hidden');
      
      // Se il telefono non supporta il movimento, blocchiamo lo sciame alla camera
      if (!is6DOFSupported) {
        swarm.setAttribute('position', '0 0 0'); // Segue l'utente
      }
      
      createSwarm(swarm);
    }
  }, 200);
});

// 4. Creazione Sciame Ottimizzato (28m x 7.5m)
function createSwarm(swarmContainer) {
  const numButterflies = 85; // Numero magico per compatibilità universale
  const tunnelLength = 28; 
  const tunnelWidth = 7.5;
  const tunnelHeight = 4;
  const groundOffset = 0.5;
  const povDistance = 1.5;

  let grid = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      grid.push({ 
        y: (r / 9) * tunnelHeight + groundOffset,
        z: -((c / 9) * tunnelWidth + povDistance)
      });
    }
  }
  grid.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numButterflies; i++) {
    let butterfly = document.createElement('a-entity');
    const slot = grid[i % grid.length];
    butterfly.setAttribute('gltf-model', '#butterflyModel');
    butterfly.setAttribute('animation-mixer', 'clip: Flying');
    butterfly.setAttribute('scale', '0.3 0.25 0.3');
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
        dur: moveDuration * 0.8, easing: 'linear'
      });
    };

    butterfly.addEventListener('animationcomplete__move', () => resetButterfly(butterfly));
    setTimeout(() => {
      swarmContainer.appendChild(butterfly);
      resetButterfly(butterfly);
    }, Math.random() * 10000);
  }
}
