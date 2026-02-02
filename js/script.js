// 1. Registrazione Componente Colore (Corretto)
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

// 2. Stato
let sensorsActive = false;
let experienceActivated = false;

function startExperience() {
  // Forza lo sblocco audio/video per browser mobile
  const scene = document.querySelector('a-scene');
  if (scene) scene.enterVR(); // Entra e esce subito per sbloccare i sensori
  setTimeout(() => { if(scene) scene.exitVR(); }, 100);

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

// 3. Controllo Calibrazione Semplificato
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');
  const calibText = document.querySelector('#calibration-msg h2');

  const checkInterval = setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    // Lettura diretta degli attributi A-Frame (più stabile su mobile)
    const rotation = camera.getAttribute('rotation');
    
    if (rotation) {
      // DEBUG VISIVO: se inclini il telefono correttamente, il testo diventa verde
      if (rotation.x > -30 && rotation.x < 30) {
        calibText.style.color = "#00ff00"; // Segnale di successo
        experienceActivated = true;
        
        setTimeout(() => {
          overlay.classList.add('hidden');
          createSwarm(swarm);
          clearInterval(checkInterval);
        }, 500);
      } else {
        calibText.style.color = "#fe5000"; // Segnale di "continua a calibrare"
      }
    }
  }, 200);
});

// 4. Creazione Sciame (Logica Robusta)
function createSwarm(swarmContainer) {
  const numButterflies = 60; // Iniziamo con 60 per testare la fluidità
  
  for (let i = 0; i < numButterflies; i++) {
    setTimeout(() => {
      const butterfly = document.createElement('a-entity');
      
      // Impostiamo tutto PRIMA di appenderlo per evitare glitch
      butterfly.setAttribute('gltf-model', '#butterflyModel');
      butterfly.setAttribute('scale', '0.2 0.15 0.2');
      butterfly.setAttribute('butterfly-color', 'color: #ce0058');
      
      // Coordinate iniziali casuali nel tunnel
      const startX = 14;
      const startY = Math.random() * 4 + 0.5;
      const startZ = -(Math.random() * 7 + 1);

      butterfly.setAttribute('position', `${startX} ${startY} ${startZ}`);
      butterfly.setAttribute('rotation', '0 -90 0');

      // Lancio animazioni dopo il caricamento
      butterfly.addEventListener('model-loaded', () => {
        butterfly.setAttribute('animation-mixer', 'clip: Flying');
        
        // Movimento verso l'uscita
        butterfly.setAttribute('animation__move', {
          property: 'position.x',
          to: -14,
          dur: 12000 + Math.random() * 5000,
          easing: 'linear',
          loop: true // Loop automatico per semplicità di test
        });

        // Cambio colore
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
    }, i * 200);
  }
}
