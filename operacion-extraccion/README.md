# Operación Extracción – Videojuego FPS 3D (Three.js)

Evaluación T3 – Computación Gráfica y Visual (UPN).

Eres uno de los últimos sobrevivientes de una ciudad infestada de zombis. Debes atravesar la calle, el patio de un hospital abandonado y una plaza en ruinas hasta llegar a la **zona de extracción** (marcada en verde), administrando tu munición. Si un zombi te toca, es **GAME OVER**.

## Cómo ejecutarlo
Los módulos y los modelos GLB solo cargan desde un servidor local (no con doble clic en `index.html`):

- **VS Code:** extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*.
- **Python:** en la carpeta del proyecto, `python -m http.server 5500` y abrir `http://localhost:5500`.

Se necesita conexión a internet porque Three.js (r180) se importa desde jsDelivr.

## Controles
| Control | Acción |
|---|---|
| Clic (primera vez) | Capturar el mouse y empezar |
| W / A / S / D | Avanzar / izquierda / retroceder / derecha |
| Mouse | Orientar la cámara |
| Clic izquierdo | Un disparo (mantener presionado no dispara en automático) |
| 1 / 2 | Pistola / Rifle |
| Esc | Pausa |
| R | Reiniciar (tras ganar o perder) |

## Reglas del juego
- Cada arma tiene su **propio contador de munición**: pistola 12 y rifle 16 al empezar.
- No se puede disparar con 0 balas. **No hay recarga**: la munición solo se recupera recogiendo **cajas de munición** del escenario (pistola +4, rifle +8 por caja).
- Cada zombi tiene **2 puntos de vida**: muere exactamente al segundo impacto válido y deja de perseguir y atacar.
- Los zombis están **inactivos** hasta que entras en su rango de detección (9 a 18 m según el zombi). Los más pequeños y rápidos están marcados en el nivel.
- Los **escudos** (esferas azules) te hacen inmune al contacto durante 8 segundos.
- Si un zombi te alcanza: **GAME OVER**. Si llegas a la zona verde: **¡MISIÓN COMPLETADA!**

## Estructura
```
operacion-extraccion/
├── index.html        Página, HUD y pantallas
├── main.js           Lógica del juego (escena, armas, zombis, disparos, bucle)
├── levelData.js      Datos del nivel (muros, zombis, cajas, escudos, extracción)
├── models/           pistola.glb · rifle.glb · zombie.glb
├── tools/make_glb.py Script que genera los modelos GLB básicos
└── README.md
```

## Requerimientos → dónde están en `main.js`
| Requerimiento | Sección / función |
|---|---|
| RF01 Armas GLB, teclas 1/2, un disparo por clic | secciones 5, 7 y 9 · `selectWeapon`, `shoot` (evento `mousedown`) |
| RF02 Munición por arma, bloqueo en 0, recuperación solo con cajas | `ammo`, `shoot`, `updatePickups` |
| RF03 Mundo 3D (calle, hospital, plaza) | sección 3 y `levelData.js` |
| RF04 Zombis GLB | sección 5 (carga) y 6 (instancias) |
| RF05 Zombis inactivos / activos por rango | `updateZombies` (estados `idle` y `chase`) |
| RF06 Cámara FPS, WASD, mouse, arma que acompaña | `PointerLockControls`, `updatePlayer`, armas hijas de la cámara |
| RF07 Disparos y colisiones (2 impactos) | `shoot` (Raycaster) y `damageZombie` |
| RF08 Inicio, desarrollo, extracción y victoria | `levelData.js`, `checkExtraction` |
| RF09 Game Over | `updateZombies` → `gameOver` |
| RF10 Coleccionables | cajas de munición y escudos (`updatePickups`) |
| RF11 Dificultad | munición limitada, zombis rápidos, callejones y zigzag del patio, 24 zombis |

## Configuración rápida (parte superior de `main.js`)
`PLAYER_SPEED`, `START_AMMO`, `AMMO_PICKUP`, `SHOT_RANGE`, `SHIELD_SECONDS`. Las posiciones y rangos de los zombis, cajas y escudos están en `levelData.js`.

## Recursos externos y licencias
- `pistola.glb`, `rifle.glb` y `zombie.glb` son **modelos propios, generados con `tools/make_glb.py`** (formas básicas). No usan recursos de terceros.
- Si se reemplazan por modelos descargados, indicar aquí el autor, la fuente y la licencia de cada uno. Ejemplo:
  - `models/zombie.glb` – *nombre del modelo* por *autor* – *sitio* – *licencia*.
- Biblioteca: [Three.js](https://threejs.org) r180 (licencia MIT).
