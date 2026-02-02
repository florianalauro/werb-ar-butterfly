// 1. Registrazione Componente Colore
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

// 3. Gestione Start (Senza VR)
function startExperience() {
  // Richiesta permessi sensori (iOS)
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
  
  // Forza il motore AR a ricalcolare le dimensioni (risolve lo schermo nero/bloccato)
  window.dispatchEvent(new Event('resize'));
}

// 4. Controllo Calibrazione
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  const checkInterval = setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    // Usiamo il componente 'rotation' di A-Frame
    const rotation = camera.getAttribute('rotation');
    
    if (rotation) {
      // Se il telefono è tenuto dritto davanti agli occhi
      if (rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden');
        createSwarm(swarm);
        clearInterval(checkInterval);
      }
    }
  }, 200);
});

// 5. Creazione Sciame (Ottimizzata)
function createSwarm(swarmContainer) {
  const numButterflies = 70;
  const tunnelLength = 28;
  
  for (let i = 0; i < numButterflies; i++) {
    setTimeout(() => {
      const butterfly = document.createElement('a-entity');
      
      butterfly.setAttribute('gltf-model', '#butterflyModel');
      butterfly.setAttribute('scale', '0.2 0.15 0.2');
      butterfly.setAttribute('butterfly-color', 'color: #ce0058');
      
      const startX = tunnelLength / 2; // Inizia a +14m
      const startY = Math.random() * 4 + 0.5;
      const startZ = -(Math.random() * 7 + 1);

      butterfly.setAttribute('position', `${startX} ${startY} ${startZ}`);
      butterfly.setAttribute('rotation', '0 -90 0');

      butterfly.addEventListener('model-loaded', () => {
        butterfly.setAttribute('animation-mixer', 'clip: Flying');
        
        // Movimento lineare
        butterfly.setAttribute('animation__move', {
          property: 'position.x',
          to: -startX, // Arriva a -14m
          dur: 12000 + Math.random() * 4000,
          easing: 'linear',
          loop: true
        });

        // Cambio colore graduale
        butterfly.setAttribute('animation__color', {
          property: 'butterfly-color.color',
          from: '#ce0058',
          to: '#fe5000',
          dur: 8000,
          easing: 'linear',
          dir: 'alternate',
          loop: true
        });
      });

      swarmContainer.appendChild(butterfly);
    }, i * 150);
  }
}
