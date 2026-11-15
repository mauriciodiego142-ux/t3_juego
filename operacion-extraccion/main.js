import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { PLAYER_START, EXTRACTION, SOLIDS, ZOMBIES, AMMO_CRATES, SHIELDS } from './levelData.js';

// =====================================================
// 1. PARÁMETROS DEL JUEGO
// =====================================================
const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 6;
const PLAYER_RADIUS = 0.45;
const ZOMBIE_RADIUS = 0.5;
const CATCH_DISTANCE = 0.9;      // distancia a la que un zombi atrapa al jugador
const SHOT_RANGE = 50;           // alcance máximo del disparo
const SHIELD_SECONDS = 8;

// Munición: [pistola, rifle]
const START_AMMO = [12, 16];
const AMMO_PICKUP = [4, 8];      // lo que da cada caja de munición
const MAX_AMMO = [40, 60];

// Armas GLB. Si cambias un modelo, ajusta scale / position / rotationY / muzzle.
// position y muzzle están en coordenadas de la cámara (x, y, z).
const WEAPONS = [
  { name: 'Pistola', file: './models/pistola.glb', scale: 1.3, position: [0.28, -0.26, -0.7],  rotationY: 0, muzzle: [0.28, -0.19, -1.29] },
  { name: 'Rifle',   file: './models/rifle.glb',   scale: 0.8, position: [0.32, -0.2, -0.6],   rotationY: 0, muzzle: [0.32, -0.156, -1.52] },
];

// Zombi GLB (el modelo debe mirar hacia +Z; si mira a otro lado, cambia yawOffset)
const ZOMBIE_MODEL = { file: './models/zombie.glb', scale: 0.9, yawOffset: 0 };

// =====================================================
// 2. ESCENA, CÁMARA, RENDERER Y LUCES
// =====================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2230);
scene.fog = new THREE.Fog(0x1a2230, 8, 70);

// La cámara es el jugador (ojos a 1.7 m de altura)
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.position.set(PLAYER_START.x, PLAYER_HEIGHT, PLAYER_START.z);
scene.add(camera);   // necesario para que las armas (hijas de la cámara) se vean

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xaaccee, 0x223344, 1.8));
const moonLight = new THREE.DirectionalLight(0xbfd0ff, 1.2);
moonLight.position.set(-10, 30, 20);
scene.add(moonLight);

// =====================================================
// 3. MUNDO: suelo, edificios, autos, muros, zona de inicio y de extracción
// =====================================================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(64, 215),
  new THREE.MeshStandardMaterial({ color: 0x33373b })
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -93.5);
scene.add(floor);

// Línea discontinua en la calle para orientarse
const dashGeometry = new THREE.PlaneGeometry(0.3, 3);
const dashMaterial = new THREE.MeshStandardMaterial({ color: 0xcfcf6a });
for (let zPos = -2; zPos > -92; zPos -= 8) {
  const dash = new THREE.Mesh(dashGeometry, dashMaterial);
  dash.rotation.x = -Math.PI / 2;
  dash.position.set(0, 0.02, zPos);
  scene.add(dash);
}

// Zona de inicio (azul)
const startPad = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 6),
  new THREE.MeshBasicMaterial({ color: 0x2e86de })
);
startPad.rotation.x = -Math.PI / 2;
startPad.position.set(PLAYER_START.x, 0.03, PLAYER_START.z);
scene.add(startPad);

// Zona de extracción (verde) con 4 postes de luz
const extractionPad = new THREE.Mesh(
  new THREE.PlaneGeometry(EXTRACTION.w, EXTRACTION.d),
  new THREE.MeshBasicMaterial({ color: 0x00ff66 })
);
extractionPad.rotation.x = -Math.PI / 2;
extractionPad.position.set(EXTRACTION.x, 0.03, EXTRACTION.z);
scene.add(extractionPad);

for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 7, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x00ff66 })
    );
    post.position.set(EXTRACTION.x + sx * EXTRACTION.w / 2, 3.5, EXTRACTION.z + sz * EXTRACTION.d / 2);
    scene.add(post);
  }
}

// Sólidos del nivel: se dibujan, bloquean al jugador/zombis y detienen los disparos
const solids = [];       // cajas de colisión en X/Z
const wallMeshes = [];   // mallas que los disparos pueden golpear

for (const s of SOLIDS) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(s.w, s.h, s.d),
    new THREE.MeshStandardMaterial({ color: s.color })
  );
  mesh.position.set(s.x, s.h / 2, s.z);
  scene.add(mesh);
  wallMeshes.push(mesh);
  solids.push({
    minX: s.x - s.w / 2, maxX: s.x + s.w / 2,
    minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2,
  });
}

// ¿Un círculo de radio r en (x, z) toca alguna pared?
function isBlocked(x, z, r) {
  for (const s of solids) {
    if (x > s.minX - r && x < s.maxX + r && z > s.minZ - r && z < s.maxZ + r) return true;
  }
  return false;
}

// =====================================================
// 4. OBJETOS COLECCIONABLES (cajas de munición y escudos)
// =====================================================
const pickups = [];

for (const c of AMMO_CRATES) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x6b8e23, emissive: 0x334400, emissiveIntensity: 1.5 })
  );
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.1, 0.54),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, emissive: 0x554400, emissiveIntensity: 1.5 })
  );
  lid.position.y = 0.3;
  crate.add(lid);
  crate.position.set(c.x, 0.6, c.z);
  scene.add(crate);
  pickups.push({ mesh: crate, type: 'ammo', taken: false });
}

for (const s of SHIELDS) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x2e86de, emissive: 0x1155aa, emissiveIntensity: 1.8 })
  );
  orb.position.set(s.x, 0.8, s.z);
  scene.add(orb);
  pickups.push({ mesh: orb, type: 'shield', taken: false });
}

// =====================================================
// 5. CONTROLES, HUD Y CARGA DE MODELOS GLB
// =====================================================
const controls = new PointerLockControls(camera, document.body);

const hudAmmo = document.getElementById('ammo');
const hudMessage = document.getElementById('message');
const hudObjective = document.getElementById('objective');
const hudKills = document.getElementById('kills');
const hudShield = document.getElementById('shield');
const pauseScreen = document.getElementById('pause');
const endScreen = document.getElementById('end');
const endTitle = document.getElementById('endTitle');
const endText = document.getElementById('endText');

const loader = new GLTFLoader();
const weaponObjects = [];
let zombieModel = null;

try {
  // Armas: son hijas de la cámara, así acompañan siempre la vista
  for (const w of WEAPONS) {
    const gltf = await loader.loadAsync(w.file);
    const weapon = gltf.scene;
    weapon.scale.setScalar(w.scale);
    weapon.position.set(w.position[0], w.position[1], w.position[2]);
    weapon.rotation.set(0, w.rotationY, 0);
    weapon.visible = false;
    camera.add(weapon);
    weaponObjects.push(weapon);
  }
  zombieModel = (await loader.loadAsync(ZOMBIE_MODEL.file)).scene;
} catch (error) {
  pauseScreen.textContent = 'No se pudieron cargar los modelos GLB. Revisa la carpeta models/ y usa un servidor local.';
  throw error;
}

pauseScreen.innerHTML =
  '<h1>OPERACIÓN EXTRACCIÓN</h1>' +
  '<p>Llega a la zona de extracción (verde) sin que un zombi te atrape.</p>' +
  '<p><b>W A S D</b> mover · <b>Mouse</b> mirar · <b>Clic</b> disparar · <b>1 / 2</b> cambiar arma</p>' +
  '<p>La munición solo se recupera recogiendo cajas.</p>' +
  '<p><b>Haz clic para jugar</b></p>';

// Fogonazo del disparo (hijo de la cámara)
const muzzleFlash = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0xffdd55 })
);
muzzleFlash.visible = false;
camera.add(muzzleFlash);

// =====================================================
// 6. ZOMBIS (modelo GLB + estados: inactivo / persecución / muerto)
// =====================================================
const zombies = [];

for (const data of ZOMBIES) {
  const root = zombieModel.clone();
  const isFast = data.speed > 3;
  root.scale.setScalar(ZOMBIE_MODEL.scale * (isFast ? 0.85 : 1));   // los rápidos son más pequeños
  root.position.set(data.x, 0, data.z);
  root.rotation.y = Math.random() * Math.PI * 2;
  scene.add(root);

  const zombie = {
    root: root,
    hp: 2,                 // dos impactos para morir
    state: 'idle',         // 'idle' | 'chase' | 'dead'
    range: data.range,
    speed: data.speed,
    stun: 0,
    fall: 0,
    phase: Math.random() * 6,
  };
  root.zombie = zombie;    // para encontrar al zombi a partir de la malla impactada
  zombies.push(zombie);
}

// =====================================================
// 7. ESTADO DEL JUEGO Y DISPARO
// =====================================================
let state = 'playing';     // 'playing' | 'gameover' | 'won'
let current = 0;           // arma seleccionada (0 = pistola, 1 = rifle)
const ammo = [START_AMMO[0], START_AMMO[1]];   // munición independiente por arma
let kills = 0;
let shieldTime = 0;
let kick = 0;
let flashTime = 0;
let messageTime = 0;
let elapsed = 0;

const raycaster = new THREE.Raycaster();
raycaster.far = SHOT_RANGE;
const screenCenter = new THREE.Vector2(0, 0);

function showMessage(text) {
  hudMessage.textContent = text;
  messageTime = 2.5;
}

function selectWeapon(index) {
  current = index;
  for (let i = 0; i < weaponObjects.length; i++) {
    weaponObjects[i].visible = (i === index);
  }
  const m = WEAPONS[index].muzzle;
  muzzleFlash.position.set(m[0], m[1], m[2]);
}

// Un clic = un disparo (se usa mousedown, que no se repite al mantener presionado)
function shoot() {
  if (state !== 'playing' || !controls.isLocked) return;

  if (ammo[current] <= 0) {
    showMessage('¡Sin munición!');
    return;
  }
  ammo[current] -= 1;
  kick = 0.07;
  flashTime = 0.06;
  muzzleFlash.visible = true;

  // Raycasting desde el centro de la pantalla: paredes y zombis vivos pueden ser impactados
  raycaster.setFromCamera(screenCenter, camera);
  const targets = wallMeshes.slice();
  for (const z of zombies) {
    if (z.state !== 'dead') targets.push(z.root);
  }
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length > 0) {
    // El primer impacto es el más cercano: si es una pared, el disparo se pierde
    let obj = hits[0].object;
    while (obj && !obj.zombie) obj = obj.parent;
    if (obj) damageZombie(obj.zombie);
  }
}

function damageZombie(z) {
  z.hp -= 1;
  z.stun = 0.35;           // se detiene un instante al recibir el impacto
  if (z.hp <= 0) {
    z.state = 'dead';      // deja de perseguir y de atacar
    kills += 1;
  }
}

// =====================================================
// 8. ACTUALIZACIONES (se llaman en cada frame)
// =====================================================
const keys = {};

function updatePlayer(delta) {
  const step = PLAYER_SPEED * delta;
  const oldX = camera.position.x;
  const oldZ = camera.position.z;

  if (keys['w']) controls.moveForward(step);
  if (keys['s']) controls.moveForward(-step);
  if (keys['a']) controls.moveRight(-step);
  if (keys['d']) controls.moveRight(step);

  // Colisión con paredes: se prueba cada eje por separado para poder "deslizar"
  const newX = camera.position.x;
  const newZ = camera.position.z;
  camera.position.x = isBlocked(newX, oldZ, PLAYER_RADIUS) ? oldX : newX;
  camera.position.z = isBlocked(camera.position.x, newZ, PLAYER_RADIUS) ? oldZ : newZ;
  camera.position.y = PLAYER_HEIGHT;   // altura fija
}

function updateZombies(delta) {
  for (const z of zombies) {
    const r = z.root;

    // Zombi muerto: cae al suelo y no hace nada más
    if (z.state === 'dead') {
      z.fall = Math.min(z.fall + delta * 3, 1);
      r.rotation.x = -z.fall * Math.PI / 2;
      r.position.y = 0.3 * z.fall;
      r.rotation.z = 0;
      continue;
    }

    const dx = camera.position.x - r.position.x;
    const dz = camera.position.z - r.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Estado inactivo: solo se activa al entrar el jugador en su rango de detección
    if (z.state === 'idle') {
      if (dist < z.range) {
        z.state = 'chase';
      } else {
        r.rotation.z = Math.sin(elapsed * 1.5 + z.phase) * 0.03;   // balanceo leve
        continue;
      }
    }

    // Estado activo: mirar al jugador y avanzar hacia él
    r.rotation.y = Math.atan2(dx, dz) + ZOMBIE_MODEL.yawOffset;

    if (z.stun > 0) {
      z.stun -= delta;
    } else if (dist > 0.001) {
      const step = z.speed * delta;
      const nx = r.position.x + (dx / dist) * step;
      const nz = r.position.z + (dz / dist) * step;
      if (!isBlocked(nx, r.position.z, ZOMBIE_RADIUS)) r.position.x = nx;
      if (!isBlocked(r.position.x, nz, ZOMBIE_RADIUS)) r.position.z = nz;
    }

    // Animación de caminata
    r.position.y = Math.abs(Math.sin(elapsed * 6 + z.phase)) * 0.06;
    r.rotation.z = Math.sin(elapsed * 6 + z.phase) * 0.08;

    // Contacto con el jugador = Game Over (el escudo lo protege)
    if (dist < CATCH_DISTANCE && shieldTime <= 0) {
      gameOver();
      return;
    }
  }
}

function updatePickups(delta) {
  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    if (p.taken) continue;

    p.mesh.rotation.y += delta * 2;
    p.mesh.position.y = 0.6 + Math.sin(elapsed * 3 + i) * 0.1;

    const dx = camera.position.x - p.mesh.position.x;
    const dz = camera.position.z - p.mesh.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
      p.taken = true;
      p.mesh.visible = false;
      if (p.type === 'ammo') {
        ammo[0] = Math.min(MAX_AMMO[0], ammo[0] + AMMO_PICKUP[0]);
        ammo[1] = Math.min(MAX_AMMO[1], ammo[1] + AMMO_PICKUP[1]);
        showMessage('+ Munición (pistola +' + AMMO_PICKUP[0] + ', rifle +' + AMMO_PICKUP[1] + ')');
      } else {
        shieldTime = SHIELD_SECONDS;
        showMessage('¡Escudo activado! Los zombis no pueden atraparte');
      }
    }
  }
}

function updateWeapon(delta) {
  // Retroceso del arma y fogonazo
  weaponObjects[current].position.z = WEAPONS[current].position[2] + kick;
  kick *= Math.exp(-delta * 18);

  if (flashTime > 0) {
    flashTime -= delta;
    if (flashTime <= 0) muzzleFlash.visible = false;
  }
}

function checkExtraction() {
  const inX = Math.abs(camera.position.x - EXTRACTION.x) < EXTRACTION.w / 2;
  const inZ = Math.abs(camera.position.z - EXTRACTION.z) < EXTRACTION.d / 2;
  if (inX && inZ) {
    state = 'won';
    controls.unlock();
    endTitle.textContent = '¡MISIÓN COMPLETADA!';
    endTitle.className = 'win';
    endText.textContent = 'Has llegado a la zona de extracción';
    endScreen.style.display = 'flex';
  }
}

function gameOver() {
  state = 'gameover';
  controls.unlock();
  endTitle.textContent = 'GAME OVER';
  endTitle.className = 'lose';
  endText.textContent = 'Un zombi te atrapó';
  endScreen.style.display = 'flex';
}

function updateHUD(delta) {
  const w = WEAPONS[current];
  hudAmmo.innerHTML =
    '<b>' + w.name + ': ' + ammo[current] + '</b><br>' +
    '<small>1 Pistola: ' + ammo[0] + ' · 2 Rifle: ' + ammo[1] + '</small>';

  const dx = camera.position.x - EXTRACTION.x;
  const dz = camera.position.z - EXTRACTION.z;
  hudObjective.textContent = 'Zona de extracción: ' + Math.round(Math.sqrt(dx * dx + dz * dz)) + ' m';
  hudKills.textContent = 'Zombis eliminados: ' + kills + ' / ' + zombies.length;
  hudShield.textContent = shieldTime > 0 ? 'Escudo: ' + Math.ceil(shieldTime) + ' s' : '';

  if (messageTime > 0) {
    messageTime -= delta;
    if (messageTime <= 0) hudMessage.textContent = '';
  }
  if (shieldTime > 0) shieldTime -= delta;
}

// =====================================================
// 9. TECLADO Y MOUSE
// =====================================================
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === '1') selectWeapon(0);
  if (e.key === '2') selectWeapon(1);
  if (e.key.toLowerCase() === 'r' && state !== 'playing') location.reload();   // reiniciar
});

addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

addEventListener('mousedown', e => {
  if (e.button === 0) shoot();
});

document.body.addEventListener('click', () => {
  if (state === 'playing' && !controls.isLocked) controls.lock();
});

// =====================================================
// 10. GAME LOOP
// =====================================================
selectWeapon(0);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  // El juego solo avanza mientras el mouse está capturado (si no, está en pausa)
  if (state === 'playing' && controls.isLocked) {
    elapsed += delta;
    updatePlayer(delta);
    updateZombies(delta);
    updatePickups(delta);
    updateWeapon(delta);
    if (state === 'playing') checkExtraction();
    updateHUD(delta);
  }

  pauseScreen.style.display = (state === 'playing' && !controls.isLocked) ? 'flex' : 'none';

  renderer.render(scene, camera);
}

animate();
