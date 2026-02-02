// 1. Registrazione Componente per il Colore con isolamento della memoria
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
        // Fondamentale: clona il materiale per renderlo indipendente su ogni farfalla
        if (!node.material._isCloned) {
          node.material = node.material.clone();
          node.material._isCloned = true;
        }
        node.material.color.copy(newColor);
        node.material.emissive.copy(newColor); 
        node.material.emissiveIntensity = 2; // Ottimizzato per schermi mobile       
      }
    });
  }
});

// 2. Variabili di Stato e Performance
let sensorsActive = false;
let experienceActivated = false;

// 3. Funzione per il Movimento Sinusoidale (Wobble)
const addWobble = (el) => {
  const amplitudeY = Math.random() * 0.4 + 0.2; 
  const duration = Math.random() * 2000 + 2000;

  el.setAttribute('animation__wobbleY', {
    property: 'object3D.position.y',
    from: el.object3D.position.y - amplitudeY,
    to: el.object3D.position.y + amplitudeY,
    dur: duration,
    dir: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });
};

// 4. Gestione Permessi (Necessario per iOS)
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

// 5. Controllo Calibrazione e Attivazione
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      const rotation = camera.getAttribute('rotation');
      // Trigger quando il telefono è verticale
      if (rotation && rotation.x > -25 && rotation.x < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
