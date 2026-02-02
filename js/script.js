// 1. Registrazione Componente unico
AFRAME.registerComponent('butterfly-manager', {
  schema: {
    colorStart: { type: 'color', default: '#ce0058' },
    colorEnd: { type: 'color', default: '#fe5000' }
  },
  
  init: function () {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh');
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh && node.material && node.material.name === 'Wings') {
            // Ottimizzazione: creiamo un'istanza unica del materiale se necessario
            node.material = node.material.clone();
            node.material.emissiveIntensity = 2; // Valore più bilanciato
          }
        });
        this.applyColor(this.data.colorStart);
      }
    });
  },

  update: function () {
    this.applyColor(this.el.getAttribute('butterfly-color') || this.data.colorStart);
  },

  applyColor: function (color) {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const threeColor = new THREE.Color(color);
    mesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.name === 'Wings') {
        node.material.color.copy(threeColor);
        node.material.emissive.copy(threeColor);
      }
    });
  }
});

let sensorsActive = false;
let experienceActivated = false;

function startExperience() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') proceed();
      })
      .catch(err => console.error("Errore sensori:", err));
  } else {
    proceed();
  }
}

function proceed() {
  sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.remove('hidden');
  document.getElementById('overlay').classList.add('semi-transparent');
  startCalibrationCheck();
}

function startCalibrationCheck() {
  const camera = document.querySelector('#main-camera');
  const swarm = document.querySelector('#swarm');
  const overlay = document.querySelector('#overlay');

  const checkInterval = setInterval(() => {
    if (experienceActivated) {
      clearInterval(checkInterval);
      return;
    }

    const rotation = camera.getAttribute('rotation');
    // Calibrazione: raggio leggermente più permissivo per UX
    if (rotation && Math.abs(rotation.x) < 25) {
      experienceActivated = true;
      overlay.classList.add('hidden');
      createSwarm(swarm);
    }
  }, 200);
}

function createSwarm(container) {
  const count = 80; // Ridotto da 150 a 80 per performance mobile
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const b = document.createElement('a-entity');
      b.setAttribute('gltf-model', '#butterflyModel');
      b.setAttribute('butterfly-manager', '');
      b.setAttribute('animation-mixer', 'clip: Flying');
      b.setAttribute('scale', '0.2 0.2 0.2');
      
      animateButterfly(b);
      container.appendChild(b);
    }, i * 150); // Spacing per non sovraccaricare la CPU
  }
}

function animateButterfly(el) {
  const zPos = -(Math.random() * 10 + 2);
  const yPos = Math.random() * 5 + 1;
  const duration = Math.random() * 5000 + 7000;

  el.setAttribute('position', `15 ${yPos} ${zPos}`);
  
  el.setAttribute('animation__move', {
    property: 'position',
    to: `-15 ${yPos} ${zPos}`,
    dur: duration,
    easing: 'linear'
  });

  // Listener per reset
  el.addEventListener('animationcomplete__move', () => animateButterfly(el));
}

