// =====================================================
// DATOS DEL NIVEL (solo datos, sin Three.js)
// Ejes: X = izquierda/derecha, Z = hacia el fondo (el recorrido avanza hacia -Z)
// Zonas: INICIO (z ≈ 4) → CALLE (z 0 a -95) → PATIO DEL HOSPITAL (z -95 a -135) → PLAZA FINAL (z -135 a -195)
// =====================================================

export const PLAYER_START = { x: 0, z: 4 };

// Zona de extracción (rectángulo en X/Z)
export const EXTRACTION = { x: 0, z: -184, w: 14, d: 10 };

const box = (x, z, w, d, h, color) => ({ x, z, w, d, h, color });

const BORDE = 0x3d3d3d;
const carColors = [0x8e2b2b, 0x2b4f8e, 0x6b6b6b, 0x2b6b4a, 0x8e7a2b, 0x4a2b6b, 0x6b3a2b, 0x2b6b6b];
const car = (x, z, alongZ, i) =>
  box(x, z, alongZ ? 2 : 4.2, alongZ ? 4.2 : 2, 1.4, carColors[i % carColors.length]);

// Todo lo que es sólido (colisiones del jugador y de los zombis, y bloquea los disparos)
export const SOLIDS = [
  // --- límites del mapa
  box(-31, -93.5, 2, 207, 14, BORDE),
  box(31, -93.5, 2, 207, 14, BORDE),
  box(0, 9, 64, 2, 14, BORDE),
  box(0, -196, 64, 2, 14, BORDE),

  // --- edificios de la calle (los huecos entre ellos son callejones sin salida con recompensa)
  box(-21, -6, 18, 28, 12, 0x6b5b4f),
  box(-21, -43.5, 18, 33, 15, 0x56606b),
  box(-21, -77.5, 18, 35, 11, 0x6e5a5a),
  box(21, -12, 18, 40, 13, 0x4f5d55),
  box(21, -54.5, 18, 31, 16, 0x6b5b4f),
  box(21, -82.5, 18, 25, 12, 0x56606b),

  // --- portón del hospital (puerta de 8 m en el centro)
  box(-17, -96, 26, 2, 7, 0x7a7a7a),
  box(17, -96, 26, 2, 7, 0x7a7a7a),

  // --- autos abandonados en la calle
  car(-6, -12, true, 0),
  car(5, -22, false, 1),
  car(-3, -30, true, 2),
  car(7, -44, true, 3),
  car(-7, -52, false, 4),
  car(2, -62, true, 5),
  car(-6, -72, true, 6),
  car(6, -80, false, 7),

  // --- patio del hospital: muros en zigzag
  box(-6, -115, 48, 2, 6, 0x7a7a7a),   // deja paso por la derecha (x 18 a 30)
  box(6, -135, 48, 2, 6, 0x7a7a7a),    // deja paso por la izquierda (x -30 a -18)

  // --- columnas / coberturas del patio
  box(-14, -106, 3, 3, 4, 0x8a8a8a),
  box(10, -105, 4, 3, 4, 0x8a8a8a),
  box(24, -108, 2, 2, 4, 0x8a8a8a),
  box(14, -125, 3, 3, 4, 0x8a8a8a),
  box(-6, -123, 4, 3, 4, 0x8a8a8a),
  box(22, -128, 2, 2, 4, 0x8a8a8a),

  // --- ruinas de la plaza final
  box(-12, -150, 10, 1.5, 2.5, 0x6f6f6f),
  box(12, -155, 10, 1.5, 2.5, 0x6f6f6f),
  box(0, -163, 8, 1.5, 2.5, 0x6f6f6f),
  box(-18, -172, 6, 1.5, 2.5, 0x6f6f6f),
  box(16, -174, 6, 1.5, 2.5, 0x6f6f6f),
];

// range = distancia de activación; speed = velocidad al perseguir (los rápidos tienen speed > 3)
const z = (x, zz, range, speed) => ({ x, z: zz, range, speed });

export const ZOMBIES = [
  // Calle
  z(-8, -38, 14, 2.0), z(8, -48, 14, 2.0), z(0, -56, 16, 2.3),
  z(-24, -23, 9, 2.2),   // callejón izquierdo
  z(24, -35.5, 9, 2.2),  // callejón derecho
  z(-5, -68, 16, 2.4), z(6, -76, 16, 2.4), z(-8, -84, 16, 2.2), z(0, -88, 18, 3.4),
  // Portón
  z(-3, -100, 14, 2.2), z(3, -102, 14, 2.2),
  // Patio del hospital
  z(-10, -110, 14, 2.2), z(12, -108, 14, 2.4), z(22, -112, 14, 2.2),
  z(24, -122, 14, 2.2), z(8, -127, 14, 2.4), z(-4, -131, 18, 3.4),
  // Plaza final
  z(-24, -141, 14, 2.2), z(-8, -146, 14, 2.2), z(10, -151, 14, 2.4),
  z(-10, -158, 16, 2.4), z(0, -168, 18, 3.4), z(-14, -176, 14, 2.2), z(14, -178, 14, 2.2),
];

// Cajas de munición (objeto de abastecimiento)
export const AMMO_CRATES = [
  { x: 4, z: -7 },
  { x: -27, z: -23.5 }, { x: 27, z: -35.5 },
  { x: 10, z: -66 }, { x: -10, z: -82 }, { x: 6, z: -92 },
  { x: -26, z: -106 }, { x: 26, z: -127 }, { x: -26, z: -143 },
  { x: -20, z: -166 }, { x: 20, z: -172 },
];

// Escudos temporales (segundo tipo de coleccionable)
export const SHIELDS = [
  { x: 0, z: -75 },
  { x: -10, z: -128 },
];
