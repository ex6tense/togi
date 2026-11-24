// Cuchillo 3D del cuchillo real de Togi (punta kiritsuke, ~175 mm), con texturas sacadas de la foto.
// Solo se ve la hoja: entra por el borde derecho del hero con la punta hacia el texto. Gira un poco con el cursor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Perfil (1 unidad ≈ 50 mm) ----------
const L = 3.5, H = 0.97, CLIP = 2.75;                       // CLIP: donde el lomo empieza a caer a la punta
const edgeY = x => 0.3 * Math.pow(x / L, 1.8);              // filo casi plano que sube suave
const spineY = x => (x <= CLIP ? H : H - (x - CLIP) / (L - CLIP) * (H - edgeY(L)));
const thick = (u, v) => Math.max(0.0015, 0.05 * (1 - 0.7 * u) * Math.pow(Math.min(1, v / 0.45), 0.75)); // cuña

const sheet = (fn, na, nb) => {                              // malla paramétrica fn(a, b) -> [x, y, z], UV = (a, b)
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) { pos.push(...fn(i / na, j / nb)); uv.push(i / na, j / nb); }
  for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) {
    const p = j * (na + 1) + i, q = p + na + 1;
    idx.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
const side = s => (u, v) => { const x = u * L; return [x, edgeY(x) + (spineY(x) - edgeY(x)) * v, s * thick(u, v) / 2]; };

const loader = new THREE.TextureLoader();
const load = url => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; });

function montar(box) {
  // ---------- Modelo ----------
  const hojaTex = load('tex/hoja.jpg');
  const steel = new THREE.MeshPhysicalMaterial({ map: hojaTex, color: 0xc9cdd1, metalness: 1, roughness: .3, side: THREE.DoubleSide, envMapIntensity: 1, clearcoat: .3, clearcoatRoughness: .25 });
  const edgeMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e6, metalness: 1, roughness: .12 }); // lomo y talón pulidos
  const knife = new THREE.Group();
  knife.add(new THREE.Mesh(sheet(side(1), 300, 48), steel), new THREE.Mesh(sheet(side(-1), 300, 48), steel),
    new THREE.Mesh(sheet((u, s) => { const x = u * L, t = thick(u, 1) / 2; return [x, spineY(x), -t + 2 * t * s]; }, 300, 2), edgeMat),
    new THREE.Mesh(sheet((v, s) => { const y = edgeY(0) + (spineY(0) - edgeY(0)) * v, t = thick(0, v) / 2; return [0, y, -t + 2 * t * s]; }, 48, 2), edgeMat));
  const foco = { x: 2.1, y: 0.5, ancho: 3.4 };                // encuadre: el talón queda fuera por el borde derecho
  knife.position.set(-foco.x, -foco.y, 0);
  const pivot = new THREE.Group();
  pivot.add(knife);

  // ---------- Escena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  box.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0xfff4e6, .8); rim.position.set(-4, 2, -3);
  scene.add(key, rim, pivot);

  const camera = new THREE.PerspectiveCamera(24, 1, .1, 100);
  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(foco.ancho / (2 * t * camera.aspect), 1.6 / (2 * t)));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(box);
  fit();

  // ---------- Movimiento ----------
  const base = { x: 0.16, y: Math.PI - 0.35, z: 0.36 };    // girado: la punta mira hacia el texto (izquierda)
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  if (!quieto) addEventListener('pointermove', e => {
    target.y = (e.clientX / innerWidth - .5) * 0.6;
    target.x = (e.clientY / innerHeight - .5) * 0.35;
  });
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);
  const frame = t => {
    requestAnimationFrame(frame);
    if (!visible) return;
    cur.x += (target.x - cur.x) * .06;
    cur.y += (target.y - cur.y) * .06;
    const f = quieto ? 0 : t / 1000;
    pivot.rotation.set(base.x + cur.x + Math.sin(f * .8) * .02, base.y + cur.y + Math.sin(f * .5) * .05, base.z);
    pivot.position.y = Math.sin(f * 1.1) * .04;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);                              // sigue corriendo con "reducir movimiento" para pintar texturas al cargar, pero sin flotar
}

// arranca después de cargar la página para no trabar la animación del titular
const iniciar = () => { const box = document.getElementById('gyuto'); if (box) montar(box); };
document.readyState === 'complete' ? iniciar() : addEventListener('load', iniciar, { once: true });
