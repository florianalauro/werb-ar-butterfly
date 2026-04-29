// 1. Registrazione Componente Personalizzato per il Colore
AFRAME.registerComponent('butterfly-color', {
  schema: { color: { type: 'color', default: '#ce0058' } },
  init: function () {
    this.meshes = [];
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      mesh.traverse((node) => {
        if (node.isMesh && node.material) {
          if (node.material.name === 'Wings' || !this.meshes.length) {
            this.meshes.push(node);
          }
        }
      });
      this.applyColor();
    });
  },
  update: function () { this.applyColor(); },
  applyColor: function () {
    if (!this.meshes.length) return;
    const newColor = new THREE.Color(this.data.color);
    newColor.convertSRGBToLinear();
    this.meshes.forEach(mesh => {
      mesh.material.color.copy(newColor);
      mesh.material.emissive.copy(newColor);
      mesh.material.emissiveIntensity = 15;
    });
  }
});

// 2. Variabili di Stato
window.ARState = {
  sensorsActive: false,
  experienceActivated: false
};

// 3. Gestione Permessi
function startExperience() {
  const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);

  if (!isMobile) {
    showError('⚠️ Dispositivo non supportato', 'Questa esperienza richiede un dispositivo mobile con sensore di orientamento.');
    return;
  }

  // PRIMO: richiedi fotocamera (OBBLIGATORIO su Android)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        console.log('✓ Permesso fotocamera concesso');
        requestSensorPermissions();
      })
      .catch(err => {
        console.error('✗ Errore fotocamera:', err);
        showError('Fotocamera negata', 'Autorizza l\'accesso alla fotocamera per usare l\'AR.');
      });
  } else {
    requestSensorPermissions();
  }
}

function requestSensorPermissions() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    Promise.all([
      DeviceOrientationEvent.requestPermission(),
      DeviceMotionEvent.requestPermission ? DeviceMotionEvent.requestPermission() : Promise.resolve('granted')
    ])
      .then(responses => {
        if (responses[0] === 'granted') {
          proceed();
        } else {
          proceed();
        }
      })
      .catch(err => {
        console.error('Errore sensori:', err);
        proceed();
      });
  } else {
    proceed();
  }
}

function proceed() {
  window.ARState.sensorsActive = true;
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('error-msg').classList.add('hidden');

  setTimeout(() => {
    document.getElementById('calibration-msg').classList.remove('hidden');
  }, 500);
}

function showError(title, message) {
  document.getElementById('status-msg').classList.add('hidden');
  document.getElementById('calibration-msg').classList.add('hidden');
  document.getElementById('error-msg').classList.remove('hidden');
  document.querySelector('#error-msg h2').textContent = title;
  document.getElementById('error-text').textContent = message;
}

// Listener per orientamento dispositivo (fallback per Android)
let orientationDetected = false;
let lastDeviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

window.addEventListener('deviceorientation', (event) => {
  orientationDetected = true;
  lastDeviceOrientation = {
    alpha: event.alpha,
    beta: event.beta,
    gamma: event.gamma
  };
  console.log('📱 Orientamento rilevato:', lastDeviceOrientation);
}, true);

// Componente per la calibrazione
AFRAME.registerComponent('calibration-manager', {
  init: function () {
    this.experienceActivated = false;
    this.overlay = document.querySelector('#overlay');
    this.swarm = document.querySelector('#swarm');
    this.modelLoaded = false;
    this.tickCount = 0;
    this.fallbackTimeout = 5000; // 5 secondi fallback (ridotto)
    this.startTime = Date.now();
    this.checkModelLoading();
  },
  checkModelLoading: function () {
    const butterflyModel = document.querySelector('#butterflyModel');
    setTimeout(() => {
      if (!butterflyModel || !butterflyModel.hasLoaded) {
        showError('Errore caricamento', 'Il modello 3D della farfalla non è riuscito a caricare. Ricarica la pagina.');
      } else {
        this.modelLoaded = true;
      }
    }, 5000);
  },
  tick: function () {
    if (this.experienceActivated || !this.modelLoaded) return;

    this.tickCount++;
    const elapsed = Date.now() - this.startTime;

    const rotation = this.el.getAttribute('rotation');

    // Debug logging (ogni 60 frame)
    if (this.tickCount % 60 === 0) {
      console.log('A-Frame Rotation:', rotation?.x?.toFixed(2),
                  'DeviceOrientation Beta:', lastDeviceOrientation.beta?.toFixed(2),
                  'Elapsed:', elapsed, 'ms');
    }

    // Metodo 1: Calibrazione tramite A-Frame rotation
    if (rotation && rotation.x > -45 && rotation.x < 45) {
      console.log('✓ Calibrato via A-Frame rotation');
      this.startExperience();
      return;
    }

    // Metodo 2: Calibrazione tramite deviceorientation raw (Android)
    // Beta: pitch (verticale = 0 ± 30)
    if (orientationDetected && lastDeviceOrientation.beta) {
      const beta = lastDeviceOrientation.beta;
      if (beta > -30 && beta < 30) {
        console.log('✓ Calibrato via deviceorientation raw');
        this.startExperience();
        return;
      }
    }

    // Fallback: se dopo 5 secondi, avvia comunque
    if (window.ARState.sensorsActive && elapsed > this.fallbackTimeout) {
      console.warn('⏱ Fallback: apertura dopo timeout');
      this.startExperience();
    }
  },
  startExperience: function () {
    this.experienceActivated = true;
    this.overlay.classList.add('hidden');
    try {
      createSwarm(this.swarm);
    } catch (err) {
      console.error('Errore creazione sciame:', err);
      showError('Errore', 'Errore durante la creazione dello sciame di farfalle.');
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
        dur: currentDuration,
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
