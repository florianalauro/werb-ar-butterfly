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
        if (!node.material.isClonedForColor) {
           node.material = node.material.clone();
           node.material.isClonedForColor = true;
        }
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

// 3. Gestione Permessi
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

// 4. Controllo Calibrazione e Attivazione
window.addEventListener('load', () => {
  const swarm = document.querySelector('#swarm');
  const camera = document.querySelector('#main-camera');
  const overlay = document.querySelector('#overlay');

  setInterval(() => {
    if (!sensorsActive || experienceActivated) return;

    if (camera.object3D) {
      // Usiamo object3D.rotation.x (in radianti) e lo convertiamo in gradi
      const rX = THREE.MathUtils.radToDeg(camera.object3D.rotation.x);
      
      // Attivazione quando il telefono è verticale (pitch tra -25° e 25°)
      if (rX > -25 && rX < 25) {
        experienceActivated = true;
        overlay.classList.add('hidden'); 
        createSwarm(swarm);
      }
    }
  }, 200);
});

// Forzare l'inline video su iOS per evitare che Safari lo apra a schermo intero (comportamento "landscape")
window.addEventListener('camera-init', (data) => {
  const video = document.querySelector('video');
  if (video) {
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.playsInline = true;

    // Iniezione texture WebGL per il VR stereoscopico (Sfondo sdoppiato)
    video.id = 'webcam-video';
    
    // Funzione per iniettare la texture quando il video è pronto
    const injectVideo = () => {
      const bgPlane = document.querySelector('#stereo-bg');
      if (bgPlane) {
        // Usa le dimensioni del video (con fallback) per mantenere le proporzioni
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;
        const aspect = vW / vH;
        
        bgPlane.setAttribute('width', 200 * aspect);
        bgPlane.setAttribute('height', 200);
        
        // Applica direttamente la texture Three.js aggirando l'engine HTML di A-Frame
        const mesh = bgPlane.getObject3D('mesh');
        if (mesh) {
           const texture = new THREE.VideoTexture(video);
           texture.minFilter = THREE.LinearFilter;
           texture.magFilter = THREE.LinearFilter;
           mesh.material.map = texture;
           mesh.material.color = new THREE.Color('#ffffff'); // Scolora il nero
           mesh.material.needsUpdate = true;
        }
        
        // Nasconde il video DOM nativo per non vederlo sotto al canvas WebGL
        video.style.opacity = '0';
      }
    };

    // Controlla se il video è già pronto, altrimenti aspetta l'evento
    if (video.readyState >= 2) {
      injectVideo();
    } else {
      video.addEventListener('loadedmetadata', injectVideo);
    }
  }
});

// 5. Logica dello Sciame tarata sul tunnel reale (28m x 7.5m) - da cliente: larghezza 9,5m, lunghezza 28m, altezza 3,3m.
function createSwarm(swarmContainer) {
  const numButterflies = 90;
  
  const tunnelLength = 28; 
  const tunnelWidth = 7.5; //9,5 - 2m circa di "passerella"
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
      
      el.removeAttribute('animation__move');
      el.removeAttribute('animation__color');

      el.setAttribute('animation__move', {
        property: 'position', 
        from: `${currentSpawnX} ${slot.y} ${slot.z}`,
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
